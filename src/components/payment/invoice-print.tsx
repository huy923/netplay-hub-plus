import { useRef } from "react";
import { formatVND } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/cybernet.functions";

interface InvoicePrintProps {
  invoice: {
    id: string;
    machine: string;
    customer: string;
    amount: number;
    method: string;
    time: string;
    status: string;
    createdAt: string;
    discountAmount?: number;
    items?: { name: string; price: number; qty: number; type: string }[];
  };
  bankInfo?: {
    bankName: string;
    accountNo: string;
    accountHolder: string;
    amount: number;
    note: string;
  };
}

const BANK_CODE_MAP: Record<string, string> = {
  Vietcombank: "VCB",
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
  TPBank: "TPB",
  VIB: "VIB",
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
  GPBank: "GPB",
  KIENLONGBANK: "KLB",
  "BaoViet Bank": "BVB",
  HSBC: "HSBC",
  "Standard Chartered": "SCB",
  "Shinhan Bank": "SHINHAN",
};

function getBankCode(bankName: string): string {
  if (BANK_CODE_MAP[bankName]) return BANK_CODE_MAP[bankName];
  for (const [key, val] of Object.entries(BANK_CODE_MAP)) {
    if (key.toLowerCase() === bankName.toLowerCase()) return val;
  }
  return bankName.replace(/\s+/g, "").substring(0, 6).toUpperCase();
}

function generateReceiptHtml(
  invoice: InvoicePrintProps["invoice"],
  storeName: string,
  storeAddress: string,
  storePhone: string,
  qrUrl: string,
): string {
  const date = new Date(invoice.createdAt);
  const dateStr = date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const discount = invoice.discountAmount ?? 0;
  const finalAmount = invoice.amount;
  const originalAmount = discount > 0 ? finalAmount + discount : finalAmount;
  const items = invoice.items ?? [];

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hoa don ${invoice.id}</title>
  <style>
    @page { margin: 2mm; size: 58mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Consolas', 'Courier New', monospace;
      color: #000;
      background: #fff;
      width: 58mm;
      padding: 0 2mm;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
    }
    .receipt { text-align: center; }
    .hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
    .hr2 { border: none; border-top: 1px solid #000; margin: 3px 0; }
    .store-name {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .store-info { font-size: 9px; color: #333; margin-top: 2px; }
    .title { font-size: 10px; font-weight: 700; margin: 4px 0 2px; letter-spacing: 0.5px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
    .meta span { color: #333; }
    .row { display: flex; justify-content: space-between; font-size: 10.5px; padding: 1.5px 0; }
    .row .lbl { color: #333; }
    .row .val { font-weight: 600; }
    .row.total {
      border-top: 1px dashed #000;
      margin-top: 3px;
      padding-top: 3px;
      font-size: 12px;
      font-weight: 700;
    }
    .row.total .val { font-size: 13px; }
    .discount { color: #333; font-size: 10px; }
    .items-header { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 4px; color: #333; }
    .item-row { display: flex; justify-content: space-between; font-size: 10px; padding: 1px 0; }
    .item-name { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-qty { width: 30px; text-align: center; color: #666; }
    .item-price { width: 70px; text-align: right; font-weight: 500; }
    .qr-section { margin: 6px 0; }
    .qr-section img { width: 120px; height: 120px; }
    .qr-hint { font-size: 8px; color: #666; margin-top: 2px; }
    .invoice-id {
      font-size: 8px;
      color: #666;
      word-break: break-all;
      margin: 3px 0;
    }
    .footer { font-size: 8px; color: #666; margin-top: 4px; line-height: 1.5; }
    @media print {
      body { padding: 0 1mm; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="store-name">${storeName}</div>
    <div class="store-info">${storeAddress}${storePhone ? ` | ${storePhone}` : ""}</div>
    <hr class="hr2">
    <div class="title">HOA DON THANH TOAN</div>
    <hr class="hr">

    <div class="meta"><span>Ngay:</span><span>${dateStr}</span></div>
    <div class="meta"><span>Gio:</span><span>${timeStr}</span></div>
    <div class="meta"><span>May:</span><span>${invoice.machine || "N/A"}</span></div>
    <div class="meta"><span>PT:</span><span>${invoice.method === "cash" ? "Tien mat" : "QR"}</span></div>

    <hr class="hr">

    ${
      items.length > 0
        ? `<div class="items-header">Chi tiet</div>
    <div class="item-row"><span class="item-name">Loai</span><span class="item-qty">SL</span><span class="item-price">Thanh tien</span></div>
    <hr class="hr">
    ${items
      .map(
        (item: { name: string; price: number; qty: number; type: string }) =>
          `<div class="item-row"><span class="item-name">${item.name}</span><span class="item-qty">${item.qty > 1 ? item.qty + "x" : ""}</span><span class="item-price">${formatVND(item.price * item.qty)}</span></div>`,
      )
      .join("\n    ")}`
        : `<div class="row"><span class="lbl">Thanh toan</span><span class="val">${formatVND(finalAmount)}</span></div>`
    }

    <hr class="hr">

    <div class="row total"><span class="lbl">TONG CONG</span><span class="val">${formatVND(finalAmount)}</span></div>

    ${
      qrUrl
        ? `<hr class="hr">
    <div class="qr-section">
      <img src="${qrUrl}" alt="QR" />
      <div class="qr-hint">Quet ma QR de thanh toan</div>
    </div>`
        : ""
    }

    <hr class="hr2">
    <div class="invoice-id">#${invoice.id}</div>
    <div class="footer">Cam on ban da su dung dich vu!<br>CyberNet</div>
    <hr class="hr2">
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;
}

function buildQrUrl(bankInfo: InvoicePrintProps["bankInfo"]): string {
  if (!bankInfo) return "";
  const bankCode = getBankCode(bankInfo.bankName);
  return `https://vietqr.app/img?acc=${encodeURIComponent(bankInfo.accountNo)}&bank=${encodeURIComponent(bankCode)}&amount=${bankInfo.amount}&des=${encodeURIComponent(bankInfo.note)}`;
}

export function useInvoicePrint() {
  const getSettingsFn = useServerFn(getSettings);

  const { data: settings } = useQuery({
    queryKey: ["settings-for-print"],
    queryFn: () => getSettingsFn(),
  });

  const printWindowRef = useRef<Window | null>(null);

  const writeReceipt = (
    invoice: InvoicePrintProps["invoice"],
    bankInfo?: InvoicePrintProps["bankInfo"],
  ) => {
    const storeName = settings?.store_name || "CyberNet";
    const storeAddress = settings?.store_address || "Dia chi quan net";
    const storePhone = settings?.store_phone || "";
    const qrUrl = buildQrUrl(bankInfo);
    return generateReceiptHtml(invoice, storeName, storeAddress, storePhone, qrUrl);
  };

  const print = (
    invoice: InvoicePrintProps["invoice"],
    bankInfo?: InvoicePrintProps["bankInfo"],
  ): Promise<void> => {
    return new Promise((resolve) => {
      const html = writeReceipt(invoice, bankInfo);
      const win = window.open("", "_blank", "width=500,height=700");
      if (win) {
        printWindowRef.current = win;
        win.document.write(html);
        win.document.close();
        const check = setInterval(() => {
          if (win.closed) {
            clearInterval(check);
            printWindowRef.current = null;
            resolve();
          }
        }, 500);
      } else {
        printWindowRef.current = null;
        resolve();
      }
    });
  };

  const retryPrint = (
    invoice: InvoicePrintProps["invoice"],
    bankInfo?: InvoicePrintProps["bankInfo"],
  ): void => {
    const html = writeReceipt(invoice, bankInfo);
    const win = printWindowRef.current;
    if (win && !win.closed) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      const newWin = window.open("", "_blank", "width=500,height=700");
      if (newWin) {
        printWindowRef.current = newWin;
        newWin.document.write(html);
        newWin.document.close();
      }
    }
  };

  return { print, retryPrint, settings };
}
