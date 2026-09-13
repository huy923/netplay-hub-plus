import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { encrypt, verifyPassword, hashPassword } from "@/lib/encryption";
import { broadcast } from "@/lib/sse-events.server";
import { requireAdmin } from "@/lib/auth.server";
import { getDecryptedSettings } from "./_shared";

const ENCRYPTED_KEYS = new Set([
  "admin_password",
  "bank_account_no",
  "bank_account_holder",
  "vietqr_api_key",
]);

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getDecryptedSettings();
});

export const updateSettings = createServerFn({ method: "POST" })
  .validator(z.record(z.string(), z.string()))
  .handler(async ({ data }: { data: Record<string, string> }) => {
    await requireAdmin();
    for (const [key, value] of Object.entries(data)) {
      const shouldEncrypt = ENCRYPTED_KEYS.has(key);
      const storeValue = shouldEncrypt ? encrypt(value) : value;
      await prisma.setting.upsert({
        where: { key },
        create: {
          key,
          value: storeValue,
          category: key.startsWith("bank_")
            ? "bank"
            : key === "admin_password"
              ? "security"
              : "general",
        },
        update: { value: storeValue },
      });
    }
    broadcast("settings:updated");
    return { ok: true };
  });

export const changeAdminPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const map = await getDecryptedSettings();
    const currentHash = map.admin_password;
    if (!currentHash) {
      throw new Error("Chưa thiết lập mật khẩu admin");
    }
    const valid = await verifyPassword(data.currentPassword, currentHash);
    if (!valid) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }
    const newHash = await hashPassword(data.newPassword);
    const encrypted = encrypt(newHash);
    await prisma.setting.upsert({
      where: { key: "admin_password" },
      create: {
        key: "admin_password",
        value: encrypted,
        category: "security",
      },
      update: { value: encrypted },
    });
    broadcast("settings:updated");
    return { ok: true };
  });

export const verifySettingsPassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const map = await getDecryptedSettings();
    const hash = map.admin_password;
    if (!hash) return { ok: true, noPassword: true };
    const valid = await verifyPassword(data.password, hash);
    if (!valid) throw new Error("Mật khẩu không đúng");
    return { ok: true, noPassword: false };
  });
