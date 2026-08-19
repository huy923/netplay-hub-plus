// Node production build (Docker self-host). Cloudflare plugin is build-only and
// targets Workers; this config produces a plain Node server bundle instead.
// CF deploy path (npm run build + wrangler) is unchanged.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
});
