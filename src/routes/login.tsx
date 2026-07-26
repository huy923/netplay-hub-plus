import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, Eye, EyeOff, ShieldCheck, MonitorPlay, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { loginUser, getCurrentUser } from "@/lib/cybernet.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/login")({ component: Login });

function FloatingOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 animate-pulse ${className}`}
      style={{ animationDuration: "4s" }}
    />
  );
}

function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const doLogin = useServerFn(loginUser);

  const currentUser = useServerFn(getCurrentUser);

  useEffect(() => {
    currentUser().then((u) => {
      if (u) nav({ to: "/admin" });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t("login.errorRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await doLogin({ data: { username, password } });
      document.cookie = `__session=${result.token}; path=/; max-age=86400; SameSite=Lax`;
      nav({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <FloatingOrb className="w-96 h-96 bg-primary -top-20 -left-20" />
      <FloatingOrb className="w-80 h-80 bg-purple-600 -bottom-20 -right-20" />
      <FloatingOrb className="w-64 h-64 bg-cyan-500 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="rounded-2xl border bg-card/80 backdrop-blur-xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-primary-foreground shadow-glow animate-pulse">
              <Gamepad2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">CyberNet</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("login.subtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {t("login.username")}
              </Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("login.usernamePlaceholder")}
                  className="pl-10 h-11 bg-background/50 border-border focus-visible:ring-primary"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("login.password")}
              </Label>
              <div className="relative">
                <MonitorPlay className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  className="pl-10 pr-10 h-11 bg-background/50 border-border focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground font-semibold shadow-glow transition-all duration-300 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t("login.loggingIn")}
                </span>
              ) : (
                t("login.loginButton")
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("login.systemLabel")}</span>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t("login.backLink")}
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">{t("login.copyright")}</p>
      </div>
    </div>
  );
}
