import { invoices, machines, menu, type Invoice, type Machine, type MenuItem } from "./mock-data";

export type { Invoice, Machine, MachineStatus, MenuItem } from "./mock-data";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  total: number;
  tier: "VIP" | "Thường";
}

export interface ShopSettings {
  shopName: string;
  phone: string;
  address: string;
  standardPrice: number;
  vipPrice: number;
  ps5Price: number;
  warnBeforeMinutes: boolean;
  staffCanExtend: boolean;
  customerQrPayment: boolean;
}

export interface CybernetData {
  machines: Machine[];
  menu: MenuItem[];
  invoices: Invoice[];
  customers: Customer[];
  settings: ShopSettings;
}

export const defaultCustomers: Customer[] = [
  { id: "KH001", name: "Nguyễn Văn A", phone: "0901234567", visits: 42, total: 1850000, tier: "VIP" },
  { id: "KH002", name: "Trần Minh", phone: "0912345678", visits: 28, total: 920000, tier: "VIP" },
  { id: "KH003", name: "Lê Hoa", phone: "0923456789", visits: 15, total: 480000, tier: "Thường" },
  { id: "KH004", name: "Phạm Đức", phone: "0934567890", visits: 9, total: 320000, tier: "Thường" },
  { id: "KH005", name: "Hoàng Sơn", phone: "0945678901", visits: 67, total: 3120000, tier: "VIP" },
];

export const defaultSettings: ShopSettings = {
  shopName: "CyberNet Gaming Hub",
  phone: "0901 234 567",
  address: "123 Nguyễn Trãi, Q.1, TP.HCM",
  standardPrice: 8000,
  vipPrice: 15000,
  ps5Price: 20000,
  warnBeforeMinutes: true,
  staffCanExtend: true,
  customerQrPayment: false,
};

export function getDefaultCybernetData(): CybernetData {
  return {
    machines: machines.map((item) => ({ ...item })),
    menu: menu.map((item) => ({ ...item })),
    invoices: invoices.map((item) => ({ ...item })),
    customers: defaultCustomers.map((item) => ({ ...item })),
    settings: { ...defaultSettings },
  };
}
