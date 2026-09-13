import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { formatVND } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInvoices, getSalesReport, getDashboardAnalytics } from "@/lib/cybernet.functions";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  type TooltipProps,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Zap,
  Receipt,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  MonitorPlay,
} from "lucide-react";

export const Route = createFileRoute("/admin/reports")({ component: Reports });

const MONTH_LABELS: Record<string, string> = {
  "01": "T1",
  "02": "T2",
  "03": "T3",
  "04": "T4",
  "05": "T5",
  "06": "T6",
  "07": "T7",
  "08": "T8",
  "09": "T9",
  "10": "T10",
  "11": "T11",
  "12": "T12",
};

const toLabel = (month: string) => {
  const [, mm] = month.split("-");
  return MONTH_LABELS[mm] ?? mm;
};

const formatVNDShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}Tr` : `${(n / 1000).toFixed(0)}K`;

const PIE_COLORS = ["#a78bfa", "#f472b6", "#34d399"];
const MACHINE_COLORS = ["#60a5fa", "#9ca3af", "#fbbf24"];

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

function Reports() {
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

  const { data: report } = useQuery({
    queryKey: ["sales-report"],
    queryFn: useServerFn(getSalesReport),
  });

  const { data: analytics } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: useServerFn(getDashboardAnalytics),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: useServerFn(listInvoices),
  });

  const totalRevenue = report?.totalRevenue ?? 0;
  const totalInvoices = report?.totalInvoices ?? 0;
  const totalHours = report?.totalHours ?? 0;
  const monthly = (report?.monthly ?? []).map((m) => ({
    ...m,
    label: toLabel(m.month),
  }));

  const revBreakdown = analytics?.revenueBreakdown;
  const pieData = revBreakdown
    ? [
        { name: t("report.machineSessions"), value: revBreakdown.machine },
        { name: t("report.menuSales"), value: revBreakdown.menu },
        { name: t("report.keyboardRental"), value: revBreakdown.keyboard },
      ]
    : [];

  const machineUsage = analytics?.machineUsage;
  const usageData = machineUsage
    ? [
        { name: t("machine.statusInUse"), value: machineUsage.inUse },
        { name: t("machine.statusIdle"), value: machineUsage.idle },
        { name: t("machine.statusMaintenance"), value: machineUsage.maintenance },
      ]
    : [];

  const comparison = analytics?.comparison;
  const prediction = analytics?.prediction;

  const dailyRevenue = (analytics?.dailyRevenue ?? []).map((d) => ({
    ...d,
    label: d.date.slice(8),
  }));

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload?.length) {
      return (
        <div className="bg-background border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
          <p className="text-muted-foreground">{label}</p>
          <p className="font-semibold text-foreground">{formatVND(payload[0].value ?? 0)}</p>
        </div>
      );
    }
    return null;
  };

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
            <BarChart3 className="h-3 w-3 text-purple-400" />
            {t("report.label")}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            {t("report.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("report.overview")}{" "}
            {new Date().toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3" style={fadeIn(1)}>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <div className="text-sm text-muted-foreground">{t("report.totalRevenue")}</div>
            </div>
            <div className="font-display text-2xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mt-1">
              {formatVND(totalRevenue)}
            </div>
          </Card>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-purple-400" />
              <div className="text-sm text-muted-foreground">{t("report.totalInvoices")}</div>
            </div>
            <div className="font-display text-2xl font-bold text-foreground mt-1">
              {totalInvoices.toLocaleString("vi-VN")}
            </div>
          </Card>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl hover:border-border transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <div className="text-sm text-muted-foreground">{t("report.totalHours")}</div>
            </div>
            <div className="font-display text-2xl font-bold text-foreground mt-1">
              {totalHours.toLocaleString("vi-VN")}h
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-6" style={fadeIn(2)}>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-purple-400" />
              {t("report.revenueBreakdown")}
            </div>
            {pieData.every((d) => d.value === 0) ? (
              <p className="text-sm text-muted-foreground/60 py-8 text-center">
                {t("common.noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={4}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatVND(value)} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-purple-400" />
              {t("report.machineDistribution")}
            </div>
            {machineUsage?.total === 0 ? (
              <p className="text-sm text-muted-foreground/60 py-8 text-center">
                {t("common.noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={usageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={4}
                  >
                    {usageData.map((_, i) => (
                      <Cell key={i} fill={MACHINE_COLORS[i % MACHINE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-6" style={fadeIn(3)}>
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              {t("report.comparison")}
            </div>
            {comparison ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("report.thisMonth")}</div>
                    <div className="font-display text-xl font-bold text-foreground mt-1">
                      {formatVND(comparison.thisMonth)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t("report.lastMonth")}</div>
                    <div className="font-display text-xl font-bold text-foreground mt-1">
                      {formatVND(comparison.lastMonth)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  {comparison.change >= 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">
                        +{formatVND(comparison.change)} (+{comparison.changePercent}%)
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                      <span className="text-destructive font-medium">
                        {formatVND(comparison.change)} ({comparison.changePercent}%)
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">vs {t("report.lastMonth")}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 py-8 text-center">
                {t("common.loading")}
              </p>
            )}
          </Card>

          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-400" />
              {t("report.prediction")}
            </div>
            {prediction?.nextMonth != null ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-linear-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                  <div className="text-sm text-muted-foreground">{t("report.predictedNext")}</div>
                  <div className="font-display text-2xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mt-1">
                    {formatVND(prediction.nextMonth)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" />
                    Linear Regression &middot; {monthly.length} months
                  </div>
                </div>
              </div>
            ) : monthly.length < 2 ? (
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 py-8 text-center">
                {t("common.loading")}
              </p>
            )}
          </Card>
        </div>

        <div style={fadeIn(4)} className="mt-6">
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              {t("report.dailyRevenue")}
            </div>
            {dailyRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 py-8 text-center">
                {t("common.noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatVNDShort}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div style={fadeIn(5)} className="mt-6">
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              {t("report.revenueChart")}
            </div>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 py-8 text-center">
                {t("common.noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatVNDShort}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatVND(value), t("report.revenue")]}
                    labelFormatter={(label) => `${t("report.month")} ${label}`}
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: 13,
                      color: "var(--foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#a78bfa" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div style={fadeIn(6)} className="mt-6">
          <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
            <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-400" />
              {t("dashboard.recentInvoices")}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 font-medium">{t("report.tableMachine")}</th>
                    <th className="text-left py-2 font-medium">{t("report.tableCustomer")}</th>
                    <th className="text-right py-2 font-medium">{t("report.tableAmount")}</th>
                    <th className="text-center py-2 font-medium">{t("report.tableMethod")}</th>
                    <th className="text-center py-2 font-medium">{t("report.tableTime")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 text-foreground">{inv.machine}</td>
                      <td className="py-2 text-muted-foreground">{inv.customer}</td>
                      <td className="text-right py-2 font-medium text-foreground">
                        {formatVND(inv.amount)}
                      </td>
                      <td className="text-center py-2 text-muted-foreground">{inv.method}</td>
                      <td className="text-center py-2 text-muted-foreground">{inv.time}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground/50">
                        {t("common.noInvoices")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
