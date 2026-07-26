import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const EVENT_QUERY_MAP: Record<string, string[][]> = {
  "machine:updated": [["machines"]],
  "machine:created": [["machines"]],
  "machine:deleted": [["machines"]],
  "cursing:created": [["cursing-requests"]],
  "cursing:resolved": [["cursing-requests"]],
  "menu:updated": [["menu"], ["low-stock-items"], ["out-of-stock-items"]],
  "menu:created": [["menu"], ["low-stock-items"]],
  "menu:deleted": [["menu"]],
  "stock:updated": [["menu"], ["low-stock-items"], ["out-of-stock-items"]],
  "customer:updated": [["customers"]],
  "customer:created": [["customers"]],
  "invoice:created": [["invoices"]],
  "settings:updated": [["settings"]],
  "order:created": [["invoices"], ["notifications"]],
  "order:updated": [["invoices"]],
  "notification.created": [["notifications"]],
  "payment.created": [["payments"], ["notifications"]],
  "payment.success": [["payments"], ["transactions"]],
  "payment.refund": [["payments"], ["transactions"], ["notifications"]],
  "staff.request": [["staff-requests"], ["notifications"]],
  "invoice.claimed": [["staff-requests"], ["notifications"]],
};

export function useRealtime() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function connect() {
      const es = new EventSource("/api/sse");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const { type } = JSON.parse(event.data);
          const keys = EVENT_QUERY_MAP[type];
          if (keys) {
            keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
          }
        } catch {
          /* ignore parse errors */
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [queryClient]);
}
