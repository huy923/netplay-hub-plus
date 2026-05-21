import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatVND, type Machine, type MachineStatus } from "@/lib/mock-data";
import { useCybernetData } from "@/hooks/use-cybernet-data";
import { Plus, Wrench, Clock, User, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/machines")({ component: Machines });

const statusMeta: Record<MachineStatus, { label: string; tone: string }> = {
  in_use: { label: "Đang dùng", tone: "primary" },
  idle: { label: "Trống", tone: "success" },
  maintenance: { label: "Bảo trì", tone: "destructive" },
};

function Machines() {
  const { data, mutate } = useCybernetData();
  const machines = data?.machines ?? [];
  const [filter, setFilter] = useState<"all" | MachineStatus>("all");
  const [editing, setEditing] = useState<Machine | null>(null);
  const list = machines.filter((m) => filter === "all" || m.status === filter);

  const openCreate = () => setEditing({ id: "", name: "", area: "Thường", status: "idle", pricePerHour: data?.settings.standardPrice ?? 8000 });
  const saveMachine = async () => {
    if (!editing?.name.trim()) return;
    await mutate(editing.id ? "machine.update" : "machine.create", { ...editing });
    setEditing(null);
  };
  const removeMachine = async (machine: Machine) => {
    if (window.confirm(`Xóa ${machine.name}?`)) await mutate("machine.delete", { id: machine.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Quản lý máy</h1>
          <p className="text-sm text-muted-foreground">{machines.length} máy · {machines.filter(m=>m.status==="in_use").length} đang dùng</p>
        </div>
        <Button className="bg-gradient-primary" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Thêm máy</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { k: "all", l: "Tất cả" },
          { k: "in_use", l: "Đang dùng" },
          { k: "idle", l: "Trống" },
          { k: "maintenance", l: "Bảo trì" },
        ] as const).map((t) => (
          <button
            key={t.k} onClick={() => setFilter(t.k)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              filter === t.k ? "bg-primary text-primary-foreground border-primary shadow-glow" : "bg-card hover:bg-muted"
            }`}
          >{t.l}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {list.map((m) => {
          const s = statusMeta[m.status];
          return (
            <Card key={m.id} className="p-4 shadow-card hover:shadow-glow transition group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-bold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.area} · {formatVND(m.pricePerHour)}/h</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `color-mix(in oklab, var(--${s.tone}) 15%, transparent)`, color: `var(--${s.tone})` }}>
                  ● {s.label}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(m)}><Pencil className="h-3.5 w-3.5" />Sửa</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeMachine(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>

              {m.status === "in_use" && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><User className="h-3.5 w-3.5" />{m.customer}</div>
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /><span className="font-mono font-semibold">{m.remaining}</span> còn lại</div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => mutate("machine.extend", { id: m.id, hours: 1 })}>+1h</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => mutate("machine.end", { id: m.id })}>Kết thúc</Button>
                  </div>
                </div>
              )}
              {m.status === "idle" && (
                <Button size="sm" className="w-full mt-4 bg-gradient-primary" onClick={() => mutate("machine.start", { id: m.id })}>Cấp máy</Button>
              )}
              {m.status === "maintenance" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                  <Wrench className="h-4 w-4" /> Đang bảo trì
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Sửa máy" : "Thêm máy"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Tên máy</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Máy 13" /></div>
              <div className="space-y-1.5"><Label>Khu vực</Label><select value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value as Machine["area"] })} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option>Thường</option><option>VIP</option><option>PS5</option></select></div>
              <div className="space-y-1.5"><Label>Trạng thái</Label><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as MachineStatus })} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="idle">Trống</option><option value="in_use">Đang dùng</option><option value="maintenance">Bảo trì</option></select></div>
              <div className="space-y-1.5"><Label>Giá/giờ</Label><Input type="number" value={editing.pricePerHour} onChange={(e) => setEditing({ ...editing, pricePerHour: Number(e.target.value) })} /></div>
              {editing.status === "in_use" && <div className="space-y-1.5 sm:col-span-2"><Label>Khách đang chơi</Label><Input value={editing.customer ?? ""} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} placeholder="Khách vãng lai" /></div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button><Button className="bg-gradient-primary" onClick={saveMachine}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
