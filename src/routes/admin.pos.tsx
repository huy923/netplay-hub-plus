import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { menu, machines, formatVND } from "@/lib/mock-data";
import { Plus, Minus, Trash2, QrCode, Banknote, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin/pos")({ component: POS });

function POS() {
  const [cart, setCart] = useState<Record<string, number>>({ m1: 2, m4: 1 });
  const [machine, setMachine] = useState("3");
  const [hours, setHours] = useState(2);
  const [method, setMethod] = useState<"cash" | "qr" | "ewallet">("qr");

  const selectedMachine = machines.find((m) => m.id === machine)!;
  const items = useMemo(
    () => menu.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] })),
    [cart],
  );
  const foodTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const playTotal = selectedMachine.pricePerHour * hours;
  const total = foodTotal + playTotal;

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id: string) => setCart((c) => {
    const n = (c[id] || 0) - 1;
    const { [id]: _, ...rest } = c;
    return n <= 0 ? rest : { ...c, [id]: n };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bán hàng (POS)</h1>
        <p className="text-sm text-muted-foreground">Tạo hóa đơn — giờ chơi + đồ ăn</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Menu</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {menu.map((m) => (
                <button key={m.id} onClick={() => add(m.id)}
                  className="rounded-xl border p-3 text-left hover:border-primary hover:shadow-glow transition bg-card">
                  <div className="text-3xl">{m.emoji}</div>
                  <div className="mt-2 font-medium text-sm">{m.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{m.category}</span>
                    <span className="text-sm font-semibold text-primary">{formatVND(m.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4 h-fit sticky top-4">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Máy</div>
              <select value={machine} onChange={(e) => setMachine(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                {machines.map((m) => <option key={m.id} value={m.id}>{m.name} — {formatVND(m.pricePerHour)}/h</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Số giờ</div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setHours((h) => Math.max(1, h - 1))}><Minus className="h-4 w-4" /></Button>
                <div className="flex-1 text-center font-display text-xl font-bold">{hours}h</div>
                <Button size="icon" variant="outline" onClick={() => setHours((h) => h + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-2">Giỏ hàng</div>
              {items.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Chưa có món</div>}
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2">
                    <div className="text-xl">{i.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{formatVND(i.price)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => sub(i.id)} className="h-7 w-7 rounded border grid place-items-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center text-sm font-medium">{i.qty}</span>
                      <button onClick={() => add(i.id)} className="h-7 w-7 rounded border grid place-items-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => setCart((c) => { const { [i.id]: _, ...r } = c; return r; })} className="ml-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <Row label={`Giờ chơi (${hours}h)`} value={formatVND(playTotal)} />
              <Row label="Đồ ăn" value={formatVND(foodTotal)} />
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="font-semibold">Tổng cộng</span>
                <span className="font-display text-xl font-bold text-primary">{formatVND(total)}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">Phương thức</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: "cash", l: "Tiền mặt", i: Banknote },
                  { k: "qr", l: "QR Code", i: QrCode },
                  { k: "ewallet", l: "Ví ĐT", i: Wallet },
                ].map((p) => (
                  <button key={p.k} onClick={() => setMethod(p.k as any)}
                    className={`rounded-md border p-2 text-xs flex flex-col items-center gap-1 transition ${
                      method === p.k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}>
                    <p.i className="h-4 w-4" />{p.l}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full bg-gradient-primary shadow-glow" size="lg">Thanh toán {formatVND(total)}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
