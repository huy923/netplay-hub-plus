import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { requireAdmin } from "@/lib/auth.server";
import { deleteImageFile } from "./_shared";

export const listCombos = createServerFn({ method: "GET" }).handler(async () => {
  return prisma.combo.findMany({
    where: { active: true },
    include: { items: { include: { menuItem: true } } },
    orderBy: { name: "asc" },
  });
});

export const createCombo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      price: z.number().int().min(0),
      seconds: z.number().int().min(0),
      image: z.string().nullable().optional(),
      itemIds: z.array(z.object({ menuItemId: z.string(), qty: z.number().int().min(1) })),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { itemIds, ...comboData } = data;
    return prisma.combo.create({
      data: { ...comboData, items: { create: itemIds } },
      include: { items: { include: { menuItem: true } } },
    });
  });

export const updateCombo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      price: z.number().int().min(0).optional(),
      seconds: z.number().int().min(0).optional(),
      image: z.string().nullable().optional(),
      active: z.boolean().optional(),
      itemIds: z
        .array(z.object({ menuItemId: z.string(), qty: z.number().int().min(1) }))
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, itemIds, ...rest } = data;
    if (rest.image !== undefined) {
      const old = await prisma.combo.findUnique({ where: { id }, select: { image: true } });
      if (old?.image && old.image !== rest.image) await deleteImageFile(old.image);
    }
    if (itemIds) {
      await prisma.comboItem.deleteMany({ where: { comboId: id } });
      await prisma.comboItem.createMany({ data: itemIds.map((i) => ({ ...i, comboId: id })) });
    }
    return prisma.combo.update({
      where: { id },
      data: rest,
      include: { items: { include: { menuItem: true } } },
    });
  });

export const deleteCombo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const combo = await prisma.combo.findUnique({ where: { id: data.id } });
    await deleteImageFile(combo?.image ?? null);
    return prisma.combo.delete({ where: { id: data.id } });
  });
