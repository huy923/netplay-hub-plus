import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  MonitorPlay,
  Users,
  UserCog,
  UtensilsCrossed,
  Receipt,
  BarChart3,
  Tag,
  Settings,
  ClipboardList,
  Moon,
  Sun,
  LogOut,
  Gamepad2,
  Monitor,
  Bell,
  X,
  Menu,
  PackagePlus,
  Volume2,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCursingRequests,
  completeCursingRequest,
  getLowStockItems,
  getCurrentUser,
  logoutUser,
  listNotifications,
  markNotificationRead,
  listStaffRequests,
  claimInvoice,
} from "@/lib/cybernet.functions";
import { formatVND } from "@/lib/format";
import { LanguageSwitcher } from "./language-switcher";
import { useRealtime } from "@/hooks/use-realtime";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const adminNav = (t: (key: string) => string) => [
  { to: "/admin", icon: LayoutDashboard, label: t("nav.dashboard") },
  { to: "/admin/machines", icon: MonitorPlay, label: t("nav.machines") },
  { to: "/admin/keyboards", icon: Gamepad2, label: t("nav.keyboards") },
  { to: "/admin/pos", icon: Receipt, label: t("nav.pos") },
  { to: "/admin/menu", icon: UtensilsCrossed, label: t("nav.menu") },
  { to: "/admin/payments", icon: Monitor, label: t("nav.payments") },
  { to: "/admin/customers", icon: Users, label: t("nav.customers") },
  { to: "/admin/users", icon: UserCog, label: t("nav.users") },
  { to: "/admin/reports", icon: BarChart3, label: t("nav.reports") },
  { to: "/admin/discounts", icon: Tag, label: t("nav.discounts") },
  { to: "/admin/settings", icon: Settings, label: t("nav.settings") },
  { to: "/admin/purchase-orders", icon: PackagePlus, label: t("nav.purchaseOrders") },
  { to: "/admin/audit-log", icon: ClipboardList, label: t("nav.auditLog") },
];

const cashierNav = (t: (key: string) => string) => [
  { to: "/admin", icon: LayoutDashboard, label: t("nav.dashboard") },
  { to: "/admin/machines", icon: MonitorPlay, label: t("nav.machines") },
  { to: "/admin/pos", icon: Receipt, label: t("nav.pos") },
  { to: "/admin/menu", icon: UtensilsCrossed, label: t("nav.menu") },
  { to: "/admin/payments", icon: Monitor, label: t("nav.payments") },
  { to: "/admin/customers", icon: Users, label: t("nav.customers") },
];

export function AdminShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const currentUser = useServerFn(getCurrentUser);
  const doLogout = useServerFn(logoutUser);
  const fetchCursingReqs = useServerFn(listCursingRequests);
  const fetchLowStockItems = useServerFn(getLowStockItems);
  const fetchNotifications = useServerFn(listNotifications);
  const fetchStaffReqs = useServerFn(listStaffRequests);
  const claimInvoiceFn = useServerFn(claimInvoice);
  const completeCursing = useServerFn(completeCursingRequest);
  const markReadFn = useServerFn(markNotificationRead);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    currentUser().then((u) => {
      if (!u) {
        navigate({ to: "/login" });
        return;
      }
      setUser(u);
      setAuthReady(true);
      if (u.role === "admin") {
        const hostname = window.location.hostname;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
        if (!isLocal) navigate({ to: "/login" });
      }
      if (u.role === "cashier") {
        const restricted = ["/admin/keyboards", "/admin/reports", "/admin/settings"];
        if (restricted.some((p) => loc.pathname.startsWith(p))) {
          navigate({ to: "/admin" });
        }
      }
    });
  }, [loc.pathname]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const resume = () => {
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
      document.removeEventListener("click", resume);
    };
    document.addEventListener("click", resume, { once: true });
    return () => document.removeEventListener("click", resume);
  }, []);

  const handleLogout = async () => {
    await doLogout();
    navigate({ to: "/" });
  };

  const [notifOpen, setNotifOpen] = useState(false);

  const { data: cursingReqs = [], refetch: refetchCursing } = useQuery({
    queryKey: ["cursing-requests"],
    queryFn: () => fetchCursingReqs(),
    refetchInterval: 15_000,
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: () => fetchLowStockItems(),
    refetchInterval: 30_000,
  });

  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications({ data: { limit: 30 } }),
    refetchInterval: 10_000,
  });

  const { data: staffRequests = [], refetch: refetchStaffReqs } = useQuery({
    queryKey: ["staff-requests"],
    queryFn: () => fetchStaffReqs(),
    refetchInterval: 5_000,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioReadyRef = useRef(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showBellHint, setShowBellHint] = useState(false);
  const beepedRef = useRef(false);
  const bellDoneRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      bellDoneRef.current = localStorage.getItem("cybernet-bell-done") === "1";
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (audioUnlocked) {
      setShowBellHint(false);
      try {
        localStorage.setItem("cybernet-bell-done", "1");
      } catch {
        /* ignore */
      }
      if (!beepedRef.current) {
        beepedRef.current = true;
        playNotifSound();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUnlocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let alive = true;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "running") {
        setAudioUnlocked(true);
      } else {
        const p = ctx.resume();
        if (p && typeof p.then === "function") {
          p.then(() => {
            if (alive && ctx.state === "running") setAudioUnlocked(true);
          }).catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      if (!alive) return;
      if (!audioUnlocked) {
        let done = false;
        try {
          done = localStorage.getItem("cybernet-bell-done") === "1";
        } catch {
          /* ignore */
        }
        if (!done) setShowBellHint(true);
      }
    }, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockAudio = useCallback(() => {
    audioReadyRef.current = true;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "running") {
        setAudioUnlocked(true);
        return;
      }
      const p = ctx.resume();
      if (p && typeof p.then === "function") {
        p.then(() => {
          if (ctx.state === "running") setAudioUnlocked(true);
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("mousedown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    window.addEventListener("click", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("mousedown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("click", unlockAudio);
    };
  }, [unlockAudio]);

  const playNotifSound = () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      }
      const playNotes = () => {
        try {
          const notes = [880, 1100, 1320, 1100, 880];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.12);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.12);
          });
        } catch {
          /* ignore */
        }
        setAudioUnlocked(true);
      };
      if (ctx.state === "suspended") {
        const resumePromise = ctx.resume();
        if (resumePromise && typeof resumePromise.then === "function") {
          resumePromise.then(playNotes).catch(() => {});
        } else {
          playNotes();
        }
        return;
      }
      playNotes();
    } catch {
      /* ignore */
    }
  };

  const sseStatusRef = useRef<"connected" | "disconnected" | "connecting">("connecting");
  const [sseStatus, setSseStatusState] = useState<"connected" | "disconnected" | "connecting">(
    "connecting",
  );
  const setSseStatus = (s: "connected" | "disconnected" | "connecting") => {
    sseStatusRef.current = s;
    setSseStatusState(s);
  };

  useEffect(() => {
    let es: EventSource | null = null;
    function connect() {
      es = new EventSource("/api/sse");
      es.onopen = () => setSseStatus("connected");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "staff.request") {
            refetchNotifs();
            refetchStaffReqs();
            playNotifSound();
            retryTimestampsRef.current.set(data.invoiceId, Date.now());
            showDesktopNotif(
              `${data.machine} — ${formatVND(data.amount)}`,
              t("payment.callStaffMessage"),
            );
            toast(`🔔 ${data.machine}`, {
              description: `${formatVND(data.amount)} — ${data.time}`,
              duration: 15000,
              action: {
                label: t("payments.btnConfirm"),
                onClick: () => navigate({ to: "/admin/payments" }),
              },
            });
          }

          if (data.type === "invoice.claimed") {
            refetchNotifs();
            refetchStaffReqs();
            retryTimestampsRef.current.delete(data.id);
          }

          if (data.type === "order:created") {
            refetchNotifs();
            playNotifSound();
            const title = `🔔 ${data.machine} gọi đồ`;
            const desc =
              (data.items || []).join(", ") + (data.total ? ` — ${formatVND(data.total)}` : "");
            showDesktopNotif(title, desc);
            toast(title, {
              description: desc,
              duration: 15000,
              action: {
                label: t("nav.menu"),
                onClick: () => navigate({ to: "/admin/pos" }),
              },
            });
          }

          if (data.type === "notification.created") {
            refetchNotifs();
            playNotifSound();
            const title = data.title || "Thông báo mới";
            const desc = data.message || "";
            showDesktopNotif(title, desc);
            if (title && !data.title?.includes("gọi đồ")) {
              toast(`🔔 ${title}`, {
                description: desc,
                duration: 10000,
              });
            }
          }

          if (data.type === "payment.success") {
            refetchNotifs();
            playNotifSound();
            const amount = data.total ?? data.expectedAmount ?? data.receivedAmount ?? 0;
            const machine = data.machine ?? data.releasedMachine ?? "";
            const title = machine
              ? `✅ Máy ${machine} thanh toán thành công`
              : "✅ Thanh toán thành công";
            const desc = `${formatVND(amount)}${data.diff && data.diff !== 0 ? ` (chênh lệch ${formatVND(data.diff)})` : ""}`;
            showDesktopNotif(title, desc);
            toast.success(title, { description: desc, duration: 10000 });
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        setSseStatus("disconnected");
        es?.close();
        setTimeout(connect, 3000);
      };
    }
    connect();
    return () => es?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastNotifIdRef = useRef<string | null>(null);
  useEffect(() => {
    const notifs = (notifications as any[]) ?? [];
    if (notifs.length === 0) return;
    const latest = notifs.find(
      (n: any) =>
        n.type === "FOOD_ORDER" ||
        n.type === "COMBO_ORDER" ||
        n.type === "MACHINE_EXTENDED" ||
        n.type === "STAFF_REQUEST" ||
        n.type === "ORDER_CANCELLED",
    );
    if (!latest) return;
    if (latest.id !== lastNotifIdRef.current) {
      lastNotifIdRef.current = latest.id;
      if (sseStatusRef.current !== "connected") playNotifSound();
    }
  }, [notifications as any]);

  const unreadNotifs = (notifications as any[]).filter(
    (n: any) =>
      !n.read &&
      (n.type === "FOOD_ORDER" ||
        n.type === "COMBO_ORDER" ||
        n.type === "MACHINE_EXTENDED" ||
        n.type === "STAFF_REQUEST"),
  );

  const pendingReqs = cursingReqs.filter((r: { status: string }) => r.status === "pending");
  const pendingStaffReqs = (staffRequests as any[]).filter((r: any) => r.status === "Chờ");
  const notifCount =
    pendingReqs.length + lowStockItems.length + unreadNotifs.length + pendingStaffReqs.length;

  const handleComplete = async (id: string) => {
    await completeCursing({ data: { id } });
    refetchCursing();
  };

  const handleClaimInvoice = async (invoiceId: string) => {
    if (!user) return;
    const result = await claimInvoiceFn({ data: { invoiceId, staffName: user.username } });
    if (result?.ok) {
      toast.success(t("common.success"));
      refetchStaffReqs();
      refetchNotifs();
    } else if (result?.error === "already_claimed") {
      toast.warning(t("payment.processingBy", { name: result.assignedTo }));
    }
  };

  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  useRealtime();

  const [notifPerm, setNotifPerm] = useState<string>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setNotifPerm(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => setNotifPerm(p));
      }
    }
  }, []);

  const retryTimestampsRef = useRef<Map<string, number>>(new Map());
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showDesktopNotif = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "cybernet-staff",
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        navigate({ to: "/admin/payments" });
        n.close();
      };
    }
  };

  useEffect(() => {
    const checkRetry = () => {
      const now = Date.now();
      for (const [invoiceId, timestamp] of retryTimestampsRef.current.entries()) {
        if (now - timestamp >= 30_000) {
          const req = (staffRequests as any[]).find((r: any) => r.id === invoiceId);
          if (req && req.status === "Chờ" && !req.assignedTo) {
            playNotifSound();
            toast.warning(`${req.machine}`, {
              description: formatVND(req.amount),
              duration: 15000,
              action: {
                label: t("payments.btnConfirm"),
                onClick: () => navigate({ to: "/admin/payments" }),
              },
            });
            showDesktopNotif(
              `${req.machine} — ${formatVND(req.amount)}`,
              t("payment.callStaffMessage"),
            );
            retryTimestampsRef.current.set(invoiceId, now);
            showDesktopNotif("💰 Yêu cầu chưa xử lý", `${req.machine} — ${formatVND(req.amount)}`);
          } else {
            retryTimestampsRef.current.delete(invoiceId);
          }
        }
      }
    };
    retryIntervalRef.current = setInterval(checkRetry, 10_000);
    return () => {
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [staffRequests, navigate]);

  if (!user) return null;
  const nav = user.role === "admin" ? adminNav(t) : cashierNav(t);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
          <Gamepad2 className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-base font-semibold leading-tight">CyberNet</div>
          <div className="text-xs text-sidebar-foreground/60">{t("nav.appSubtitle")}</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((n) => {
          const active =
            loc.pathname === n.to || (n.to !== "/admin" && loc.pathname.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/85"
              }`}
            >
              <n.icon className={`h-4 w-4 ${active ? "" : "text-sidebar-foreground/85"}`} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Link
          to="/play"
          onClick={() => setMobileOpen(false)}
          className="block text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground px-3"
        >
          {t("nav.openCustomerUI")}
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        {sidebarContent}
      </aside>

      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-64 h-full bg-sidebar text-sidebar-foreground flex flex-col animate-[slideInLeft_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-sidebar-accent grid place-items-center text-sidebar-foreground/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden h-9 w-9 rounded-lg bg-secondary/50 hover:bg-secondary grid place-items-center border border-border transition-all"
            >
              <Menu className="h-4 w-4 text-secondary-foreground" />
            </button>
            <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-medium hidden sm:inline">
              ● {t("nav.openShift")}
            </span>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.role === "admin" ? t("nav.adminRole") : t("nav.cashierRole")}:{" "}
              <b className="text-foreground">{user?.username ?? ""}</b>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setNotifOpen(true);
                unlockAudio();
              }}
              className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-secondary/50 hover:bg-secondary grid place-items-center border border-border transition-all"
              title={t("nav.notifications")}
            >
              <Bell className="h-4 w-4 text-secondary-foreground" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center shadow-lg">
                  {notifCount}
                </span>
              )}
            </button>
            <span
              title={`SSE: ${sseStatus}`}
              className={`hidden sm:inline-flex h-2 w-2 rounded-full ${
                sseStatus === "connected"
                  ? "bg-emerald-500"
                  : sseStatus === "connecting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-500 animate-pulse"
              }`}
            />
            {!audioUnlocked && !bellDoneRef.current && (
              <button
                onClick={unlockAudio}
                title="Bấm để bật chuông thông báo (trình duyệt chặn âm thanh tự động)"
                className="h-9 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold grid place-items-center border border-amber-500/40 transition-all animate-pulse"
              >
                <Volume2 className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Bật chuông</span>
              </button>
            )}
            <LanguageSwitcher />
            <button
              onClick={toggle}
              title={
                theme === "dark"
                  ? t("nav.themeLight")
                  : theme === "light"
                    ? t("nav.themeDark")
                    : t("nav.themeSystem")
              }
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-secondary/50 hover:bg-secondary grid place-items-center border border-border transition-all"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-secondary-foreground" />
              ) : theme === "light" ? (
                <Moon className="h-4 w-4 text-secondary-foreground" />
              ) : (
                <Monitor className="h-4 w-4 text-secondary-foreground" />
              )}
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-sm font-semibold shadow-glow ml-1">
              {user?.username?.charAt(0).toUpperCase() ?? "NL"}
            </div>
          </div>
        </header>
        {showBellHint && !audioUnlocked && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 flex items-center gap-2 text-sm animate-[fadeIn_0.3s_ease-out]">
            <Volume2 className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-amber-200">
              Trình duyệt chặn âm thanh tự động — <b>bấm vào bất kỳ đâu trên trang</b> một lần để
              bật chuông thông báo (không cần bấm nút riêng).
            </span>
          </div>
        )}
        {notifPerm === "denied" && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-amber-200">
              Trình duyệt đang chặn thông báo desktop. Hãy vào{" "}
              <button
                onClick={() => {
                  if ("Notification" in window)
                    Notification.requestPermission().then((p) => setNotifPerm(p));
                }}
                className="underline font-semibold hover:text-amber-100"
              >
                cài đặt thông báo
              </button>{" "}
              để cho phép.
            </span>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}

      {notifOpen && (
        <div className="fixed top-14 right-2 sm:right-4 z-50 w-[calc(100vw-1rem)] sm:w-96 max-h-[70vh] overflow-auto rounded-2xl border border-border bg-card shadow-2xl animate-[fadeIn_0.15s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-pink-400" />
              {t("notif.title")}
              {notifCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">
                  {notifCount}
                </span>
              )}
            </h3>
            <button
              onClick={() => setNotifOpen(false)}
              className="text-muted-foreground hover:text-foreground h-6 w-6 rounded-md hover:bg-muted grid place-items-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border">
            {pendingReqs.length > 0 &&
              pendingReqs.map(
                (r: { id: string; machine: string; customer: string; price: number }) => (
                  <div key={r.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🎤</span>
                          <span className="text-xs font-semibold text-foreground">
                            {t("notif.cursingRequest")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <b className="text-foreground">{r.machine}</b> — {r.customer} —{" "}
                          <span className="text-pink-400 font-medium">{formatVND(r.price)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 h-7 px-2 text-[10px] bg-linear-to-r from-pink-500 to-rose-500 text-white border-0"
                        onClick={() => handleComplete(r.id)}
                      >
                        {t("notif.markDone")}
                      </Button>
                    </div>
                  </div>
                ),
              )}

            {lowStockItems.length > 0 &&
              lowStockItems.map(
                (item: { id: string; name: string; stock: number; lowStockThreshold: number }) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📦</span>
                      <span className="text-xs font-semibold text-foreground">{item.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t("notif.stockInfo", {
                        stock: item.stock,
                        threshold: item.lowStockThreshold,
                      })}
                    </div>
                  </div>
                ),
              )}

            {pendingStaffReqs.map((r: any) => (
              <div
                key={r.id}
                className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  navigate({ to: "/admin/payments" });
                  setNotifOpen(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">💰</span>
                      <span className="text-xs font-semibold text-foreground">
                        {t("payment.callStaffSuccessTitle")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <b className="text-foreground">{r.machine}</b> — {formatVND(r.amount)}
                    </div>
                    {r.assignedTo ? (
                      <div className="text-[10px] text-blue-400 mt-0.5">
                        {t("payment.processingBy", { name: r.assignedTo })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-400 mt-0.5">
                        {t("payment.unclaimed")}
                      </div>
                    )}
                  </div>
                  {!r.assignedTo && (
                    <Button
                      size="sm"
                      className="shrink-0 h-7 px-2 text-[10px] bg-linear-to-r from-green-500 to-emerald-500 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimInvoice(r.id);
                      }}
                    >
                      {t("payments.btnConfirm")}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {unreadNotifs.map((n: any) => (
              <div
                key={n.id}
                className="px-4 py-3 hover:bg-muted/50 transition-colors flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</div>
                </div>
                <button
                  className="shrink-0 text-muted-foreground hover:text-foreground h-6 w-6 rounded-md hover:bg-muted grid place-items-center"
                  onClick={() => markReadFn({ data: { id: n.id } })}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {notifCount === 0 && (
              <div className="text-xs text-muted-foreground/50 text-center py-8">
                <Bell className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                {t("notif.noNotifications")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
