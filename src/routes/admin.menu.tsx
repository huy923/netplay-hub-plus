import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { menu, formatVND } from "@/lib/mock-data";
import { Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/menu")({
  beforeLoad: async () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (!isLocalhost) {
      throw redirect({ to: "/play" });
    }
  },
  component: Menu,
});

function Menu() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dịch vụ bán kèm</h1>
          <p className="text-sm text-muted-foreground">{menu.length} món · 3 nhóm</p>
        </div>
        <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Thêm món</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {menu.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="text-4xl">{m.emoji}</div>
            <div className="mt-2 font-semibold">{m.name}</div>
            <div className="text-xs text-muted-foreground">{m.category}</div>
            <div className="flex items-center justify-between mt-3">
              <span className="font-display text-lg font-bold text-primary">{formatVND(m.price)}</span>
              <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
