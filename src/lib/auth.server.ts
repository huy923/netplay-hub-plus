import { SignJWT, jwtVerify } from "jose";
import { getRequest } from "@tanstack/react-start/server";
import { setCookie, deleteCookie } from "@tanstack/start-server-core";

const COOKIE_NAME = "__session";
const MACHINE_COOKIE = "__machine";

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

export function getTokenFromCookie(name: string = COOKIE_NAME): string | null {
  try {
    const req = getRequest();
    const cookie = req.headers.get("cookie");
    if (!cookie) return null;
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<Record<string, unknown>> {
  const raw = getTokenFromCookie(COOKIE_NAME);
  if (!raw) throw new Error("Unauthorized");
  const payload = await verifyToken(raw);
  if (!payload || payload.type !== "admin") throw new Error("Unauthorized");
  return payload;
}

export async function signMachineToken(machineId: string): Promise<string> {
  return signToken({ type: "machine", mid: machineId });
}

export type KioskAuth =
  | { kind: "admin"; payload: Record<string, unknown> }
  | { kind: "machine"; machineId: string };

export async function getKioskAuth(): Promise<KioskAuth | null> {
  const raw = getTokenFromCookie(COOKIE_NAME);
  if (raw) {
    const payload = await verifyToken(raw);
    if (payload && payload.type === "admin") return { kind: "admin", payload };
  }
  const mraw = getTokenFromCookie(MACHINE_COOKIE);
  if (mraw) {
    const payload = await verifyToken(mraw);
    if (payload && payload.type === "machine" && typeof payload.mid === "string") {
      return { kind: "machine", machineId: payload.mid };
    }
  }
  return null;
}

export async function requireKioskOrAdmin(): Promise<KioskAuth> {
  const auth = await getKioskAuth();
  if (!auth) throw new Error("Unauthorized");
  return auth;
}

function isHttps(): boolean {
  try {
    const req = getRequest();
    return req?.url.startsWith("https") ?? false;
  } catch {
    return false;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  setCookie(COOKIE_NAME, token, {
    path: "/",
    maxAge: 86400,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

export async function setMachineCookie(token: string): Promise<void> {
  setCookie(MACHINE_COOKIE, token, {
    path: "/",
    maxAge: 86400,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(),
  });
}
