import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";

export const createFoodOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      machineName: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string(),
          price: z.number().int().min(0),
          qty: z.number().int().min(1),
          type: z.string().default("menu"),
        }),
      ),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    // Decrement stock for menu items
    const stockUpdates: string[] = [];
    for (const item of data.items) {
      if (item.type === "menu" || item.type === "combo") {
        const menu = await prisma.menuItem.findFirst({ where: { name: item.name } });
        if (menu) {
          await prisma.menuItem.update({
            where: { id: menu.id },
            data: { stock: { decrement: item.qty } },
          });
          stockUpdates.push(menu.id);
        }
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        machine: data.machineName,
        customer: "",
        amount: total,
        method: "CASH",
        status: "Chờ xử lý",
        time,
        items: {
          create: data.items.map((i) => ({
            name: i.name,
            price: i.price,
            qty: i.qty,
            type: i.type,
          })),
        },
      },
      include: { items: true },
    });

    const summary = data.items.map((i) => `${i.qty}x ${i.name}`).join(", ");

    await prisma.notification.create({
      data: {
        type: "FOOD_ORDER",
        title: `Máy ${data.machineName} gọi đồ`,
        message: summary + (data.note ? ` (${data.note})` : ""),
        targetRole: "CASHIER",
      },
    });

    broadcast("order:created", {
      id: invoice.id,
      machine: data.machineName,
      items: data.items.map((i) => `${i.qty}x ${i.name}`),
      total,
      note: data.note ?? "",
      time,
    });

    broadcast("notification.created", {
      id: invoice.id,
      notifType: "FOOD_ORDER",
      title: `Máy ${data.machineName} gọi đồ`,
      message: summary + (data.note ? ` (${data.note})` : ""),
    });

    // Broadcast stock updates
    for (const menuId of stockUpdates) {
      broadcast("stock:updated", { id: menuId });
    }

    return invoice;
  });

export const getOrdersByMachine = createServerFn({ method: "GET" })
  .inputValidator(z.object({ machineName: z.string() }))
  .handler(async ({ data }) => {
    return prisma.invoice.findMany({
      where: { machine: data.machineName },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), status: z.string() }))
  .handler(async ({ data }) => {
    const result = await prisma.invoice.update({
      where: { id: data.id },
      data: { status: data.status },
      include: { items: true },
    });
    broadcast("order:updated", { id: result.id, status: data.status, machine: result.machine });
    if (data.status === "Đã hủy") {
      // Restore stock for cancelled items
      const stockUpdates: string[] = [];
      for (const item of result.items) {
        if (item.type === "menu" || item.type === "combo") {
          const menu = await prisma.menuItem.findFirst({ where: { name: item.name } });
          if (menu) {
            await prisma.menuItem.update({
              where: { id: menu.id },
              data: { stock: { increment: item.qty } },
            });
            stockUpdates.push(menu.id);
          }
        }
      }
      for (const menuId of stockUpdates) {
        broadcast("stock:updated", { id: menuId });
      }

      const summary = result.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
      broadcast("notification.created", {
        id: result.id,
        notifType: "ORDER_CANCELLED",
        title: `Máy ${result.machine} hủy đơn`,
        message: summary,
      });
    }
    return result;
  });
