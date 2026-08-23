import { getRequest } from "@tanstack/react-start/server";
import { prisma } from "@/lib/prisma.server";
import { decrypt } from "@/lib/encryption";

export function isEncryptedValue(val: string): boolean {
  if (!val.includes(":")) return false;
  const [a, b] = val.split(":");
  return !!a && !!b && /^[0-9a-f]+$/i.test(a) && /^[0-9a-f]+$/i.test(b);
}

export async function getDecryptedSettings(): Promise<Record<string, string>> {
  const all = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of all) {
    if (isEncryptedValue(s.value)) {
      try {
        map[s.key] = decrypt(s.value);
      } catch {
        map[s.key] = s.value;
      }
    } else {
      map[s.key] = s.value;
    }
  }
  return map;
}

export function getClientIP(): string {
  try {
    const req = getRequest();
    if (!req) return "unknown";
    const cf = req.headers.get("cf-connecting-ip");
    if (cf) return cf;
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    const realIP = req.headers.get("x-real-ip");
    if (realIP) return realIP;
    return "unknown";
  } catch {
    return "unknown";
  }
}

function isPrivateIP(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const parts = v4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

export function isLocalIP(ip: string): boolean {
  if (ip === "unknown") return true;
  return isPrivateIP(ip);
}

export async function deleteImageFile(imagePath: string | null) {
  if (!imagePath) return;
  const { unlink } = await import("node:fs/promises");
  const filepath = `public${imagePath}`;
  try {
    await unlink(filepath);
  } catch {
    // Best-effort cleanup — file may already be gone
  }
}

export async function createAuditLog(
  userId: string,
  username: string,
  action: string,
  target?: string,
  details?: string,
) {
  try {
    const ip = getClientIP();
    await prisma.auditLog.create({ data: { userId, username, action, target, details, ip } });
  } catch {
    // Never let audit logging break the main operation
  }
}
