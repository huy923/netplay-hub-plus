import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import {
  getMachineByIP,
  listMenu,
  listCombos,
  createFoodOrder,
  createPayment,
  createNotification,
  createCursingRequest,
  updateMachine,
  getOrdersByMachine,
  updateOrderStatus,
  getCustomerByName,
} from "@/lib/cybernet.functions";
import {
  Clock,
  Coffee,
  Sandwich,
  Minus,
  Plus,
  QrCode,
  Gamepad2,
  Sparkles,
  Zap,
  History,
  Star,
  ChevronRight,
  Bell,
  X,
  Loader2,
  Monitor,
  Send,
  CheckCircle2,
} from "lucide-react";
import QRPaymentDialog from "@/components/payment/qr-payment";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Monitor as MonitorIcon } from "lucide-react";

export const Route = createFileRoute("/play")({ component: PlayerHome });

type Tab = "home" | "food" | "extend" | "pay" | "account";

function parseTime(t: string): number {
  const p = t.split(":");
  return p.length === 2 ? parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 : 0;
}

function PlayerHome() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const { theme, toggle } = useTheme();

  const getMachineFn = useServerFn(getMachineByIP);
  const listMenuFn = useServerFn(listMenu);
  const createOrderFn = useServerFn(createFoodOrder);
  const makePaymentFn = useServerFn(createPayment);
  const makeNotificationFn = useServerFn(createNotification);
  const updateMachineFn = useServerFn(updateMachine);

  const {
    data: machine,
    isLoading: loadingMachine,
    error: machineError,
  } = useQuery({
    queryKey: ["play-machine"],
    queryFn: () => getMachineFn(),
    retry: false,
    refetchInterval: 30000,
  });

  const { data: menu = [] } = useQuery({
    queryKey: ["play-menu"],
    queryFn: () => listMenuFn(),
  });

  const getOrdersFn = useServerFn(getOrdersByMachine);
  const { data: allOrders = [] } = useQuery({
    queryKey: ["play-active-orders", machine?.name],
    queryFn: () => getOrdersFn({ data: { machineName: machine!.name } }),
    enabled: !!machine,
    refetchInterval: 10000,
  });

  const pendingFoodOrders = (allOrders as any[]).filter(
    (o: any) => o.status === "Chờ xử lý" || o.status === "Đang chuẩn bị" || o.status === "Đã giao",
  );
  const foodAmount = pendingFoodOrders.reduce(
    (sum: number, o: any) => sum + o.amount,
    0,
  );

  const groupedFood: Record<string, { qty: number; total: number }> = {};
  for (const order of pendingFoodOrders) {
    for (const item of order.items || []) {
      if (!groupedFood[item.name]) groupedFood[item.name] = { qty: 0, total: 0 };
      groupedFood[item.name].qty += item.qty;
      groupedFood[item.name].total += item.price * item.qty;
    }
  }
  const foodItems = Object.entries(groupedFood);

  const getCustomerFn = useServerFn(getCustomerByName);
  const [custObj, setCustObj] = useState<any>(null);

  useEffect(() => {
    if (!machine?.customer || machine.customer === "Khách vãng lai") {
      setCustObj(null);
      return;
    }
    const raw: any = machine.customer;
    const name = typeof raw === "object" && raw ? raw.name : typeof raw === "string" ? (() => { try { return JSON.parse(raw).name; } catch { return raw; } })() : undefined;
    if (name) {
      getCustomerFn({ data: { name } }).then((c: any) => setCustObj(c)).catch(() => setCustObj(null));
    }
  }, [machine?.customer]);

  const isVIP = custObj?.tier === "VIP";
  const vipDiscount = isVIP ? Math.round((foodAmount) * 0.1) : 0;

  const [remaining, setRemaining] = useState(0);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionAmount, setSessionAmount] = useState(0);
  const sessionSnapshot = useRef<{ amount: number; food: typeof foodItems; timeCost: number } | null>(null);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [callStaff, setCallStaff] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!machine) return;
    if (machine.status === "in_use" && machine.remaining && machine.startedAt) {
      const duration = parseTime(machine.remaining);
      const elapsed = Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000);
      const rem = Math.max(0, duration - elapsed);
      setRemaining(rem);
      if (rem <= 0) {
        const dur = parseTime(machine.remaining);
        const elapsed2 = Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000);
        const played = Math.min(elapsed2, dur);
        const timeCost = Math.round((played / 3600) * machine.pricePerHour);
        const finalAmount = timeCost + foodAmount - vipDiscount;
        setSessionAmount(finalAmount);
        sessionSnapshot.current = { amount: finalAmount, food: foodItems, timeCost };
        setSessionEnded(true);
      }
    } else if (machine.status === "in_use" && machine.remaining) {
      setRemaining(parseTime(machine.remaining));
    }
  }, [machine]);

  useEffect(() => {
    if (remaining <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (machine) {
            const hours = parseTime(machine.remaining ?? "0:00") / 3600;
            const timeCost = Math.round(hours * machine.pricePerHour);
            const finalAmount = timeCost + foodAmount - vipDiscount;
            setSessionAmount(finalAmount);
            sessionSnapshot.current = { amount: finalAmount, food: foodItems, timeCost };
            setSessionEnded(true);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [machine, remaining > 0, foodAmount]);

  useEffect(() => {
    if (!machine || machine.status !== "in_use" || !machine.remaining || !machine.startedAt) return;
    const dur = parseTime(machine.remaining);
    const el = Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000);
    const played = Math.min(el, dur);
    setSessionAmount(Math.round((played / 3600) * machine.pricePerHour) + foodAmount - vipDiscount);
  }, [machine, remaining, foodAmount, vipDiscount]);

  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const fadeIn = (d: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s ease-out ${d}s`,
  });

  const [warned15, setWarned15] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const handleExtend = async (added: number, amount: number) => {
    const newRem = remaining + added;
    setRemaining(newRem);
    if (machine) {
      const h = Math.floor(newRem / 3600);
      const m = Math.floor((newRem % 3600) / 60);
      await updateMachineFn({
        data: {
          id: machine.id,
          remaining: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          startedAt: new Date().toISOString(),
        },
      });
      if (amount > 0) {
        await makePaymentFn({
          data: {
            machine: machine.name,
            amount,
            method: "qr",
          },
        });
      }
      await makeNotificationFn({
        data: {
          type: "MACHINE_EXTENDED",
          title: `Máy ${machine.name} gia hạn`,
          message: `+${Math.round(added / 3600)}h — ${formatVND(amount)}`,
          targetRole: "CASHIER",
        },
      });
      setWarned15(false);
    }
  };

  useEffect(() => {
    if (remaining > 0 && remaining <= 900 && !warned15 && machine) {
      setWarned15(true);
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        /* no-op */
      }
    }
  }, [remaining, warned15, machine]);

  if (loadingMachine) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (machineError || !machine) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-sm w-full text-center border border-border">
          <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground">
            {t("play.machineNotFound")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">{t("play.machineNotFoundDesc")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden" style={fadeIn(0)}>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-white/15 backdrop-blur border border-white/10 shadow-lg">
              <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider">
                {t("play.playingAt")}
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-white drop-shadow">
                {machine.name}
                {machine.area ? ` · ${machine.area}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {machine.status === "in_use" && remaining > 0 && (
              <div className="text-right">
                <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider">
                  {t("play.timeRemaining")}
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums drop-shadow">
                  {hh}:{mm}:{ss}
                </div>
              </div>
            )}
            <button
              onClick={toggle}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white/15 hover:bg-white/25 grid place-items-center border border-white/10 transition-all"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-white" />
              ) : theme === "light" ? (
                <Moon className="h-4 w-4 text-white" />
              ) : (
                <MonitorIcon className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-none">
          {[
            { k: "home", l: t("play.home"), i: Sparkles },
            { k: "food", l: t("play.food"), i: Coffee, badge: cartCount },
            { k: "extend", l: t("play.extend"), i: Clock },
            { k: "pay", l: t("play.pay"), i: QrCode },
            { k: "account", l: t("play.account"), i: Monitor },
          ].map((tabItem) => (
            <button
              key={tabItem.k}
              onClick={() => setTab(tabItem.k as Tab)}
              className={`relative px-3 sm:px-5 py-3 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                tab === tabItem.k
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              {tab === tabItem.k && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full" />
              )}
              <tabItem.i className="h-4 w-4" />
              <span className="hidden sm:inline">{tabItem.l}</span>
              {tabItem.badge ? (
                <span className="ml-0.5 grid h-5 min-w-[20px] px-1 place-items-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold shadow-lg">
                  {tabItem.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      {/* Session ended overlay */}
      {sessionEnded && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md grid place-items-center z-50 p-4">
          <div className="p-6 max-w-sm w-full border border-border bg-card rounded-2xl shadow-2xl text-center">
            <div className="text-5xl">⏰</div>
            <div className="font-display text-xl font-bold text-foreground mt-3">
              {t("play.sessionEnded")}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("play.sessionEndedDesc", { machine: machine.name })}
            </p>
            <div className="mt-4 p-3 rounded-xl bg-muted border border-border space-y-2">
              {(() => {
                const snapFood = sessionSnapshot.current?.food ?? foodItems;
                const snapTimeCost = sessionSnapshot.current?.timeCost ?? 0;
                const snapFoodAmt = snapFood.reduce((sum, [, g]) => sum + g.total, 0);
                const disc = isVIP ? Math.round(snapFoodAmt * 0.1) : 0;
                const total = sessionSnapshot.current?.amount ?? sessionAmount;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giờ chơi</span>
                      <span className="font-semibold text-foreground">{formatVND(snapTimeCost)}</span>
                    </div>
                    {snapFood.length > 0 && (
                      <>
                        <div className="border-t border-border pt-2">
                          <div className="text-xs text-muted-foreground mb-1">Đồ ăn đã gọi</div>
                          {snapFood.map(([name, g]) => (
                            <div key={name} className="flex justify-between text-sm">
                              <span className="text-foreground">
                                {g.qty}x {name}
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatVND(g.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tổng đồ ăn</span>
                          <span className="font-semibold text-foreground">
                            {formatVND(snapFoodAmt)}
                          </span>
                        </div>
                      </>
                    )}
                    {disc > 0 && (
                      <div className="flex justify-between text-sm text-green-500">
                        <span>⭐ VIP giảm 10% đồ ăn</span>
                        <span className="font-semibold">-{formatVND(disc)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-semibold text-foreground">{t("play.amountDue")}</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatVND(total)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="space-y-3 mt-5">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 h-12 text-base"
                onClick={() => setShowQRPayment(true)}
              >
                <QrCode className="h-5 w-5 mr-2" />
                {t("play.payQR")}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={async () => {
                  try {
                    await makeNotificationFn({
                      data: {
                        type: "STAFF_REQUEST",
                        title: `Máy ${machine.name} gọi nhân viên`,
                        message: `${machine.name} — cần hỗ trợ tại bàn`,
                        targetRole: "CASHIER",
                      },
                    });
                    setCallStaff(true);
                  } catch {
                    // continue
                  }
                }}
              >
                <Bell className="h-5 w-5 mr-2" />
                {t("play.callStaff")}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => {
                  setSessionEnded(false);
                }}
              >
                {t("play.payAtCounter")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Call staff success */}
      {callStaff && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm grid place-items-center z-50 p-4"
          onClick={() => setCallStaff(false)}
        >
          <div
            className="p-6 max-w-sm w-full border border-border bg-background rounded-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl">🔔</div>
            <div className="font-display text-xl font-bold text-foreground text-center mt-3">
              {t("play.staffNotified")}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{t("play.staffNotifiedDesc")}</div>
            <Button
              className="mt-4 w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0"
              onClick={() => setCallStaff(false)}
            >
              {t("common.gotIt")}
            </Button>
          </div>
        </div>
      )}

      {/* 15-min warning */}
      {warned15 && remaining > 0 && remaining <= 900 && !sessionEnded && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md grid place-items-center z-50 p-4">
          <div className="p-6 max-w-sm w-full border border-border bg-card rounded-2xl shadow-2xl text-center">
            <div className="text-5xl">⏰</div>
            <div className="font-display text-xl font-bold text-foreground mt-3">
              {t("play.timeWarning")}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("play.timeWarningDesc", {
                minutes: Math.ceil(remaining / 60),
              })}
            </p>
            <div className="space-y-3 mt-5">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 h-12 text-base"
                onClick={() => {
                  setWarned15(false);
                  setShowQRPayment(true);
                }}
              >
                <QrCode className="h-5 w-5 mr-2" />
                {t("play.pay")}
              </Button>
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 h-12 text-base"
                onClick={() => {
                  setWarned15(false);
                  setTab("extend");
                }}
              >
                <Clock className="h-5 w-5 mr-2" />
                {t("play.extend")}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => setWarned15(false)}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment */}
      {showQRPayment && (
        <QRPaymentDialog
          open={showQRPayment}
          onOpenChange={setShowQRPayment}
          amount={sessionAmount}
          note={`THANHTOAN ${machine.name}`}
          machine={machine.name}
          showStatus
          onSuccess={() => {
            setShowQRPayment(false);
            setSessionEnded(false);
          }}
        />
      )}

      {/* Order success animation */}
      {showOrderSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white shadow-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{t("play.orderSent")}</span>
          </div>
        </div>
      )}

      {/* Tab content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <div key={tab} className="animate-[fadeIn_0.3s_ease-out]">
          {tab === "home" && (
            <HomeTab mounted={mounted} machine={machine} remaining={remaining} onTab={setTab} />
          )}
          {tab === "food" && (
            <FoodTab
              menu={menu}
              cart={cart}
              setCart={setCart}
              machineName={machine.name}
              onOrderSuccess={() => {
                setShowOrderSuccess(true);
                setTimeout(() => setShowOrderSuccess(false), 3000);
              }}
            />
          )}
          {tab === "extend" && (
            <ExtendTab
              remaining={remaining}
              onExtend={handleExtend}
              pricePerHour={machine.pricePerHour}
            />
          )}
          {tab === "pay" && (
            <PayTab
              machine={machine}
              remaining={remaining}
              sessionAmount={sessionAmount}
              foodAmount={foodAmount}
              foodItems={foodItems}
              isVIP={isVIP}
              vipDiscount={vipDiscount}
              onPayQR={() => setShowQRPayment(true)}
              onCallStaff={async () => {
                try {
                  await makeNotificationFn({
                    data: {
                      type: "STAFF_REQUEST",
                      title: `Máy ${machine.name} gọi nhân viên`,
                      message: `${machine.name} — cần hỗ trợ tại bàn`,
                      targetRole: "CASHIER",
                    },
                  });
                  setCallStaff(true);
                } catch {
                  // continue
                }
              }}
              onPayCounter={() => setSessionEnded(true)}
            />
          )}
          {tab === "account" && <AccountTab machine={machine} />}
        </div>
      </main>
    </div>
  );
}

function HomeTab({
  mounted,
  machine,
  remaining,
  onTab,
}: {
  mounted: boolean;
  machine: any;
  remaining: number;
  onTab: (t: Tab) => void;
}) {
  const { t } = useTranslation();
  const [cursing, setCursing] = useState(false);
  const [cursingDone, setCursingDone] = useState(false);
  const createCursingFn = useServerFn(createCursingRequest);

  const fadeIn = (d: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s ease-out ${d}s`,
  });

  const handleCursing = async () => {
    await createCursingFn({
      data: { machine: machine.name, customer: "Khách" },
    });
    setCursing(false);
    setCursingDone(true);
  };

  const actions = [
    {
      k: "food",
      l: t("play.food"),
      d: t("play.foodDesc"),
      i: Coffee,
      color: "from-pink-500 to-rose-500",
    },
    {
      k: "extend",
      l: t("play.extend"),
      d: t("play.extendDesc"),
      i: Clock,
      color: "from-purple-500 to-indigo-500",
    },
    {
      k: "pay",
      l: t("play.pay"),
      d: t("play.payDesc"),
      i: QrCode,
      color: "from-green-500 to-emerald-500",
    },
    {
      k: "account",
      l: t("play.account"),
      d: t("play.accountDesc"),
      i: Monitor,
      color: "from-cyan-500 to-teal-500",
    },
  ] as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div style={fadeIn(0)}>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          {t("play.welcome")}{" "}
          <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {machine.name}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {machine.area} · {formatVND(machine.pricePerHour)}/h
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4" style={fadeIn(0.1)}>
        {actions.map((a, i) => (
          <button
            key={a.k}
            onClick={() => onTab(a.k as Tab)}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5 sm:p-6 text-left hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02]"
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <div
              className={`inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br ${a.color} shadow-lg`}
            >
              <a.i className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-foreground mt-3 sm:mt-4">
              {a.l}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">{a.d}</div>
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-foreground" />
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6" style={fadeIn(0.2)}>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-yellow-400" />
          <h3 className="font-semibold text-foreground/90">{t("play.promoToday")}</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border border-border p-4 hover:border-purple-400/30 transition-all">
            <div className="text-sm font-semibold text-foreground">
              🎮 Cuối tuần giảm 30% giờ chơi VIP
            </div>
            <div className="text-xs text-muted-foreground mt-1">Áp dụng thứ 7 & CN, 14h–18h</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 hover:border-cyan-400/30 transition-all">
            <div className="text-sm font-semibold text-foreground">🍟 Combo Game Thủ -10k</div>
            <div className="text-xs text-muted-foreground mt-1">
              Mì + Pepsi + Khoai tây = 55k → 45k
            </div>
          </div>
        </div>
      </div>

      {machine.area && machine.area !== "Thường" && (
        <div className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6" style={fadeIn(0.3)}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <h3 className="font-semibold text-foreground/90">{t("play.specialService")}</h3>
          </div>
          <div className="rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-foreground text-base">
                  🎤 {t("play.curseService")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t("play.curseDesc")}</div>
                <div className="text-sm font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mt-1">
                  {formatVND(10000)}
                </div>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-lg shadow-pink-500/20 shrink-0"
                onClick={() => setCursing(true)}
              >
                <Zap className="h-4 w-4 mr-1" />
                {t("play.rentNow")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cursing confirm dialog */}
      {cursing && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm grid place-items-center z-50 p-4"
          onClick={() => setCursing(false)}
        >
          <div
            className="p-6 max-w-sm w-full border border-border bg-background rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl text-center">🎤</div>
            <div className="font-display text-xl font-bold text-foreground text-center mt-3">
              {t("play.confirmCurse")}
            </div>
            <div className="text-sm text-muted-foreground text-center mt-1">
              {t("play.confirmCurseDesc", { price: formatVND(10000) })}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setCursing(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-lg shadow-pink-500/20"
                onClick={handleCursing}
              >
                <Zap className="h-4 w-4 mr-1" />
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cursing done dialog */}
      {cursingDone && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm grid place-items-center z-50 p-4"
          onClick={() => setCursingDone(false)}
        >
          <div
            className="p-6 max-w-sm w-full border border-border bg-background rounded-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl">✅</div>
            <div className="font-display text-xl font-bold text-foreground text-center mt-3">
              {t("play.orderSent")}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{t("play.orderMessage")}</div>
            <Button
              className="mt-4 w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0"
              onClick={() => setCursingDone(false)}
            >
              {t("common.gotIt")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FoodTab({
  menu,
  cart,
  setCart,
  machineName,
  onOrderSuccess,
}: {
  menu: any[];
  cart: Record<string, number>;
  setCart: (c: Record<string, number>) => void;
  machineName: string;
  onOrderSuccess: () => void;
}) {
  const { t } = useTranslation();
  const createOrderFn = useServerFn(createFoodOrder);
  const getOrdersFn = useServerFn(getOrdersByMachine);
  const cancelOrderFn = useServerFn(updateOrderStatus);
  const [outOfStockMsg, setOutOfStockMsg] = useState(false);
  const [sentToast, setSentToast] = useState(false);

  const { data: activeOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["play-active-orders", machineName],
    queryFn: () => getOrdersFn({ data: { machineName } }),
    refetchInterval: 10000,
  });

  const pendingOrders = activeOrders.filter(
    (o: any) => o.status === "Chờ xử lý" || o.status === "Đang chuẩn bị" || o.status === "Đã giao",
  );

  const items = menu.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const sub = (id: string) => {
    const n = (cart[id] || 0) - 1;
    const { [id]: _, ...rest } = cart;
    setCart(n <= 0 ? rest : { ...cart, [id]: n });
  };

  const add = (id: string) => {
    const item = menu.find((m) => m.id === id);
    const currentQty = cart[id] || 0;
    if (item && currentQty >= item.stock) {
      setOutOfStockMsg(true);
      return;
    }
    setCart({ ...cart, [id]: currentQty + 1 });
  };

  const handleSend = async () => {
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = menu.find((m) => m.id === id)!;
      return { name: item.name, price: item.price, qty, type: "menu" as const };
    });
    if (orderItems.length === 0) return;
    try {
      await createOrderFn({ data: { machineName, items: orderItems } });
      setCart({});
      setSentToast(true);
      onOrderSuccess();
      refetchOrders();
      setTimeout(() => setSentToast(false), 3000);
    } catch {
      // error handled by toast
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm(t("play.cancelConfirm"))) return;
    try {
      await cancelOrderFn({ data: { id: orderId, status: "Đã hủy" } });
      refetchOrders();
    } catch {
      // error handled by toast
    }
  };

  const statusColor = (s: string) => {
    if (s === "Chờ xử lý") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (s === "Đang chuẩn bị") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (s === "Đã giao") return "text-green-400 bg-green-500/10 border-green-500/20";
    if (s === "Đã gộp") return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    if (s === "Đã hủy") return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-muted-foreground bg-muted";
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Coffee className="h-5 w-5 text-purple-400" />
          {t("play.menu")}
        </h2>
        {menu.length === 0 ? (
          <div className="text-muted-foreground text-center py-12">{t("play.loadingMenu")}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {menu.map((m, i) => (
              <Card
                key={m.id}
                className="group border border-border bg-card/50 p-4 hover:border-purple-400/40 hover:bg-muted/50 transition-all duration-300"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-xl bg-muted flex items-center justify-center text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">
                  {m.image ? (
                    <img
                      src={m.image}
                      alt={m.name}
                      onError={(e) => {
                        e.currentTarget.src = "/images/meme.jpg";
                      }}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Sandwich className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="mt-3 font-semibold text-foreground text-sm sm:text-base">
                  {m.name}
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">{m.category}</div>
                <div className="flex items-center justify-between mt-3 gap-1">
                  <div className="font-display font-bold text-sm sm:text-base bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {formatVND(m.price)}
                  </div>
                  {cart[m.id] ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => sub(m.id)}
                        className="h-7 w-7 rounded-lg border border-border bg-muted grid place-items-center hover:bg-muted/80 transition"
                      >
                        <Minus className="h-3 w-3 text-foreground" />
                      </button>
                      <span className="w-6 text-center font-medium text-foreground text-sm">
                        {cart[m.id]}
                      </span>
                      <button
                        onClick={() => add(m.id)}
                        className={`h-7 w-7 rounded-lg border border-border bg-muted grid place-items-center hover:bg-muted/80 transition ${cart[m.id] >= m.stock ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Plus className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => add(m.id)}
                      disabled={m.stock === 0}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 text-xs h-8"
                    >
                      {m.stock === 0 ? t("common.outOfStock") : t("common.add")}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Cart */}
        <Card className="p-5 h-fit lg:sticky lg:top-24 border border-border bg-card/50">
          <h3 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            {t("play.cart")}
          </h3>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground/50 text-center py-8">
              <Sandwich className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t("play.cartEmpty")}
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-72 overflow-auto scrollbar-thin">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 bg-muted rounded-xl p-2">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                      {i.image ? (
                        <img
                          src={i.image}
                          alt={i.name}
                          onError={(e) => {
                            e.currentTarget.src = "/images/meme.jpg";
                          }}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Sandwich className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatVND(i.price)} × {i.qty}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatVND(i.price * i.qty)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-border mt-4 pt-3">
                <span className="font-semibold text-foreground/90">{t("common.total")}</span>
                <span className="font-display text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {formatVND(total)}
                </span>
              </div>
              <div className="space-y-2 mt-4">
                <Button
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 h-11 shadow-lg shadow-pink-500/20"
                  size="lg"
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t("play.sendRequest")}
                </Button>
              </div>
            </>
          )}

          {/* Sent toast */}
          {sentToast && (
            <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center font-medium animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              {t("play.orderSent")}
            </div>
          )}

          {/* Out of stock dialog */}
          {outOfStockMsg && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm grid place-items-center z-50 p-4"
              onClick={() => setOutOfStockMsg(false)}
            >
              <Card
                className="p-6 max-w-sm relative text-center border border-border bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setOutOfStockMsg(false)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground/70"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="text-5xl mb-3">⚠️</div>
                <div className="font-display text-lg font-bold text-foreground">
                  {t("play.outOfStockMsg")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{t("play.orderOther")}</div>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0"
                  onClick={() => setOutOfStockMsg(false)}
                >
                  {t("common.gotIt")}
                </Button>
              </Card>
            </div>
          )}
        </Card>

        {/* Active orders */}
        {pendingOrders.length > 0 && (
          <Card className="p-5 h-fit lg:sticky lg:top-[420px] border border-border bg-card/50">
            <h3 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-400" />
              {t("play.activeOrders")}
              <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {pendingOrders.length}
              </span>
            </h3>
            <div className="space-y-3 max-h-80 overflow-auto scrollbar-thin">
              {pendingOrders.map((order: any) => (
                <div key={order.id} className="border border-border rounded-xl p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(order.status)}`}
                    >
                      {order.status === "Chờ xử lý"
                        ? t("play.waiting")
                        : order.status === "Đang chuẩn bị"
                          ? t("play.preparing")
                          : order.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("play.orderTime")} {order.time}
                    </span>
                  </div>
                  <div className="space-y-1 mb-2">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.qty}× {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatVND(item.price * item.qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-display font-bold text-foreground">
                      {formatVND(order.amount)}
                    </span>
                    {order.status === "Chờ xử lý" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancel(order.id)}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        {t("play.cancelOrder")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ExtendTab({
  remaining,
  onExtend,
  pricePerHour,
}: {
  remaining: number;
  onExtend: (seconds: number, amount: number) => void;
  pricePerHour: number;
}) {
  const { t } = useTranslation();
  const { data: combos = [] } = useQuery({
    queryKey: ["play-combos"],
    queryFn: () => listCombos(),
  });

  const packs = combos.map((c: any) => ({
    id: c.id,
    label: c.name,
    price: c.price,
    image: c.image,
    sub:
      (c.items ?? []).map((ci: any) => `${ci.menuItem?.name ?? ""} ×${ci.qty}`).join(", ") +
      ` + ${Math.floor(c.seconds / 3600)}h`,
    seconds: c.seconds,
  }));
  const [picked, setPicked] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const pick = packs.find((p) => p.id === picked);
  const [manualHours, setManualHours] = useState(1);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
        <Clock className="h-5 w-5 text-purple-400" />
        {t("play.extendTitle")}
      </h2>
      <p className="text-muted-foreground mb-6">
        {t("play.remainingLabel")}{" "}
        <span className="font-mono font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          {Math.floor(remaining / 3600)}h {Math.floor((remaining % 3600) / 60)}'
        </span>
      </p>

      <Card className="p-5 border-border bg-card/50 mb-6">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-purple-400" />
          {t("play.extendByHour")}
        </h3>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 border-border shrink-0"
            onClick={() => setManualHours((h) => Math.max(0.5, h - 0.5))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center font-bold text-xl text-foreground tabular-nums">
            {manualHours}h
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 border-border shrink-0"
            onClick={() => setManualHours((h) => Math.min(24, h + 0.5))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          {[1, 2, 3, 5, 8].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setManualHours(v)}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-all ${
                manualHours === v
                  ? "bg-purple-500/20 text-purple-400 border-purple-400/40 font-semibold"
                  : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {v}h
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <div className="text-xs text-muted-foreground">{t("play.amountDue")}</div>
            <div className="font-display text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {formatVND(Math.round(manualHours * pricePerHour))}
            </div>
          </div>
          <Button
            className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20"
            onClick={() => {
              const seconds = Math.round(manualHours * 3600);
              const amount = Math.round(manualHours * pricePerHour);
              onExtend(seconds, amount);
            }}
          >
            {t("play.extendHours", { hours: manualHours })}
          </Button>
        </div>
      </Card>

      {packs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{t("play.noPacks")}</p>
          <p className="text-sm mt-1">{t("play.contactStaff")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => setPicked(p.id)}
              className={`text-left rounded-2xl border p-0 overflow-hidden transition-all duration-200 relative ${
                picked === p.id
                  ? "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                  : "border-border bg-card/50 hover:border-border hover:bg-muted/50"
              }`}
            >
              {p.image && (
                <div className="h-32 sm:h-36 bg-muted overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
              <div className="p-5">
                <div className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  {p.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.sub}</div>
                <div className="mt-3 font-display text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {formatVND(p.price)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {pick && (
        <div className="mt-6 rounded-2xl border border-border bg-card/50 p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {pick.image && (
              <img
                src={pick.image}
                alt={pick.label}
                className="h-12 w-12 rounded-lg object-cover bg-muted"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div>
              <div className="text-xs text-muted-foreground">{t("common.selected")}</div>
              <div className="font-semibold text-foreground">
                {pick.label} — {formatVND(pick.price)}
              </div>
            </div>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20"
            onClick={() => setPaying(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            {t("play.extendQR")}
          </Button>
        </div>
      )}

      {paying && pick && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm grid place-items-center z-50 p-4"
          onClick={() => setPaying(false)}
        >
          <Card
            className="p-6 max-w-sm w-full border border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="font-display text-lg font-bold text-foreground">
                {t("play.scanQR")}
              </div>
              <div className="text-sm text-muted-foreground">
                {pick.label} · {formatVND(pick.price)}
              </div>
            </div>
            <div className="mt-4 mx-auto h-48 w-48 grid place-items-center rounded-xl bg-muted border border-border">
              <QrCode className="h-32 w-32 text-purple-400" />
            </div>
            <Button
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0"
              onClick={() => {
                onExtend(pick.seconds, pick.price);
                setPaying(false);
                setPicked(null);
              }}
            >
              {t("play.confirmPaid")}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function PayTab({
  machine,
  remaining,
  sessionAmount,
  foodAmount,
  foodItems,
  isVIP,
  vipDiscount,
  onPayQR,
  onCallStaff,
  onPayCounter,
}: {
  machine: any;
  remaining: number;
  sessionAmount: number;
  foodAmount: number;
  foodItems: [string, { qty: number; total: number }][];
  isVIP: boolean;
  vipDiscount: number;
  onPayQR: () => void;
  onCallStaff: () => void;
  onPayCounter: () => void;
}) {
  const { t } = useTranslation();
  const elapsed =
    machine.status === "in_use" && machine.startedAt
      ? Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000)
      : 0;
  const duration = parseTime(machine.remaining ?? "0:00");
  const playHours = Math.min(elapsed, duration) / 3600;
  const playCost = Math.round(playHours * machine.pricePerHour);
  const displayAmount = playCost + foodAmount - vipDiscount;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5 text-purple-400" />
          {t("play.pay")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("play.payDesc")}</p>
      </div>

      <Card className="p-5 border border-border bg-card/50">
        <div className="text-center mb-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {t("play.amountDue")}
          </div>
          <div className="font-display text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {formatVND(displayAmount)}
          </div>
        </div>

        <div className="space-y-2 text-sm mb-5">
          <div className="flex justify-between bg-muted rounded-lg px-3 py-2">
            <span className="text-muted-foreground">Giờ chơi</span>
            <b className="text-foreground">{formatVND(playCost)}</b>
          </div>
          {foodItems.length > 0 && (
            <>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Đồ ăn</span>
                  <b className="text-foreground">{formatVND(foodAmount)}</b>
                </div>
                {foodItems.map(([name, g]) => (
                  <div key={name} className="flex justify-between text-xs text-muted-foreground pl-2">
                    <span>{g.qty}x {name}</span>
                    <span>{formatVND(g.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {isVIP && vipDiscount > 0 && (
            <div className="flex justify-between bg-green-500/10 rounded-lg px-3 py-2 text-green-500">
              <span>⭐ VIP giảm 10% đồ ăn</span>
              <b>-{formatVND(vipDiscount)}</b>
            </div>
          )}
          {machine.area && (
            <div className="flex justify-between bg-muted rounded-lg px-3 py-2">
              <span className="text-muted-foreground">{t("play.area")}</span>
              <b className="text-foreground">{machine.area}</b>
            </div>
          )}
          <div className="flex justify-between bg-muted rounded-lg px-3 py-2">
            <span className="text-muted-foreground">{t("play.pricePerHour")}</span>
            <b className="text-foreground">{formatVND(machine.pricePerHour)}/h</b>
          </div>
          {machine.status === "in_use" && remaining > 0 && (
            <div className="flex justify-between bg-muted rounded-lg px-3 py-2">
              <span className="text-muted-foreground">{t("play.timeRemaining")}</span>
              <b className="text-foreground font-mono">
                {Math.floor(remaining / 3600)}h {Math.floor((remaining % 3600) / 60)}m
              </b>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 h-12 text-base"
            onClick={onPayQR}
          >
            <QrCode className="h-5 w-5 mr-2" />
            {t("play.payQR")}
          </Button>
          <Button variant="outline" className="w-full h-12 text-base" onClick={onCallStaff}>
            <Bell className="h-5 w-5 mr-2" />
            {t("play.callStaff")}
          </Button>
          <Button variant="outline" className="w-full h-12 text-base" onClick={onPayCounter}>
            {t("play.goCounter")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AccountTab({ machine }: { machine: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <Card className="p-6 border border-border bg-card/50">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 grid place-items-center text-white font-display text-2xl font-bold shadow-lg shadow-purple-500/30 mx-auto">
          <Monitor className="h-8 w-8" />
        </div>
        <div className="mt-4 font-display text-xl font-bold text-foreground text-center">
          {machine.name}
        </div>
        <div className="text-sm text-muted-foreground text-center">
          {machine.area}
          {machine.ip ? ` · IP: ${machine.ip}` : ""}
        </div>
        <div className="mt-4 rounded-xl bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/20 text-yellow-400 p-3 flex items-center gap-2 justify-center">
          <Sparkles className="h-4 w-4" />
          <div className="text-sm font-semibold">{machine.area}</div>
        </div>
        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between bg-muted rounded-lg px-3 py-2">
            <span className="text-muted-foreground">{t("play.pricePerHour")}</span>
            <b className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {formatVND(machine.pricePerHour)}
            </b>
          </div>
          <div className="flex justify-between bg-muted rounded-lg px-3 py-2">
            <span className="text-muted-foreground">{t("play.status")}</span>
            <b className="text-foreground">
              {machine.status === "in_use"
                ? t("play.sessionActive")
                : machine.status === "idle"
                  ? t("play.machineReady")
                  : t("play.maintenance")}
            </b>
          </div>
        </div>
      </Card>

      <Card className="p-5 border border-border bg-card/50">
        <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-purple-400" />
          {t("play.sessionInfo")}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between bg-muted rounded-lg px-3 py-3">
            <span className="text-muted-foreground">{t("play.machineName")}</span>
            <b className="text-foreground">{machine.name}</b>
          </div>
          <div className="flex justify-between bg-muted rounded-lg px-3 py-3">
            <span className="text-muted-foreground">{t("play.area")}</span>
            <b className="text-foreground">{machine.area}</b>
          </div>
          <div className="flex justify-between bg-muted rounded-lg px-3 py-3">
            <span className="text-muted-foreground">{t("play.pricePerHour")}</span>
            <b className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {formatVND(machine.pricePerHour)}
            </b>
          </div>
          {machine.status === "in_use" && machine.startedAt && (
            <div className="flex justify-between bg-muted rounded-lg px-3 py-3">
              <span className="text-muted-foreground">{t("play.startedAt")}</span>
              <b className="text-foreground">
                {new Date(machine.startedAt).toLocaleTimeString("vi-VN")}
              </b>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
