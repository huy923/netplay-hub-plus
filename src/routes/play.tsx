import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { menu, formatVND } from "@/lib/mock-data";
import { UtensilsCrossed, Clock, User, Bell, X, Plus, Minus, QrCode, Gamepad2, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/play")({ component: PlayerHome });

type Tab = "home" | "food" | "extend" | "account";

function PlayerHome() {
  const [tab, setTab] = useState<Tab>("home");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(3 * 3600 + 24 * 60 + 12); // seconds
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top status bar */}
      <header className="bg-gradient-primary text-primary-foreground shadow-glow">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs opacity-80">Bạn đang chơi tại</div>
              <div className="font-display text-xl font-bold">Máy 15 · Khu VIP</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs opacity-80">Thời gian còn lại</div>
              <div className="font-mono text-2xl font-bold tabular-nums">{hh}:{mm}:{ss}</div>
            </div>
            <button onClick={toggle} className="h-10 w-10 rounded-lg bg-white/15 hover:bg-white/25 grid place-items-center">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b bg-card sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 flex gap-1 overflow-x-auto">
          {[
            { k: "home", l: "Trang chủ", i: Sparkles },
            { k: "food", l: "Gọi đồ ăn", i: UtensilsCrossed, badge: cartCount },
            { k: "extend", l: "Gia hạn giờ", i: Clock },
            { k: "account", l: "Tài khoản", i: User },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as Tab)}
              className={`relative px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <t.i className="h-4 w-4" />{t.l}
              {t.badge ? <span className="ml-1 grid h-5 min-w-5 px-1 place-items-center rounded-full bg-destructive text-destructive-foreground text-xs">{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {tab === "home" && <Home onTab={setTab} />}
        {tab === "food" && <Food cart={cart} setCart={setCart} />}
        {tab === "extend" && <Extend remaining={remaining} setRemaining={setRemaining} />}
        {tab === "account" && <Account />}
      </main>
    </div>
  );
}

function Home({ onTab }: { onTab: (t: Tab) => void }) {
  const actions = [
    { k: "food", l: "Gọi đồ ăn", d: "Đồ uống, đồ ăn vặt, combo", i: UtensilsCrossed, tone: "destructive" },
    { k: "extend", l: "Gia hạn giờ", d: "+1h, +2h hoặc combo", i: Clock, tone: "primary" },
    { k: "account", l: "Tài khoản", d: "Lịch sử & VIP", i: User, tone: "info" },
  ] as const;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Xin chào, <span className="text-primary">Nguyễn Văn A</span> 👋</h1>
        <p className="text-muted-foreground mt-1">Chúc bạn chơi game vui vẻ!</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a) => (
          <button key={a.k} onClick={() => onTab(a.k as Tab)}
            className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-left hover:shadow-glow hover:-translate-y-0.5 transition shadow-card">
            <div className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-glow"
              style={{ background: `linear-gradient(135deg, var(--${a.tone}), var(--primary))` }}>
              <a.i className="h-6 w-6" />
            </div>
            <div className="font-display text-xl font-bold mt-4">{a.l}</div>
            <div className="text-sm text-muted-foreground">{a.d}</div>
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-10 group-hover:opacity-20 transition" style={{ background: `var(--${a.tone})` }} />
          </button>
        ))}
      </div>

      <Card className="p-5 bg-gradient-surface">
        <div className="flex items-center gap-2 mb-3"><Bell className="h-4 w-4 text-warning" /><h3 className="font-semibold">Khuyến mãi hôm nay</h3></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border p-4">
            <div className="text-sm font-semibold">🎮 Cuối tuần giảm 30% giờ chơi VIP</div>
            <div className="text-xs text-muted-foreground mt-1">Áp dụng thứ 7 & CN, 14h–18h</div>
          </div>
          <div className="rounded-xl bg-card border p-4">
            <div className="text-sm font-semibold">🍟 Combo Game Thủ -10k</div>
            <div className="text-xs text-muted-foreground mt-1">Mì + Pepsi + Khoai tây = 55k → 45k</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Food({ cart, setCart }: { cart: Record<string, number>; setCart: (c: Record<string, number>) => void }) {
  const items = menu.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const add = (id: string) => setCart({ ...cart, [id]: (cart[id] || 0) + 1 });
  const sub = (id: string) => {
    const n = (cart[id] || 0) - 1;
    const { [id]: _, ...rest } = cart;
    setCart(n <= 0 ? rest : { ...cart, [id]: n });
  };
  const [sent, setSent] = useState(false);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Thực đơn</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {menu.map((m) => (
            <Card key={m.id} className="p-4 hover:shadow-glow hover:border-primary transition">
              <div className="text-5xl text-center">{m.emoji}</div>
              <div className="mt-3 font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.category}</div>
              <div className="flex items-center justify-between mt-3">
                <div className="font-display font-bold text-primary">{formatVND(m.price)}</div>
                {cart[m.id] ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => sub(m.id)} className="h-7 w-7 rounded border grid place-items-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center font-medium">{cart[m.id]}</span>
                    <button onClick={() => add(m.id)} className="h-7 w-7 rounded border grid place-items-center"><Plus className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => add(m.id)}>Thêm</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5 h-fit lg:sticky lg:top-20">
        <h3 className="font-display text-lg font-bold mb-3">Giỏ hàng</h3>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">Hãy chọn món bạn thích nhé 🍕</div>
        ) : (
          <>
            <div className="space-y-3 max-h-72 overflow-auto">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3">
                  <div className="text-2xl">{i.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{formatVND(i.price)} × {i.qty}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatVND(i.price * i.qty)}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t mt-4 pt-3">
              <span className="font-semibold">Tổng</span>
              <span className="font-display text-xl font-bold text-primary">{formatVND(total)}</span>
            </div>
            <div className="space-y-2 mt-4">
              <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" size="lg" onClick={() => setSent(true)}>
                Gửi yêu cầu
              </Button>
              <Button variant="outline" className="w-full" size="lg"><QrCode className="h-4 w-4 mr-2" />Gửi & thanh toán QR</Button>
            </div>
          </>
        )}
        {sent && (
          <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4" onClick={() => setSent(false)}>
            <Card className="p-6 max-w-sm relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSent(false)} className="absolute top-3 right-3"><X className="h-4 w-4" /></button>
              <div className="text-5xl text-center">✅</div>
              <div className="font-display text-xl font-bold text-center mt-3">Đã gửi yêu cầu</div>
              <div className="text-sm text-muted-foreground text-center mt-1">Nhân viên sẽ phục vụ bạn trong ít phút.</div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}

function Extend({ remaining, setRemaining }: { remaining: number; setRemaining: (n: number) => void }) {
  const packs = [
    { id: "1h", label: "+1 giờ", price: 15000, sub: "Tiếp tục chơi 1h" },
    { id: "2h", label: "+2 giờ", price: 28000, sub: "Tiết kiệm 2k", highlight: true },
    { id: "3h", label: "+3 giờ", price: 40000, sub: "Tiết kiệm 5k" },
    { id: "combo", label: "Combo Ăn + Chơi 3h", price: 80000, sub: "Mì + nước + 3h" },
  ];
  const [picked, setPicked] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const pick = packs.find((p) => p.id === picked);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-2">Gia hạn giờ chơi</h2>
      <p className="text-muted-foreground mb-6">Còn lại: <span className="font-mono font-semibold text-primary">{Math.floor(remaining/3600)}h {Math.floor((remaining%3600)/60)}'</span></p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packs.map((p) => (
          <button key={p.id} onClick={() => setPicked(p.id)}
            className={`text-left rounded-2xl border p-5 transition relative ${
              picked === p.id ? "border-primary shadow-glow bg-primary/5" : "hover:border-primary/50 bg-card"
            }`}>
            {p.highlight && <span className="absolute -top-2 right-3 text-xs px-2 py-0.5 rounded-full bg-warning text-warning-foreground font-medium">Phổ biến</span>}
            <div className="font-display text-2xl font-bold">{p.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{p.sub}</div>
            <div className="mt-3 font-display text-xl font-bold text-primary">{formatVND(p.price)}</div>
          </button>
        ))}
      </div>

      {pick && (
        <Card className="mt-6 p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Đã chọn</div>
            <div className="font-semibold">{pick.label} — {formatVND(pick.price)}</div>
          </div>
          <Button size="lg" className="bg-gradient-primary shadow-glow" onClick={() => setPaying(true)}>
            <QrCode className="h-4 w-4 mr-2" />Gia hạn & thanh toán QR
          </Button>
        </Card>
      )}

      {paying && pick && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={() => setPaying(false)}>
          <Card className="p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="font-display text-lg font-bold">Quét mã để thanh toán</div>
              <div className="text-sm text-muted-foreground">{pick.label} · {formatVND(pick.price)}</div>
            </div>
            <div className="mt-4 mx-auto h-48 w-48 grid place-items-center rounded-xl bg-foreground text-background">
              <QrCode className="h-32 w-32" />
            </div>
            <Button className="w-full mt-4 bg-gradient-primary" onClick={() => {
              const add = pick.id === "1h" ? 3600 : pick.id === "2h" ? 7200 : 10800;
              setRemaining(remaining + add); setPaying(false); setPicked(null);
            }}>Xác nhận đã thanh toán</Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function Account() {
  const history = [
    { d: "Hôm nay 13:20", a: "Chơi 2h Máy 15", v: 30000 },
    { d: "Hôm qua 19:00", a: "Combo Game Thủ", v: 55000 },
    { d: "16/05 14:30", a: "Gia hạn +1h", v: 15000 },
    { d: "15/05 20:15", a: "Mì tôm trứng × 2", v: 50000 },
  ];
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <Card className="p-6 bg-gradient-surface">
        <div className="h-20 w-20 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-display text-2xl font-bold shadow-glow">A</div>
        <div className="mt-4 font-display text-xl font-bold">Nguyễn Văn A</div>
        <div className="text-sm text-muted-foreground">KH001 · 0901 234 567</div>
        <div className="mt-4 rounded-xl bg-warning/15 text-warning p-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <div className="text-sm font-semibold">Thành viên VIP</div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Tổng giờ chơi</span><b>142h</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Số dư tài khoản</span><b className="text-primary">{formatVND(85000)}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Điểm tích lũy</span><b>320 ⭐</b></div>
        </div>
        <Button className="w-full mt-4 bg-gradient-primary"><QrCode className="h-4 w-4 mr-2" />Nạp thêm tiền</Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-lg font-bold mb-4">Lịch sử giao dịch</h3>
        <div className="divide-y">
          {history.map((h, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{h.a}</div>
                <div className="text-xs text-muted-foreground">{h.d}</div>
              </div>
              <div className="font-semibold">{formatVND(h.v)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
