import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCybernetData } from "@/hooks/use-cybernet-data";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/settings")({ component: Settings });

function Settings() {
  const { data, mutate } = useCybernetData();
  const [settings, setSettings] = useState(data?.settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data?.settings]);

  if (!settings) return <div className="text-sm text-muted-foreground">Đang tải cấu hình...</div>;

  const save = async () => {
    await mutate("settings.update", { ...settings });
    setSaved(true);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Cấu hình</h1>
        <p className="text-sm text-muted-foreground">Thông tin quán & giá tiền</p>
      </div>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Thông tin quán</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Tên quán</Label><Input value={settings.shopName} onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Số điện thoại</Label><Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Địa chỉ</Label><Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></div>
        </div>
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Giá tiền chuẩn</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Máy thường (₫/h)</Label><Input type="number" value={settings.standardPrice} onChange={(e) => setSettings({ ...settings, standardPrice: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Máy VIP (₫/h)</Label><Input type="number" value={settings.vipPrice} onChange={(e) => setSettings({ ...settings, vipPrice: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>PS5 (₫/h)</Label><Input type="number" value={settings.ps5Price} onChange={(e) => setSettings({ ...settings, ps5Price: Number(e.target.value) })} /></div>
        </div>
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Tùy chọn</h2>
        <div className="flex items-center justify-between"><span className="text-sm">Cảnh báo hết giờ 5 phút</span><Switch checked={settings.warnBeforeMinutes} onCheckedChange={(v) => setSettings({ ...settings, warnBeforeMinutes: v })} /></div>
        <div className="flex items-center justify-between"><span className="text-sm">Cho phép nhân viên gia hạn máy</span><Switch checked={settings.staffCanExtend} onCheckedChange={(v) => setSettings({ ...settings, staffCanExtend: v })} /></div>
        <div className="flex items-center justify-between"><span className="text-sm">Cho khách tự thanh toán QR trên PC</span><Switch checked={settings.customerQrPayment} onCheckedChange={(v) => setSettings({ ...settings, customerQrPayment: v })} /></div>
      </Card>
      <div className="flex items-center gap-2"><Button className="bg-gradient-primary" onClick={save}>Lưu thay đổi</Button><Button variant="outline" onClick={() => data?.settings && setSettings(data.settings)}>Hủy</Button>{saved && <span className="text-sm text-success">Đã lưu cấu hình.</span>}</div>
    </div>
  );
}
