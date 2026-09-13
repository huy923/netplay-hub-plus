import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Minus,
  Trash2,
  QrCode,
  Banknote,
  Wallet,
  Receipt,
  Zap,
  Coffee,
  Tag,
  CheckCircle2,
  XCircle,
  Loader2,
  Crown,
  Clock,
  Printer,
  ClipboardList,
  PackageCheck,
} from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  listMachines,
  listMenu,
  createInvoice,
  updateMachine,
  validateDiscount,
  getUnpaidInvoicesByMachine,
  settleInvoices,
  getCustomerByName,
  endMachineSession,
  confirmEndSessionIdle,
  updateOrderStatus,
  getAllPendingFoodOrders,
} from "@/lib/cybernet.functions";
import { useKitchenSlip } from "@/components/payment/kitchen-slip";

type Machine = Awaited<ReturnType<typeof listMachines>>[number];
type MenuItem = Awaited<ReturnType<typeof listMenu>>[number];
type InvoiceWithItems = Awaited<ReturnType<typeof getAllPendingFoodOrders>>[number];
type EndSessionResult = Awaited<ReturnType<typeof endMachineSession>>;
type ValidateDiscountResult = Awaited<ReturnType<typeof validateDiscount>>;
type ValidDiscount = Extract<ValidateDiscountResult, { valid: true }>;
type Customer = Exclude<Awaited<ReturnType<typeof getCustomerByName>>, null>;
type PayMethod = "Tiền mặt" | "QR" | "Ví điện tử";

export const Route = createFileRoute("/admin/pos")({ component: POS });

function FloatingParticle({
  delay,
  size,
  left,
  top,
}: {
  delay: number;
  size: number;
  left: string;
  top: string;
}) {
  return (
    <div
      className="absolute rounded-full bg-foreground/5 dark:bg-white/10 animate-pulse"
      style={{
        width: size,
        height: size,
        left,
        top,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + delay}s`,
      }}
    />
  );
}

function POS() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { t } = useTranslation();

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
  });

  const qc = useQueryClient();
  const lm = useServerFn(listMachines);
  const lmenu = useServerFn(listMenu);
  const ci = useServerFn(createInvoice);
  const um = useServerFn(updateMachine);
  const vd = useServerFn(validateDiscount);
  const getUnpaidFn = useServerFn(getUnpaidInvoicesByMachine);
  const settleFn = useServerFn(settleInvoices);
  const endSessionFn = useServerFn(endMachineSession);
  const confirmIdleFn = useServerFn(confirmEndSessionIdle);
  const updateOrderStatusFn = useServerFn(updateOrderStatus);
  const kitchenSlip = useKitchenSlip();

  const { data: machines = [] } = useQuery({ queryKey: ["machines"], queryFn: () => lm() });
  const { data: menu = [] } = useQuery({ queryKey: ["menu"], queryFn: () => lmenu() });

  const getAllPendingFn = useServerFn(getAllPendingFoodOrders);
  const { data: allPendingOrders = [], refetch: refetchPendingOrders } = useQuery({
    queryKey: ["all-pending-orders"],
    queryFn: () => getAllPendingFn(),
    refetchInterval: 5000,
  });

  const [mode, setMode] = useState<"play" | "food" | "settle" | "orders">("orders");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [machineId, setMachineId] = useState<string>("");
  const [hours, setHours] = useState(1);
  const [method, setMethod] = useState<PayMethod>("QR");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<ValidDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Settlement state
  const [settleMachineId, setSettleMachineId] = useState<string>("");
  const settleMachine = machines.find((m) => m.name === settleMachineId);
  const { data: unpaidInvoices = [], refetch: refetchUnpaid } = useQuery({
    queryKey: ["unpaid-invoices", settleMachineId],
    queryFn: () => getUnpaidFn({ data: { machine: settleMachineId } }),
    enabled: mode === "settle" && !!settleMachineId,
  });

  // Calculate time cost for settle machine (billed in full-hour blocks)
  const settleTimeCost = useMemo(() => {
    if (!settleMachine || settleMachine.status !== "in_use" || !settleMachine.startedAt) return 0;
    const elapsed = (Date.now() - new Date(settleMachine.startedAt).getTime()) / 1000;
    const billedHours = Math.ceil(Math.max(0, elapsed) / 3600);
    return billedHours * settleMachine.pricePerHour;
  }, [settleMachine]);

  const VIP_DISCOUNT_PERCENT = 10;
  const getCustomerFn = useServerFn(getCustomerByName);
  const foodOfInvoice = (inv: InvoiceWithItems) =>
    (inv.items || [])
      .filter((item) => item.type !== "time")
      .reduce((sum: number, item) => sum + item.price * item.qty, 0);
  const settleFoodTotal = unpaidInvoices.reduce((s: number, inv) => s + foodOfInvoice(inv), 0);
  const settleSubtotal = settleTimeCost + settleFoodTotal;
  const settleVipDiscount = settleMachine?.customer ? 0 : 0; // Will be computed via settleCustomer
  const [settleCustomer, setSettleCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!settleMachine?.customer) {
      setSettleCustomer(null);
      return;
    }
    getCustomerFn({ data: { name: settleMachine.customer } })
      .then((c) => {
        setSettleCustomer(c?.tier === "VIP" ? c : null);
      })
      .catch(() => setSettleCustomer(null));
  }, [settleMachine?.customer, getCustomerFn]);

  const settleVipDiscountAmount = settleCustomer
    ? Math.round((settleSubtotal * VIP_DISCOUNT_PERCENT) / 100)
    : 0;
  const settleFinalTotal = Math.max(0, settleSubtotal - settleVipDiscountAmount);

  const filteredMachines = useMemo(
    () => (zoneFilter === "all" ? machines : machines.filter((m) => m.area === zoneFilter)),
    [machines, zoneFilter],
  );
  const selectedMachine = filteredMachines.find((m) => m.id === machineId) ?? filteredMachines[0];

  const items = useMemo(
    () => menu.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id]! })),
    [cart, menu],
  );
  const foodTotal = items.reduce((s: number, i) => s + i.price * i.qty, 0);
  const playTotal = mode === "play" ? (selectedMachine?.pricePerHour ?? 0) * hours : 0;
  const subtotal = foodTotal + playTotal;
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1;
      const { [id]: _omit, ...rest } = c;
      return n <= 0 ? rest : { ...c, [id]: n };
    });

  const handleApplyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) return;
    setValidatingDiscount(true);
    setDiscountError("");
    setAppliedDiscount(null);
    try {
      const result = await vd({ data: { code, amount: subtotal } });
      if (result.valid) {
        setAppliedDiscount(result);
        toast.success(`-${formatVND(result.discountAmount)}`);
      } else {
        setDiscountError(result.message ?? t("discount.invalid"));
      }
    } catch {
      setDiscountError(t("common.error"));
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode("");
    setAppliedDiscount(null);
    setDiscountError("");
  };

  // Food-only order (no machine, no hours)
  const createFoodOrderMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error(t("pos.noItems"));
      const machineName = selectedMachine?.name || "Quầy";
      return ci({
        data: {
          machine: machineName,
          customer: t("pos.walkInGuest"),
          amount: total,
          method,
          status: "Chờ xử lý",
          discountCode: appliedDiscount ? discountCode.trim() : undefined,
          items: items.map((i) => ({
            name: i.name,
            price: i.price,
            qty: i.qty,
            type: "menu",
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success(t("pos.orderCreated"));
      setCart({});
      handleRemoveDiscount();
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });

  // Play + food (current behavior)
  const pay = useMutation({
    mutationFn: async () => {
      if (!selectedMachine) throw new Error(t("pos.errorNoMachine"));
      const totalSec = Math.round(hours * 3600);
      const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
      await ci({
        data: {
          machine: selectedMachine.name,
          customer: t("pos.walkInGuest"),
          method,
          status: t("dashboard.statusPaid"),
          discountCode: appliedDiscount ? discountCode.trim() : undefined,
          items: [
            ...items.map((i) => ({
              name: i.name,
              qty: i.qty,
              type: "menu",
            })),
            {
              name: `Giờ chơi ${hours}h — ${selectedMachine.name}`,
              qty: hours,
              type: "time",
            },
          ],
        },
      });
      await um({
        data: {
          id: selectedMachine.id,
          status: "in_use",
          remaining: `${hh}:${mm}`,
          startedAt: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success(t("pos.success"));
      setCart({});
      setMachineId("");
      handleRemoveDiscount();
      setHours(1);
      qc.invalidateQueries({ queryKey: ["machines"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });

  // Settlement
  const settleMutation = useMutation({
    mutationFn: async () => {
      if (unpaidInvoices.length === 0 && settleTimeCost === 0)
        throw new Error(t("pos.settleNoUnpaid"));

      if (settleMachine?.status === "in_use") {
        const payMethod = method === "Tiền mặt" ? "cash" : "qr";
        const result = await endSessionFn({
          data: { machineId: settleMachine.id, paymentMethod: payMethod },
        });
        if (payMethod === "cash" && result?.paymentId) {
          await confirmIdleFn({
            data: {
              machineId: settleMachine.id,
              paymentId: result.paymentId,
              invoiceId: result.invoiceId,
            },
          });
        }
        return result;
      }

      if (unpaidInvoices.length > 0) {
        return settleFn({
          data: {
            invoiceIds: unpaidInvoices.map((i) => i.id),
            method,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(t("pos.settleSuccess"));
      refetchUnpaid();
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["machines"] });
      setSettleMachineId("");
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });

  // Print kitchen slip
  const printKitchenMutation = useMutation({
    mutationFn: async (invoice: InvoiceWithItems) => {
      await kitchenSlip.print({
        orderId: invoice.id,
        machine: invoice.machine,
        customer: invoice.customer || undefined,
        items: invoice.items.map((i) => ({
          name: i.name,
          price: i.price,
          qty: i.qty,
          type: i.type,
        })),
        createdAt: invoice.createdAt.toISOString(),
      });
      await updateOrderStatusFn({
        data: { id: invoice.id, status: "Đang chuẩn bị" },
      });
    },
    onSuccess: () => {
      toast.success(t("pos.kitchenPrinted"));
      refetchUnpaid();
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-linear-to-br from-purple-200/40 via-background to-cyan-200/40 dark:from-purple-950/40 dark:via-background dark:to-cyan-950/40" />
      <FloatingParticle delay={0} size={5} left="5%" top="10%" />
      <FloatingParticle delay={1.5} size={3} left="90%" top="20%" />
      <FloatingParticle delay={0.8} size={4} left="10%" top="80%" />
      <FloatingParticle delay={2} size={3} left="85%" top="70%" />
      <div className="absolute top-0 -left-10 w-75 h-75 bg-purple-300/10 rounded-full blur-[120px] animate-pulse dark:bg-purple-600/15" />
      <div
        className="absolute bottom-0 -right-10 w-75 h-75 bg-cyan-300/10 rounded-full blur-[120px] animate-pulse dark:bg-cyan-500/15"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 p-6">
        <div style={fadeIn(0)} className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
            <Receipt className="h-3 w-3 text-purple-400" />
            {t("pos.label")}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            {t("pos.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("pos.subtitle")}</p>
        </div>

        {/* Mode toggle */}
        <div style={fadeIn(0)} className="flex gap-2 mb-6">
          {[
            {
              k: "orders" as const,
              label: t("pos.modeOrders"),
              desc: t("pos.modeOrdersDesc"),
              icon: ClipboardList,
            },
            {
              k: "food" as const,
              label: t("pos.modeFoodOnly"),
              desc: t("pos.modeFoodOnlyDesc"),
              icon: Coffee,
            },
            {
              k: "play" as const,
              label: t("pos.modePlay"),
              desc: t("pos.modePlayDesc"),
              icon: Zap,
            },
            {
              k: "settle" as const,
              label: t("pos.modeSettle"),
              desc: t("pos.modeSettleDesc"),
              icon: Receipt,
            },
          ].map((m) => (
            <button
              key={m.k}
              onClick={() => setMode(m.k)}
              className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                mode === m.k
                  ? "border-purple-500/40 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                  : "border-border bg-card/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <m.icon
                  className={`h-4 w-4 ${mode === m.k ? "text-purple-400" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-semibold ${mode === m.k ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {m.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* ORDERS MODE */}
        {mode === "orders" && (
          <div style={fadeIn(1)} className="grid gap-4 lg:grid-cols-[1fr_320px] mb-4">
            <Card className="p-4 border border-border bg-card/80 backdrop-blur-xl">
              <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-400" />
                {t("pos.modeOrders")}
                {allPendingOrders.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold border border-orange-500/20">
                    {allPendingOrders.length}
                  </span>
                )}
              </div>
              {allPendingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <div>{t("pos.orderNoPending")}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {allPendingOrders.map((inv) => {
                    const isPreparing = inv.status === "Đang chuẩn bị";
                    return (
                      <div
                        key={inv.id}
                        className={`border rounded-xl p-3 transition-all ${
                          isPreparing
                            ? "border-blue-500/30 bg-blue-500/5"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                isPreparing
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              }`}
                            >
                              {isPreparing ? t("pos.statusPreparing") : inv.status}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {inv.machine}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{inv.time}</span>
                        </div>
                        <div className="space-y-1 mb-2">
                          {inv.items
                            .filter((i) => i.type !== "time")
                            .map((item, idx: number) => (
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
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                          <span className="font-display font-bold text-foreground">
                            {formatVND(foodOfInvoice(inv))}
                          </span>
                          <div className="flex gap-2">
                            {!isPreparing && (
                              <button
                                onClick={() => printKitchenMutation.mutate(inv)}
                                disabled={printKitchenMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-orange-500 to-amber-400 text-white text-xs font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                {t("pos.printKitchen")}
                              </button>
                            )}
                            {isPreparing && (
                              <button
                                onClick={() => {
                                  updateOrderStatusFn({
                                    data: { id: inv.id, status: "Đã giao" },
                                  }).then(() => {
                                    toast.success(t("pos.orderMarkDelivered"));
                                    refetchPendingOrders();
                                    qc.invalidateQueries({ queryKey: ["orders"] });
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-green-500 to-emerald-400 text-white text-xs font-semibold hover:shadow-lg hover:shadow-green-500/20 transition-all"
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                {t("pos.orderMarkDelivered")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Order flow guide */}
            <Card className="p-4 h-fit sticky top-4 space-y-4 border border-border bg-card/80 backdrop-blur-xl">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-400" />
                Quy trình
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 grid place-items-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Khách gọi đồ</div>
                    <div className="text-muted-foreground">Đơn "Chờ xử lý" xuất hiện</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20 grid place-items-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">In phiếu bếp</div>
                    <div className="text-muted-foreground">
                      Đơn → "Đang chuẩn bị", khách không thể hủy
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 grid place-items-center shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Đã giao</div>
                    <div className="text-muted-foreground">
                      Đồ ăn đã đến khách, hiển thị trên play
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* SETTLE MODE */}
        {mode === "settle" && (
          <div style={fadeIn(1)} className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Card className="p-4 border border-border bg-card/80 backdrop-blur-xl">
              <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-orange-400" />
                {t("pos.settleTitle")}
              </div>
              {!settleMachineId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <div>{t("pos.settleEmpty")}</div>
                </div>
              ) : settleMachine?.status === "in_use" ? (
                <div className="space-y-3">
                  {/* Time cost card */}
                  <div className="border border-border rounded-xl p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Giờ chơi
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {settleMachine.customer || "Khách vãng lai"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">
                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                        {settleMachine.remaining} × {formatVND(settleMachine.pricePerHour)}/h
                      </span>
                      <span className="font-display font-bold text-foreground">
                        {formatVND(settleTimeCost)}
                      </span>
                    </div>
                  </div>

                  {/* Food orders */}
                  {unpaidInvoices.length > 0 &&
                    unpaidInvoices.map((inv) => (
                      <div key={inv.id} className="border border-border rounded-xl p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            {inv.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{inv.time}</span>
                        </div>
                        <div className="space-y-1 mb-2">
                          {inv.items
                            .filter((item) => item.type !== "time")
                            .map((item, idx: number) => (
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
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            {inv.customer || "Đồ ăn"}
                          </span>
                          <span className="font-display font-bold text-foreground">
                            {formatVND(foodOfInvoice(inv))}
                          </span>
                        </div>
                        {inv.status !== "Đã giao" &&
                          inv.status !== "Đã gộp" &&
                          inv.status !== "Đã hủy" && (
                            <div className="mt-2">
                              <button
                                onClick={() => printKitchenMutation.mutate(inv)}
                                disabled={printKitchenMutation.isPending}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-linear-to-r from-orange-500 to-amber-400 text-white text-xs font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                {t("pos.printKitchen")}
                              </button>
                            </div>
                          )}
                      </div>
                    ))}

                  {unpaidInvoices.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Chưa có đồ ăn nào được gọi
                    </div>
                  )}
                </div>
              ) : unpaidInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-green-500" />
                  <div>{t("pos.settleNoUnpaid")}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidInvoices.map((inv) => (
                    <div key={inv.id} className="border border-border rounded-xl p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          {inv.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{inv.time}</span>
                      </div>
                      <div className="space-y-1 mb-2">
                        {inv.items
                          .filter((item) => item.type !== "time")
                          .map((item, idx: number) => (
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
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">{inv.customer}</span>
                        <span className="font-display font-bold text-foreground">
                          {formatVND(foodOfInvoice(inv))}
                        </span>
                      </div>
                      {inv.status !== "Đã giao" &&
                        inv.status !== "Đã gộp" &&
                        inv.status !== "Đã hủy" && (
                          <div className="mt-2">
                            <button
                              onClick={() => printKitchenMutation.mutate(inv)}
                              disabled={printKitchenMutation.isPending}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-linear-to-r from-orange-500 to-amber-400 text-white text-xs font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              {t("pos.printKitchen")}
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 h-fit sticky top-4 space-y-4 border border-border bg-card/80 backdrop-blur-xl">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("pos.settleSelectMachine")}
                </div>
                <select
                  value={settleMachineId}
                  onChange={(e) => setSettleMachineId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="" className="bg-background text-muted-foreground">
                    —
                  </option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.name} className="bg-background">
                      {m.name} {m.status === "in_use" ? `(${m.customer || "đang dùng"})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {settleMachineId && (
                <>
                  <div className="border-t border-border pt-3 space-y-1 text-sm">
                    {settleMachine?.status === "in_use" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Giờ chơi ({settleMachine.remaining})
                        </span>
                        <span className="text-foreground">{formatVND(settleTimeCost)}</span>
                      </div>
                    )}
                    {settleFoodTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Coffee className="h-3 w-3" />
                          Đồ ăn ({unpaidInvoices.length})
                        </span>
                        <span className="text-foreground">{formatVND(settleFoodTotal)}</span>
                      </div>
                    )}
                    {settleCustomer && settleVipDiscountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-400" />
                          VIP {VIP_DISCOUNT_PERCENT}%
                        </span>
                        <span className="text-yellow-400">
                          -{formatVND(settleVipDiscountAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border mt-2">
                      <span className="font-semibold text-foreground">{t("pos.settleTotal")}</span>
                      <span className="font-display text-xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatVND(settleFinalTotal)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t("pos.paymentMethod")}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { k: t("pos.cash"), i: Banknote },
                        { k: "QR", i: QrCode },
                        { k: t("pos.eWallet"), i: Wallet },
                      ].map((p) => (
                        <button
                          key={p.k}
                          onClick={() => setMethod(p.k as PayMethod)}
                          className={`rounded-md border p-2 text-xs flex flex-col items-center gap-1 transition ${
                            method === p.k
                              ? "border-primary/40 bg-primary/20 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <p.i className="h-4 w-4" />
                          {p.k}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    disabled={
                      settleMutation.isPending ||
                      (unpaidInvoices.length === 0 && settleTimeCost === 0)
                    }
                    className="w-full bg-linear-to-r from-green-500 to-emerald-400 text-white border-0 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all"
                    size="lg"
                    onClick={() => settleMutation.mutate()}
                  >
                    {settleMutation.isPending
                      ? t("pos.paying")
                      : t("pos.settlePay", { total: formatVND(settleFinalTotal) })}
                  </Button>
                </>
              )}
            </Card>
          </div>
        )}

        {/* FOOD-ONLY & PLAY MODES */}
        {mode !== "settle" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]" style={fadeIn(1)}>
            <Card className="p-4 border border-border bg-card/80 backdrop-blur-xl">
              <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Coffee className="h-4 w-4 text-purple-400" />
                {t("pos.menu")}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {menu.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => add(m.id)}
                    className="rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:bg-muted/50 transition-all bg-card/80 group"
                  >
                    <div className="h-14 w-14 mx-auto rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                      {m.image ? (
                        <img
                          src={m.image}
                          onError={(e) => {
                            e.currentTarget.src = "/images/meme.jpg";
                          }}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Coffee className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-2 font-medium text-sm text-foreground">{m.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{m.category}</span>
                      <span className="text-sm font-semibold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatVND(m.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4 h-fit sticky top-4 space-y-4 border border-border bg-card/80 backdrop-blur-xl">
              {/* Machine & zone (play mode only) */}
              {mode === "play" && (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t("pos.zone")}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[
                        { k: "all", l: t("common.all") },
                        { k: "Thường", l: t("machine.areaStandard") },
                        { k: "VIP", l: t("machine.areaVip") },
                        { k: "PS5", l: t("machine.areaPs5") },
                        { k: "Stream", l: t("machine.areaStream") },
                      ].map((z) => (
                        <button
                          key={z.k}
                          onClick={() => {
                            setZoneFilter(z.k);
                            setMachineId("");
                          }}
                          className={`px-2 py-1 text-xs rounded-md border transition ${
                            zoneFilter === z.k
                              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {z.l}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{t("pos.machine")}</div>
                    <select
                      value={selectedMachine?.id ?? ""}
                      onChange={(e) => setMachineId(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {filteredMachines.length === 0 && (
                        <option value="" className="bg-background text-muted-foreground">
                          {t("pos.noMachines")}
                        </option>
                      )}
                      {filteredMachines.map((m) => (
                        <option key={m.id} value={m.id} className="bg-background">
                          {m.name} — {formatVND(m.pricePerHour)}/h
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t("pos.hours")}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => setHours((h) => Math.max(1, h - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center font-display text-xl font-bold text-foreground">
                        {hours}h
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => setHours((h) => h + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Cart */}
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2">{t("pos.cart")}</div>
                {items.length === 0 && (
                  <div className="text-sm text-muted-foreground/60 py-4 text-center">
                    {t("pos.noItems")}
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                      <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                        {i.image ? (
                          <img
                            src={i.image}
                            alt={i.name}
                            onError={(e) => {
                              e.currentTarget.src = "/images/meme.jpg";
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Coffee className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{formatVND(i.price)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => sub(i.id)}
                          className="h-7 w-7 rounded border border-border grid place-items-center hover:bg-muted text-muted-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-foreground">
                          {i.qty}
                        </span>
                        <button
                          onClick={() => add(i.id)}
                          className="h-7 w-7 rounded border border-border grid place-items-center hover:bg-muted text-muted-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() =>
                            setCart((c) => {
                              const { [i.id]: _omit, ...r } = c;
                              return r;
                            })
                          }
                          className="ml-1 text-destructive/80 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {t("discount.label")}
                </div>
                {appliedDiscount ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-success truncate">
                        {appliedDiscount.discount.code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        -{formatVND(appliedDiscount.discountAmount)}
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveDiscount}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value);
                        setDiscountError("");
                      }}
                      placeholder={t("discount.codePlaceholder")}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                      onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border shrink-0"
                      onClick={handleApplyDiscount}
                      disabled={validatingDiscount || !discountCode.trim()}
                    >
                      {validatingDiscount ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("discount.apply")
                      )}
                    </Button>
                  </div>
                )}
                {discountError && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                    <XCircle className="h-3 w-3" />
                    {discountError}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                {mode === "play" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("pos.playTime", { hours })}</span>
                    <span className="text-foreground">{formatVND(playTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pos.food")}</span>
                  <span className="text-foreground">{formatVND(foodTotal)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {t("discount.label")}
                    </span>
                    <span className="text-success">-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border mt-2">
                  <span className="font-semibold text-foreground">{t("common.total")}</span>
                  <span className="font-display text-xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {formatVND(total)}
                  </span>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">{t("pos.paymentMethod")}</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: t("pos.cash"), i: Banknote },
                    { k: "QR", i: QrCode },
                    { k: t("pos.eWallet"), i: Wallet },
                  ].map((p) => (
                    <button
                      key={p.k}
                      onClick={() => setMethod(p.k as PayMethod)}
                      className={`rounded-md border p-2 text-xs flex flex-col items-center gap-1 transition ${
                        method === p.k
                          ? "border-primary/40 bg-primary/20 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <p.i className="h-4 w-4" />
                      {p.k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action button */}
              {mode === "play" ? (
                <Button
                  disabled={pay.isPending || !selectedMachine || total === 0}
                  className="w-full bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                  size="lg"
                  onClick={() => pay.mutate()}
                >
                  {pay.isPending ? t("pos.paying") : t("pos.pay", { total: formatVND(total) })}
                </Button>
              ) : (
                <Button
                  disabled={createFoodOrderMutation.isPending || items.length === 0}
                  className="w-full bg-linear-to-r from-orange-500 to-amber-400 text-white border-0 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
                  size="lg"
                  onClick={() => createFoodOrderMutation.mutate()}
                >
                  {createFoodOrderMutation.isPending ? t("pos.paying") : t("pos.createOrder")}
                </Button>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
