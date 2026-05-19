import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { formatVND } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/reports")({ component: Reports });

const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const values = [1800, 2200, 1900, 2600, 3100, 4200, 3800];

function Reports() {
  const max = Math.max(...values);
  const total = values.reduce((a, b) => a + b, 0) * 1000;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Báo cáo</h1>
        <p className="text-sm text-muted-foreground">Tuần này · 12 – 18/05/2026</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><div className="text-sm text-muted-foreground">Tổng doanh thu</div><div className="font-display text-2xl font-bold text-primary mt-1">{formatVND(total)}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Số hóa đơn</div><div className="font-display text-2xl font-bold mt-1">218</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Giờ máy bán ra</div><div className="font-display text-2xl font-bold mt-1">412h</div></Card>
      </div>
      <Card className="p-5">
        <div className="font-semibold mb-4">Doanh thu theo ngày</div>
        <div className="flex items-end gap-3 h-56">
          {values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-medium">{(v/1000).toFixed(1)}M</div>
              <div className="w-full rounded-t-lg bg-gradient-primary shadow-glow transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%` }} />
              <div className="text-xs text-muted-foreground">{days[i]}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
