import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/cybernet.functions";

export const Route = createFileRoute("/")({
  component: RedirectHandler,
});

function RedirectHandler() {
  const nav = useNavigate();
  const checkUser = useServerFn(getCurrentUser);
  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocal) {
      checkUser().then((u) => {
        if (u) nav({ to: "/admin" });
        else nav({ to: "/login" });
      });
    } else {
      nav({ to: "/play" });
    }
  }, []);
  return null;
}
