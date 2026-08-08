import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";
import { getClientIP } from "./_shared";

export const getMachineByIP = createServerFn({ method: "GET" }).handler(async () => {
  const ip = getClientIP();
  if (ip === "unknown") {
    const fallback = await prisma.machine.findFirst({ orderBy: { name: "asc" } });
    return fallback;
  }
  const machine = await prisma.machine.findFirst({ where: { ip } });
  return machine;
});

export const listMachines = createServerFn({ method: "GET" }).handler(async () => {
  return prisma.machine.findMany({
    orderBy: { name: "asc" },
    include: { sessions: { orderBy: { startedAt: "desc" }, take: 5 } },
  });
});

export const createMachine = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      area: z.string().min(1),
      ip: z.string().optional(),
      pricePerHour: z.number().int().min(0),
      status: z.string().default("idle"),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.machine.create({ data });
    broadcast("machine:created", { id: result.id });
    return result;
  });

export const updateMachine = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      area: z.string().optional(),
      ip: z.string().nullable().optional(),
      status: z.string().optional(),
      customer: z.string().nullable().optional(),
      remaining: z.string().nullable().optional(),
      startedAt: z.string().nullable().optional(),
      pricePerHour: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const old = await prisma.machine.findUnique({ where: { id } });
    const result = await prisma.machine.update({ where: { id }, data: rest });

    if (old?.status === "in_use" && rest.status === "idle") {
      const hoursUsed = old.startedAt
        ? (Date.now() - new Date(old.startedAt).getTime()) / 3600000
        : 0;
      await prisma.machineSession.create({
        data: {
          machineId: id,
          machineName: old.name,
          customerName: old.customer ?? "Khách vãng lai",
          startedAt: old.startedAt ?? new Date(),
          endedAt: new Date(),
          hoursUsed: Math.round(hoursUsed * 100) / 100,
          amount: Math.round(hoursUsed * old.pricePerHour),
        },
      });
    }
    broadcast("machine:updated", { id: result.id });
    return result;
  });

export const deleteMachine = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.machine.delete({ where: { id: data.id } });
    broadcast("machine:deleted", { id: data.id });
    return result;
  });

export const getLastMachineSessionByCustomer = createServerFn({ method: "GET" })
  .inputValidator(z.object({ customer: z.string() }))
  .handler(async ({ data }) => {
    return prisma.machineSession.findFirst({
      where: { customerName: data.customer },
      orderBy: { endedAt: "desc" },
    });
  });

export const getMachineSessions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ machineId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.machineSession.findMany({
      where: { machineId: data.machineId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
  });

export const endMachineSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      machineId: z.string(),
      paymentMethod: z.enum(["cash", "qr"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const machine = await prisma.machine.findUnique({ where: { id: data.machineId } });
    if (!machine || machine.status !== "in_use") {
      throw new Error("Machine not in use");
    }

    const existing = await prisma.invoice.findFirst({
      where: {
        machine: machine.name,
        status: "Chờ",
        items: { some: { type: "time" } },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      let existingPayment = await prisma.payment.findFirst({
        where: { invoiceId: existing.id },
      });

      const extraPending = await prisma.invoice.findMany({
        where: {
          machine: machine.name,
          id: { not: existing.id },
          status: { in: ["Chờ xử lý", "Đang chuẩn bị", "Đã giao"] },
        },
        include: { items: true },
      });
      const extraItems: { name: string; price: number; qty: number; type: string }[] = [];
      let extraAmount = 0;
      for (const order of extraPending) {
        for (const item of order.items ?? []) {
          extraItems.push({ name: item.name, price: item.price, qty: item.qty, type: item.type });
          extraAmount += item.price * item.qty;
        }
      }

      let totalAmount = existing.amount;
      if (extraItems.length > 0) {
        await prisma.invoice.update({
          where: { id: existing.id },
          data: { amount: existing.amount + extraAmount, items: { create: extraItems } },
        });
        totalAmount += extraAmount;
        for (const order of extraPending) {
          await prisma.invoice.update({ where: { id: order.id }, data: { status: "Đã gộp" } });
        }
      }

      if (existingPayment && extraAmount > 0) {
        existingPayment = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { amount: existingPayment.amount + extraAmount },
        });
      } else if (!existingPayment) {
        existingPayment = await prisma.payment.create({
          data: {
            invoiceId: existing.id,
            amount: totalAmount,
            method: data.paymentMethod,
            status: "pending",
          },
        });
      }

      const existingTimeItem = existing.items?.find((i) => i.type === "time");
      return {
        invoiceId: existing.id,
        paymentId: existingPayment?.id ?? "",
        amount: totalAmount,
        hoursUsed:
          machine.pricePerHour > 0 ? (existingTimeItem?.price ?? 0) / machine.pricePerHour : 0,
        timeAmount: existingTimeItem?.price ?? 0,
        foodAmount: Math.max(0, totalAmount - (existingTimeItem?.price ?? 0)),
        note:
          existingPayment?.method === "qr"
            ? `NAPMAY ${machine.name.replace(/\s+/g, "").toUpperCase()}`
            : null,
        needIdle: (existingPayment?.method ?? data.paymentMethod) === "cash",
        items: [
          ...(existing.items?.map((i) => ({
            name: i.name,
            price: i.price,
            qty: i.qty,
            type: i.type,
          })) ?? []),
          ...extraItems,
        ],
      };
    }

    const rp = (machine.remaining ?? "0:00").split(":").map(Number);
    const purchasedSec = (rp[0] || 0) * 3600 + (rp[1] || 0) * 60 + (rp[2] || 0);
    const elapsedSec = machine.startedAt
      ? Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000)
      : 0;
    const hoursUsed = Math.min(elapsedSec, purchasedSec) / 3600;
    const timeAmount = Math.round(hoursUsed * machine.pricePerHour);
    const customer = machine.customer ?? "Khách vãng lai";
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    const pendingOrders = await prisma.invoice.findMany({
      where: {
        machine: machine.name,
        status: { in: ["Chờ", "Chờ xử lý", "Đang chuẩn bị", "Đã giao"] },
      },
      include: { items: true },
    });
    const foodAmount = pendingOrders.reduce((sum, o) => sum + o.amount, 0);
    const totalAmount = timeAmount + foodAmount;

    const foodItemsData = pendingOrders.flatMap((o) => {
      const items = o.items ?? [];
      return items.map((item) => ({
        name: item.name,
        price: item.price,
        qty: item.qty,
        type: item.type,
      }));
    });

    const allItemsData = [
      {
        name: `Giờ chơi (${hoursUsed.toFixed(1)}h × ${machine.pricePerHour})`,
        price: timeAmount,
        qty: 1,
        type: "time",
      },
      ...foodItemsData,
    ];

    const invoice = await prisma.invoice.create({
      data: {
        machine: machine.name,
        customer,
        amount: totalAmount,
        method: data.paymentMethod,
        status: "Chờ",
        time,
        items: {
          create: allItemsData,
        },
      },
    });

    const createdItems = await prisma.invoiceItem.findMany({
      where: { invoiceId: invoice.id },
    });

    for (const order of pendingOrders) {
      await prisma.invoice.update({
        where: { id: order.id },
        data: { status: "Đã gộp" },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: totalAmount,
        method: data.paymentMethod,
        status: "pending",
      },
    });

    await prisma.transaction.create({
      data: {
        type: "payment_created",
        amount: totalAmount,
        referenceId: payment.id,
        description: `${data.paymentMethod} payment for ${machine.name} (${hoursUsed.toFixed(2)}h + ${foodAmount} food)`,
      },
    });

    await prisma.machineSession.create({
      data: {
        machineId: machine.id,
        machineName: machine.name,
        customerName: customer,
        startedAt: machine.startedAt ?? new Date(),
        endedAt: new Date(),
        hoursUsed: Math.round(hoursUsed * 100) / 100,
        amount: totalAmount,
      },
    });

    if (data.paymentMethod === "qr") {
      const now = new Date();
      const createdAt = invoice.createdAt;
      const pad = (n: number) => String(n).padStart(2, "0");
      const note = `NAPMAY ${machine.name.replace(/\s+/g, "").toUpperCase()} ${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getDate())}${pad(now.getMonth() + 1)}`;

      broadcast("staff.request", {
        invoiceId: invoice.id,
        machine: machine.name,
        amount: totalAmount,
        time: `${pad(createdAt.getHours())}:${pad(createdAt.getMinutes())} ${pad(createdAt.getDate())}/${pad(createdAt.getMonth() + 1)}`,
      });

      return {
        invoiceId: invoice.id,
        amount: totalAmount,
        hoursUsed: Math.round(hoursUsed * 100) / 100,
        timeAmount,
        foodAmount,
        note,
        paymentId: payment.id,
        needIdle: false,
        items: createdItems.map((i) => ({
          name: i.name,
          price: i.price,
          qty: i.qty,
          type: i.type,
        })),
      };
    }

    return {
      invoiceId: invoice.id,
      amount: totalAmount,
      hoursUsed: Math.round(hoursUsed * 100) / 100,
      timeAmount,
      foodAmount,
      note: null,
      paymentId: payment.id,
      needIdle: true,
      items: createdItems.map((i) => ({ name: i.name, price: i.price, qty: i.qty, type: i.type })),
    };
  });

export const confirmEndSessionIdle = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      machineId: z.string(),
      paymentId: z.string(),
      invoiceId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "pending") throw new Error("Payment already confirmed");

    await prisma.payment.update({
      where: { id: data.paymentId },
      data: { status: "success", paidAt: new Date() },
    });

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { status: "Đã thanh toán" },
    });

    await prisma.transaction.create({
      data: {
        type: "payment_success",
        amount: payment.amount,
        referenceId: payment.id,
        description: `Cash collected: ${payment.amount}`,
      },
    });

    await prisma.machine.update({
      where: { id: data.machineId },
      data: { status: "idle", remaining: null, startedAt: null, customer: null },
    });

    broadcast("payment.success", { id: data.paymentId });
    broadcast("machine:updated", { id: data.machineId });
    return { ok: true };
  });
