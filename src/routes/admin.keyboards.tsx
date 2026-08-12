import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
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
import { formatVND } from "@/lib/format";
import {
  listKeyboards,
  createKeyboard,
  updateKeyboard,
  deleteKeyboard,
  listMachines,
  uploadImage,
} from "@/lib/cybernet.functions";
import {
  Plus,
  Wrench,
  Pencil,
  Trash2,
  Check,
  Monitor,
  Gamepad2,
  Keyboard as KeyboardIcon,
} from "lucide-react";

export const Route = createFileRoute("/admin/keyboards")({ component: Keyboards });

type KeyboardStatus = "idle" | "rented" | "maintenance";

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
      toast.error(t("keyboard.imageOnly"));
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
      toast.error(t("keyboard.uploadError") + ((e as any)?.message ?? t("common.unknown")));
    }
    setUploading(false);
  };

  const src = preview || value;

  return (
    <div className="space-y-2">
      <Label className="text-foreground">{t("keyboard.image")}</Label>
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
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        ) : src ? (
          <img src={src} alt="Preview" className="max-h-32 rounded object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <KeyboardIcon className="h-8 w-8 opacity-40" />
            <span className="text-sm">{t("keyboard.dragDrop")}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) resizeAndUpload(f);
          }}
        />
      </div>
    </div>
  );
}

function KeyboardForm({
  edit,
  onClose,
}: {
  edit?: {
    id: string;
    name: string;
    brand: string;
    pricePerHour: number;
    image: string | null;
    machineId: string | null;
  };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(edit?.name ?? "");
  const [brand, setBrand] = useState(edit?.brand ?? "");
  const [pricePerHour, setPricePerHour] = useState(edit?.pricePerHour ?? 10000);
  const [image, setImage] = useState<string | null>(edit?.image ?? null);
  const [machineId, setMachineId] = useState(edit?.machineId ?? "");
  const qc = useQueryClient();
  const createFn = useServerFn(createKeyboard);
  const updateFn = useServerFn(updateKeyboard);

  const mutation = useMutation({
    mutationFn: async () => {
      if (edit) {
        return updateFn({
          data: {
            id: edit.id,
            name: name || undefined,
            brand: brand || undefined,
            pricePerHour,
            image: image ?? null,
            machineId: machineId || null,
          },
        });
      }
      return createFn({
        data: { name, brand, pricePerHour, image: image ?? null, machineId: machineId || null },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keyboards"] });
      toast.success(edit ? t("common.updated") : t("common.added"));
      onClose();
    },
    onError: (e: any) => toast.error(t("common.error") + (e.message ?? t("common.unknown"))),
  });

  return (
    <div className="space-y-4">
      <ImageUpload value={image} onChange={setImage} folder="keyboards" />
      <div>
        <Label className="text-foreground">
          {t("keyboard.name")} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("keyboard.namePlaceholder")}
          className={`mt-1 border-border bg-background text-foreground ${!name ? "border-destructive" : ""}`}
        />
        {!name && <p className="text-xs text-destructive mt-1">{t("common.requiredName")}</p>}
      </div>
      <div>
        <Label className="text-foreground">
          {t("keyboard.brand")} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder={t("keyboard.brandPlaceholder")}
          className={`mt-1 border-border bg-background text-foreground ${!brand ? "border-destructive" : ""}`}
        />
        {!brand && <p className="text-xs text-destructive mt-1">{t("keyboard.requiredBrand")}</p>}
      </div>
      <div>
        <Label className="text-foreground">{t("keyboard.pricePerHour")}</Label>
        <Input
          type="number"
          value={pricePerHour}
          onChange={(e) => setPricePerHour(Number(e.target.value))}
          className="mt-1 border-border bg-background text-foreground"
        />
      </div>
      <div>
        <Label className="text-foreground">{t("keyboard.machineOptional")}</Label>
        <Input
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          placeholder={t("keyboard.machinePlaceholder")}
          className="mt-1 border-border bg-background text-foreground"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          disabled={!name || !brand || mutation.isPending}
          className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0"
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? t("common.processing") : edit ? t("common.save") : t("common.add")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Keyboards() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const statusMeta: Record<KeyboardStatus, { label: string; tone: string }> = {
    rented: { label: t("keyboard.statusRented"), tone: "primary" },
    idle: { label: t("keyboard.statusIdle"), tone: "success" },
    maintenance: { label: t("keyboard.statusMaintenance"), tone: "destructive" },
  };

  const fadeIn = (i: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease-out ${i * 0.12}s`,
  });

  const qc = useQueryClient();
  const fetchKeyboards = useServerFn(listKeyboards);
  const fetchMachines = useServerFn(listMachines);
  const { data: keyboards = [] } = useQuery({
    queryKey: ["keyboards"],
    queryFn: () => fetchKeyboards(),
  });

  const [filter, setFilter] = useState<"all" | KeyboardStatus>("all");
  const list = keyboards.filter((kb: any) => filter === "all" || kb.status === filter);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [rentKb, setRentKb] = useState<any>(null);

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => fetchMachines(),
  });

  const deleteFn = useServerFn(deleteKeyboard);
  const updateFn = useServerFn(updateKeyboard);

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keyboards"] });
      toast.success(t("common.deleted"));
    },
    onError: (e: any) => toast.error(t("common.error") + (e.message ?? t("common.unknown"))),
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
        <div style={fadeIn(0)} className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <Gamepad2 className="h-3 w-3 text-purple-400" />
              {t("keyboard.label")}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mt-3 dark:drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {t("keyboard.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("keyboard.summary", {
                total: keyboards.length,
                rented: keyboards.filter((k: any) => k.status === "rented").length,
              })}
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                <Plus className="h-4 w-4 mr-1" /> {t("keyboard.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-background text-foreground max-w-md">
              <DialogHeader>
                <DialogTitle>{t("keyboard.add")}</DialogTitle>
              </DialogHeader>
              <KeyboardForm key="add" onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div style={fadeIn(1)} className="flex flex-wrap gap-2 mb-6">
          {(
            [
              { k: "all", l: t("common.all") },
              { k: "idle", l: t("keyboard.statusIdle") },
              { k: "rented", l: t("keyboard.statusRented") },
              { k: "maintenance", l: t("keyboard.statusMaintenance") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.k}
              onClick={() => setFilter(tab.k)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                filter === tab.k
                  ? "bg-purple-100/80 text-purple-700 border-purple-300/60 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40 shadow-lg shadow-purple-500/10"
                  : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.l}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={fadeIn(2)}>
          {list.map((kb: any) => {
            const s = statusMeta[kb.status as KeyboardStatus] ?? {
              label: kb.status,
              tone: "primary",
            };
            return (
              <Card
                key={kb.id}
                className="p-4 border border-border bg-card/80 backdrop-blur-xl hover:bg-muted/50 transition-all duration-300 group flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                    {kb.image ? (
                      <img
                        src={kb.image}
                        alt={kb.name}
                        onError={(e) => {
                          e.currentTarget.src = "/images/meme.jpg";
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <KeyboardIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--${s.tone}) 15%, transparent)`,
                      color: `var(--${s.tone})`,
                    }}
                  >
                    ● {s.label}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="font-display text-lg font-bold text-foreground">{kb.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">{kb.brand}</div>
                  <div className="font-mono font-semibold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {formatVND(kb.pricePerHour)}/h
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {kb.status === "rented" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Monitor className="h-3.5 w-3.5" />
                        {t("keyboard.machine")}: {kb.machineId}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            updateFn({ data: { id: kb.id, status: "idle", machineId: null } }).then(
                              () => {
                                qc.invalidateQueries({ queryKey: ["keyboards"] });
                                toast.success(t("keyboard.returned"));
                              },
                            )
                          }
                        >
                          <Check className="h-4 w-4 mr-1" /> {t("keyboard.return")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(kb)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            confirm(t("keyboard.confirmDelete", { name: kb.name })) &&
                            deleteM.mutate(kb.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {kb.status === "idle" && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="flex-1 bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20"
                        onClick={() => setRentKb(kb)}
                      >
                        {t("keyboard.rent")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          updateFn({ data: { id: kb.id, status: "maintenance" } }).then(() => {
                            qc.invalidateQueries({ queryKey: ["keyboards"] });
                            toast.success(t("keyboard.movedToMaintenance"));
                          })
                        }
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(kb)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() =>
                          confirm(t("keyboard.confirmDelete", { name: kb.name })) &&
                          deleteM.mutate(kb.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {kb.status === "maintenance" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                        <Wrench className="h-4 w-4" /> {t("keyboard.maintenanceStatus")}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            updateFn({ data: { id: kb.id, status: "idle" } }).then(() => {
                              qc.invalidateQueries({ queryKey: ["keyboards"] });
                              toast.success(t("keyboard.maintenanceEnded"));
                            })
                          }
                        >
                          {t("keyboard.endMaintenance")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(kb)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            confirm(t("keyboard.confirmDelete", { name: kb.name })) &&
                            deleteM.mutate(kb.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-border bg-background text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>{t("keyboard.edit")}</DialogTitle>
          </DialogHeader>
          <KeyboardForm
            key={editing?.id ?? "edit"}
            edit={editing}
            onClose={() => setEditing(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!rentKb} onOpenChange={(o) => !o && setRentKb(null)}>
        <DialogContent className="border-border bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("keyboard.selectMachine", { name: rentKb?.name })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-auto">
            {machines.filter((m: any) => m.status === "in_use").length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                {t("keyboard.noMachines")}
              </p>
            )}
            {machines
              .filter((m: any) => m.status === "in_use")
              .map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => {
                    updateFn({ data: { id: rentKb.id, status: "rented", machineId: m.name } }).then(
                      () => {
                        qc.invalidateQueries({ queryKey: ["keyboards"] });
                        toast.success(
                          t("keyboard.rentedSuccess", { name: rentKb.name, machine: m.name }),
                        );
                        setRentKb(null);
                      },
                    );
                  }}
                  className="w-full text-left p-3 rounded-xl border border-border bg-card/50 hover:bg-muted/50 cursor-pointer transition-all"
                >
                  <div className="font-medium text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("keyboard.area", { area: m.area })} · {t("keyboard.customer")}:{" "}
                    {m.customer || t("keyboard.hasCustomer")}
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
