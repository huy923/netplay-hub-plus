// Production Node server for the Docker/self-host path.
// Serves the built static client from dist/client and forwards everything else
// to the TanStack Start server handler (dist/server/server.js).
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.PORT || 8080);
const CLIENT_DIR = new URL("./dist/client/", import.meta.url).pathname;
const { default: server } = await import("./dist/server/server.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(CLIENT_DIR, rel));
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403).end();
    return true;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;
  res.writeHead(200, {
    "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
    "cache-control": pathname === "/" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(res);
  return true;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if ((req.method === "GET" || req.method === "HEAD") && serveStatic(req, res, url.pathname)) {
      return;
    }

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    }

    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = Readable.toWeb(req);
    }

    const response = await server.fetch(
      new Request(url, { method: req.method, headers, body, duplex: "half" }),
      { ...process.env },
      {},
    );

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) res.setHeader("set-cookie", cookies);
    res.writeHead(response.status);
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Internal Server Error");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`CyberNet listening on http://0.0.0.0:${PORT}`);
});
