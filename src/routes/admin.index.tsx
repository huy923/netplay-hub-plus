import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { formatVND } from "@/lib/format";
// import { listMachines, listInvoices, getSalesReport, getSalesReport } from "@/lib/cybernet.functions";
import { TrendingUp, MonitorPlay, Users, Coffee, Zap } from "lucide-react";
import { listMachines, listInvoices } from "@/lib/cybernet.functions";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

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

function Dashboard() {
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
  const lm = useServerFn(listMachines);
  const li = useServerFn(listInvoices);
  const { data: machines = [] } = useQuery({ queryKey: ["machines"], queryFn: () => lm() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => li() });

  const inUse = machines.filter((m) => m.status === "in_use").length;
  const idle = machines.filter((m) => m.status === "idle").length;
  const maint = machines.filter((m) => m.status === "maintenance").length;
  const todayLocal = new Date();
  const todayStr = [
    todayLocal.getFullYear(),
    String(todayLocal.getMonth() + 1).padStart(2, "0"),
    String(todayLocal.getDate()).padStart(2, "0"),
  ].join("-");
  const todayInvoices = invoices.filter((i) => {
    if (!i.createdAt) return false;
    const d = new Date(i.createdAt);
    const invStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    return invStr === todayStr;
  });
  const revenue = todayInvoices
    .filter((i) => i.status === "Đã thanh toán")
    .reduce((s, i) => s + i.amount, 0);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const stats = [
    {
      label: t("dashboard.revenueToday"),
      value: formatVND(revenue),
      icon: TrendingUp,
      tone: "primary",
      sub: `${dateStr} — ${timeStr}`,
    },
    {
      label: t("dashboard.machinesInUse"),
      value: `${inUse}/${machines.length}`,
      icon: MonitorPlay,
      tone: "info",
      sub: t("dashboard.idleMaint", { idle, maint }),
    },
    {
      label: t("dashboard.playersActive"),
      value: String(inUse),
      icon: Users,
      tone: "success",
      sub: t("dashboard.realtimeTracking"),
    },
    {
      label: t("dashboard.invoices"),
      value: String(invoices.length),
      icon: Coffee,
      tone: "warning",
      sub: t("dashboard.recentLabel"),
    },
  ] as const;

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
            <Zap className="h-3 w-3 text-warning" />
            {t("dashboard.label")}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            {t("dashboard.title")}
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={fadeIn(1)}>
          {stats.map((s) => (
            <Card
              key={s.label}
              className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="font-display text-2xl font-bold text-foreground mt-1">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted border border-border">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div style={fadeIn(2)} className="mt-6">
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Coffee className="h-4 w-4 text-primary" />
              {t("dashboard.todayInvoices", "Hóa đơn hôm nay")}
              <span className="ml-auto text-xs font-mono text-muted-foreground">{timeStr}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 font-medium">{t("dashboard.tableMachine")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.tableCustomer")}</th>
                    <th className="text-right py-2 font-medium">{t("dashboard.tableAmount")}</th>
                    <th className="text-left py-2 font-medium pl-4">
                      {t("dashboard.tableMethod")}
                    </th>
                    <th className="text-left py-2 font-medium">{t("dashboard.tableStatus")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.tableTime")}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        {t("dashboard.noInvoices")}
                      </td>
                    </tr>
                  )}
                  {todayInvoices.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 text-foreground">{i.machine}</td>
                      <td className="py-3 text-muted-foreground">{i.customer}</td>
                      <td className="py-3 text-right font-semibold text-foreground">
                        {formatVND(i.amount)}
                      </td>
                      <td className="py-3 pl-4 text-muted-foreground">{i.method}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            i.status === "Đã thanh toán"
                              ? "bg-success/15 text-success"
                              : i.status === "Chờ"
                                ? "bg-warning/20 text-warning"
                                : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {i.status}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{i.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
