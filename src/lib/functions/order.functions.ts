import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireKioskOrAdmin } from "@/lib/auth.server";

export const createFoodOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      machineName: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string(),
          qty: z.number().int().min(1).max(99),
          type: z.string().default("menu"),
        }),
      ),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    let machineId: string | null = null;
    if (auth.kind === "machine") {
      const machine = await prisma.machine.findUnique({
        where: { id: auth.machineId },
        select: { name: true },
      });
      if (!machine || machine.name !== data.machineName) throw new Error("Unauthorized");
      machineId = auth.machineId;
    }

    // Server-side price lookup — never trust client prices
    const resolvedItems: { name: string; price: number; qty: number; type: string }[] = [];
    for (const item of data.items) {
      if (item.type === "menu") {
        const menu = await prisma.menuItem.findUnique({ where: { name: item.name } });
        if (!menu) throw new Error(`Món "${item.name}" không tồn tại`);
        if (menu.stock < item.qty) throw new Error(`"${item.name}" hết hàng`);
        resolvedItems.push({ name: menu.name, price: menu.price, qty: item.qty, type: "menu" });
      } else if (item.type === "combo") {
        const combo = await prisma.combo.findFirst({ where: { name: item.name } });
        if (!combo) throw new Error(`Combo "${item.name}" không tồn tại`);
        resolvedItems.push({ name: combo.name, price: combo.price, qty: item.qty, type: "combo" });
      } else {
        throw new Error("Loại món không hợp lệ");
      }
    }

    const total = resolvedItems.reduce((s, i) => s + i.price * i.qty, 0);
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    // Decrement stock for menu items
    const stockUpdates: string[] = [];
    for (const item of resolvedItems) {
      if (item.type === "menu") {
        const menu = await prisma.menuItem.findUnique({ where: { name: item.name } });
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
          create: resolvedItems.map((i) => ({
            name: i.name,
            price: i.price,
            qty: i.qty,
            type: i.type,
          })),
        },
      },
      include: { items: true },
    });

    const summary = resolvedItems.map((i) => `${i.qty}x ${i.name}`).join(", ");

    await prisma.notification.create({
      data: {
        type: "FOOD_ORDER",
        title: `Máy ${data.machineName} gọi đồ`,
        message: summary + (data.note ? ` (${data.note})` : ""),
        targetRole: "CASHIER",
        metadata: machineId,
      },
    });

    broadcast("order:created", {
      id: invoice.id,
      machine: data.machineName,
      items: resolvedItems.map((i) => `${i.qty}x ${i.name}`),
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
  .validator(z.object({ machineName: z.string() }))
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    if (auth.kind === "machine") {
      const machine = await prisma.machine.findUnique({
        where: { id: auth.machineId },
        select: { name: true },
      });
      if (!machine || machine.name !== data.machineName) throw new Error("Unauthorized");
    }
    return prisma.invoice.findMany({
      where: { machine: data.machineName },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: z.string() }))
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    const invoice = await prisma.invoice.findUnique({ where: { id: data.id } });
    if (!invoice) throw new Error("Đơn không tồn tại");

    if (auth.kind === "machine") {
      // Kiosk may only cancel its own order within 30 seconds while still pending
      const machine = await prisma.machine.findUnique({
        where: { id: auth.machineId },
        select: { name: true },
      });
      if (!machine || machine.name !== invoice.machine) throw new Error("Unauthorized");
      if (data.status !== "Đã hủy") throw new Error("Không được phép");
      if (invoice.status !== "Chờ xử lý") throw new Error("Đơn không còn hủy được");
      if (Date.now() - new Date(invoice.createdAt).getTime() > 30_000)
        throw new Error("Đã quá 30 giây, không thể hủy");
    }

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
