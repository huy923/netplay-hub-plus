import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { hashPassword } from "@/lib/encryption";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";

export const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.customer.findMany({ orderBy: { total: "desc" } });
});

export const getCustomerByName = createServerFn({ method: "GET" })
  .validator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    const customer = await prisma.customer.findFirst({ where: { name: data.name } });
    if (!customer) return null;
    const { password, ...rest } = customer;
    return rest;
  });

export const createCustomer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      password: z.string().trim().optional(),
      tier: z.string().default("Thường"),
    }),
  )
  .handler(async ({ data }) => {
    const result = await prisma.customer.create({
      data: { ...data, password: data.password ? await hashPassword(data.password) : "" },
    });
    broadcast("customer:created", { id: result.id });
    return result;
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      phone: z.string().optional(),
      tier: z.string().optional(),
      visits: z.number().int().optional(),
      total: z.number().int().optional(),
      points: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...rest } = data;
    const result = await prisma.customer.update({ where: { id }, data: rest });
    broadcast("customer:updated", { id });
    return result;
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.customer.delete({ where: { id: data.id } });
    broadcast("customer:updated", { id: data.id });
    return result;
  });

export const earnLoyaltyPoints = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string(),
      points: z.number().int().min(1),
      reference: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await prisma.loyaltyTransaction.create({
      data: {
        customerId: data.customerId,
        points: data.points,
        type: "earn",
        reference: data.reference,
      },
    });
    return prisma.customer.update({
      where: { id: data.customerId },
      data: { points: { increment: data.points } },
    });
  });

export const burnLoyaltyPoints = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string(),
      points: z.number().int().min(1),
      reference: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.points < data.points) throw new Error("Không đủ điểm thưởng");
    await prisma.loyaltyTransaction.create({
      data: {
        customerId: data.customerId,
        points: -data.points,
        type: "burn",
        reference: data.reference,
      },
    });
    return prisma.customer.update({
      where: { id: data.customerId },
      data: { points: { decrement: data.points } },
    });
  });

export const getLoyaltyTransactions = createServerFn({ method: "GET" })
  .validator(z.object({ customerId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.loyaltyTransaction.findMany({
      where: { customerId: data.customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

export const createCursingRequest = createServerFn({ method: "POST" })
  .validator(z.object({ machine: z.string(), customer: z.string() }))
  .handler(async ({ data }) => {
    const req = await prisma.cursingRequest.create({
      data: { machine: data.machine, customer: data.customer, price: 10000 },
    });
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    await prisma.invoice.create({
      data: {
        machine: data.machine,
        customer: data.customer,
        amount: 10000,
        method: "QR",
        status: "Chờ",
        time,
      },
    });
    broadcast("cursing:created", { id: req.id, machine: req.machine, customer: req.customer });
    return req;
  });

export const listCursingRequests = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.cursingRequest.findMany({ orderBy: { createdAt: "desc" } });
});

export const completeCursingRequest = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.cursingRequest.update({
      where: { id: data.id },
      data: { status: "completed" },
    });
    broadcast("cursing:resolved", { id: result.id });
    return result;
  });
