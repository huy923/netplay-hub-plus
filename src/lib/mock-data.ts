export type MachineStatus = "in_use" | "idle" | "maintenance";
export interface Machine {
  id: string;
  name: string;
  area: "VIP" | "Thường" | "PS5";
  status: MachineStatus;
  customer?: string;
  startedAt?: string;
  remaining?: string;
  pricePerHour: number;
}

export const machines: Machine[] = [
  { id: "1", name: "Máy 01", area: "Thường", status: "in_use", customer: "Khách vãng lai", startedAt: "13:20", remaining: "01:25", pricePerHour: 8000 },
  { id: "2", name: "Máy 02", area: "Thường", status: "idle", pricePerHour: 8000 },
  { id: "3", name: "Máy 03", area: "Thường", status: "in_use", customer: "Nguyễn Văn A", startedAt: "12:00", remaining: "00:12", pricePerHour: 8000 },
  { id: "4", name: "Máy 04", area: "Thường", status: "maintenance", pricePerHour: 8000 },
  { id: "5", name: "VIP 01", area: "VIP", status: "in_use", customer: "Trần Minh", startedAt: "11:45", remaining: "02:40", pricePerHour: 15000 },
  { id: "6", name: "VIP 02", area: "VIP", status: "idle", pricePerHour: 15000 },
  { id: "7", name: "VIP 03", area: "VIP", status: "in_use", customer: "Lê Hoa", startedAt: "14:00", remaining: "00:45", pricePerHour: 15000 },
  { id: "8", name: "PS5 01", area: "PS5", status: "in_use", customer: "Phạm Đức", startedAt: "13:00", remaining: "01:00", pricePerHour: 20000 },
  { id: "9", name: "PS5 02", area: "PS5", status: "idle", pricePerHour: 20000 },
  { id: "10", name: "Máy 05", area: "Thường", status: "in_use", customer: "Khách vãng lai", startedAt: "14:30", remaining: "00:30", pricePerHour: 8000 },
  { id: "11", name: "Máy 06", area: "Thường", status: "idle", pricePerHour: 8000 },
  { id: "12", name: "Máy 07", area: "Thường", status: "idle", pricePerHour: 8000 },
];

export interface MenuItem {
  id: string;
  name: string;
  category: "Đồ uống" | "Ăn vặt" | "Combo";
  price: number;
  emoji: string;
}

export const menu: MenuItem[] = [
  { id: "m1", name: "Pepsi lon", category: "Đồ uống", price: 12000, emoji: "🥤" },
  { id: "m2", name: "Sting dâu", category: "Đồ uống", price: 12000, emoji: "🧃" },
  { id: "m3", name: "Redbull", category: "Đồ uống", price: 15000, emoji: "🪫" },
  { id: "m4", name: "Mì tôm trứng", category: "Ăn vặt", price: 25000, emoji: "🍜" },
  { id: "m5", name: "Xúc xích", category: "Ăn vặt", price: 15000, emoji: "🌭" },
  { id: "m6", name: "Khoai tây chiên", category: "Ăn vặt", price: 25000, emoji: "🍟" },
  { id: "m7", name: "Combo Game Thủ", category: "Combo", price: 55000, emoji: "🎮" },
  { id: "m8", name: "Combo Đêm Khuya", category: "Combo", price: 70000, emoji: "🌙" },
];

export interface Invoice {
  id: string;
  machine: string;
  customer: string;
  amount: number;
  method: "Tiền mặt" | "QR" | "Ví điện tử";
  status: "Đã thanh toán" | "Chờ" | "Hủy";
  time: string;
}

export const invoices: Invoice[] = [
  { id: "HD0241", machine: "Máy 03", customer: "Nguyễn Văn A", amount: 48000, method: "QR", status: "Đã thanh toán", time: "14:20" },
  { id: "HD0240", machine: "VIP 01", customer: "Trần Minh", amount: 95000, method: "Tiền mặt", status: "Đã thanh toán", time: "13:55" },
  { id: "HD0239", machine: "PS5 01", customer: "Phạm Đức", amount: 60000, method: "Ví điện tử", status: "Chờ", time: "13:40" },
  { id: "HD0238", machine: "Máy 01", customer: "Khách vãng lai", amount: 32000, method: "Tiền mặt", status: "Đã thanh toán", time: "13:20" },
  { id: "HD0237", machine: "VIP 03", customer: "Lê Hoa", amount: 120000, method: "QR", status: "Đã thanh toán", time: "13:05" },
];

export const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
