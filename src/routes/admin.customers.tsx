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
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger,DialogFooter,} from "@/components/ui/dialog";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import { formatVND } from "@/lib/format";
import {listCustomers,createCustomer,updateCustomer,deleteCustomer,getLoyaltyTransactions,earnLoyaltyPoints,burnLoyaltyPoints,} from "@/lib/cybernet.functions";
import {Plus,Search,Crown,Pencil,Trash2,Users,Eye,Coins,ArrowUp,ArrowDown,History} from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

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

function Customers() {
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
  const list = useServerFn(listCustomers);
  const create = useServerFn(createCustomer);
  const update = useServerFn(updateCustomer);
  const remove = useServerFn(deleteCustomer);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => list(),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["customers"] });

  const createM = useMutation({
    mutationFn: (data: any) => create({ data }),
    onSuccess: () => {
      toast.success(t("customer.added"));
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
  const [detailCustomer, setDetailCustomer] = useState<any | null>(null);

  const getLoyalty = useServerFn(getLoyaltyTransactions);
  const doEarn = useServerFn(earnLoyaltyPoints);
  const doBurn = useServerFn(burnLoyaltyPoints);

  const { data: loyaltyTx = [], refetch: refetchLoyalty } = useQuery({
    queryKey: ["loyalty", detailCustomer?.id],
    queryFn: () => (detailCustomer ? getLoyalty({ data: { customerId: detailCustomer.id } }) : []),
    enabled: !!detailCustomer,
  });

  const earnM = useMutation({
    mutationFn: (v: { customerId: string; points: number }) => doEarn({ data: v }),
    onSuccess: () => {
      toast.success(t("common.success"));
      refetchLoyalty();
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });
  const burnM = useMutation({
    mutationFn: (v: { customerId: string; points: number }) => doBurn({ data: v }),
    onSuccess: () => {
      toast.success(t("common.success"));
      refetchLoyalty();
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("common.error")),
  });

  const filtered = customers.filter(
    (c: any) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q),
  );

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200/40 via-background to-cyan-200/40 dark:from-purple-950/40 dark:via-background dark:to-cyan-950/40" />
      <FloatingParticle delay={0} size={5} left="5%" top="10%" />
      <FloatingParticle delay={1.5} size={3} left="90%" top="20%" />
      <FloatingParticle delay={0.8} size={4} left="10%" top="80%" />
      <FloatingParticle delay={2} size={3} left="85%" top="70%" />
      <div className="absolute top-0 -left-10 w-[300px] h-[300px] bg-purple-300/10 rounded-full blur-[120px] animate-pulse dark:bg-purple-600/15" />
      <div
        className="absolute bottom-0 -right-10 w-[300px] h-[300px] bg-cyan-300/10 rounded-full blur-[120px] animate-pulse dark:bg-cyan-500/15"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 p-6">
        <div style={fadeIn(0)} className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <Users className="h-3 w-3 text-purple-400" />
              {t("customer.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {t("customer.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("customer.summary", {
                total: customers.length,
                vip: customers.filter((c: any) => c.tier === "VIP").length,
              })}
            </p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                <Plus className="h-4 w-4 mr-1" />
                {t("customer.add")}
              </Button>
            </DialogTrigger>
            {openAdd && (
              <CustomerForm
                title={t("customer.addNew")}
                onSubmit={(v) => createM.mutate(v, { onSuccess: () => setOpenAdd(false) })}
                loading={createM.isPending}
              />
            )}
          </Dialog>
        </div>

        <Card className="p-4 border border-border bg-card/80 backdrop-blur-xl" style={fadeIn(1)}>
          <div className="relative max-w-sm mb-4">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("customer.searchPlaceholder")}
              className="pl-9 border-border bg-background text-foreground"
            />
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 font-medium">{t("customer.tableName")}</th>
                  <th className="text-left py-2 font-medium">{t("customer.tablePhone")}</th>
                  <th className="text-right py-2 font-medium">{t("customer.tableVisits")}</th>
                  <th className="text-right py-2 font-medium">{t("customer.tableTotalSpent")}</th>
                  <th className="text-left py-2 font-medium pl-4">{t("customer.tableTier")}</th>
                  <th className="text-right py-2 font-medium">{t("loyalty.points")}</th>
                  <th className="text-right py-2 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 font-medium text-foreground">{c.name}</td>
                    <td className="py-3 text-muted-foreground">{c.phone}</td>
                    <td className="py-3 text-right text-foreground">{c.visits}</td>
                    <td className="py-3 text-right font-semibold text-foreground">
                      {formatVND(c.total)}
                    </td>
                    <td className="py-3 pl-4">
                      {c.tier === "VIP" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                          <Crown className="h-3 w-3" /> VIP
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("customer.tierNormal")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium text-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-400" />
                        {c.points}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setDetailCustomer(c)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive/80 hover:text-destructive"
                        onClick={() =>
                          confirm(t("customer.confirmDelete", { name: c.name })) &&
                          deleteM.mutate(c.id)
                        }
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
            <CustomerForm
              title={t("customer.edit")}
              initial={editing}
              onSubmit={(v) =>
                updateM.mutate({ id: editing.id, ...v }, { onSuccess: () => setEditing(null) })
              }
              loading={updateM.isPending}
            />
          )}
        </Dialog>

        <Dialog open={!!detailCustomer} onOpenChange={(o) => !o && setDetailCustomer(null)}>
          {detailCustomer && (
            <DialogContent className="border-border bg-background text-foreground max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">{detailCustomer.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("customer.tablePhone")}:</span>{" "}
                    <span className="text-foreground">{detailCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("customer.tableTier")}:</span>{" "}
                    <span className="text-foreground">
                      {detailCustomer.tier === "VIP" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                          <Crown className="h-3 w-3" /> VIP
                        </span>
                      ) : (
                        t("customer.tierNormal")
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("customer.tableVisits")}:</span>{" "}
                    <span className="text-foreground">{detailCustomer.visits}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("customer.tableTotalSpent")}:</span>{" "}
                    <span className="text-foreground font-semibold">
                      {formatVND(detailCustomer.total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("loyalty.currentPoints", { points: detailCustomer.points })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const p = prompt(t("loyalty.earnPoints"));
                      const n = p ? parseInt(p) : NaN;
                      if (!isNaN(n) && n > 0) {
                        earnM.mutate({ customerId: detailCustomer.id, points: n });
                      }
                    }}
                  >
                    <ArrowUp className="h-3 w-3 mr-1 text-success" />
                    {t("loyalty.earn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const p = prompt(t("loyalty.burnPoints"));
                      const n = p ? parseInt(p) : NaN;
                      if (!isNaN(n) && n > 0) {
                        burnM.mutate({ customerId: detailCustomer.id, points: n });
                      }
                    }}
                  >
                    <ArrowDown className="h-3 w-3 mr-1 text-destructive" />
                    {t("loyalty.burn")}
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <History className="h-3 w-3 text-muted-foreground" />
                    {t("loyalty.history")}
                  </h4>
                  <div className="max-h-60 overflow-auto border border-border rounded-lg">
                    {loyaltyTx.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">
                        {t("loyalty.noHistory")}
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground border-b border-border">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium">{t("loyalty.type")}</th>
                            <th className="text-right py-2 px-3 font-medium">
                              {t("loyalty.points")}
                            </th>
                            <th className="text-left py-2 px-3 font-medium">
                              {t("loyalty.reference")}
                            </th>
                            <th className="text-left py-2 px-3 font-medium">{t("loyalty.date")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loyaltyTx.map((tx: any) => (
                            <tr key={tx.id} className="border-b border-border/50 last:border-0">
                              <td className="py-2 px-3">
                                {tx.type === "earn" ? (
                                  <span className="inline-flex items-center gap-1 text-success">
                                    <ArrowUp className="h-3 w-3" /> {t("loyalty.typeEarn")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-destructive">
                                    <ArrowDown className="h-3 w-3" /> {t("loyalty.typeBurn")}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-medium">
                                <span
                                  className={
                                    tx.type === "earn" ? "text-success" : "text-destructive"
                                  }
                                >
                                  {tx.type === "earn" ? "+" : ""}
                                  {tx.points}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {tx.reference || "—"}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {formatDate(tx.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}

function CustomerForm({
  title,
  initial,
  onSubmit,
  loading,
}: {
  title: string;
  initial?: any;
  onSubmit: (v: { name: string; phone: string; tier: string }) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [tier, setTier] = useState(initial?.tier ?? "Thường");

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground/80">
            {t("common.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
          />
          {!name && <p className="text-xs text-destructive mt-1">{t("common.requiredName")}</p>}
        </div>
        <div>
          <Label className="text-foreground/80">
            {t("customer.tablePhone")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`border-border bg-background text-foreground ${!phone ? "border-destructive" : ""}`}
          />
          {!phone && <p className="text-xs text-destructive mt-1">{t("common.requiredPhone")}</p>}
        </div>
        <div>
          <Label className="text-foreground/80">{t("customer.tableTier")}</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              <SelectItem value="Thường">{t("customer.tierNormal")}</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !name || !phone}
          className="bg-gradient-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() => onSubmit({ name, phone, tier })}
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
