import { SignJWT, jwtVerify } from "jose";
import { getRequest } from "@tanstack/react-start/server";

const COOKIE_NAME = "__session";

function getJWTSecret(): Uint8Array {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("Missing ENCRYPTION_KEY in .env");
  const bytes = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16));
  if (!bytes || bytes.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes hex");
  return new Uint8Array(bytes);
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJWTSecret());
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenFromCookie(): string | null {
  try {
    const req = getRequest();
    const cookie = req.headers.get("cookie");
    if (!cookie) return null;
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<Record<string, unknown>> {
  const raw = getTokenFromCookie();
  if (!raw) throw new Error("Unauthorized");
  const payload = await verifyToken(raw);
  if (!payload || payload.type !== "admin") throw new Error("Unauthorized");
  return payload;
}
