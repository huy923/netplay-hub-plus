import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuditLogs, getLoginAttempts } from "@/lib/cybernet.functions";
import { format } from "date-fns";
import { ClipboardList, LogIn, ShieldAlert, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/audit-log")({ component: AuditLog });

type TabKey = "audit" | "login";

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

const actionBadge = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("tạo"))
    return "bg-green-500/15 text-green-400 border-green-500/30";
  if (lower.includes("update") || lower.includes("sửa"))
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (lower.includes("delete") || lower.includes("xóa"))
    return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border-border";
};

function AuditLog() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("audit");

  const TABS: { key: TabKey; label: string; icon: typeof ClipboardList }[] = [
    { key: "audit", label: t("auditLog.auditTab"), icon: ClipboardList },
    { key: "login", label: t("auditLog.loginTab"), icon: LogIn },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
  });

  const getAuditLogsFn = useServerFn(getAuditLogs);
  const getLoginAttemptsFn = useServerFn(getLoginAttempts);

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => getAuditLogsFn({ data: { limit: 100 } }),
  });

  const { data: loginAttempts = [] } = useQuery({
    queryKey: ["login-attempts"],
    queryFn: () => getLoginAttemptsFn({ data: { limit: 50 } }),
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
            <ShieldAlert className="h-3 w-3 text-purple-400" />
            {t("auditLog.title")}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            {t("auditLog.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("auditLog.subtitle")}</p>
        </div>

        <div style={fadeIn(1)} className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                    : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "audit" && (
          <div style={fadeIn(1)}>
            <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
              <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-400" />
                {t("auditLog.auditTab")}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">{t("auditLog.tableTime")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableUser")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableAction")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableTarget")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableDetails")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableIp")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 text-foreground whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd/MM HH:mm")}
                        </td>
                        <td className="py-2 text-foreground font-medium">{log.username}</td>
                        <td className="py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${actionBadge(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">{log.target ?? "—"}</td>
                        <td className="py-2 text-muted-foreground max-w-50 truncate">
                          {log.details ?? "—"}
                        </td>
                        <td className="py-2 text-muted-foreground font-mono text-xs">
                          {log.ip ?? "—"}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground/50">
                          {t("common.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "login" && (
          <div style={fadeIn(1)}>
            <Card className="p-5 border border-border bg-card/80 backdrop-blur-xl">
              <div className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <LogIn className="h-4 w-4 text-purple-400" />
                {t("auditLog.loginHistory")}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">{t("auditLog.tableTime")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableIp")}</th>
                      <th className="text-left py-2 font-medium">{t("auditLog.tableAccount")}</th>
                      <th className="text-center py-2 font-medium">{t("auditLog.tableResult")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginAttempts.map((att) => (
                      <tr
                        key={att.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 text-foreground whitespace-nowrap">
                          {format(new Date(att.createdAt), "dd/MM HH:mm")}
                        </td>
                        <td className="py-2 text-muted-foreground font-mono text-xs">{att.ip}</td>
                        <td className="py-2 text-foreground font-medium">{att.username}</td>
                        <td className="text-center py-2">
                          {att.success ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                              <CheckCircle className="h-3 w-3" />
                              {t("auditLog.success")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                              <XCircle className="h-3 w-3" />
                              {t("auditLog.failure")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {loginAttempts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground/50">
                          {t("common.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
