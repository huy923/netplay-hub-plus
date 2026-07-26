import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";

export const listDiscounts = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.discount.findMany({ orderBy: { createdAt: "desc" } });
});

export const createDiscount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(1),
      name: z.string().default("percent"),
      value: z.number().int().min(0),
      minAmount: z.number().int().default(0),
      maxUses: z.number().int().min(1),
      type: z.string().default("percent"),
      expiresAt: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.discount.create({
      data: {
        code: data.code,
        name: data.name ?? "Khuyến mãi",
        type: data.type ?? "percent",
        value: data.value,
        minAmount: data.minAmount ?? 0,
        maxUses: data.maxUses ?? 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  });

export const updateDiscount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      active: z.boolean().optional(),
      maxUses: z.number().int().optional(),
      expiresAt: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...rest } = data;
    return prisma.discount.update({
      where: { id },
      data: { ...rest, expiresAt: rest.expiresAt ? new Date(rest.expiresAt) : undefined },
    });
  });

export const deleteDiscount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.discount.delete({ where: { id: data.id } });
  });

export const validateDiscount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), amount: z.number().int() }))
  .handler(async ({ data }) => {
    const discount = await prisma.discount.findUnique({ where: { code: data.code } });
    if (!discount) return { valid: false, message: "Mã giảm giá không tồn tại" };
    if (!discount.active) return { valid: false, message: "Mã giảm giá đã bị vô hiệu hóa" };
    if (discount.expiresAt && discount.expiresAt < new Date())
      return { valid: false, message: "Mã giảm giá đã hết hạn" };
    if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses)
      return { valid: false, message: "Mã giảm giá đã hết lượt sử dụng" };
    if (data.amount < discount.minAmount)
      return {
        valid: false,
        message: `Giá trị tối thiểu ${discount.minAmount.toLocaleString("vi-VN")}₫`,
      };
    const discountAmount =
      discount.type === "percent"
        ? Math.round((data.amount * discount.value) / 100)
        : discount.value;
    return { valid: true, discount, discountAmount, finalAmount: data.amount - discountAmount };
  });

export const refundInvoice = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), reason: z.string().default("Hoàn trả hóa đơn") }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const invoice = await prisma.invoice.findUnique({ where: { id: data.id } });
    if (!invoice) throw new Error("Hóa đơn không tồn tại");
    if (invoice.refundedAt) throw new Error("Hóa đơn đã được hoàn trả trước đó");
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    await prisma.invoice.create({
      data: {
        machine: invoice.machine,
        customer: invoice.customer,
        amount: -invoice.amount,
        method: invoice.method,
        status: "Đã thanh toán",
        time,
        refundedAt: new Date(),
        refundReason: data.reason,
      },
    });
    const result = await prisma.invoice.update({
      where: { id: data.id },
      data: { refundedAt: new Date(), refundReason: data.reason },
    });
    broadcast("invoice:created", { id: result.id });
    return result;
  });
