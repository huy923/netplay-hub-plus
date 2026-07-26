import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { requireAdmin } from "@/lib/auth.server";

export const getAuditLogs = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().int().default(100) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: data.limit });
  });

export const getLoginAttempts = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().int().default(50) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    return prisma.loginAttempt.findMany({ orderBy: { createdAt: "desc" }, take: data.limit });
  });

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string(), data: z.string(), folder: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const buf = Buffer.from(data.data, "base64");
    const sanitized = data.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${sanitized}`;
    const sub = data.folder ? `/${data.folder}` : "";
    const filepath = `public/images${sub}/${filename}`;
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(`public/images${sub}`, { recursive: true });
    await writeFile(filepath, buf);
    return `/images${sub}/${filename}`;
  });
