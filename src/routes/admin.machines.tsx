import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatVND } from "@/lib/format";
import {
  listMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  endMachineSession,
  confirmEndSessionIdle,
  getPublicBankSettings,
  getUnpaidInvoicesByMachine,
} from "@/lib/cybernet.functions";
import { useTranslation } from "react-i18next";
import { useRealtime } from "@/hooks/use-realtime";
import { useInvoicePrint } from "@/components/payment/invoice-print";
import {
  Plus,
  Minus,
  Wrench,
  Clock,
  Trash2,
  Pencil,
  MonitorPlay,
  Banknote,
  QrCode,
  Printer,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import QRPayment from "@/components/payment/qr-payment";

export const Route = createFileRoute("/admin/machines")({ component: Machines });

const statusMeta: Record<string, { label: string; tone: string }> = {
  in_use: { label: "Đang dùng", tone: "primary" },
  idle: { label: "Trống", tone: "success" },
  maintenance: { label: "Bảo trì", tone: "destructive" },
};

function parseTime(s: string): number {
  const parts = s.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatTime(sec: number): string {
  if (sec <= 0) return "Hết giờ";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

function Machines() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
  });

  const qc = useQueryClient();
  const list = useServerFn(listMachines);
  const create = useServerFn(createMachine);
  const update = useServerFn(updateMachine);
  const remove = useServerFn(deleteMachine);
  const getUnpaidFn = useServerFn(getUnpaidInvoicesByMachine);

  useRealtime();

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: () => list(),
    refetchInterval: 120_000,
  });

  const [machineOrders, setMachineOrders] = useState<
    Record<string, { items: any[]; total: number }>
  >({});

  useEffect(() => {
    const inUseMachines = machines.filter((m: any) => m.status === "in_use");
    for (const m of inUseMachines) {
      getUnpaidFn({ data: { machine: m.name } })
        .then((orders: any[]) => {
          const allItems = orders.flatMap((o: any) => o.items || []);
          const foodItems = allItems.filter((i: any) => i.type !== "time");
          const total = foodItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0);
          setMachineOrders((prev) => ({ ...prev, [m.name]: { items: foodItems, total } }));
        })
        .catch(() => {});
    }
  }, [machines]);

  const getBank = useServerFn(getPublicBankSettings);
  const { data: bankInfo } = useQuery({
    queryKey: ["bank-settings-print"],
    queryFn: () => getBank(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["machines"] });
  };

  const createM = useMutation({
    mutationFn: (data: {
      name: string;
      area: string;
      ip?: string;
      pricePerHour: number;
      status: string;
    }) => create({ data }),
    onSuccess: () => {
      toast.success(t("machine.addSuccess"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });
  const updateM = useMutation({
    mutationFn: (data: any) => update({ data }),
    onSuccess: () => {
      toast.success(t("machine.updateSuccess"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success(t("machine.deleteSuccess"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });

  const [filter, setFilter] = useState<"all" | string>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [assigning, setAssigning] = useState<any | null>(null);
  const [endingSession, setEndingSession] = useState<any | null>(null);
  const [, forceRender] = useState(0);

  const endSessionFn = useServerFn(endMachineSession);
  const confirmIdleFn = useServerFn(confirmEndSessionIdle);
  const { print, retryPrint } = useInvoicePrint();
  const [printReady, setPrintReady] = useState<any>(null);

  const endSessionM = useMutation({
    mutationFn: (data: { machineId: string; paymentMethod: "cash" | "qr" }) =>
      endSessionFn({ data }),
    onSuccess: async (result: any, variables) => {
      if (result) {
        const m = endingSession;
        const bInfo = bankInfo
          ? {
              bankName: bankInfo.bankName,
              accountNo: bankInfo.accountNo,
              accountHolder: bankInfo.accountHolder,
              amount: result.amount,
              note: `${m?.name ?? ""} - ${result.amount}`,
            }
          : undefined;

        const invoiceItems = (result.items ?? []) as { name: string; price: number; qty: number; type: string }[];

        const customerName = m?.customer ?? "Khách vãng lai";
        const invoiceData = {
          id: result.invoiceId,
          machine: m?.name ?? "",
          customer: customerName,
          amount: result.amount,
          method: variables.paymentMethod,
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          status: "Đã thanh toán",
          createdAt: new Date().toISOString(),
          items: invoiceItems,
        };
        setPrintReady({
          machineId: m?.id,
          machineName: m?.name,
          invoiceId: result.invoiceId,
          paymentId: result.paymentId,
          amount: result.amount,
          payMethod: variables.paymentMethod,
          invoiceData,
          bankInfo: bInfo,
        });
        print(invoiceData, bInfo);
      }
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });

  const handleConfirmPrintDone = async () => {
    if (!printReady?.machineId) return;
    try {
      if (printReady.payMethod === "cash") {
        await confirmIdleFn({
          data: {
            machineId: printReady.machineId,
            paymentId: printReady.paymentId,
            invoiceId: printReady.invoiceId,
          },
        });
        invalidate();
        toast.success(t("machine.endSessionSuccess"));
      } else {
        toast.success(t("machine.printDoneQr"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setPrintReady(null);
      setEndingSession(null);
    }
  };

  const handleRetryPrint = () => {
    if (!printReady) return;
    retryPrint(printReady.invoiceData, printReady.bankInfo);
  };

  const handleSkipPrint = () => {
    if (printReady?.payMethod === "cash") {
      handleConfirmPrintDone();
    } else {
      setPrintReady(null);
      setEndingSession(null);
    }
  };

  useEffect(() => {
    const t = setInterval(() => forceRender((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function getRemaining(m: any): number {
    if (m.status !== "in_use" || !m.remaining || !m.startedAt) return 0;
    const duration = parseTime(m.remaining);
    const elapsed = Math.floor((Date.now() - new Date(m.startedAt).getTime()) / 1000);
    return Math.max(0, duration - elapsed);
  }

  function getPlayed(m: any): number {
    if (m.status !== "in_use" || !m.startedAt) return 0;
    return Math.floor((Date.now() - new Date(m.startedAt).getTime()) / 1000);
  }

  const filtered = machines.filter((m: any) => filter === "all" || m.status === filter);

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
        <div style={fadeIn(0)} className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <MonitorPlay className="h-3 w-3 text-primary" />
              {t("machine.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {t("machine.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("machine.summary", {
                total: machines.length,
                inUse: machines.filter((m: any) => m.status === "in_use").length,
              })}
            </p>
          </div>
          <Dialog
            open={openAdd}
            onOpenChange={(v) => {
              setOpenAdd(v);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                <Plus className="h-4 w-4 mr-1" /> {t("machine.add")}
              </Button>
            </DialogTrigger>
            {openAdd && (
              <MachineForm
                title={t("machine.addNew")}
                onSubmit={(v) => createM.mutate(v, { onSuccess: () => setOpenAdd(false) })}
                loading={createM.isPending}
              />
            )}
          </Dialog>
        </div>

        <div style={fadeIn(1)} className="flex flex-wrap gap-2 mb-6">
          {[
            { k: "all", l: t("machine.filterAll") },
            { k: "in_use", l: t("machine.filterInUse") },
            { k: "idle", l: t("machine.filterIdle") },
            { k: "maintenance", l: t("machine.filterMaintenance") },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                filter === f.k
                  ? "bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/10"
                  : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={fadeIn(2)}>
          {filtered.map((m: any) => {
            const s = statusMeta[m.status] ?? statusMeta.idle;
            const orders = machineOrders[m.name];
            return (
              <Card
                key={m.id}
                className="p-4 border border-border bg-card/80 backdrop-blur-xl hover:border-border hover:bg-card transition-all duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-lg font-bold text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.area} · {formatVND(m.pricePerHour)}/h
                    </div>
                    {m.ip && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        IP: {m.ip}
                      </div>
                    )}
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--${s.tone}) 15%, transparent)`,
                      color: `var(--${s.tone})`,
                    }}
                  >
                    ●{" "}
                    {m.status === "in_use"
                      ? t("machine.statusInUse")
                      : m.status === "idle"
                        ? t("machine.statusIdle")
                        : t("machine.statusMaintenance")}
                  </span>
                </div>

                {m.status === "in_use" && (
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span
                        className={`font-mono font-semibold ${getRemaining(m) <= 60 ? "text-destructive" : "text-foreground"}`}
                      >
                        {formatTime(getRemaining(m))}
                      </span>
                      <span className="text-muted-foreground">{t("machine.remaining")}</span>
                    </div>
                    {orders && orders.items.length > 0 && (
                      <div className="p-2 rounded-lg bg-muted/50 border border-border space-y-1">
                        <div className="text-[10px] text-muted-foreground font-medium">
                          Đồ ăn chờ thanh toán
                        </div>
                        {orders.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-foreground truncate mr-2">
                              {item.qty}x {item.name}
                            </span>
                            <span className="font-medium text-foreground shrink-0">
                              {formatVND(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold pt-1 border-t border-border">
                          <span className="text-muted-foreground">Tổng đồ ăn</span>
                          <span className="text-foreground">{formatVND(orders.total)}</span>
                        </div>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => setEndingSession(m)}
                    >
                      {t("machine.endSession")}
                    </Button>
                  </div>
                )}
                {m.status === "idle" && (
                  <Button
                    size="sm"
                    className="w-full mt-4 bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
                    onClick={() => setAssigning(m)}
                  >
                    {t("machine.assign")}
                  </Button>
                )}
                {m.status === "maintenance" && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <Wrench className="h-4 w-4" /> {t("machine.underMaintenance")}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => updateM.mutate({ id: m.id, status: "idle" })}
                    >
                      {t("machine.endMaintenance")}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing(m)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() =>
                      confirm(t("common.deleteConfirm", { name: m.name })) && deleteM.mutate(m.id)
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("common.delete")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          {editing && (
            <MachineForm
              title={t("machine.edit")}
              initial={editing}
              onSubmit={(v) =>
                updateM.mutate({ id: editing.id, ...v }, { onSuccess: () => setEditing(null) })
              }
              loading={updateM.isPending}
            />
          )}
        </Dialog>

        <AssignDialog
          machine={assigning}
          onClose={() => setAssigning(null)}
          loading={updateM.isPending}
          onAssign={(hours) => {
            const totalSec = Math.round(hours * 3600);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);
            updateM.mutate(
              {
                id: assigning!.id,
                status: "in_use",
                remaining: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
                startedAt: new Date().toISOString(),
              },
              { onSuccess: () => setAssigning(null) },
            );
          }}
        />

        <EndSessionDialog
          machine={endingSession}
          onClose={() => {
            setEndingSession(null);
            setPrintReady(null);
          }}
          onClosePrint={() => setPrintReady(null)}
          bankInfo={bankInfo}
          onConfirm={(method, machineId) => {
            endSessionM.mutate({ machineId, paymentMethod: method });
          }}
          isPending={endSessionM.isPending}
          printReady={printReady}
          onPrintDone={handleConfirmPrintDone}
          onRetryPrint={handleRetryPrint}
          onSkipPrint={handleSkipPrint}
          getPlayed={getPlayed}
        />
      </div>
    </div>
  );
}

function EndSessionDialog({
  machine,
  onClose,
  onClosePrint,
  bankInfo,
  onConfirm,
  isPending,
  printReady,
  onPrintDone,
  onRetryPrint,
  onSkipPrint,
  getPlayed,
}: {
  machine: any;
  onClose: () => void;
  onClosePrint: () => void;
  bankInfo: any;
  onConfirm: (method: "cash" | "qr", machineId: string) => void;
  isPending: boolean;
  printReady: any;
  onPrintDone: () => void;
  onRetryPrint: () => void;
  onSkipPrint: () => void;
  getPlayed: (m: any) => number;
}) {
  const [method, setMethod] = useState<"cash" | "qr">("cash");
  const [showQR, setShowQR] = useState(false);
  const getUnpaidFn = useServerFn(getUnpaidInvoicesByMachine);

  const { data: liveOrders } = useQuery({
    queryKey: ["unpaid-for-end", machine?.name],
    queryFn: () => getUnpaidFn({ data: { machine: machine?.name ?? "" } }),
    enabled: !!machine?.name,
    refetchInterval: 10000,
  });

  const hasSessionEndInvoice = useMemo(() => {
    if (!liveOrders) return false;
    return liveOrders.some((o: any) =>
      (o.items || []).some((item: any) => item.type === "time"),
    );
  }, [liveOrders]);

  const orders = useMemo(() => {
    if (!liveOrders) return { items: [] as any[], foodItems: [] as any[], foodTotal: 0 };
    const allItems = liveOrders.flatMap((o: any) => o.items || []);
    const foodItems = allItems.filter((i: any) => i.type !== "time");
    const foodTotal = foodItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0);
    return { items: allItems, foodItems, foodTotal };
  }, [liveOrders]);

  const customerObj = useMemo(() => {
    if (!machine?.customer) return null;
    if (typeof machine.customer === "string") {
      try { return JSON.parse(machine.customer); } catch { return { name: machine.customer }; }
    }
    return machine.customer;
  }, [machine?.customer]);

  if (!machine) return null;

  const existingTimeItem = hasSessionEndInvoice
    ? orders.items.find((i: any) => i.type === "time")
    : undefined;
  const timeCost = existingTimeItem
    ? existingTimeItem.price
    : Math.ceil(Math.max(0, getPlayed(machine)) / 3600) * machine.pricePerHour;
  const foodCost = orders?.foodTotal ?? 0;
  const total = timeCost + foodCost;
  const customerName = customerObj?.name ?? "Khách vãng lai";
  const customerPhone = customerObj?.phone ?? "";
  const isVIP = customerObj?.tier === "VIP" || machine.customerData?.tier === "VIP";
  const discount = isVIP ? Math.round(total * 0.1) : 0;
  const finalTotal = total - discount;

  return (
    <>
      <Dialog open={!!machine && !printReady} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="border-border bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Kết thúc — {machine.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-muted border border-border space-y-2">
              {hasSessionEndInvoice ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hóa đơn chờ thanh toán</span>
                  <span className="font-semibold text-foreground">{formatVND(timeCost + foodCost)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Giờ chơi</span>
                  <span className="font-semibold text-foreground">{formatVND(timeCost)}</span>
                </div>
              )}
              {orders && orders.foodItems.length > 0 && (
                <>
                  <div className="border-t border-border pt-2">
                    <div className="text-xs text-muted-foreground mb-1">Chi tiết</div>
                    {orders.foodItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground truncate mr-2">
                          {item.qty}x {item.name}
                        </span>
                        <span className="font-medium text-foreground shrink-0">
                          {formatVND(item.price * item.qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {!hasSessionEndInvoice && foodCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng đồ ăn</span>
                      <span className="font-semibold text-foreground">{formatVND(foodCost)}</span>
                    </div>
                  )}
                </>
              )}
              {isVIP && discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá VIP (10%)</span>
                  <span className="font-semibold">-{formatVND(discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold text-foreground">Tổng cộng</span>
                <span className="text-xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {formatVND(finalTotal)}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-foreground text-sm">Khách hàng</Label>
              <div className="text-sm text-foreground mt-1">
                {customerName}
                {customerPhone && <span className="text-muted-foreground ml-1">({customerPhone})</span>}
                {isVIP && <span className="text-yellow-500 ml-1">⭐ VIP</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={method === "cash" ? "default" : "outline"}
                className={`flex-1 ${method === "cash" ? "bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0" : "border-border"}`}
                onClick={() => setMethod("cash")}
              >
                <Banknote className="h-4 w-4 mr-1" /> Tiền mặt
              </Button>
              <Button
                size="sm"
                variant={method === "qr" ? "default" : "outline"}
                className={`flex-1 ${method === "qr" ? "bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0" : "border-border"}`}
                onClick={() => setMethod("qr")}
              >
                <QrCode className="h-4 w-4 mr-1" /> QR
              </Button>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              disabled={isPending}
              className="w-full h-11 text-base bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
              onClick={() => {
                if (method === "qr") {
                  setShowQR(true);
                } else {
                  onConfirm("cash", machine.id);
                }
              }}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Xác nhận thanh toán {formatVND(finalTotal)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showQR && (
        <QRPayment
          open={showQR}
          onOpenChange={setShowQR}
          amount={finalTotal}
          note={`${machine.name} - ${finalTotal}`}
          onSuccess={() => {
            setShowQR(false);
            onConfirm("qr", machine.id);
          }}
        />
      )}

      <Dialog
        open={!!printReady}
        onOpenChange={(o) => {
          if (!o && printReady) onClosePrint();
        }}
      >
        <DialogContent className="border-border bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">In hóa đơn</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 mt-2">
            <Button
              className="w-full h-10 bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0"
              onClick={onPrintDone}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Xác nhận
            </Button>
            <Button
              variant="outline"
              className="w-full h-10 border-border"
              onClick={onRetryPrint}
            >
              <Printer className="h-4 w-4 mr-2" /> In lại
            </Button>
            <Button variant="ghost" className="w-full h-10" onClick={onSkipPrint}>
              Bỏ qua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MachineForm({
  title,
  initial,
  onSubmit,
  loading,
}: {
  title: string;
  initial?: any;
  onSubmit: (v: {
    name: string;
    area: string;
    ip?: string;
    pricePerHour: number;
    status: string;
  }) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [area, setArea] = useState(initial?.area ?? "Thường");
  const [ip, setIp] = useState(initial?.ip ?? "");
  const [price, setPrice] = useState(initial?.pricePerHour ?? 8000);
  const [status, setStatus] = useState(initial?.status ?? "idle");

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground">
            {t("machine.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
          />
          {!name && <p className="text-xs text-destructive mt-1">{t("machine.nameRequired")}</p>}
        </div>
        <div>
          <Label className="text-foreground">{t("machine.area")}</Label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              <SelectItem value="Thường">{t("machine.areaNormal")}</SelectItem>
              <SelectItem value="VIP">{t("machine.areaVip")}</SelectItem>
              <SelectItem value="PS5">{t("machine.areaPs5")}</SelectItem>
              <SelectItem value="Stream">{t("machine.areaStream")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-foreground">{t("machine.pricePerHour")}</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground">{t("machine.ip")}</Label>
          <Input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.10"
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground">{t("machine.statusLabel")}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              <SelectItem value="idle">{t("machine.statusIdle")}</SelectItem>
              <SelectItem value="in_use">{t("machine.statusInUse")}</SelectItem>
              <SelectItem value="maintenance">{t("machine.statusMaintenance")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !name || price <= 0}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() => onSubmit({ name, area, ip: ip || undefined, pricePerHour: price, status })}
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AssignDialog({
  machine,
  onClose,
  onAssign,
  loading,
}: {
  machine: any;
  onClose: () => void;
  onAssign: (hours: number) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(1);

  return (
    <Dialog open={!!machine} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-background text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {t("machine.assignTitle", { name: machine?.name ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-foreground text-base">{t("machine.hours")}</Label>
            <div className="flex items-center gap-3 mt-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-12 w-12 border-border"
                onClick={() => setHours((h) => Math.max(0.5, h - 0.5))}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <div className="flex-1 text-center font-bold text-2xl text-foreground tabular-nums">
                {hours}h
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-12 w-12 border-border"
                onClick={() => setHours((h) => Math.min(24, h + 0.5))}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              {[0.5, 1, 2, 3, 5, 8].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setHours(v)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                    hours === v
                      ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {v}h
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button
            disabled={hours <= 0 || loading}
            className="w-full h-11 text-base bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
            onClick={() => onAssign(hours)}
          >
            {loading ? t("common.processing") : t("common.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
