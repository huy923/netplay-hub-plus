import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
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
import { formatVND } from "@/lib/format";
import {
  listMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addStock,
  listCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  uploadImage,
} from "@/lib/cybernet.functions";
import {
  Plus,
  Pencil,
  PackagePlus,
  Trash2,
  UtensilsCrossed,
  Clock,
  Package,
  Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/admin/menu")({ component: Menu });

type MenuTab = "all" | "items" | "combos";
type MenuItem = Awaited<ReturnType<typeof listMenu>>[number];
type Combo = Awaited<ReturnType<typeof listCombos>>[number];
type CreateMenuItemInput = Parameters<typeof createMenuItem>[0]["data"];
type UpdateMenuItemInput = Parameters<typeof updateMenuItem>[0]["data"];
type CreateComboInput = Parameters<typeof createCombo>[0]["data"];
type UpdateComboInput = Parameters<typeof updateCombo>[0]["data"];

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

function Menu() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<MenuTab>("all");
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
  });

  const qc = useQueryClient();
  const list = useServerFn(listMenu);
  const create = useServerFn(createMenuItem);
  const update = useServerFn(updateMenuItem);
  const remove = useServerFn(deleteMenuItem);
  const stock = useServerFn(addStock);

  const { data: menu = [], isLoading } = useQuery({ queryKey: ["menu"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["menu"] });

  const createM = useMutation({
    mutationFn: (data: CreateMenuItemInput) => create({ data }),
    onSuccess: () => {
      toast.success(t("menuPage.addSuccess"));
      invalidate();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });
  const updateM = useMutation({
    mutationFn: (data: UpdateMenuItemInput) => update({ data }),
    onSuccess: () => {
      toast.success(t("menuPage.updateSuccess"));
      invalidate();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success(t("menuPage.deleteSuccess"));
      invalidate();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });
  const stockM = useMutation({
    mutationFn: (v: { id: string; amount: number }) => stock({ data: v }),
    onSuccess: () => {
      toast.success(t("menuPage.stockAddSuccess"));
      invalidate();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const listC = useServerFn(listCombos);
  const createC = useServerFn(createCombo);
  const updateC = useServerFn(updateCombo);
  const removeC = useServerFn(deleteCombo);

  const { data: combos = [] } = useQuery({ queryKey: ["combos"], queryFn: () => listC() });
  const invalidateCombos = () => qc.invalidateQueries({ queryKey: ["combos"] });

  const createComboM = useMutation({
    mutationFn: (data: CreateComboInput) => createC({ data }),
    onSuccess: () => {
      toast.success(t("menuPage.comboAddSuccess"));
      invalidateCombos();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });
  const updateComboM = useMutation({
    mutationFn: (data: UpdateComboInput) => updateC({ data }),
    onSuccess: () => {
      toast.success(t("menuPage.comboUpdateSuccess"));
      invalidateCombos();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });
  const deleteComboM = useMutation({
    mutationFn: (id: string) => removeC({ data: { id } }),
    onSuccess: () => {
      toast.success(t("menuPage.comboDeleteSuccess"));
      invalidateCombos();
    },
    onError: (e) => toast.error(e?.message ?? t("common.error")),
  });

  const [openComboAdd, setOpenComboAdd] = useState(false);
  const [comboAddKey, setComboAddKey] = useState(0);
  const [menuAddKey, setMenuAddKey] = useState(0);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

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
        <div style={fadeIn(0)} className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <UtensilsCrossed className="h-3 w-3 text-primary" />
              {t("menuPage.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {t("menuPage.title")}
            </h1>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border" style={fadeIn(0.1)}>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === "all"
                ? "border-purple-400 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("menuPage.tabAll", {
              count: menu.filter((m) => m.category !== "Combo").length + combos.length,
            })}
          </button>
          <button
            onClick={() => setTab("items")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === "items"
                ? "border-purple-400 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("menuPage.tabItems", {
              count: menu.filter((m) => m.category !== "Combo").length,
            })}
          </button>
          <button
            onClick={() => setTab("combos")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === "combos"
                ? "border-purple-400 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("menuPage.tabCombos", { count: combos.length })}
          </button>
        </div>

        {tab === "all" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {t("menuPage.itemCount", {
                  items: menu.filter((m) => m.category !== "Combo").length,
                  combos: combos.length,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-border text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setComboAddKey((k) => k + 1);
                    setOpenComboAdd(true);
                  }}
                >
                  <Package className="h-4 w-4 mr-1" />
                  {t("menuPage.addCombo")}
                </Button>
                <Dialog
                  open={openAdd}
                  onOpenChange={(v) => {
                    setOpenAdd(v);
                    if (v) setMenuAddKey((k) => k + 1);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                      <Plus className="h-4 w-4 mr-1" />
                      {t("menuPage.addItem")}
                    </Button>
                  </DialogTrigger>
                  <MenuForm
                    key={menuAddKey}
                    title={t("menuPage.addNewItem")}
                    onSubmit={(v) => createM.mutate(v, { onSuccess: () => setOpenAdd(false) })}
                    loading={createM.isPending}
                  />
                </Dialog>
              </div>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={fadeIn(1)}>
              {menu
                .filter((m) => m.category !== "Combo")
                .map((m) => (
                  <Card
                    key={m.id}
                    className="p-4 flex flex-col border border-border bg-card/80 backdrop-blur-xl hover:border-border hover:bg-card transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                        {m.image ? (
                          <img
                            src={m.image}
                            onError={(e) => {
                              e.currentTarget.src = "/images/meme.jpg";
                            }}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          m.stock > 0
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {t("menuPage.stockLabel", { stock: m.stock })}
                      </div>
                    </div>
                    <div className="mt-3 font-semibold text-lg text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.category}</div>
                    <div className="flex items-center justify-between mt-3 mb-3">
                      <span className="font-display text-lg font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatVND(m.price)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            confirm(t("common.deleteConfirm", { name: m.name })) &&
                            deleteM.mutate(m.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-auto border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => {
                          const q = prompt(t("menuPage.addStockPrompt"));
                          const n = q ? parseInt(q) : NaN;
                          if (!isNaN(n)) stockM.mutate({ id: m.id, amount: n });
                        }}
                      >
                        <PackagePlus className="h-4 w-4 mr-2" /> {t("menuPage.addStock")}
                      </Button>
                    </div>
                  </Card>
                ))}
              {combos.map((c) => (
                <Card
                  key={c.id}
                  className="p-4 flex flex-col border border-border bg-card/80 backdrop-blur-xl hover:border-border hover:bg-card transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          onError={(e) => {
                            e.currentTarget.src = "/images/meme.jpg";
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      <Clock className="h-3 w-3" />
                      {Math.floor(c.seconds / 3600)}
                      {t("menuPage.hours_unit")}
                    </div>
                  </div>
                  <div className="mt-3 font-semibold text-lg text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                    {c.items?.map((ci) => (
                      <span
                        key={ci.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border"
                      >
                        {ci.menuItem?.name} ×{ci.qty}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-display text-lg font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      {formatVND(c.price)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingCombo(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          confirm(t("common.deleteConfirm", { name: c.name })) &&
                          deleteComboM.mutate(c.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
              {editing && (
                <MenuForm
                  title={t("menuPage.editItem")}
                  initial={editing}
                  onSubmit={(v) =>
                    updateM.mutate({ id: editing.id, ...v }, { onSuccess: () => setEditing(null) })
                  }
                  loading={updateM.isPending}
                />
              )}
            </Dialog>
            <Dialog open={!!editingCombo} onOpenChange={(o) => !o && setEditingCombo(null)}>
              {editingCombo && (
                <ComboForm
                  menuItems={menu}
                  title={t("menuPage.editCombo")}
                  initial={editingCombo}
                  onSubmit={(v) =>
                    updateComboM.mutate(
                      { id: editingCombo.id, ...v },
                      { onSuccess: () => setEditingCombo(null) },
                    )
                  }
                  loading={updateComboM.isPending}
                />
              )}
            </Dialog>
          </>
        )}

        {tab === "items" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {t("menuPage.itemsOnly", {
                  count: menu.filter((m) => m.category !== "Combo").length,
                })}
              </p>
              <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                <DialogTrigger asChild>
                  <Button className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("menuPage.addItem")}
                  </Button>
                </DialogTrigger>
                <MenuForm
                  title={t("menuPage.addNewItem")}
                  onSubmit={(v) => createM.mutate(v, { onSuccess: () => setOpenAdd(false) })}
                  loading={createM.isPending}
                />
              </Dialog>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={fadeIn(1)}>
              {menu
                .filter((m) => m.category !== "Combo")
                .map((m) => (
                  <Card
                    key={m.id}
                    className="p-4 flex flex-col border border-border bg-card/80 backdrop-blur-xl hover:border-border hover:bg-card transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                        {m.image ? (
                          <img
                            src={m.image}
                            onError={(e) => {
                              e.currentTarget.src = "/images/meme.jpg";
                            }}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          m.stock > 0
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {t("menuPage.stockLabel", { stock: m.stock })}
                      </div>
                    </div>
                    <div className="mt-3 font-semibold text-lg text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.category}</div>
                    <div className="flex items-center justify-between mt-3 mb-3">
                      <span className="font-display text-lg font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatVND(m.price)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            confirm(t("common.deleteConfirm", { name: m.name })) &&
                            deleteM.mutate(m.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-auto border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => {
                          const q = prompt(t("menuPage.addStockPrompt"));
                          const n = q ? parseInt(q) : NaN;
                          if (!isNaN(n)) stockM.mutate({ id: m.id, amount: n });
                        }}
                      >
                        <PackagePlus className="h-4 w-4 mr-2" /> {t("menuPage.addStock")}
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
              {editing && (
                <MenuForm
                  title={t("menuPage.editItem")}
                  initial={editing}
                  onSubmit={(v) =>
                    updateM.mutate({ id: editing.id, ...v }, { onSuccess: () => setEditing(null) })
                  }
                  loading={updateM.isPending}
                />
              )}
            </Dialog>
          </>
        )}

        {tab === "combos" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {t("menuPage.combosOnly", { count: combos.length })}
              </p>
              <Button
                className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                onClick={() => {
                  setComboAddKey((k) => k + 1);
                  setOpenComboAdd(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("menuPage.addCombo")}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={fadeIn(1)}>
              {combos.map((c) => (
                <Card
                  key={c.id}
                  className="p-4 flex flex-col border border-border bg-card/80 backdrop-blur-xl hover:border-border hover:bg-card transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      <Clock className="h-3 w-3" />
                      {Math.floor(c.seconds / 3600)}
                      {t("menuPage.hours_unit")}
                    </div>
                  </div>
                  <div className="mt-3 font-semibold text-lg text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                    {c.items?.map((ci) => (
                      <span
                        key={ci.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border"
                      >
                        {ci.menuItem?.name} ×{ci.qty}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-display text-lg font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      {formatVND(c.price)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingCombo(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          confirm(t("common.deleteConfirm", { name: c.name })) &&
                          deleteComboM.mutate(c.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Dialog open={!!editingCombo} onOpenChange={(o) => !o && setEditingCombo(null)}>
              {editingCombo && (
                <ComboForm
                  menuItems={menu}
                  title={t("menuPage.editCombo")}
                  initial={editingCombo}
                  onSubmit={(v) =>
                    updateComboM.mutate(
                      { id: editingCombo.id, ...v },
                      { onSuccess: () => setEditingCombo(null) },
                    )
                  }
                  loading={updateComboM.isPending}
                />
              )}
            </Dialog>
          </>
        )}

        <Dialog
          open={openComboAdd}
          onOpenChange={(v) => {
            setOpenComboAdd(v);
            if (v) setComboAddKey((k) => k + 1);
          }}
        >
          <ComboForm
            key={comboAddKey}
            menuItems={menu}
            onSubmit={(v) => createComboM.mutate(v, { onSuccess: () => setOpenComboAdd(false) })}
            loading={createComboM.isPending}
          />
        </Dialog>
      </div>
    </div>
  );
}

function MenuForm({
  title,
  initial,
  onSubmit,
  loading,
}: {
  title: string;
  initial?: MenuItem;
  onSubmit: (v: {
    name: string;
    category: string;
    price: number;
    image: string | null;
    stock: number;
  }) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Đồ uống");
  const [price, setPrice] = useState(initial?.price ?? 10000);
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [image, setImage] = useState(initial?.image ?? null);

  return (
    <DialogContent className="border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle className="text-foreground">{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground">
            {t("menuPage.itemName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
          />
          {!name && (
            <p className="text-xs text-destructive mt-1">{t("menuPage.itemNameRequired")}</p>
          )}
        </div>
        <div>
          <Label className="text-foreground">{t("menuPage.category")}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-background text-foreground">
              <SelectItem value="Đồ uống">{t("menuPage.categoryDrink")}</SelectItem>
              <SelectItem value="Ăn vặt">{t("menuPage.categorySnack")}</SelectItem>
              <SelectItem value="Đồ ăn">{t("menuPage.categoryFood")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-foreground">{t("menuPage.priceLabel")}</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="border-border bg-background text-foreground"
          />
        </div>
        <div>
          <ImageUpload value={image} onChange={setImage} folder="menu/combo" />
        </div>
        <div>
          <Label className="text-foreground">{t("menuPage.stock")}</Label>
          <Input
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className="border-border bg-background text-foreground"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !name || price <= 0}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() => onSubmit({ name, category, price, image, stock })}
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ImageUpload({
  value,
  onChange,
  folder,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
}) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useServerFn(uploadImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const setPreviewUrl = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };

  const resizeAndUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("menuPage.imageError"));
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = localUrl;
      });
      const max = 800;
      let { width, height } = img;
      if (width > max || height > max) {
        if (width > height) {
          height = (height / width) * max;
          width = max;
        } else {
          width = (width / height) * max;
          height = max;
        }
      }
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = c.toDataURL("image/jpeg", 0.8).split(",")[1];
      const url = await upload({ data: { name: file.name, data: base64, folder } });
      onChange(url);
    } catch (e) {
      console.error(e);
      toast.error(
        t("menuPage.imageUploadError", { message: (e as Error)?.message ?? t("common.error") }),
      );
    }
    setUploading(false);
  };

  const src = preview || value;

  return (
    <div className="space-y-2">
      <Label className="text-foreground">{t("menuPage.image")}</Label>
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer ${
          dragging
            ? "border-purple-400 bg-purple-500/10"
            : "border-border hover:border-muted-foreground"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) resizeAndUpload(f);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) resizeAndUpload(f);
            e.target.value = "";
          }}
        />
        {src ? (
          <div className="w-full space-y-2">
            <img src={src} alt="preview" className="max-h-32 mx-auto rounded-lg object-cover" />
            {uploading && (
              <p className="text-xs text-center text-muted-foreground">{t("menuPage.uploading")}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-border text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setPreviewUrl(null);
              }}
            >
              {t("menuPage.removeImage")}
            </Button>
          </div>
        ) : uploading ? (
          <p className="text-xs text-muted-foreground">{t("menuPage.uploading")}</p>
        ) : (
          <>
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">{t("menuPage.dragDropImage")}</p>
          </>
        )}
      </div>
    </div>
  );
}

function ComboForm({
  title,
  initial,
  menuItems,
  onSubmit,
  loading,
}: {
  title?: string;
  initial?: Combo;
  menuItems: MenuItem[];
  onSubmit: (v: {
    name: string;
    price: number;
    seconds: number;
    image: string | null;
    itemIds: { menuItemId: string; qty: number }[];
  }) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("menuPage.addNewCombo");
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.price ?? 50000);
  const [seconds, setSeconds] = useState(initial?.seconds ?? 10800);
  const [image, setImage] = useState(initial?.image ?? null);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ menuItemId: string; qty: number }[]>(
    initial?.items?.map((i) => ({ menuItemId: i.menuItem?.id ?? i.menuItemId, qty: i.qty })) ?? [],
  );

  const available = menuItems.filter((m) => m.category !== "Combo");
  const addItem = (menuItemId: string) => {
    if (!selectedItems.find((s) => s.menuItemId === menuItemId)) {
      setSelectedItems([...selectedItems, { menuItemId, qty: 1 }]);
    }
  };
  const removeItem = (menuItemId: string) =>
    setSelectedItems(selectedItems.filter((s) => s.menuItemId !== menuItemId));
  const updateQty = (menuItemId: string, qty: number) =>
    setSelectedItems(selectedItems.map((s) => (s.menuItemId === menuItemId ? { ...s, qty } : s)));

  const filtered = available.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DialogContent className="border-border bg-background text-foreground max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-foreground">{resolvedTitle}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground">
            {t("menuPage.comboName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
          />
          {!name && (
            <p className="text-xs text-destructive mt-1">{t("menuPage.comboNameRequired")}</p>
          )}
        </div>
        <div>
          <ImageUpload value={image} onChange={setImage} folder="menu/combo" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-foreground">{t("menuPage.comboPrice")}</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="border-border bg-background text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground">{t("menuPage.playHours")}</Label>
            <Select value={String(seconds)} onValueChange={(v) => setSeconds(Number(v))}>
              <SelectTrigger className="border-border bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-background text-foreground">
                <SelectItem value="1800">{`30 ${t("menuPage.minutes")}`}</SelectItem>
                <SelectItem value="3600">{`1 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="5400">{`1.5 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="7200">{`2 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="10800">{`3 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="14400">{`4 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="18000">{`5 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="21600">{`6 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="28800">{`8 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="43200">{`12 ${t("menuPage.hours_unit")}`}</SelectItem>
                <SelectItem value="86400">{`24 ${t("menuPage.hours_unit")}`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-foreground">{t("menuPage.itemsInCombo")}</Label>
          <Input
            placeholder={t("menuPage.searchItems")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 border-border bg-background text-foreground"
          />
          <div className="mt-2 space-y-2 max-h-72 overflow-auto border border-border rounded-lg p-2">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">{t("menuPage.noItemsFound")}</p>
            )}
            {filtered.map((m) => {
              const sel = selectedItems.find((s) => s.menuItemId === m.id);
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    sel ? "bg-primary/10 border border-primary/30" : "bg-muted hover:bg-muted/80"
                  }`}
                  onClick={() => (sel ? removeItem(m.id) : addItem(m.id))}
                >
                  <span className="flex-1 text-sm text-foreground">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{formatVND(m.price)}</span>
                  {sel && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">
                        {t("menuPage.qtyLabel")}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        value={sel.qty}
                        onChange={(e) => updateQty(m.id, Math.max(1, Number(e.target.value)))}
                        className="w-16 h-7 text-xs border-border bg-background text-foreground"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("menuPage.selectedItems", { count: selectedItems.length })}
            </p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !name || price <= 0 || seconds <= 0 || selectedItems.length === 0}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
          onClick={() => onSubmit({ name, price, seconds, image, itemIds: selectedItems })}
        >
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
