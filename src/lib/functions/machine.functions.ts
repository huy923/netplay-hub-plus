import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin, requireKioskOrAdmin } from "@/lib/auth.server";
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
  .validator(
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
  .validator(
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
    const auth = await requireKioskOrAdmin();
    const { id, ...rest } = data;

    let updateData: Record<string, unknown> = rest;
    if (auth.kind === "machine") {
      if (auth.machineId !== id) throw new Error("Unauthorized");
      const allowed: (keyof typeof rest)[] = ["remaining", "startedAt"];
      const extra = Object.keys(rest).filter((k) => !allowed.includes(k as keyof typeof rest));
      if (extra.length > 0) throw new Error("Unauthorized");
      if (rest.remaining !== undefined) {
        const m = String(rest.remaining).match(/^\d{1,3}:\d{2}(:\d{2})?$/);
        if (!m) throw new Error("Thời gian không hợp lệ");
      }
      updateData = Object.fromEntries(allowed.filter((k) => k in rest).map((k) => [k, rest[k]]));
    }

    const old = await prisma.machine.findUnique({ where: { id } });
    const result = await prisma.machine.update({ where: { id }, data: updateData });

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
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.machine.delete({ where: { id: data.id } });
    broadcast("machine:deleted", { id: data.id });
    return result;
  });

export const getLastMachineSessionByCustomer = createServerFn({ method: "GET" })
  .validator(z.object({ customer: z.string() }))
  .handler(async ({ data }) => {
    return prisma.machineSession.findFirst({
      where: { customerName: data.customer },
      orderBy: { endedAt: "desc" },
    });
  });

export const getMachineSessions = createServerFn({ method: "GET" })
  .validator(z.object({ machineId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.machineSession.findMany({
      where: { machineId: data.machineId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
  });

export const endMachineSession = createServerFn({ method: "POST" })
  .validator(
    z.object({
      machineId: z.string(),
      paymentMethod: z.enum(["cash", "qr"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const VIP_DISCOUNT_PERCENT = 10;

    return await prisma.$transaction(async (tx) => {
      const machine = await tx.machine.findUnique({ where: { id: data.machineId } });
      if (!machine || machine.status !== "in_use") {
        throw new Error("Machine not in use");
      }

      const customer = machine.customer ?? "Khách vãng lai";
      const vipCustomer = await tx.customer.findFirst({
        where: { name: customer, tier: "VIP" },
        select: { id: true },
      });
      const isVip = vipCustomer !== null;

      // Prepaid time = time bought at the POS counter AFTER the previous session
      // ended (i.e. during THIS session). Older paid time items belong to sessions
      // that were already billed — counting them would zero out the time charge.
      const lastSession = await tx.machineSession.findFirst({
        where: { machineId: machine.id },
        orderBy: { endedAt: "desc" },
      });
      const paidTimeInvoices = await tx.invoice.findMany({
        where: {
          machine: machine.name,
          status: "Đã thanh toán",
          createdAt: { gte: lastSession?.endedAt ?? new Date(0) },
          items: { some: { type: "time" } },
        },
        include: { items: true },
      });
      const prepaidVnd = paidTimeInvoices.reduce(
        (sum, inv) =>
          sum + (inv.items ?? []).filter((i) => i.type === "time").reduce((s, i) => s + i.price, 0),
        0,
      );

      const applyDiscount = (base: number) => {
        const discountAmount = isVip ? Math.round((base * VIP_DISCOUNT_PERCENT) / 100) : 0;
        return { finalAmount: Math.max(0, base - discountAmount), discountAmount };
      };

      const time = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Billing is by full-hour blocks, not real time: a 1h rental is billed 1h
      // even if the customer leaves after 30 minutes. Play beyond the bought
      // time is billed as extra blocks (prepaid covers the bought part).
      const elapsedSec = machine.startedAt
        ? Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000)
        : 0;
      const hoursUsed = Math.ceil(Math.max(0, elapsedSec) / 3600);
      const rawTimeAmount = hoursUsed * machine.pricePerHour;
      const timeAmount = Math.max(0, rawTimeAmount - prepaidVnd);

      const existing = await tx.invoice.findFirst({
        where: {
          machine: machine.name,
          status: "Chờ",
          items: { some: { type: "time" } },
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        let existingPayment = await tx.payment.findFirst({
          where: { invoiceId: existing.id },
        });

        const extraPending = await tx.invoice.findMany({
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

        const existingTimeItem = existing.items?.find((i) => i.type === "time");
        if (existingTimeItem) {
          await tx.invoiceItem.update({
            where: { id: existingTimeItem.id },
            data: {
              name: `Giờ chơi (${hoursUsed.toFixed(1)}h × ${machine.pricePerHour})`,
              price: timeAmount,
            },
          });
        }
        // Items already merged into this invoice on a previous run are part of it —
        // only the time item price is refreshed above, so its food must be kept.
        const existingFoodVnd = (existing.items ?? [])
          .filter((i) => i.type !== "time")
          .reduce((s, i) => s + i.price * i.qty, 0);
        const baseAmount = timeAmount + existingFoodVnd + extraAmount;
        const { finalAmount, discountAmount } = applyDiscount(baseAmount);

        const updatedInvoice = await tx.invoice.update({
          where: { id: existing.id },
          data: {
            amount: finalAmount,
            discountAmount,
            discountId: isVip ? null : existing.discountId,
            items: extraItems.length > 0 ? { create: extraItems } : undefined,
          },
        });

        for (const order of extraPending) {
          await tx.invoice.update({ where: { id: order.id }, data: { status: "Đã gộp" } });
        }

        if (existingPayment) {
          existingPayment = await tx.payment.update({
            where: { id: existingPayment.id },
            data: { amount: finalAmount },
          });
        } else {
          existingPayment = await tx.payment.create({
            data: {
              invoiceId: existing.id,
              amount: finalAmount,
              method: data.paymentMethod,
              status: "pending",
            },
          });
        }

        return {
          invoiceId: existing.id,
          paymentId: existingPayment?.id ?? "",
          amount: finalAmount,
          hoursUsed: machine.pricePerHour > 0 ? timeAmount / machine.pricePerHour : 0,
          timeAmount,
          foodAmount: extraAmount,
          discountAmount,
          isVip,
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

      const pendingOrders = await tx.invoice.findMany({
        where: {
          machine: machine.name,
          status: { in: ["Chờ", "Chờ xử lý", "Đang chuẩn bị", "Đã giao"] },
        },
        include: { items: true },
      });
      const foodAmount = pendingOrders.reduce((sum, o) => sum + o.amount, 0);
      const baseAmount = timeAmount + foodAmount;
      const { finalAmount, discountAmount } = applyDiscount(baseAmount);

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

      const invoice = await tx.invoice.create({
        data: {
          machine: machine.name,
          customer,
          amount: finalAmount,
          method: data.paymentMethod,
          status: "Chờ",
          time,
          discountAmount,
          discountId: isVip ? null : undefined,
          items: {
            create: allItemsData,
          },
        },
      });

      const createdItems = await tx.invoiceItem.findMany({
        where: { invoiceId: invoice.id },
      });

      for (const order of pendingOrders) {
        await tx.invoice.update({
          where: { id: order.id },
          data: { status: "Đã gộp" },
        });
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: finalAmount,
          method: data.paymentMethod,
          status: "pending",
        },
      });

      await tx.transaction.create({
        data: {
          type: "payment_created",
          amount: finalAmount,
          referenceId: payment.id,
          description: `${data.paymentMethod} payment for ${machine.name} (${hoursUsed.toFixed(2)}h + ${foodAmount} food, vip=${isVip}, discount=${discountAmount})`,
        },
      });

      await tx.machineSession.create({
        data: {
          machineId: machine.id,
          machineName: machine.name,
          customerName: customer,
          startedAt: machine.startedAt ?? new Date(),
          endedAt: new Date(),
          hoursUsed: Math.round(hoursUsed * 100) / 100,
          amount: finalAmount,
        },
      });

      const pad = (n: number) => String(n).padStart(2, "0");

      if (data.paymentMethod === "qr") {
        const now = new Date();
        const note = `NAPMAY ${machine.name.replace(/\s+/g, "").toUpperCase()} ${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getDate())}${pad(now.getMonth() + 1)}`;

        broadcast("staff.request", {
          invoiceId: invoice.id,
          machine: machine.name,
          amount: finalAmount,
          time: `${pad(invoice.createdAt.getHours())}:${pad(invoice.createdAt.getMinutes())} ${pad(invoice.createdAt.getDate())}/${pad(invoice.createdAt.getMonth() + 1)}`,
        });

        return {
          invoiceId: invoice.id,
          amount: finalAmount,
          hoursUsed: Math.round(hoursUsed * 100) / 100,
          timeAmount,
          foodAmount,
          discountAmount,
          isVip,
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
        amount: finalAmount,
        hoursUsed: Math.round(hoursUsed * 100) / 100,
        timeAmount,
        foodAmount,
        discountAmount,
        isVip,
        note: null,
        paymentId: payment.id,
        needIdle: true,
        items: createdItems.map((i) => ({
          name: i.name,
          price: i.price,
          qty: i.qty,
          type: i.type,
        })),
      };
    });
  });

export const confirmEndSessionIdle = createServerFn({ method: "POST" })
  .validator(
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
