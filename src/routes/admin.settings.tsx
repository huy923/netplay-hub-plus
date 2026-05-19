import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: async () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (!isLocalhost) {
      throw redirect({ to: "/play" });
    }
  },
  component: Settings,
});

function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Cấu hình</h1>
        <p className="text-sm text-muted-foreground">Thông tin quán & giá tiền</p>
      </div>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Thông tin quán</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Tên quán</Label><Input defaultValue="CyberNet Gaming Hub" /></div>
          <div className="space-y-1.5"><Label>Số điện thoại</Label><Input defaultValue="0901 234 567" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Địa chỉ</Label><Input defaultValue="123 Nguyễn Trãi, Q.1, TP.HCM" /></div>
        </div>
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Giá tiền chuẩn</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Máy thường (₫/h)</Label><Input defaultValue="8000" /></div>
          <div className="space-y-1.5"><Label>Máy VIP (₫/h)</Label><Input defaultValue="15000" /></div>
          <div className="space-y-1.5"><Label>PS5 (₫/h)</Label><Input defaultValue="20000" /></div>
        </div>
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Tùy chọn</h2>
        {[
          ["Cảnh báo hết giờ 5 phút", true],
          ["Cho phép nhân viên gia hạn máy", true],
          ["Cho khách tự thanh toán QR trên PC", false],
        ].map(([l, v]) => (
          <div key={l as string} className="flex items-center justify-between">
            <span className="text-sm">{l}</span>
            <Switch defaultChecked={v as boolean} />
          </div>
        ))}
      </Card>
      <div className="flex gap-2"><Button className="bg-gradient-primary" >Lưu thay đổi</Button><Button variant="outline">Hủy</Button></div>
    </div>
  );
}
