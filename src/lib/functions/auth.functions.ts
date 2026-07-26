import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { decrypt } from "@/lib/encryption";
import { broadcast } from "@/lib/sse-events.server";
import { signToken, verifyToken, getTokenFromCookie } from "@/lib/auth.server";
import { getClientIP, isLocalIP } from "./_shared";

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ username: z.string().min(1), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const ip = getClientIP();
    const recentFails = await prisma.loginAttempt.count({
      where: { ip, success: false, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    if (recentFails >= 5)
      throw new Error("Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.");

    const user = await prisma.user.findUnique({ where: { username: data.username } });
    if (!user) {
      await prisma.loginAttempt.create({ data: { ip, username: data.username, success: false } });
      throw new Error("Sai tài khoản hoặc mật khẩu");
    }
    if (!user.active) throw new Error("Tài khoản đã bị vô hiệu hóa");
    if (user.role === "admin" && !isLocalIP(ip)) {
      await prisma.loginAttempt.create({ data: { ip, username: data.username, success: false } });
      throw new Error("Tài khoản Admin chỉ có thể đăng nhập từ localhost");
    }
    const decrypted = decrypt(user.password);
    if (decrypted !== data.password) {
      await prisma.loginAttempt.create({ data: { ip, username: data.username, success: false } });
      throw new Error("Sai tài khoản hoặc mật khẩu");
    }
    await prisma.loginAttempt.create({ data: { ip, username: data.username, success: true } });
    const token = await signToken({
      type: "admin",
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const raw = getTokenFromCookie();
  if (!raw) return null;
  const payload = await verifyToken(raw);
  if (!payload || payload.type !== "admin") return null;
  return {
    id: payload.sub as string,
    username: payload.username as string,
    role: payload.role as string,
  };
});

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  broadcast("user:logout");
  return { ok: true };
});
