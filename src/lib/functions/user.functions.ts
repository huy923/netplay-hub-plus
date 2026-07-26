import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { encrypt } from "@/lib/encryption";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";
import { createAuditLog } from "./_shared";

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return prisma.user.findMany({
    select: { id: true, username: true, role: true, active: true, createdAt: true },
    orderBy: { username: "asc" },
  });
});

export const createUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      role: z.string().default("cashier"),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const user = await prisma.user.create({ data: { ...data, password: encrypt(data.password) } });
    await createAuditLog("system", "system", "create_user", user.username);
    broadcast("user:updated");
    return user;
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      username: z.string().optional(),
      password: z.string().optional(),
      role: z.string().optional(),
      active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, password, ...rest } = data;
    const updateData: any = { ...rest };
    if (password && password.length > 0) updateData.password = encrypt(password);
    const user = await prisma.user.update({ where: { id }, data: updateData });
    await createAuditLog("system", "system", "update_user", user.username);
    broadcast("user:updated");
    return user;
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await prisma.user.delete({ where: { id: data.id } });
    await createAuditLog("system", "system", "delete_user", data.id);
    broadcast("user:updated");
    return { ok: true };
  });
