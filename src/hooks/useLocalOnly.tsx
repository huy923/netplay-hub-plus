import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

/**
 * Hook that redirects the user away from the page if the app is accessed
 * from a non‑local host (i.e., not "localhost" or "127.0.0.1").
 *
 * Use it in any admin‑only route component:
 *   useLocalOnly();
 * for example, in src/routes/admin.tsx. This ensures that the admin interface
 * is only accessible when running the app locally, and not from a deployed environment.
 */
export function useLocalOnly() {
  const navigate = useNavigate();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (!isLocal) {
      // Redirect to the root page (or any public page you prefer)
      navigate({
        to: "/",
      });
    }
  }, [navigate]);
}
