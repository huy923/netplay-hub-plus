import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatVND } from "@/lib/mock-data";
import { type Customer } from "@/lib/cybernet-data";
import { useCybernetData } from "@/hooks/use-cybernet-data";
import { Plus, Search, Crown, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

function Customers() {
  const { data, mutate } = useCybernetData();
  const customers = data?.customers ?? [];
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.id} ${c.name} ${c.phone}`.toLowerCase().includes(q));
  }, [customers, keyword]);
  const openCreate = () => setEditing({ id: "", name: "", phone: "", visits: 0, total: 0, tier: "Thường" });
  const saveCustomer = async () => {
    if (!editing?.name.trim()) return;
    await mutate(editing.id ? "customer.update" : "customer.create", { ...editing });
    setEditing(null);
  };
  const removeCustomer = async (customer: Customer) => {
    if (window.confirm(`Xóa khách ${customer.name}?`)) await mutate("customer.delete", { id: customer.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">{customers.length} khách · {customers.filter(c=>c.tier==="VIP").length} VIP</p>
        </div>
        <Button className="bg-gradient-primary" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Thêm khách</Button>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo tên, SĐT, mã KH..." className="pl-9" />
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
                <th className="text-right py-2 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
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
                  <td className="py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeCustomer(c)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Sửa khách hàng" : "Thêm khách hàng"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Tên khách</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Số điện thoại</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Lượt chơi</Label><Input type="number" value={editing.visits} onChange={(e) => setEditing({ ...editing, visits: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Tổng chi</Label><Input type="number" value={editing.total} onChange={(e) => setEditing({ ...editing, total: Number(e.target.value) })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Hạng</Label><select value={editing.tier} onChange={(e) => setEditing({ ...editing, tier: e.target.value as Customer["tier"] })} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option>Thường</option><option>VIP</option></select></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button><Button className="bg-gradient-primary" onClick={saveCustomer}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
