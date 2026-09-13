import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";

export const listInvoices = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true },
  });
});

export const getAllPendingFoodOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.invoice.findMany({
    where: {
      status: { in: ["Chờ", "Chờ xử lý", "Đang chuẩn bị"] },
      items: { some: { type: { not: "time" } } },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
});

export const getInvoiceById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.invoice.findUnique({
      where: { id: data.id },
      include: { items: true },
    });
  });

export const getInvoicesByCustomer = createServerFn({ method: "GET" })
  .validator(z.object({ customer: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.invoice.findMany({
      where: { customer: data.customer },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  });

export const getMachineByCustomerName = createServerFn({ method: "GET" })
  .validator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.machine.findFirst({ where: { customer: data.name } });
  });

export const getCustomerById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const customer = await prisma.customer.findUnique({ where: { id: data.id } });
    if (!customer) return null;
    const { password, ...rest } = customer;
    return rest;
  });

export const createInvoice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      machine: z.string(),
      customer: z.string(),
      amount: z.number().int().optional(),
      method: z.string(),
      status: z.string().default("Đã thanh toán"),
      items: z
        .array(
          z.object({
            name: z.string(),
            price: z.number().int().optional(),
            qty: z.number().int().min(1),
            type: z.string().default("menu"),
          }),
        )
        .optional(),
      discountCode: z.string().optional(),
      pointsApplied: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    // Server-side price resolution — never trust client prices
    const resolvedItems: { name: string; price: number; qty: number; type: string }[] = [];
    let subtotal = 0;
    for (const item of data.items ?? []) {
      if (item.type === "menu") {
        const menu = await prisma.menuItem.findUnique({ where: { name: item.name } });
        if (!menu) throw new Error(`Món "${item.name}" không tồn tại`);
        resolvedItems.push({ name: menu.name, price: menu.price, qty: item.qty, type: "menu" });
        subtotal += menu.price * item.qty;
      } else if (item.type === "combo") {
        const combo = await prisma.combo.findFirst({ where: { name: item.name } });
        if (!combo) throw new Error(`Combo "${item.name}" không tồn tại`);
        resolvedItems.push({ name: combo.name, price: combo.price, qty: item.qty, type: "combo" });
        subtotal += combo.price * item.qty;
      } else if (item.type === "time") {
        const machine = await prisma.machine.findFirst({ where: { name: data.machine } });
        if (!machine) throw new Error("Máy không tồn tại");
        const price = machine.pricePerHour * item.qty;
        resolvedItems.push({ name: item.name, price, qty: item.qty, type: "time" });
        subtotal += price;
      } else {
        throw new Error("Loại món không hợp lệ");
      }
    }

    const baseAmount = data.items && data.items.length > 0 ? subtotal : (data.amount ?? 0);
    let finalAmount = baseAmount;
    let discountAmount = 0;
    let discountId: string | undefined;

    if (data.discountCode) {
      const discount = await prisma.discount.findUnique({ where: { code: data.discountCode } });
      if (
        discount &&
        discount.active &&
        (!discount.expiresAt || discount.expiresAt > new Date()) &&
        (discount.maxUses === 0 || discount.usedCount < discount.maxUses)
      ) {
        if (baseAmount >= discount.minAmount) {
          discountAmount =
            discount.type === "percent"
              ? Math.round((baseAmount * discount.value) / 100)
              : discount.value;
          finalAmount = Math.max(0, baseAmount - discountAmount);
          discountId = discount.id;
          await prisma.discount.update({
            where: { id: discount.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    const inv = await prisma.invoice.create({
      data: {
        machine: data.machine,
        customer: data.customer,
        amount: finalAmount,
        method: data.method,
        status: data.status,
        time,
        discountAmount,
        discountId,
        items: resolvedItems.length > 0 ? { create: resolvedItems } : undefined,
      },
      include: { items: true },
    });

    if (data.pointsApplied && data.pointsApplied > 0) {
      const cust = await prisma.customer.findFirst({ where: { name: data.customer } });
      if (cust) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId: cust.id,
            points: -data.pointsApplied,
            type: "burn",
            reference: `Hóa đơn ${inv.id}`,
          },
        });
        await prisma.customer.update({
          where: { id: cust.id },
          data: { points: { decrement: data.pointsApplied } },
        });
      }
    }

    const cust = await prisma.customer.findFirst({ where: { name: data.customer } });
    if (cust) {
      const pointsEarned = Math.floor(finalAmount / 1000);
      if (pointsEarned > 0) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId: cust.id,
            points: pointsEarned,
            type: "earn",
            reference: `Hóa đơn ${inv.id}`,
          },
        });
        await prisma.customer.update({
          where: { id: cust.id },
          data: {
            points: { increment: pointsEarned },
            total: { increment: finalAmount },
            visits: { increment: 1 },
          },
        });
      }
    }

    broadcast("invoice:created", { id: inv.id, machine: inv.machine });
    broadcast("machine:updated", { machine: inv.machine });
    return inv;
  });

export const getUnpaidInvoicesByMachine = createServerFn({ method: "GET" })
  .validator(z.object({ machine: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.invoice.findMany({
      where: {
        machine: data.machine,
        status: { in: ["Chờ", "Chờ xử lý", "Đang chuẩn bị", "Đã giao"] },
      },
      include: { items: true, payments: true },
      orderBy: { createdAt: "asc" },
    });
  });

export const getCurrentSessionOrders = createServerFn({ method: "GET" })
  .validator(z.object({ machine: z.string(), startedAt: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.invoice.findMany({
      where: {
        machine: data.machine,
        status: { in: ["Chờ", "Chờ xử lý", "Đang chuẩn bị", "Đã giao"] },
        createdAt: { gte: new Date(data.startedAt) },
      },
      include: { items: true, payments: true },
      orderBy: { createdAt: "asc" },
    });
  });

export const settleInvoices = createServerFn({ method: "POST" })
  .validator(
    z.object({
      invoiceIds: z.array(z.string()),
      method: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const result = await prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { id: { in: data.invoiceIds } },
        include: { items: true },
      });
      if (invoices.length === 0) throw new Error("No invoices found");

      const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
      const time = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const inv of invoices) {
        await tx.payment.create({
          data: {
            invoiceId: inv.id,
            amount: inv.amount,
            method: data.method,
            status: "success",
            paidAt: new Date(),
          },
        });

        await tx.invoice.update({
          where: { id: inv.id },
          data: { status: "Đã thanh toán", method: data.method },
        });

        await tx.transaction.create({
          data: {
            type: "payment_success",
            amount: inv.amount,
            referenceId: inv.id,
            description: `Settled: ${inv.machine} - ${inv.customer} (${inv.amount})`,
          },
        });
      }

      return { total: totalAmount, count: invoices.length };
    });

    broadcast("payment.success", { ids: data.invoiceIds, total: result.total });

    return { ok: true, ...result };
  });
