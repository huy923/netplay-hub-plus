import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { machines, invoices, formatVND } from "@/lib/mock-data";
import { TrendingUp, MonitorPlay, Users, Coffee, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (!isLocalhost) {
      throw redirect({ to: "/play" });
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const inUse = machines.filter((m) => m.status === "in_use").length;
  const idle = machines.filter((m) => m.status === "idle").length;
  const maint = machines.filter((m) => m.status === "maintenance").length;

  const stats = [
    { label: "Doanh thu hôm nay", value: formatVND(2840000), icon: TrendingUp, tone: "primary", sub: "+12% so với hôm qua" },
    { label: "Máy đang dùng", value: `${inUse}/${machines.length}`, icon: MonitorPlay, tone: "info", sub: `${idle} trống · ${maint} lỗi` },
    { label: "Khách đang chơi", value: "9", icon: Users, tone: "success", sub: "3 khách VIP" },
    { label: "Đơn đồ ăn", value: "14", icon: Coffee, tone: "warning", sub: "2 đơn đang chờ" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Cập nhật lúc 14:32 — Thứ ba, 19/05/2026</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 shadow-card border-l-4" style={{ borderLeftColor: `var(--${s.tone})` }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="font-display text-2xl font-bold mt-1">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, var(--${s.tone}) 15%, transparent)`, color: `var(--${s.tone})` }}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Hóa đơn gần đây</h2>
            <span className="text-xs text-muted-foreground">Ca hiện tại · Nguyễn Linh</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 font-medium">Mã</th>
                  <th className="text-left py-2 font-medium">Máy</th>
                  <th className="text-left py-2 font-medium">Khách</th>
                  <th className="text-right py-2 font-medium">Tiền</th>
                  <th className="text-left py-2 font-medium pl-4">Phương thức</th>
                  <th className="text-left py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-3 font-mono text-xs">{i.id}</td>
                    <td className="py-3">{i.machine}</td>
                    <td className="py-3 text-muted-foreground">{i.customer}</td>
                    <td className="py-3 text-right font-semibold">{formatVND(i.amount)}</td>
                    <td className="py-3 pl-4">{i.method}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        i.status === "Đã thanh toán" ? "bg-success/15 text-success" :
                        i.status === "Chờ" ? "bg-warning/20 text-warning" : "bg-destructive/15 text-destructive"
                      }`}>{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-semibold">Cảnh báo</h2>
          </div>
          <div className="space-y-3">
            {[
              { t: "Máy 03 sắp hết giờ", d: "Còn 12 phút", tone: "warning" },
              { t: "Máy 04 cần bảo trì", d: "Lỗi mạng từ 11:30", tone: "destructive" },
              { t: "PS5 01 đơn chờ XN", d: "Combo Game Thủ ×1", tone: "info" },
              { t: "VIP 03 còn 45'", d: "Đề xuất nhắc khách", tone: "primary" },
            ].map((a, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
                <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: `var(--${a.tone})` }} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
