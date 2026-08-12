import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/cybernet.functions";
import { Plus, Pencil, Trash2, Shield, ShieldOff, UserCog } from "lucide-react";

export const Route = createFileRoute("/admin/users")({ component: Users });

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

function Users() {
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
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => list(),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const createM = useMutation({
    mutationFn: (data: { username: string; password: string; role: string }) => create({ data }),
    onSuccess: () => {
      toast.success(t("user.added"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });
  const updateM = useMutation({
    mutationFn: (data: any) => update({ data }),
    onSuccess: () => {
      toast.success(t("common.updated"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

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
        <div style={fadeIn(0)} className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <UserCog className="h-3 w-3 text-purple-400" />
              {t("user.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {t("user.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("user.summary", {
                total: users.length,
                active: users.filter((u: any) => u.active).length,
              })}
            </p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                <Plus className="h-4 w-4 mr-1" />
                {t("user.add")}
              </Button>
            </DialogTrigger>
            {openAdd && (
              <UserForm
                title={t("user.addNew")}
                onSubmit={(v) =>
                  createM.mutate(v as any, {
                    onSuccess: () => setOpenAdd(false),
                  })
                }
                loading={createM.isPending}
              />
            )}
          </Dialog>
        </div>

        <Card className="p-4 border border-border bg-card/80 backdrop-blur-xl" style={fadeIn(1)}>
          {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 font-medium">{t("user.tableUsername")}</th>
                  <th className="text-left py-2 font-medium">{t("user.tableRole")}</th>
                  <th className="text-left py-2 font-medium">{t("user.tableStatus")}</th>
                  <th className="text-left py-2 font-medium">{t("user.tableCreatedAt")}</th>
                  <th className="text-right py-2 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 font-medium text-foreground">{u.username}</td>
                    <td className="py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          <Shield className="h-3 w-3" /> {t("user.roleAdmin")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          <ShieldOff className="h-3 w-3" /> {t("user.roleCashier")}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {u.active ? (
                        <Badge
                          variant="outline"
                          className="text-xs border-green-400/40 text-green-600 dark:text-green-400 bg-green-500/10"
                        >
                          {t("user.active")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs border-muted-foreground/30 text-muted-foreground"
                        >
                          {t("user.inactive")}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {format(new Date(u.createdAt), "dd/MM/yyyy")}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive/80 hover:text-destructive"
                        onClick={() => {
                          if (confirm(t("user.confirmDelete", { username: u.username }))) {
                            deleteM.mutate(u.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          {editing && (
            <UserForm
              title={t("user.edit")}
              initial={editing}
              onSubmit={(v) =>
                updateM.mutate({ id: editing.id, ...v }, { onSuccess: () => setEditing(null) })
              }
              loading={updateM.isPending}
            />
          )}
        </Dialog>
      </div>
    </div>
  );
}

function UserForm({
  title,
  initial,
  onSubmit,
  loading,
}: {
  title: string;
  initial?: any;
  onSubmit: (v: { username: string; password?: string; role: string; active?: boolean }) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initial?.role ?? "cashier");
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground/80">
            {t("user.tableUsername")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`border-border bg-background text-foreground ${!username ? "border-destructive" : ""}`}
          />
          {!username && (
            <p className="text-xs text-destructive mt-1">{t("common.requiredUsername")}</p>
          )}
        </div>
        <div>
          <Label className="text-foreground/80">
            {t("common.password")}
            {initial ? "" : " *"}
          </Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={initial ? t("user.passwordPlaceholder") : ""}
            className={`border-border bg-background text-foreground ${!initial && !password ? "border-destructive" : ""}`}
          />
          {!initial && !password && (
            <p className="text-xs text-destructive mt-1">{t("common.requiredPassword")}</p>
          )}
        </div>
        <div>
          <Label className="text-foreground/80">{t("user.tableRole")}</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              <SelectItem value="admin">{t("user.roleAdmin")}</SelectItem>
              <SelectItem value="cashier">{t("user.roleCashier")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {initial && (
          <div className="flex items-center justify-between">
            <Label className="text-foreground/80 cursor-pointer">{t("user.activeToggle")}</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !username || (!initial && !password)}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() =>
            onSubmit({
              username,
              ...(password ? { password } : {}),
              role,
              ...(initial ? { active } : {}),
            })
          }
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
