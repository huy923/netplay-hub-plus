import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/admin")({ component: AdminRoute });

function AdminRoute() {
  const nav = useNavigate();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (!isLocal) nav({ to: "/play" });
  }, []);

  return <AdminShell />;
}
