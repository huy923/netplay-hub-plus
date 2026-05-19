import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (!isLocalhost) {
      throw redirect({ to: "/play" });
    }
  },
  component: AdminShell,
});
