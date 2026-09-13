import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";
import { deleteImageFile } from "./_shared";

export const listMenu = createServerFn({ method: "GET" }).handler(async () => {
  return prisma.menuItem.findMany({ orderBy: { category: "asc" } });
});

export const createMenuItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      price: z.number().int().min(0),
      stock: z.number().int().min(0).default(0),
      cost: z.number().int().default(0),
      lowStockThreshold: z.number().int().default(5),
      image: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.menuItem.create({ data });
    broadcast("menu:created", { id: result.id });
    return result;
  });

export const updateMenuItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      category: z.string().optional(),
      price: z.number().int().optional(),
      cost: z.number().int().optional(),
      lowStockThreshold: z.number().int().optional(),
      image: z.string().nullable().optional(),
      stock: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...rest } = data;
    if (rest.image !== undefined) {
      const old = await prisma.menuItem.findUnique({ where: { id }, select: { image: true } });
      if (old?.image && old.image !== rest.image) await deleteImageFile(old.image);
    }
    const result = await prisma.menuItem.update({ where: { id }, data: rest });
    broadcast("menu:updated", { id });
    return result;
  });

export const addStock = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), amount: z.number().int() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await prisma.menuItem.update({
      where: { id: data.id },
      data: { stock: { increment: data.amount } },
    });
    broadcast("stock:updated", { id: data.id });
    return result;
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const item = await prisma.menuItem.findUnique({ where: { id: data.id } });
    await deleteImageFile(item?.image ?? null);
    const result = await prisma.menuItem.delete({ where: { id: data.id } });
    broadcast("menu:deleted", { id: data.id });
    return result;
  });

export const getLowStockItems = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const items = await prisma.menuItem.findMany({ orderBy: { category: "asc" } });
  return items.filter((i) => i.stock <= i.lowStockThreshold && i.stock > 0);
});

export const getOutOfStockItems = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.menuItem.findMany({ where: { stock: 0 }, orderBy: { category: "asc" } });
});

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      itemId: z.string(),
      qty: z.number().int().min(1),
      unitCost: z.number().int().min(0),
      supplier: z.string().default(""),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const item = await prisma.menuItem.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error("Món không tồn tại");
    const totalCost = data.qty * data.unitCost;
    const po = await prisma.purchaseOrder.create({
      data: {
        itemId: data.itemId,
        itemName: item.name,
        qty: data.qty,
        unitCost: data.unitCost,
        totalCost,
        supplier: data.supplier,
        note: data.note,
      },
    });
    await prisma.menuItem.update({
      where: { id: data.itemId },
      data: { stock: { increment: data.qty } },
    });
    if (data.unitCost > 0) {
      await prisma.menuItem.update({ where: { id: data.itemId }, data: { cost: data.unitCost } });
    }
    return po;
  });

export const listPurchaseOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { menuItem: { select: { name: true, category: true } } },
  });
});

export const deletePurchaseOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const po = await prisma.purchaseOrder.findUnique({ where: { id: data.id } });
    if (!po) throw new Error("Đơn nhập không tồn tại");
    await prisma.menuItem.update({
      where: { id: po.itemId },
      data: { stock: { decrement: po.qty } },
    });
    return prisma.purchaseOrder.delete({ where: { id: data.id } });
  });
