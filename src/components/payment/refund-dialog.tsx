import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { refundPayment } from "@/lib/cybernet.functions";
import { formatVND } from "@/lib/format";
import { Loader2, RotateCcw, AlertCircle, Banknote, FileText } from "lucide-react";
import { toast } from "sonner";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentId: string;
  maxAmount: number;
  onRefunded: () => void;
}

export default function RefundDialog({
  open,
  onOpenChange,
  paymentId,
  maxAmount,
  onRefunded,
}: RefundDialogProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(maxAmount);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const refundFn = useServerFn(refundPayment);

  const refundMutation = useMutation({
    mutationFn: () =>
      refundFn({
        data: {
          paymentId,
          amount,
          reason: reason.trim(),
        },
      }),
    onSuccess: () => {
      toast.success(t("refund.success", "Hoàn trả thành công!"));
      onOpenChange(false);
      onRefunded();
      setAmount(maxAmount);
      setReason("");
      setError("");
    },
    onError: (err: Error) => {
      toast.error(err.message || t("refund.error", "Hoàn trả thất bại"));
    },
  });

  const handleSubmit = () => {
    setError("");

    if (amount <= 0) {
      setError(t("refund.errorMinAmount", "Số tiền phải lớn hơn 0"));
      return;
    }
    if (amount > maxAmount) {
      setError(
        t("refund.errorMaxAmount", "Số tiền hoàn trả không được vượt quá {{max}}", {
          max: formatVND(maxAmount),
        }),
      );
      return;
    }
    if (!reason.trim()) {
      setError(t("refund.errorReason", "Vui lòng nhập lý do hoàn trả"));
      return;
    }

    refundMutation.mutate();
  };

  const handleAmountChange = (value: string) => {
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    } else {
      setAmount(0);
    }
    if (error) setError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!refundMutation.isPending) {
          onOpenChange(v);
          if (!v) {
            setAmount(maxAmount);
            setReason("");
            setError("");
          }
        }
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-linear-to-r from-rose-600 via-pink-500 to-orange-500 px-6 py-5 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur border border-white/20 shadow-lg">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">
                {t("refund.title", "Hoàn trả tiền")}
              </h2>
              <p className="text-sm text-white/80">
                {t("refund.subtitle", "Xác nhận hoàn trả cho khách hàng")}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Max Amount Info */}
          <div className="rounded-xl bg-linear-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rose-300">
                {t("refund.maxAmount", "Tối đa hoàn trả")}
              </span>
              <span className="text-lg font-bold font-display bg-linear-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                {formatVND(maxAmount)}
              </span>
            </div>
          </div>

          {/* Refund Amount */}
          <div className="space-y-2">
            <Label
              htmlFor="refund-amount"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              {t("refund.amount", "Số tiền hoàn trả")}
            </Label>
            <div className="relative">
              <Input
                id="refund-amount"
                type="text"
                inputMode="numeric"
                value={amount > 0 ? amount.toLocaleString("vi-VN") : ""}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                disabled={refundMutation.isPending}
                className="text-base font-semibold pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                VND
              </span>
            </div>
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setAmount(Math.round((maxAmount * pct) / 100));
                    if (error) setError("");
                  }}
                  disabled={refundMutation.isPending}
                  className="flex-1 rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Refund Reason */}
          <div className="space-y-2">
            <Label
              htmlFor="refund-reason"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {t("refund.reason", "Lý do hoàn trả")}
            </Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder={t("refund.reasonPlaceholder", "Nhập lý do hoàn trả...")}
              disabled={refundMutation.isPending}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={refundMutation.isPending || amount <= 0}
              className="flex-1 h-11 bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all text-sm font-semibold"
            >
              {refundMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  {t("refund.confirm", "Xác nhận hoàn trả")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={refundMutation.isPending}
              className="h-11 border-border text-sm"
            >
              {t("refund.cancel", "Hủy")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
