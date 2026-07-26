import { useRef } from "react";
import { formatVND } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/cybernet.functions";

interface KitchenSlipProps {
  orderId: string;
  machine: string;
  customer?: string;
  items: { name: string; price: number; qty: number; type: string }[];
  createdAt?: string;
}

function generateKitchenSlipHtml(
  data: KitchenSlipProps,
  storeName: string,
  storeAddress: string,
  storePhone: string,
): string {
  const date = data.createdAt ? new Date(data.createdAt) : new Date();
  const dateStr = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const orderNum = data.orderId.slice(-6).toUpperCase();

  const itemsHtml = data.items
    .map(
      (item) => `
      <div class="item">
        <div class="item-main">
          <span class="item-qty">${item.qty}×</span>
          <span class="item-name">${item.name}</span>
        </div>
        <div class="item-note">${item.type === "combo" ? "COMBO" : ""}</div>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phieu bep #${orderNum}</title>
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
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
    }
    .slip { text-align: center; }

    .store-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .store-info { font-size: 8px; color: #444; margin-top: 1px; }

    .title-box {
      border: 2px solid #000;
      margin: 4px 0;
      padding: 3px 0;
    }
    .title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .order-num {
      font-size: 9px;
      font-weight: 700;
      margin-top: 1px;
    }

    .hr { border: none; border-top: 1px dashed #000; margin: 3px 0; }
    .hr2 { border: none; border-top: 2px solid #000; margin: 3px 0; }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 8px;
      text-align: left;
      font-size: 10px;
      margin: 3px 0;
    }
    .meta-grid .lbl { color: #555; font-weight: 400; }
    .meta-grid .val { font-weight: 600; text-align: right; }

    .items-section {
      text-align: left;
      margin: 4px 0;
    }
    .items-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      margin-bottom: 2px;
    }
    .item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 2px 0;
      border-bottom: 1px dotted #ddd;
    }
    .item:last-child { border-bottom: none; }
    .item-main {
      display: flex;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .item-qty {
      font-weight: 700;
      min-width: 22px;
      color: #000;
    }
    .item-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-note {
      font-size: 8px;
      color: #666;
      text-transform: uppercase;
      margin-left: 4px;
    }

    .note-box {
      border: 1px dashed #000;
      padding: 3px 4px;
      margin: 4px 0;
      text-align: left;
      font-size: 9px;
    }
    .note-label {
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
      color: #444;
    }
    .note-text {
      margin-top: 1px;
      word-break: break-word;
    }

    .status-box {
      border: 2px solid #000;
      padding: 3px 0;
      margin: 4px 0;
    }
    .status-text {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .footer {
      font-size: 8px;
      color: #666;
      margin-top: 3px;
      line-height: 1.4;
    }

    @media print {
      body { padding: 0 1mm; }
    }
  </style>
</head>
<body>
  <div class="slip">
    <div class="store-name">${storeName}</div>
    <div class="store-info">${storeAddress}${storePhone ? ` | ${storePhone}` : ""}</div>

    <div class="title-box">
      <div class="title">PHIẾU BẾP</div>
      <div class="order-num">#${orderNum}</div>
    </div>

    <div class="meta-grid">
      <span class="lbl">Máy:</span>
      <span class="val">${data.machine}</span>
      <span class="lbl">Ngày:</span>
      <span class="val">${dateStr}</span>
      <span class="lbl">Giờ:</span>
      <span class="val">${timeStr}</span>
      ${data.customer ? `<span class="lbl">Khách:</span><span class="val">${data.customer}</span>` : ""}
    </div>

    <hr class="hr2">

    <div class="items-section">
      <div class="items-title">Thực đơn</div>
      ${itemsHtml}
    </div>

    <hr class="hr">

    <div class="status-box">
      <div class="status-text">⚠ CHUẨN BỊ</div>
    </div>

    <hr class="hr">

    <div class="footer">
      ${storeName} — ${timeStr}<br>
      Phiếu này KHÔNG phải hóa đơn thanh toán
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

export default function KitchenSlip() {
  return null;
}

export function useKitchenSlip() {
  const getSettingsFn = useServerFn(getSettings);
  const printWindowRef = useRef<Window | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["settings-for-kitchen-print"],
    queryFn: () => getSettingsFn(),
  });

  const print = (data: KitchenSlipProps): Promise<void> => {
    return new Promise((resolve) => {
      const storeName = settings?.store_name || "CyberNet";
      const storeAddress = settings?.store_address || "";
      const storePhone = settings?.store_phone || "";
      const html = generateKitchenSlipHtml(data, storeName, storeAddress, storePhone);

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

  const retryPrint = (data: KitchenSlipProps): void => {
    const storeName = settings?.store_name || "CyberNet";
    const storeAddress = settings?.store_address || "";
    const storePhone = settings?.store_phone || "";
    const html = generateKitchenSlipHtml(data, storeName, storeAddress, storePhone);

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

  return { print, retryPrint };
}
