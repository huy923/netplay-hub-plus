import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import {
  listPayments,
  listTransactions,
  confirmPayment,
  refundPayment,
  listNotifications,
  markNotificationRead,
} from "@/lib/cybernet.functions";
import {
  DollarSign,
  Clock,
  RotateCcw,
  Hash,
  CheckCircle2,
  XCircle,
  Loader2,
  Bell,
  BellOff,
  Banknote,
  CreditCard,
  Smartphone,
  User,
  Monitor,
  FileText,
  Inbox,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/payments")({ component: Payments });

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

function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds} giây trước`;
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
      );
    case "partial":
      return (
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
      );
    case "overpaid":
      return (
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500" />
        </span>
      );
    case "pending":
      return (
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
        </span>
      );
    default:
      return (
        <span className="relative flex h-3 w-3">
          <span className="relative inline-flex h-3 w-3 rounded-full bg-muted-foreground/40" />
        </span>
      );
  }
}

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "success":
      return t("payments.statusSuccess");
    case "partial":
      return t("payments.statusPartial");
    case "overpaid":
      return t("payments.statusOverpaid");
    case "pending":
      return t("payments.statusPending");
    case "refunded":
      return t("payments.statusRefunded");
    default:
      return status;
  }
}

function methodIcon(method: string) {
  switch (method) {
    case "qr":
      return <Smartphone className="h-3.5 w-3.5" />;
    case "cash":
      return <Banknote className="h-3.5 w-3.5" />;
    case "wallet":
      return <CreditCard className="h-3.5 w-3.5" />;
    default:
      return <DollarSign className="h-3.5 w-3.5" />;
  }
}

function Payments() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const qc = useQueryClient();
  const [refundOpen, setRefundOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [refundTarget, setRefundTarget] = useState<Record<string, any> | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (
        data.type === "payment.created" ||
        data.type === "payment.success" ||
        data.type === "refund"
      ) {
        qc.invalidateQueries({ queryKey: ["payments"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
      }
      if (data.type === "notification.created") {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    };
    return () => es.close();
  }, [qc]);

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
  });

  const listPaymentsFn = useServerFn(listPayments);
  const listTransactionsFn = useServerFn(listTransactions);
  const listNotificationsFn = useServerFn(listNotifications);
  const confirmFn = useServerFn(confirmPayment);
  const refundFn = useServerFn(refundPayment);
  const markReadFn = useServerFn(markNotificationRead);

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => listPaymentsFn(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => listTransactionsFn({ data: { limit: 100 } }),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotificationsFn({ data: { limit: 50 } }),
  });

  const confirmMutation = useMutation({
    mutationFn: (data: { paymentId: string; receivedAmount: number }) => confirmFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const refundMutation = useMutation({
    mutationFn: (data: { paymentId: string; amount: number; reason: string }) => refundFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (data: { id: string }) => markReadFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const todayStr = (() => {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  })();

  const todayPayments = payments.filter((p: any) => {
    if (!p.createdAt) return false;
    const d = new Date(p.createdAt);
    const s = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    return s === todayStr && p.status === "success";
  });

  const totalRevenueToday = todayPayments.reduce((s: number, p: any) => s + p.amount, 0);
  const pendingCount = payments.filter((p: any) => p.status === "pending").length;
  const refundedCount = payments.filter((p: any) => p.status === "refunded").length;
  const totalTransactions = transactions.length;

  const unreadNotifications = notifications.filter((n: any) => !n.read);

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
            <DollarSign className="h-3 w-3 text-purple-400" />
            {t("payments.label")}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            {t("payments.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("payments.overview")}{" "}
            {new Date().toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4" style={fadeIn(1)}>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div className="text-sm text-muted-foreground">{t("payments.revenueToday")}</div>
            </div>
            <div className="font-display text-2xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mt-1">
              {formatVND(totalRevenueToday)}
            </div>
          </Card>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <div className="text-sm text-muted-foreground">{t("payments.pendingCount")}</div>
            </div>
            <div className="font-display text-2xl font-bold text-foreground mt-1">
              {pendingCount}
            </div>
          </Card>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="h-4 w-4 text-red-400" />
              <div className="text-sm text-muted-foreground">{t("payments.refundedCount")}</div>
            </div>
            <div className="font-display text-2xl font-bold text-foreground mt-1">
              {refundedCount}
            </div>
          </Card>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-purple-400" />
              <div className="text-sm text-muted-foreground">{t("payments.totalTransactions")}</div>
            </div>
            <div className="font-display text-2xl font-bold text-foreground mt-1">
              {totalTransactions}
            </div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          <div className="flex-1 min-w-0" style={fadeIn(2)}>
            <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
              <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-400" />
                {t("payments.transactionList")}
              </div>

              {loadingPayments ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                  <Inbox className="h-10 w-10 mb-3" />
                  <p className="text-sm">{t("payments.noPayments")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-5 font-medium">
                          {t("payments.colStatus")}
                        </th>
                        <th className="text-left py-2 font-medium">{t("payments.colCustomer")}</th>
                        <th className="text-left py-2 font-medium">{t("payments.colMachine")}</th>
                        <th className="text-right py-2 font-medium">{t("payments.colExpected")}</th>
                        <th className="text-right py-2 font-medium">{t("payments.colReceived")}</th>
                        <th className="text-right py-2 font-medium">{t("payments.colDiff")}</th>
                        <th className="text-center py-2 font-medium">{t("payments.colMethod")}</th>
                        <th className="text-left py-2 font-medium">{t("payments.colNote")}</th>
                        <th className="text-left py-2 font-medium">{t("payments.colTime")}</th>
                        <th className="text-center py-2 font-medium pr-5">
                          {t("payments.colAction")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment: any) => {
                        const expected = payment.amount;
                        const received =
                          payment.status === "success" ||
                          payment.status === "partial" ||
                          payment.status === "overpaid"
                            ? payment.amount +
                              (payment.refunds?.reduce((s: number, r: any) => s - r.amount, 0) ?? 0)
                            : payment.amount;
                        const diff =
                          payment.status === "success"
                            ? 0
                            : payment.status === "overpaid"
                              ? received - expected
                              : payment.status === "partial"
                                ? received - expected
                                : 0;
                        const diffAbs = Math.abs(diff);

                        return (
                          <tr
                            key={payment.id}
                            className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                          >
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-2">
                                <StatusIcon status={payment.status} />
                                <span className="text-xs text-muted-foreground">
                                  {statusLabel(payment.status, t)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                {payment.invoice?.customer ?? "—"}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                                {payment.invoice?.machine ?? "—"}
                              </div>
                            </td>
                            <td className="py-3 text-right font-medium text-foreground">
                              {formatVND(expected)}
                            </td>
                            <td className="py-3 text-right font-medium text-foreground">
                              {formatVND(received)}
                            </td>
                            <td className="py-3 text-right">
                              {diffAbs > 0 ? (
                                <span
                                  className={`text-xs font-medium ${
                                    diff > 0 ? "text-green-500" : "text-red-500"
                                  }`}
                                >
                                  {diff > 0 ? "+" : "-"}
                                  {formatVND(diffAbs)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                                {methodIcon(payment.method)}
                                <span className="text-xs capitalize">{payment.method}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5 text-muted-foreground max-w-[140px] truncate">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span className="text-xs truncate">
                                  {payment.transferNote || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground text-xs whitespace-nowrap">
                              {relativeTime(payment.createdAt)}
                            </td>
                            <td className="py-3 pr-5 text-center">
                              {payment.status === "pending" ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      confirmMutation.mutate({
                                        paymentId: payment.id,
                                        receivedAmount: payment.amount,
                                      })
                                    }
                                    disabled={confirmMutation.isPending}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t("payments.btnConfirm")}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRefundTarget(payment);
                                      setRefundAmount(payment.amount);
                                      setRefundReason("");
                                      setRefundOpen(true);
                                    }}
                                    disabled={refundMutation.isPending}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    {t("payments.btnRefund")}
                                  </button>
                                </div>
                              ) : (payment.status === "success" ||
                                  payment.status === "partial" ||
                                  payment.status === "overpaid") &&
                                payment.refunds?.length === 0 ? (
                                <button
                                  onClick={() => {
                                    setRefundTarget(payment);
                                    setRefundAmount(payment.amount);
                                    setRefundReason("");
                                    setRefundOpen(true);
                                  }}
                                  disabled={refundMutation.isPending}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="h-3 w-3" />
                                  {t("payments.btnRefund")}
                                </button>
                              ) : payment.status === "refunded" ? (
                                <span className="text-xs text-muted-foreground/50 flex items-center gap-1 justify-center">
                                  <RotateCcw className="h-3 w-3" />
                                  {t("payments.refunded")}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/30">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="w-full lg:w-80 shrink-0" style={fadeIn(3)}>
            <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
              <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-400" />
                {t("payments.notifications")}
                {unreadNotifications.length > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                  <BellOff className="h-8 w-8 mb-2" />
                  <p className="text-xs">{t("payments.noNotifications")}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {notifications.map((notif: any) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        if (!notif.read) {
                          markReadMutation.mutate({ id: notif.id });
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        notif.read
                          ? "border-border/50 bg-muted/20 hover:bg-muted/40"
                          : "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-medium truncate ${
                              notif.read ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/40 mt-1">
                            {relativeTime(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Refund Dialog */}
      {refundOpen && refundTarget && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm grid place-items-center z-50 p-4"
          onClick={() => setRefundOpen(false)}
        >
          <div
            className="p-6 max-w-sm w-full border border-border bg-card rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">💸</div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {t("payments.refund")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {refundTarget.invoice?.machine ?? "—"} · {formatVND(refundTarget.amount)}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t("payments.refundAmount")}
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  min={1}
                  max={refundTarget.amount}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t("payments.refundReason")}
                </label>
                <input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder={t("payments.refundReasonPlaceholder", "Lý do hoàn tiền...")}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setRefundOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                disabled={!refundReason.trim() || refundAmount < 1 || refundMutation.isPending}
                onClick={() => {
                  refundMutation.mutate(
                    {
                      paymentId: refundTarget.id,
                      amount: refundAmount,
                      reason: refundReason.trim(),
                    },
                    {
                      onSuccess: () => {
                        setRefundOpen(false);
                        setRefundTarget(null);
                      },
                    },
                  );
                }}
              >
                {refundMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("payments.refundConfirm")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
