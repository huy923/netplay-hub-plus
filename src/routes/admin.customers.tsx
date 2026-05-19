import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatVND } from "@/lib/mock-data";
import { Plus, Search, Crown } from "lucide-react";

export const Route = createFileRoute("/admin/customers")({
  beforeLoad: async () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (!isLocalhost) {
      throw redirect({ to: "/play" });
    }
  },
  component: Customers,
});

const customers = [
  { id: "KH001", name: "Nguyễn Văn A", phone: "0901234567", visits: 42, total: 1850000, tier: "VIP" },
  { id: "KH002", name: "Trần Minh", phone: "0912345678", visits: 28, total: 920000, tier: "VIP" },
  { id: "KH003", name: "Lê Hoa", phone: "0923456789", visits: 15, total: 480000, tier: "Thường" },
  { id: "KH004", name: "Phạm Đức", phone: "0934567890", visits: 9, total: 320000, tier: "Thường" },
  { id: "KH005", name: "Hoàng Sơn", phone: "0945678901", visits: 67, total: 3120000, tier: "VIP" },
];

function Customers() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">{customers.length} khách · {customers.filter(c=>c.tier==="VIP").length} VIP</p>
        </div>
        <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Thêm khách</Button>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm theo tên, SĐT, mã KH..." className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 font-medium">Mã</th>
                <th className="text-left py-2 font-medium">Khách hàng</th>
                <th className="text-left py-2 font-medium">SĐT</th>
                <th className="text-right py-2 font-medium">Lượt chơi</th>
                <th className="text-right py-2 font-medium">Tổng chi</th>
                <th className="text-left py-2 font-medium pl-4">Hạng</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-3 font-mono text-xs">{c.id}</td>
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3 text-muted-foreground">{c.phone}</td>
                  <td className="py-3 text-right">{c.visits}</td>
                  <td className="py-3 text-right font-semibold">{formatVND(c.total)}</td>
                  <td className="py-3 pl-4">
                    {c.tier === "VIP" ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                        <Crown className="h-3 w-3" /> VIP
                      </span>
                    ) : <span className="text-xs text-muted-foreground">Thường</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
