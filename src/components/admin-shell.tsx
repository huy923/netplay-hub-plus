import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, MonitorPlay, Users, UtensilsCrossed, Receipt,
  BarChart3, Settings, Moon, Sun, LogOut, Gamepad2,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

const nav = [
  { to: "/admin", icon: LayoutDashboard, label: "Tổng quan" },
  { to: "/admin/machines", icon: MonitorPlay, label: "Máy" },
  { to: "/admin/pos", icon: Receipt, label: "Bán hàng (POS)" },
  { to: "/admin/menu", icon: UtensilsCrossed, label: "Dịch vụ" },
  { to: "/admin/customers", icon: Users, label: "Khách hàng" },
  { to: "/admin/reports", icon: BarChart3, label: "Báo cáo" },
  { to: "/admin/settings", icon: Settings, label: "Cấu hình" },
];

export function AdminShell() {
  const loc = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-semibold leading-tight">CyberNet</div>
            <div className="text-xs text-sidebar-foreground/60">Quản lý quán net</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/admin" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/85"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Link to="/play" className="block text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground px-3">
            → Mở giao diện khách (PC)
          </Link>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-medium">● Đang mở ca</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">Thu ngân: <b className="text-foreground">Nguyễn Linh</b></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Đổi theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-sm font-semibold">NL</div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
