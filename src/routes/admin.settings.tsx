import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  Zap,
  Shield,
  Building2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  QrCode,
  Loader2,
} from "lucide-react";
import {
  getSettings,
  updateSettings,
  changeAdminPassword,
  getBankSettings,
  verifySettingsPassword,
  lookupBankAccount,
} from "@/lib/cybernet.functions";

export const Route = createFileRoute("/admin/settings")({ component: Settings });

const PASSWORD_SESSION_KEY = "settings_password_verified";

function Settings() {
  const { t } = useTranslation();
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const verifyPasswordFn = useServerFn(verifySettingsPassword);
  const getSettingsFn = useServerFn(getSettings);

  useEffect(() => {
    const session = sessionStorage.getItem(PASSWORD_SESSION_KEY);
    if (session === "true") {
      setPasswordVerified(true);
      return;
    }
    getSettingsFn()
      .then((s) => {
        if (s.admin_password) {
          setShowPasswordGate(true);
        } else {
          setPasswordVerified(true);
          sessionStorage.setItem(PASSWORD_SESSION_KEY, "true");
        }
      })
      .catch(() => {
        setPasswordVerified(true);
        sessionStorage.setItem(PASSWORD_SESSION_KEY, "true");
      });
  }, []);

  const handlePasswordSubmit = async (password: string) => {
    try {
      const result = await verifyPasswordFn({ data: { password } });
      if (result.ok) {
        setPasswordVerified(true);
        setShowPasswordGate(false);
        sessionStorage.setItem(PASSWORD_SESSION_KEY, "true");
      }
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  };

  if (showPasswordGate && !passwordVerified) {
    return <PasswordGate onSubmit={handlePasswordSubmit} />;
  }

  if (!passwordVerified) {
    return null;
  }

  return <SettingsContent />;
}

function PasswordGate({ onSubmit }: { onSubmit: (pw: string) => void }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(password);
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 w-full max-w-sm border border-border bg-card/80 backdrop-blur-xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 grid place-items-center">
          <KeyRound className="h-8 w-8 text-purple-400" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("settings.security")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settings.enterPasswordToAccess")}
          </p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••"
              className="border-border bg-background text-foreground text-center text-lg tracking-widest pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!password || loading}
            className="w-full bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          >
            <Lock className="h-4 w-4 mr-2" />
            {loading ? t("common.saving") : t("common.gotIt")}
          </Button>
        </div>
      </Card>
    </div>
  );
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

const DEFAULTS: Record<string, string> = {
  store_name: "CyberNet Gaming Hub",
  store_phone: "0901 234 567",
  store_address: "123 Nguyễn Huệ, Q.1, TP.HCM",
  store_email: "info@cybernet.vn",
  normal_zone_price: "8000",
  vip_zone_price: "15000",
  ps5_price: "20000",
  auto_end_session: "true",
  send_notifications: "true",
  maintenance_mode: "false",
};

function SettingsContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const getSettingsFn = useServerFn(getSettings);
  const updateSettingsFn = useServerFn(updateSettings);
  const changePasswordFn = useServerFn(changeAdminPassword);
  const getBankSettingsFn = useServerFn(getBankSettings);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettingsFn().then((s) => ({ ...DEFAULTS, ...s })),
  });

  const { data: bankSettings } = useQuery({
    queryKey: ["bankSettings"],
    queryFn: () => getBankSettingsFn(),
  });

  const saveMutation = useMutation({
    mutationFn: (vals: Record<string, string>) => updateSettingsFn({ data: vals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["bankSettings"] });
      toast.success(t("settings.saveSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
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

      <div className="relative z-10 p-6 max-w-3xl">
        <div style={fadeIn(0)} className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
            <SettingsIcon className="h-3 w-3 text-purple-400" />
            {t("settings.label")}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            {t("settings.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
        </div>

        {/* Store Info */}
        <Card
          className="p-5 space-y-4 border border-border bg-card/80 backdrop-blur-xl"
          style={fadeIn(1)}
        >
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            {t("settings.storeInfo")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveMutation.mutate(Object.fromEntries(fd) as Record<string, string>);
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.storeName")}</Label>
                <Input
                  name="store_name"
                  defaultValue={settings?.store_name ?? DEFAULTS.store_name}
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.storePhone")}</Label>
                <Input
                  name="store_phone"
                  defaultValue={settings?.store_phone ?? DEFAULTS.store_phone}
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.storeAddress")}</Label>
                <Input
                  name="store_address"
                  defaultValue={settings?.store_address ?? DEFAULTS.store_address}
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.storeEmail")}</Label>
                <Input
                  name="store_email"
                  defaultValue={settings?.store_email ?? DEFAULTS.store_email}
                  className="border-border bg-background text-foreground"
                />
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
              >
                {saveMutation.isPending ? t("common.saving") : t("settings.saveInfo")}
              </Button>
            </div>
          </form>
        </Card>

        {/* Default Prices */}
        <Card
          className="p-5 space-y-4 border border-border bg-card/80 backdrop-blur-xl mt-6"
          style={fadeIn(2)}
        >
          <h2 className="font-semibold text-foreground">{t("settings.defaultPrices")}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveMutation.mutate(Object.fromEntries(fd) as Record<string, string>);
            }}
          >
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.normalZonePrice")}</Label>
                <Input
                  name="normal_zone_price"
                  type="number"
                  defaultValue={settings?.normal_zone_price ?? DEFAULTS.normal_zone_price}
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.vipZonePrice")}</Label>
                <Input
                  name="vip_zone_price"
                  type="number"
                  defaultValue={settings?.vip_zone_price ?? DEFAULTS.vip_zone_price}
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80">{t("settings.ps5Price")}</Label>
                <Input
                  name="ps5_price"
                  type="number"
                  defaultValue={settings?.ps5_price ?? DEFAULTS.ps5_price}
                  className="border-border bg-background text-foreground"
                />
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
              >
                {saveMutation.isPending ? t("common.saving") : t("settings.updatePrices")}
              </Button>
            </div>
          </form>
        </Card>

        {/* Feature Toggles */}
        <Card
          className="p-5 space-y-4 border border-border bg-card/80 backdrop-blur-xl mt-6"
          style={fadeIn(3)}
        >
          <h2 className="font-semibold text-foreground">{t("settings.features")}</h2>
          <div className="space-y-3">
            {[
              {
                key: "auto_end_session",
                label: t("settings.autoEndSession"),
                desc: t("settings.autoEndSessionDesc"),
              },
              {
                key: "send_notifications",
                label: t("settings.sendNotifications"),
                desc: t("settings.sendNotificationsDesc"),
              },
              {
                key: "maintenance_mode",
                label: t("settings.maintenanceMode"),
                desc: t("settings.maintenanceModeDesc"),
              },
            ].map((o) => (
              <div key={o.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{o.label}</div>
                  <div className="text-xs text-muted-foreground">{o.desc}</div>
                </div>
                <Switch
                  checked={settings?.[o.key] === "true"}
                  onCheckedChange={(checked) => {
                    saveMutation.mutate({ [o.key]: checked ? "true" : "false" });
                  }}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Security - Password */}
        <SecurityCard
          fadeIn={fadeIn}
          index={4}
          t={t}
          changePasswordFn={changePasswordFn}
          queryClient={queryClient}
        />

        {/* Bank Account */}
        <BankCard
          fadeIn={fadeIn}
          t={t}
          bankSettings={bankSettings}
          saveMutation={saveMutation}
          settings={settings}
        />
      </div>
    </div>
  );
}

function SecurityCard({
  fadeIn,
  index,
  t,
  changePasswordFn,
  queryClient,
}: {
  fadeIn: (i: number) => React.CSSProperties;
  index: number;
  t: (key: string) => string;
  changePasswordFn: any;
  queryClient: any;
}) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 6) {
      toast.error(t("settings.passwordMinLength"));
      return;
    }
    if (newPw !== confirmPw) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      await changePasswordFn({
        data: { currentPassword: currentPw, newPassword: newPw },
      });
      toast.success(t("settings.passwordUpdated"));
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className="p-5 space-y-4 border border-border bg-card/80 backdrop-blur-xl mt-6"
      style={fadeIn(index)}
    >
      <h2 className="font-semibold text-foreground flex items-center gap-2">
        <Shield className="h-4 w-4 text-red-400" />
        {t("settings.security")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("settings.securityDesc")}</p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-foreground/80">{t("settings.currentPassword")}</Label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="border-border bg-background text-foreground pr-10"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground/80">{t("settings.newPassword")}</Label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="border-border bg-background text-foreground pr-10"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground/80">{t("settings.confirmPassword")}</Label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="border-border bg-background text-foreground pr-10"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          onClick={handleChangePassword}
          disabled={loading || !currentPw || !newPw || !confirmPw}
          className="bg-linear-to-r from-red-500 to-orange-400 text-white border-0 shadow-lg shadow-red-500/20"
        >
          <Lock className="h-4 w-4 mr-2" />
          {loading ? t("common.saving") : t("settings.changePassword")}
        </Button>
      </div>
    </Card>
  );
}

const QR_PREFIX_OPTIONS = [
  { value: "NAPMAY", label: "Nạp máy — Khách quét QR để nạp tiền" },
  { value: "CYBERNET", label: "CyberNet — Tên quán" },
  { value: "PHI", label: "Phí — Thu phí dịch vụ" },
  { value: "THANHTOAN", label: "Thanh toán — Hóa đơn chung" },
  { value: "DATCOC", label: "Đặt cọc — Tiền đặt cọc máy" },
  { value: "HOANTIEN", label: "Hoàn tiền — Refund" },
];

function BankCard({
  fadeIn,
  t,
  bankSettings,
  saveMutation,
  settings,
}: {
  fadeIn: (i: number) => React.CSSProperties;
  t: (key: string, vars?: Record<string, any>) => string;
  bankSettings?: { bankName: string; accountNo: string; accountHolder: string; qrPrefix: string };
  saveMutation: any;
  settings?: Record<string, string>;
}) {
  const lookupBankAccountFn = useServerFn(lookupBankAccount);
  const [bankName, setBankName] = useState(bankSettings?.bankName ?? "Vietcombank");
  const [bankCode, setBankCode] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [accountNo, setAccountNo] = useState(bankSettings?.accountNo ?? "");
  const [accountHolder, setAccountHolder] = useState(bankSettings?.accountHolder ?? "");
  const [qrPrefix, setQrPrefix] = useState(bankSettings?.qrPrefix ?? "NAPMAY");
  const [vietqrApiKey, setVietqrApiKey] = useState(settings?.vietqr_api_key ?? "");
  const [checkResult, setCheckResult] = useState<"ok" | "error" | null>(null);
  const [checkError, setCheckError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [showBankList, setShowBankList] = useState(false);
  const [qrPrefixSearch, setQrPrefixSearch] = useState("");
  const [showQrPrefixList, setShowQrPrefixList] = useState(false);
  const [bankList, setBankList] = useState<
    Array<{
      code: string;
      bin: string;
      shortName: string;
      name: string;
      logo: string;
      lookupSupported: number;
    }>
  >([]);

  useEffect(() => {
    if (bankSettings) {
      setBankName(bankSettings.bankName);
      setAccountNo(bankSettings.accountNo);
      setAccountHolder(bankSettings.accountHolder);
      setQrPrefix(bankSettings.qrPrefix);
    }
  }, [bankSettings]);

  useEffect(() => {
    fetch("https://api.vietqr.io/v2/banks")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setBankList(d.data);
      })
      .catch(() => {});
  }, []);

  const filteredBanks = bankList.filter(
    (b) =>
      b.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.code.toLowerCase().includes(bankSearch.toLowerCase()),
  );

  const selectBank = (b: (typeof bankList)[0]) => {
    setBankName(b.shortName);
    setBankCode(b.code);
    setBankBin(b.bin);
    setBankSearch("");
    setShowBankList(false);
  };

  const selectedBank = bankList.find((b) => b.shortName === bankName || b.code === bankCode);

  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setCheckResult(null);
    setCheckError("");
    const cleanNo = accountNo.replace(/\s/g, "");
    if (!cleanNo) {
      toast.error(t("settings.enterAccountNo"));
      return;
    }
    if (!/^\d{6,19}$/.test(cleanNo)) {
      toast.error(t("settings.accountInvalid"));
      return;
    }
    if (!selectedBank) {
      toast.error(t("settings.selectBankRequired"));
      return;
    }
    if (!accountHolder.trim()) {
      toast.error(t("settings.holderRequired"));
      return;
    }
    setChecking(true);
    try {
      const result = await lookupBankAccountFn({
        data: { bin: selectedBank.bin, accountNumber: cleanNo },
      });
      if (result?.ok) {
        const remoteName = result.accountName.trim().toUpperCase();
        const localName = accountHolder.trim().toUpperCase();
        if (remoteName === localName) {
          const url = `https://vietqr.app/img?acc=${encodeURIComponent(cleanNo)}&bank=${encodeURIComponent(selectedBank.code)}&amount=10000&des=${encodeURIComponent(qrPrefix || "NAPMAY")}&template=compact&showinfo=true&fullacc=true&holder=${encodeURIComponent(accountHolder)}`;
          setPreviewUrl(url);
          setCheckResult("ok");
        } else {
          setCheckError(t("settings.holderMismatch", { name: result.accountName }));
          setCheckResult("error");
        }
      } else if (result?.error === "no_api_key") {
        setCheckError(t("settings.noApiKey"));
        setCheckResult("error");
      } else {
        setCheckError(t("settings.accountNotFound"));
        setCheckResult("error");
      }
    } catch {
      setCheckError(t("settings.checkFailed"));
      setCheckResult("error");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate({
      bank_name: bankName,
      bank_account_no: accountNo,
      bank_account_holder: accountHolder,
      qr_prefix: qrPrefix,
      vietqr_api_key: vietqrApiKey,
    });
  };

  return (
    <Card
      className="p-5 space-y-4 border border-border bg-card/80 backdrop-blur-xl mt-6"
      style={fadeIn(5)}
    >
      <h2 className="font-semibold text-foreground flex items-center gap-2">
        <Building2 className="h-4 w-4 text-purple-400" />
        {t("settings.bankAccount")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("settings.bankAccountDesc")}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Bank selector */}
        <div className="space-y-1.5 relative">
          <Label className="text-foreground/80">{t("settings.bankName")}</Label>
          <div
            className="flex items-center gap-2 border border-border bg-background rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50"
            onClick={() => setShowBankList(!showBankList)}
          >
            {selectedBank ? (
              <>
                <img src={selectedBank.logo} alt="" className="h-5 w-5 rounded-sm" />
                <span className="text-foreground text-sm">{selectedBank.shortName}</span>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">{t("settings.selectBank")}</span>
            )}
          </div>
          {showBankList && (
            <div className="absolute z-50 mt-1 w-full max-h-[280px] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
              <div className="sticky top-0 bg-card p-2 border-b border-border">
                <Input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder={t("settings.searchBank")}
                  className="h-8 text-sm border-border bg-background"
                  autoFocus
                />
              </div>
              {filteredBanks.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => selectBank(b)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left ${
                    b.shortName === bankName ? "bg-muted" : ""
                  }`}
                >
                  <img src={b.logo} alt="" className="h-5 w-5 rounded-sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {b.shortName}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{b.name}</div>
                  </div>
                </button>
              ))}
              {filteredBanks.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {t("settings.noBankFound")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account number */}
        <div className="space-y-1.5">
          <Label className="text-foreground/80">{t("settings.bankAccountNo")}</Label>
          <Input
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            className="border-border bg-background text-foreground font-mono"
            placeholder="0123456789"
          />
        </div>

        {/* Account holder */}
        <div className="space-y-1.5">
          <Label className="text-foreground/80">{t("settings.bankAccountHolder")}</Label>
          <Input
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            className="border-border bg-background text-foreground"
            placeholder="NGUYEN VAN A"
          />
        </div>

        {/* QR prefix */}
        <div className="space-y-1.5 relative">
          <Label className="text-foreground/80">{t("settings.qrPrefix")}</Label>
          <div
            className="flex items-center gap-2 border border-border bg-background rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50"
            onClick={() => setShowQrPrefixList(!showQrPrefixList)}
          >
            {qrPrefix ? (
              <span className="text-foreground text-sm">{qrPrefix}</span>
            ) : (
              <span className="text-muted-foreground text-sm">{t("settings.qrPrefix")}</span>
            )}
          </div>
          {showQrPrefixList && (
            <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
              <div className="sticky top-0 bg-card p-2 border-b border-border">
                <Input
                  value={qrPrefixSearch}
                  onChange={(e) => setQrPrefixSearch(e.target.value)}
                  placeholder={t("settings.searchPrefix")}
                  className="h-8 text-sm border-border bg-background"
                  autoFocus
                />
              </div>
              {QR_PREFIX_OPTIONS.filter(
                (opt) =>
                  opt.label.toLowerCase().includes(qrPrefixSearch.toLowerCase()) ||
                  opt.value.toLowerCase().includes(qrPrefixSearch.toLowerCase()),
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setQrPrefix(opt.value);
                    setQrPrefixSearch("");
                    setShowQrPrefixList(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left ${
                    qrPrefix === opt.value ? "bg-muted" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{opt.value}</div>
                    <div className="text-[10px] text-muted-foreground">{opt.label}</div>
                  </div>
                </button>
              ))}
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setQrPrefix(qrPrefixSearch || "NAPMAY");
                    setQrPrefixSearch("");
                    setShowQrPrefixList(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left text-purple-400"
                >
                  <div className="text-sm">
                    {qrPrefixSearch ? `"${qrPrefixSearch}"` : t("settings.customPrefix")}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VietQR API Key */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">{t("settings.vietqrApiKey")}</Label>
        <Input
          value={vietqrApiKey}
          onChange={(e) => setVietqrApiKey(e.target.value)}
          className="border-border bg-background text-foreground font-mono"
          placeholder=" VietQR API Key (đăng ký miễn phí tại vietqr.io)"
          type="password"
        />
        <p className="text-[10px] text-muted-foreground">{t("settings.vietqrApiKeyDesc")}</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCheck}
          disabled={checking || !accountNo.trim() || !selectedBank}
          className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
        >
          {checking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : checkResult === "ok" ? (
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
          ) : (
            <QrCode className="h-4 w-4 mr-2" />
          )}
          {t("settings.checkAccount")}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
        >
          {saveMutation.isPending ? t("common.saving") : t("settings.saveBank")}
        </Button>
      </div>

      {checkResult === "ok" && previewUrl && (
        <div className="rounded-xl border border-green-400/30 bg-green-400/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {t("settings.accountValid")}
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.accountValidDesc")}</p>
          <div className="flex justify-center">
            <img src={previewUrl} alt="QR Preview" className="h-[200px] w-[200px] rounded-lg" />
          </div>
        </div>
      )}

      {checkResult === "error" && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4">
          <p className="text-sm text-red-400">{checkError || t("settings.accountInvalid")}</p>
        </div>
      )}
    </Card>
  );
}
