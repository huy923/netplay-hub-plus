import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { Switch } from "@/components/ui/switch";
import { formatVND } from "@/lib/format";
import {
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from "@/lib/cybernet.functions";
import { Tag, Plus, Pencil, Trash2, Percent, Coins } from "lucide-react";

export const Route = createFileRoute("/admin/discounts")({ component: Discounts });

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

function Discounts() {
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
  const list = useServerFn(listDiscounts);
  const create = useServerFn(createDiscount);
  const update = useServerFn(updateDiscount);
  const remove = useServerFn(deleteDiscount);

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ["discounts"],
    queryFn: () => list(),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["discounts"] });

  const createM = useMutation({
    mutationFn: (data: any) => create({ data }),
    onSuccess: () => {
      toast.success(t("discount.added"));
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

  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const now = new Date();
  const filtered = discounts.filter(
    (d: any) =>
      !q ||
      d.code.toLowerCase().includes(q.toLowerCase()) ||
      d.name.toLowerCase().includes(q.toLowerCase()),
  );

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
              <Tag className="h-3 w-3 text-purple-400" />
              {t("discount.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {t("discount.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("discount.summary", {
                total: discounts.length,
                active: discounts.filter((d: any) => d.active).length,
              })}
            </p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                <Plus className="h-4 w-4 mr-1" />
                {t("discount.add")}
              </Button>
            </DialogTrigger>
            {openAdd && (
              <DiscountForm
                title={t("discount.addNew")}
                onSubmit={(v) => createM.mutate(v, { onSuccess: () => setOpenAdd(false) })}
                loading={createM.isPending}
              />
            )}
          </Dialog>
        </div>

        <Card className="p-4 border border-border bg-card/80 backdrop-blur-xl" style={fadeIn(1)}>
          <div className="relative max-w-sm mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("discount.searchPlaceholder")}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <svg
              className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 font-medium">{t("discount.tableCode")}</th>
                  <th className="text-left py-2 font-medium">{t("discount.tableName")}</th>
                  <th className="text-center py-2 font-medium">{t("discount.tableType")}</th>
                  <th className="text-right py-2 font-medium">{t("discount.tableValue")}</th>
                  <th className="text-center py-2 font-medium">{t("discount.tableUsage")}</th>
                  <th className="text-left py-2 font-medium">{t("discount.tableExpiry")}</th>
                  <th className="text-center py-2 font-medium">{t("discount.tableStatus")}</th>
                  <th className="text-right py-2 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => {
                  const expired = d.expiresAt && new Date(d.expiresAt) < now;
                  const muted = !d.active || expired;
                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-border/50 last:border-0 hover:bg-muted/50 ${muted ? "opacity-50" : ""}`}
                    >
                      <td className="py-3 font-mono text-xs font-medium text-foreground">
                        {d.code}
                      </td>
                      <td className="py-3 text-foreground">{d.name}</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {d.type === "percent" ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <Coins className="h-3 w-3" />
                          )}
                          {d.type === "percent" ? "%" : "₫"}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-foreground">
                        {d.type === "percent" ? `${d.value}%` : formatVND(d.value)}
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        {d.usedCount}/{d.maxUses || "∞"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="py-3 text-center">
                        {!d.active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                            {t("discount.statusDisabled")}
                          </span>
                        ) : expired ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {t("discount.statusExpired")}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                            {t("discount.statusActive")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(d)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive/80 hover:text-destructive"
                          onClick={() =>
                            confirm(t("discount.confirmDelete", { code: d.code })) &&
                            deleteM.mutate(d.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          {editing && (
            <DiscountEditForm
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

function DiscountForm({
  title,
  onSubmit,
  loading,
}: {
  title: string;
  onSubmit: (v: any) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [minAmount, setMinAmount] = useState("0");
  const [maxUses, setMaxUses] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");

  const valid = code && name && value;

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground/80">
            {t("discount.tableCode")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("discount.codePlaceholder")}
            className={`border-border bg-background text-foreground ${!code ? "border-destructive" : ""}`}
          />
          {!code && <p className="text-xs text-destructive mt-1">{t("common.requiredCode")}</p>}
        </div>
        <div>
          <Label className="text-foreground/80">
            {t("discount.tableName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("discount.namePlaceholder")}
            className={`border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
          />
          {!name && <p className="text-xs text-destructive mt-1">{t("common.requiredName")}</p>}
        </div>
        <div>
          <Label className="text-foreground/80">{t("discount.tableType")}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              <SelectItem value="percent">{t("discount.typePercent")}</SelectItem>
              <SelectItem value="fixed">{t("discount.typeFixed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-foreground/80">
            {t("discount.tableValue")} <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              type === "percent"
                ? t("discount.valuePercentPlaceholder")
                : t("discount.valueFixedPlaceholder")
            }
            className={`border-border bg-background text-foreground ${!value ? "border-destructive" : ""}`}
          />
          {!value && <p className="text-xs text-destructive mt-1">{t("common.requiredValue")}</p>}
        </div>
        <div>
          <Label className="text-foreground/80">{t("discount.minAmount")}</Label>
          <Input
            type="number"
            min={0}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground/80">{t("discount.maxUses")}</Label>
          <Input
            type="number"
            min={0}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground/80">{t("discount.expiresAt")}</Label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="border-border bg-background text-foreground"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !valid}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() =>
            onSubmit({
              code,
              name,
              type,
              value: parseInt(value),
              minAmount: parseInt(minAmount) || 0,
              maxUses: parseInt(maxUses) || 0,
              expiresAt: expiresAt || null,
            })
          }
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DiscountEditForm({
  initial,
  onSubmit,
  loading,
}: {
  initial: any;
  onSubmit: (v: any) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name ?? "");
  const [active, setActive] = useState(initial.active ?? true);
  const [maxUses, setMaxUses] = useState(String(initial.maxUses ?? 0));
  const [expiresAt, setExpiresAt] = useState(
    initial.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : "",
  );

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{t("discount.edit")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground/80">
            {t("discount.tableName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
          />
          {!name && <p className="text-xs text-destructive mt-1">{t("common.requiredName")}</p>}
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-foreground/80">{t("discount.activate")}</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <div>
          <Label className="text-foreground/80">{t("discount.maxUses")}</Label>
          <Input
            type="number"
            min={0}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground/80">{t("discount.expiresAt")}</Label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="border-border bg-background text-foreground"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !name}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() =>
            onSubmit({
              name,
              active,
              maxUses: parseInt(maxUses) || 0,
              expiresAt: expiresAt || null,
            })
          }
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
