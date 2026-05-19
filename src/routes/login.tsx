import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const [role, setRole] = useState<"admin" | "staff">("admin");
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground"><Gamepad2 className="h-5 w-5" /></div>
          <span className="font-display text-lg font-semibold">CyberNet</span>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold">Chào mừng trở lại 👋</h2>
          <p className="mt-2 text-sidebar-foreground/70 max-w-sm">Đăng nhập để mở ca làm việc, quản lý máy và phục vụ khách hàng nhanh chóng.</p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© CyberNet 2026</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); nav({ to: "/admin" }); }}
          className="w-full max-w-sm space-y-5"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">Đăng nhập</h1>
            <p className="text-sm text-muted-foreground">Dùng tài khoản nhân viên của bạn</p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
            {(["admin", "staff"] as const).map((r) => (
              <button
                key={r} type="button" onClick={() => setRole(r)}
                className={`text-sm py-2 rounded-md transition ${role === r ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {r === "admin" ? "Admin" : "Nhân viên"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Mã nhân viên</Label>
            <Input placeholder="NV001" defaultValue="NV001" />
          </div>
          <div className="space-y-2">
            <Label>Mật khẩu</Label>
            <Input type="password" placeholder="••••••••" defaultValue="123456" />
          </div>

          <Button type="submit" className="w-full bg-gradient-primary shadow-glow">Đăng nhập</Button>
          <div className="text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">← Về trang chủ</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
