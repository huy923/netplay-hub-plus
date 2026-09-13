import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
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
import { formatVND, formatDate } from "@/lib/format";
import {
  listMenu,
  listPurchaseOrders,
  createPurchaseOrder,
  deletePurchaseOrder,
} from "@/lib/cybernet.functions";
import { Plus, Trash2, Package, Search } from "lucide-react";

export const Route = createFileRoute("/admin/purchase-orders")({
  component: PurchaseOrders,
});

type MenuItem = Awaited<ReturnType<typeof listMenu>>[number];
type CreatePurchaseOrderInput = Parameters<typeof createPurchaseOrder>[0]["data"];

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

function PurchaseOrders() {
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
  const listPOs = useServerFn(listPurchaseOrders);
  const createPO = useServerFn(createPurchaseOrder);
  const deletePO = useServerFn(deletePurchaseOrder);
  const listMenuItems = useServerFn(listMenu);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => listPOs(),
  });
  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: () => listMenuItems(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    qc.invalidateQueries({ queryKey: ["menu"] });
    qc.invalidateQueries({ queryKey: ["low-stock-items"] });
  };

  const createM = useMutation({
    mutationFn: (data: CreatePurchaseOrderInput) => createPO({ data }),
    onSuccess: () => {
      toast.success(t("purchaseOrder.addSuccess"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message ?? t("common.error")),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deletePO({ data: { id } }),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message ?? t("common.error")),
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.itemName.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier?.toLowerCase().includes(search.toLowerCase()),
  );

  const itemsForSelect = menu.filter((m) => m.category !== "Combo");

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-linear-to-br from-emerald-200/40 via-background to-teal-200/40 dark:from-emerald-950/40 dark:via-background dark:to-teal-950/40" />
      <FloatingParticle delay={0} size={5} left="5%" top="10%" />
      <FloatingParticle delay={1.5} size={3} left="90%" top="20%" />
      <FloatingParticle delay={0.8} size={4} left="10%" top="80%" />
      <FloatingParticle delay={2} size={3} left="85%" top="70%" />
      <div className="absolute top-0 -left-10 w-75 h-75 bg-emerald-300/10 rounded-full blur-[120px] animate-pulse dark:bg-emerald-600/15" />
      <div
        className="absolute bottom-0 -right-10 w-75 h-75 bg-teal-300/10 rounded-full blur-[120px] animate-pulse dark:bg-teal-500/15"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 p-6">
        <div style={fadeIn(0)} className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <Package className="h-3 w-3 text-emerald-400" />
              {t("purchaseOrder.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              {t("purchaseOrder.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("purchaseOrder.summary", { total: orders.length })}
            </p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-emerald-500 to-teal-400 text-white border-0 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
                <Plus className="h-4 w-4 mr-1" />
                {t("purchaseOrder.add")}
              </Button>
            </DialogTrigger>
            {openAdd && (
              <POForm
                items={itemsForSelect}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("purchaseOrder.searchPlaceholder")}
              className="pl-9 border-border bg-background text-foreground"
            />
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 font-medium">{t("purchaseOrder.tableItem")}</th>
                  <th className="text-right py-2 font-medium">{t("common.quantity")}</th>
                  <th className="text-right py-2 font-medium">
                    {t("purchaseOrder.tableUnitCost")}
                  </th>
                  <th className="text-right py-2 font-medium">{t("common.total")}</th>
                  <th className="text-left py-2 font-medium">{t("purchaseOrder.tableSupplier")}</th>
                  <th className="text-left py-2 font-medium">{t("purchaseOrder.tableNote")}</th>
                  <th className="text-left py-2 font-medium">{t("purchaseOrder.tableDate")}</th>
                  <th className="text-right py-2 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      {t("purchaseOrder.noOrders")}
                    </td>
                  </tr>
                )}
                {filtered.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 font-medium text-foreground">
                      {po.itemName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({po.menuItem?.category ?? ""})
                      </span>
                    </td>
                    <td className="py-3 text-right text-foreground">{po.qty}</td>
                    <td className="py-3 text-right text-foreground">{formatVND(po.unitCost)}</td>
                    <td className="py-3 text-right font-semibold text-foreground">
                      {formatVND(po.totalCost)}
                    </td>
                    <td className="py-3 text-muted-foreground">{po.supplier || "—"}</td>
                    <td className="py-3 text-muted-foreground max-w-37.5 truncate">
                      {po.note || "—"}
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {formatDate(po.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive/80 hover:text-destructive"
                        onClick={() =>
                          confirm(t("common.deleteConfirm", { name: po.itemName })) &&
                          deleteM.mutate(po.id)
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
      </div>
    </div>
  );
}

function POForm({
  items,
  onSubmit,
  loading,
}: {
  items: MenuItem[];
  onSubmit: (v: {
    itemId: string;
    qty: number;
    unitCost: number;
    supplier: string;
    note?: string;
  }) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{t("purchaseOrder.addNew")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground/80">
            {t("purchaseOrder.selectItem")} <span className="text-destructive">*</span>
          </Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue placeholder={t("purchaseOrder.selectItem")} />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              {items.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} ({formatVND(m.price)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-foreground/80">{t("common.quantity")}</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="border-border bg-background text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground/80">{t("purchaseOrder.unitCost")}</Label>
            <Input
              type="number"
              min={0}
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              className="border-border bg-background text-foreground"
            />
          </div>
        </div>
        <div>
          <Label className="text-foreground/80">{t("purchaseOrder.supplier")}</Label>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder={t("purchaseOrder.supplierPlaceholder")}
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground/80">{t("purchaseOrder.note")}</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("purchaseOrder.notePlaceholder")}
            className="border-border bg-background text-foreground"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !itemId || qty < 1}
          className="bg-linear-to-r from-emerald-500 to-teal-400 text-white border-0 shadow-lg shadow-emerald-500/20"
          onClick={() => onSubmit({ itemId, qty, unitCost, supplier, note })}
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
