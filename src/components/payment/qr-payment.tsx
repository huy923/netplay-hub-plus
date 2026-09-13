import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import {
  confirmPayment,
  getPublicBankSettings,
  createPayment,
  findPendingPayment,
} from "@/lib/cybernet.functions";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Copy,
  QrCode,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface ConfirmResult {
  status: string;
  id?: string;
}

interface BankSettings {
  bankName: string;
  accountNo: string;
  accountHolder: string;
  qrPrefix: string;
}

interface QRPaymentProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  note: string;
  onSuccess: () => void;
  showStatus?: boolean;
  machine?: string;
}

const BANK_CODE_MAP: Record<string, string> = {
  Vietcombank: "VCB",
  "BIDV ": "BIDV",
  BIDV: "BIDV",
  VietinBank: "CTG",
  Agribank: "AB",
  Techcombank: "TCB",
  "MB Bank": "MB",
  MB: "MB",
  VPBank: "VPB",
  ACB: "ACB",
  Sacombank: "STB",
  HDBank: "HDB",
  "DongA Bank": "DAB",
  TPBank: "TPB",
  VIB: "VIB",
  Eximbank: "EIB",
  SHB: "SHB",
  MSB: "MSB",
  SeABank: "SSB",
  OCB: "OCB",
  PVcomBank: "PVC",
  LienVietPostBank: "LPB",
  BacABank: "BAB",
  "PG Bank": "PGB",
  VietABank: "VAB",
  NamABank: "NAB",
  OceanBank: "Oceanbank",
  CBBank: "CBB",
  KIENLONGBANK: "KLB",
  "BaoViet Bank": "BVB",
  GPBank: "GPB",
  VRB: "VRB",
  "Woori Bank": "Woori",
  CIMB: "CIMB",
  UOB: "UOB",
  HSBC: "HSBC",
  "Standard Chartered": "SCB",
  "Shinhan Bank": "SHINHAN",
};

function getBankCode(bankName: string): string {
  if (BANK_CODE_MAP[bankName]) return BANK_CODE_MAP[bankName];
  const normalized = bankName.toLowerCase().replace(/\s+/g, "").replace("bank", "");
  for (const [key, val] of Object.entries(BANK_CODE_MAP)) {
    if (key.toLowerCase().replace(/\s+/g, "").replace("bank", "").includes(normalized)) {
      return val;
    }
  }
  return bankName.replace(/\s+/g, "").substring(0, 6).toUpperCase();
}

type PendingPaymentResult = { paymentId: string; invoiceId: string; amount: number } | null;
type CreatePaymentResult = { paymentId: string; invoiceId: string | undefined };

export default function QRPayment({
  open,
  onOpenChange,
  amount,
  note,
  onSuccess,
  showStatus = false,
  machine,
}: QRPaymentProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "success" | "partial" | "overpaid" | "error">(
    "idle",
  );
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [paymentId, setPaymentId] = useState<string>("");
  const [snapshotAmount, setSnapshotAmount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const creatingRef = useRef(false);

  const cfPayment = useServerFn(confirmPayment);
  const getBank = useServerFn(getPublicBankSettings);
  const mkPayment = useServerFn(createPayment);

  const { data: bankInfo } = useQuery<BankSettings>({
    queryKey: ["bank-settings"],
    queryFn: () => getBank() as Promise<BankSettings>,
    enabled: open,
  });

  const bankName = bankInfo?.bankName ?? "Vietcombank";
  const bankCode = getBankCode(bankName);
  const accountNo = bankInfo?.accountNo ?? "1234567890";
  const transferNote = note || `THANHTOAN ${snapshotAmount}`;

  const qrUrl =
    snapshotAmount > 0
      ? `https://vietqr.app/img?acc=${encodeURIComponent(accountNo)}&bank=${encodeURIComponent(bankCode)}&amount=${snapshotAmount}&des=${encodeURIComponent(transferNote)}`
      : "";

  const confirmMutation = useMutation({
    mutationFn: (receivedAmount: number) =>
      cfPayment({
        data: {
          paymentId: paymentId,
          receivedAmount,
        },
      }) as Promise<ConfirmResult>,
    onSuccess: (result: ConfirmResult) => {
      if (result?.status === "success") {
        setStatus("success");
        toast.success(t("qr.success", "Thanh toán thành công!"));
        onSuccess();
      } else if (result?.status === "partial") {
        setStatus("partial");
        toast.warning(t("qr.partial", "Thanh toán thiếu tiền"));
      } else if (result?.status === "overpaid") {
        setStatus("overpaid");
        toast.info(t("qr.overpaid", "Thanh toán dư tiền"));
      }
    },
    onError: () => {
      setStatus("error");
      toast.error(t("qr.error", "Xác nhận thanh toán thất bại"));
    },
  });

  useEffect(() => {
    if (!open || !paymentId || status !== "idle") return;
    const es = new EventSource("/api/sse");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "payment.success" && data.id === paymentId) {
          if (data.status === "success") {
            setStatus("success");
            toast.success(t("qr.success", "Thanh toán thành công!"));
            onSuccess();
          } else if (data.status === "partial") {
            setStatus("partial");
            toast.warning(t("qr.partial", "Thanh toán thiếu tiền"));
          } else if (data.status === "overpaid") {
            setStatus("overpaid");
            toast.info(t("qr.overpaid", "Thanh toán dư tiền"));
          }
          es.close();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [open, paymentId, status, onSuccess, t]);

  const findPending = useServerFn(findPendingPayment);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setElapsed(0);
      setCopied(false);
      setSnapshotAmount(amount);
      if (amount > 0 && machine && !creatingRef.current) {
        creatingRef.current = true;
        setPaymentId("");
        findPending({ data: { machine } })
          .then((existing: PendingPaymentResult) => {
            if (existing?.paymentId && existing.amount === amount) {
              setPaymentId(existing.paymentId);
              creatingRef.current = false;
              return;
            }
            return mkPayment({
              data: {
                amount,
                method: "qr",
                machine,
                transferNote: note || `THANHTOAN ${amount}`,
              },
            }).then((result: CreatePaymentResult) => {
              if (result?.paymentId) setPaymentId(result.paymentId);
              creatingRef.current = false;
            });
          })
          .catch(() => {
            creatingRef.current = false;
          });
      }
    }
  }, [open, amount, findPending, machine, mkPayment, note]);

  useEffect(() => {
    if (open && showStatus && status === "idle") {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, showStatus, status]);

  const handleCopyAccountNo = async () => {
    if (!bankInfo?.accountNo) return;
    try {
      await navigator.clipboard.writeText(bankInfo.accountNo);
      setCopied(true);
      toast.success(t("qr.copied", "Đã sao chép"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("qr.copyError", "Không thể sao chép"));
    }
  };

  const handleConfirmPayment = () => {
    confirmMutation.mutate(snapshotAmount);
  };

  const formatElapsed = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-linear-to-r from-purple-600 via-pink-500 to-cyan-500 px-6 py-5 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur border border-white/20 shadow-lg">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">
                {t("qr.title", "Thanh toán QR")}
              </h2>
              <p className="text-sm text-white/80">{t("qr.subtitle", "Quét mã để chuyển khoản")}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Amount Display */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t("qr.amount", "Số tiền")}
            </p>
            <p className="text-3xl font-bold font-display bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {formatVND(snapshotAmount)}
            </p>
          </div>

          {/* QR Code */}
          {qrUrl ? (
            <div className="flex justify-center">
              <div className="relative rounded-2xl bg-white p-3 shadow-lg border border-border">
                <img src={qrUrl} alt="QR Code" className="h-60 w-60" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-purple-500 to-cyan-400 px-3 py-0.5 text-[10px] font-bold text-white shadow-md">
                  {bankInfo?.bankName ?? "Bank"}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <div className="grid h-60 w-[240px] place-items-center rounded-2xl bg-muted/50 border border-dashed border-border">
                <XCircle className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </div>
          )}

          {/* Bank Info */}
          {bankInfo && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("qr.bank", "Ngân hàng")}</span>
                <span className="text-sm font-medium">{bankInfo.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("qr.accountHolder", "Chủ tài khoản")}
                </span>
                <span className="text-sm font-medium">{bankInfo.accountHolder}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("qr.accountNo", "Số tài khoản")}
                </span>
                <button
                  onClick={handleCopyAccountNo}
                  className="flex items-center gap-1.5 text-sm font-mono font-semibold hover:text-purple-400 transition-colors cursor-pointer"
                >
                  {bankInfo.accountNo}
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {note && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("qr.note", "Nội dung")}</span>
                  <span className="text-sm font-medium max-w-50 truncate">{note}</span>
                </div>
              )}
            </div>
          )}

          {/* Status Indicator */}
          {showStatus && status === "idle" && (
            <div className="flex items-center gap-3 rounded-xl bg-linear-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 p-3">
              <div className="relative">
                <Clock className="h-4 w-4 text-purple-400 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 animate-ping" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-purple-300">
                  {t("qr.polling", "Đang chờ xác nhận thanh toán...")}
                </p>
              </div>
              <span className="text-xs font-mono text-purple-300">{formatElapsed(elapsed)}</span>
            </div>
          )}

          {/* Success Status */}
          {status === "success" && (
            <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="text-sm text-green-400 font-medium">
                {t("qr.successMsg", "Thanh toán thành công!")}
              </p>
            </div>
          )}

          {/* Partial Status */}
          {status === "partial" && (
            <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-400 font-medium">
                {t("qr.partialMsg", "Thanh toán thiếu tiền")}
              </p>
            </div>
          )}

          {/* Overpaid Status */}
          {status === "overpaid" && (
            <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-blue-400 font-medium">
                {t("qr.overpaidMsg", "Thanh toán dư tiền")}
              </p>
            </div>
          )}

          {/* Error Status */}
          {status === "error" && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-400 font-medium">
                {t("qr.errorMsg", "Xác nhận thất bại. Vui lòng thử lại.")}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {status === "idle" && (
              <Button
                onClick={handleConfirmPayment}
                disabled={confirmMutation.isPending}
                className="flex-1 h-11 bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all text-sm font-semibold"
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t("qr.confirmTransfer", "Tôi đã chuyển khoản")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            {(status === "success" ||
              status === "partial" ||
              status === "overpaid" ||
              status === "error") && (
              <Button
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 bg-linear-to-r from-purple-500 to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all text-sm font-semibold"
              >
                {t("qr.close", "Đóng")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 border-border text-sm"
            >
              {t("qr.cancel", "Hủy")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
