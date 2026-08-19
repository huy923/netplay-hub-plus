import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { requireAdmin, requireKioskOrAdmin } from "@/lib/auth.server";
import { deleteImageFile } from "./_shared";

export const listKeyboards = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.keyboard.findMany({ orderBy: { name: "asc" } });
});

export const createKeyboard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      brand: z.string().min(1),
      pricePerHour: z.number().int().min(0),
      image: z.string().nullable().optional(),
      machineId: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.keyboard.create({ data });
  });

export const updateKeyboard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      brand: z.string().optional(),
      pricePerHour: z.number().int().optional(),
      status: z.string().optional(),
      image: z.string().nullable().optional(),
      machineId: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...rest } = data;
    if (rest.image !== undefined) {
      const old = await prisma.keyboard.findUnique({ where: { id }, select: { image: true } });
      if (old?.image && old.image !== rest.image) await deleteImageFile(old.image);
    }
    return prisma.keyboard.update({ where: { id }, data: rest });
  });

export const deleteKeyboard = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const kb = await prisma.keyboard.findUnique({ where: { id: data.id } });
    await deleteImageFile(kb?.image ?? null);
    return prisma.keyboard.delete({ where: { id: data.id } });
  });

export const rentKeyboard = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), machineId: z.string() }))
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    if (auth.kind === "machine" && auth.machineId !== data.machineId)
      throw new Error("Unauthorized");
    return prisma.keyboard.update({
      where: { id: data.id },
      data: { status: "rented", machineId: data.machineId },
    });
  });

export const returnKeyboard = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    const kb = await prisma.keyboard.findUnique({ where: { id: data.id } });
    if (auth.kind === "machine" && kb?.machineId !== auth.machineId)
      throw new Error("Unauthorized");
    return prisma.keyboard.update({
      where: { id: data.id },
      data: { status: "idle", machineId: null },
    });
  });

export const getRentedKeyboardsByMachine = createServerFn({ method: "GET" })
  .inputValidator(z.object({ machineName: z.string() }))
  .handler(async ({ data }) => {
    const auth = await requireKioskOrAdmin();
    if (auth.kind === "machine") {
      const machine = await prisma.machine.findUnique({
        where: { id: auth.machineId },
        select: { name: true },
      });
      if (!machine || machine.name !== data.machineName) throw new Error("Unauthorized");
    }
    return prisma.keyboard.findMany({ where: { machineId: data.machineName, status: "rented" } });
  });
