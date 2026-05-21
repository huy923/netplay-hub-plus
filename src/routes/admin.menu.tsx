import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatVND, type MenuItem } from "@/lib/mock-data";
import { useCybernetData } from "@/hooks/use-cybernet-data";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/menu")({ component: Menu });

function Menu() {
  const { data, mutate } = useCybernetData();
  const menu = data?.menu ?? [];
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const openCreate = () => setEditing({ id: "", name: "", category: "Đồ uống", price: 12000, emoji: "🥤" });
  const saveItem = async () => {
    if (!editing?.name.trim()) return;
    await mutate(editing.id ? "menu.update" : "menu.create", { ...editing });
    setEditing(null);
  };
  const removeItem = async (item: MenuItem) => {
    if (window.confirm(`Xóa ${item.name}?`)) await mutate("menu.delete", { id: item.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dịch vụ bán kèm</h1>
          <p className="text-sm text-muted-foreground">{menu.length} món · 3 nhóm</p>
        </div>
        <Button className="bg-gradient-primary" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Thêm món</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {menu.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="text-4xl">{m.emoji}</div>
            <div className="mt-2 font-semibold">{m.name}</div>
            <div className="text-xs text-muted-foreground">{m.category}</div>
            <div className="flex items-center justify-between mt-3">
              <span className="font-display text-lg font-bold text-primary">{formatVND(m.price)}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeItem(m)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Sửa món" : "Thêm món"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-[90px_1fr]">
              <div className="space-y-1.5"><Label>Emoji</Label><Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Tên món</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Nhóm</Label><select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as MenuItem["category"] })} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option>Đồ uống</option><option>Ăn vặt</option><option>Combo</option></select></div>
              <div className="space-y-1.5"><Label>Giá</Label><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button><Button className="bg-gradient-primary" onClick={saveItem}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
