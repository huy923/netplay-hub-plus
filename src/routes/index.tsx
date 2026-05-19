import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, ShieldCheck, MonitorPlay, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/contexts/access";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { isLocalhost } = useAccess();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">CyberNet</span>
          </div>
          <div className="flex items-center gap-2">
            {isLocalhost && <Link to="/login"><Button variant="ghost">Đăng nhập</Button></Link>}
            {isLocalhost && <Link to="/admin"><Button>Vào hệ thống</Button></Link>}
            {!isLocalhost && <span className="text-xs text-muted-foreground">Giao diện khách</span>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              ● Phiên bản 1.0 — sẵn sàng cho quán net
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
              Quản lý quán net <span className="text-primary">gọn gàng</span>,
              khách chơi <span className="text-destructive">vui hơn</span>.
            </h1>
            <p className="mt-4 text-muted-foreground max-w-xl">
              Bộ đôi web Admin/Thu ngân và giao diện khách PC. Gọi đồ, gia hạn giờ, thanh toán QR — tất cả trong một hệ thống tiếng Việt rõ ràng.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isLocalhost && <Link to="/admin"><Button size="lg" className="bg-gradient-primary shadow-glow">Mở trang quản lý <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>}
              <Link to="/play"><Button size="lg" variant="outline">Giao diện khách (PC)</Button></Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl bg-gradient-surface shadow-card border p-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Đang dùng", v: "8", c: "text-primary" },
                  { l: "Trống", v: "3", c: "text-success" },
                  { l: "Lỗi", v: "1", c: "text-destructive" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-card p-4 border">
                    <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-card p-4 border">
                <div className="text-xs text-muted-foreground">Doanh thu hôm nay</div>
                <div className="font-display text-3xl font-bold text-primary mt-1">2.840.000₫</div>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            { i: ShieldCheck, t: "Phân quyền rõ ràng", d: "Admin và Thu ngân thấy đúng việc của mình." },
            { i: MonitorPlay, t: "Quản lý máy realtime", d: "Trạng thái, thời gian, gia hạn — một chạm." },
            { i: Gamepad2, t: "Khách tự gọi đồ trên PC", d: "Gọi đồ, gia hạn, thanh toán QR mà không gọi nhân viên." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.i className="h-5 w-5" />
              </div>
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
