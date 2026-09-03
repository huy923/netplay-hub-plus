import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-cbc";
const ENC_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

const machines = [
  {
    name: "Máy 01",
    area: "Thường",
    status: "in_use",
    customer: "Khách vãng lai",
    remaining: "01:25",
    pricePerHour: 8000,
  },
  { name: "Máy 02", area: "Thường", status: "idle", pricePerHour: 8000 },
  {
    name: "Máy 03",
    area: "Thường",
    status: "in_use",
    customer: "Nguyễn Văn A",
    remaining: "00:12",
    pricePerHour: 8000,
  },
  { name: "Máy 04", area: "Thường", status: "maintenance", pricePerHour: 8000 },

  {
    name: "VIP 01",
    area: "VIP",
    status: "in_use",
    customer: "Trần Minh",
    remaining: "02:40",
    pricePerHour: 15000,
  },
  { name: "VIP 02", area: "VIP", status: "idle", pricePerHour: 15000 },
  {
    name: "VIP 03",
    area: "VIP",
    status: "in_use",
    customer: "Lê Hoa",
    remaining: "00:45",
    pricePerHour: 15000,
  },
  {
    name: "PS5 01",
    area: "PS5",
    status: "in_use",
    customer: "Phạm Đức",
    remaining: "01:00",
    pricePerHour: 20000,
  },
  { name: "PS5 02", area: "PS5", status: "idle", pricePerHour: 20000 },
  { name: "Máy 05", area: "Thường", status: "idle", pricePerHour: 8000 },
  { name: "Máy 06", area: "Thường", status: "idle", pricePerHour: 8000 },
  { name: "Máy 07", area: "Thường", status: "idle", pricePerHour: 8000 },
];
const menu = [
  {
    name: "Pepsi lon",
    category: "Đồ uống",
    price: 12000,
    image: "/images/menu/do-uong/pepsi.jpg",
    stock: 24,
  },
  {
    name: "Sting dâu",
    category: "Đồ uống",
    price: 12000,
    image: "/images/menu/do-uong/sting.jpg",
    stock: 15,
  },
  {
    name: "Redbull",
    category: "Đồ uống",
    price: 15000,
    image: "/images/menu/do-uong/redbull.jpg",
    stock: 0,
  },
  {
    name: "Bạc xỉu",
    category: "Đồ uống",
    price: 20000,
    image: "/images/menu/do-uong/bac-xiu.png",
    stock: 10,
  },
  {
    name: "Monster energy",
    category: "Đồ uống",
    price: 15000,
    image: "/images/menu/do-uong/monster-energy.png",
    stock: 5,
  },
  {
    name: "Monster energy white",
    category: "Đồ uống",
    price: 15000,
    image: "/images/menu/do-uong/monster-energy-white.png",
    stock: 5,
  },
  {
    name: "Cafe sữa đá",
    category: "Đồ uống",
    price: 20000,
    image: "/images/menu/do-uong/cafe-sua-da.png",
    stock: 12,
  },
  {
    name: "Trà tắc",
    category: "Đồ uống",
    price: 15000,
    image: "/images/menu/do-uong/tra-tac.png",
    stock: 20,
  },
  {
    name: "Nước khoáng Aquafina",
    category: "Đồ uống",
    price: 10000,
    image: "/images/menu/do-uong/Nước khoáng Aquafina.png",
    stock: 30,
  }, // Thêm từ ảnh
  {
    name: "Cơm bò né bông cải",
    category: "Đồ ăn",
    price: 45000,
    image: "/images/menu/do-an/Cơm bò né bông cải.png",
    stock: 15,
  },
  {
    name: "Cơm gà xối mỡ",
    category: "Đồ ăn",
    price: 40000,
    image: "/images/menu/do-an/Cơm gà xối mỡ.png",
    stock: 20,
  },
  {
    name: "Cơm sườn trứng ốp la",
    category: "Đồ ăn",
    price: 35000,
    image: "/images/menu/do-an/Cơm sườn trứng ốp la.png",
    stock: 15,
  },
  {
    name: "Mì xào bò xúc xích",
    category: "Đồ ăn",
    price: 30000,
    image: "/images/menu/do-an/Mì xào bò xúc xích.png",
    stock: 25,
  },
  {
    name: "Xúc xích nướng",
    category: "Đồ ăn",
    price: 15000,
    image: "/images/menu/do-an/Xúc xích nướng.png",
    stock: 40,
  },
  {
    name: "Mì tôm trứng",
    category: "Ăn vặt",
    price: 25000,
    image: "/images/menu/do-an/Mì tôm trứng.png",
    stock: 50,
  }, // Trong ảnh file nằm ở folder do-an
  {
    name: "Khoai tây chiên",
    category: "Ăn vặt",
    price: 25000,
    image: "/images/menu/an-vat/khoai-tay.jpg",
    stock: 0,
  },
];

const keyboards = [
  {
    name: "Razer BlackWidow V4",
    brand: "Razer",
    pricePerHour: 10000,
    status: "idle",
    image: "/images/keyboards/razer-v4.jpg",
  },
  {
    name: "Logitech G Pro X",
    brand: "Logitech",
    pricePerHour: 12000,
    status: "rented",
    image: "/images/keyboards/logitech-gpro.jpg",
    machineId: "VIP 01",
  },
  {
    name: "Corsair K70 RGB",
    brand: "Corsair",
    pricePerHour: 8000,
    status: "idle",
    image: "/images/keyboards/corsair-k70.jpg",
  },
  {
    name: "SteelSeries Apex Pro",
    brand: "SteelSeries",
    pricePerHour: 15000,
    status: "maintenance",
    image: "/images/keyboards/apex-pro.jpg",
  },
];

const combos = [
  {
    name: "Combo Sáng ",
    price: 60000,
    seconds: 10800,
    image: "/images/menu/combo/sang.jpg",
    items: [
      { name: "Cơm sườn trứng ốp la", qty: 1 },
      { name: "Pepsi lon", qty: 1 },
      { name: "Xúc xích nướng", qty: 2 },
    ],
  },
  {
    name: "Combo Chiều ",
    price: 60000,
    seconds: 10800,
    image: "/images/menu/combo/chieu.jpg",
    items: [
      { name: "Cơm bò né bông cải", qty: 1 },
      { name: "Monster energy white", qty: 1 },
      { name: "Xúc xích nướng", qty: 2 },
    ],
  },
  {
    name: "Combo Game Thủ",
    price: 55000,
    seconds: 10800,
    image: "/images/menu/combo/game-thu.jpg",
    items: [
      { name: "Mì tôm trứng", qty: 1 },
      { name: "Pepsi lon", qty: 1 },
      { name: "Xúc xích nướng", qty: 2 },
    ],
  },
  {
    name: "Combo Đêm Khuya",
    price: 70000,
    seconds: 10800,
    image: "/images/menu/combo/dem-khuya.jpg",
    items: [
      { name: "Mì tôm trứng", qty: 1 },
      { name: "Sting dâu", qty: 1 },
      { name: "Xúc xích nướng", qty: 2 },
    ],
  },
];
const customers = [
  {
    name: "Nguyễn Văn A",
    phone: "123456",
    password: encrypt("123456"),
    visits: 42,
    total: 1850000,
    tier: "VIP",
  },
  {
    name: "Trần Minh",
    phone: "0912345678",
    password: encrypt("123456"),
    visits: 28,
    total: 920000,
    tier: "VIP",
  },
  {
    name: "Lê Hoa",
    phone: "0923456789",
    password: encrypt("123456"),
    visits: 15,
    total: 480000,
    tier: "Thường",
  },
  {
    name: "Phạm Đức",
    phone: "0934567890",
    password: encrypt("123456"),
    visits: 9,
    total: 320000,
    tier: "Thường",
  },
  {
    name: "Hoàng Sơn",
    phone: "0945678901",
    password: encrypt("123456"),
    visits: 67,
    total: 3120000,
    tier: "VIP",
  },
];
// 2 tài khoản người dùng: 1 admin và 1 nhân viên thu ngân. Mật khẩu được mã hóa bằng AES-256-CBC.
async function main() {
  const users = [
    { username: "admin", password: encrypt("admin123"), role: "admin" },
    { username: "thungan", password: encrypt("thungan123"), role: "cashier" },
  ];
  // Sử dụng upsert để tránh lỗi trùng lặp khi chạy lại seed nhiều lần. Nếu đã tồn tại, sẽ không cập nhật gì (update: {}), chỉ tạo mới nếu chưa có.
  for (const u of users) {
    await prisma.user.upsert({ where: { username: u.username }, update: {}, create: u });
  }
  // Tương tự với máy, menu và khách hàng. Với khách hàng, nếu đã tồn tại sẽ không cập nhật gì để giữ nguyên dữ liệu cũ.
  for (const m of machines) {
    await prisma.machine.upsert({ where: { name: m.name }, create: m, update: m });
  }
  for (const m of menu) {
    await prisma.menuItem.upsert({ where: { name: m.name }, create: m, update: m });
  }
  for (const kb of keyboards) {
    await prisma.keyboard.upsert({ where: { name: kb.name }, create: kb, update: kb });
  }
  for (const combo of combos) {
    const comboItems = (
      await Promise.all(
        combo.items.map(async (ci) => {
          const item = await prisma.menuItem.findUnique({ where: { name: ci.name } });
          return item ? { menuItemId: item.id, qty: ci.qty } : null;
        }),
      )
    ).filter(Boolean);
    await prisma.combo.upsert({
      where: { name: combo.name },
      create: {
        name: combo.name,
        price: combo.price,
        seconds: combo.seconds,
        image: combo.image,
        items: { create: comboItems },
      },
      update: {
        price: combo.price,
        seconds: combo.seconds,
        image: combo.image,
      },
    });
  }
  for (const c of customers) {
    await prisma.customer.upsert({ where: { phone: c.phone }, create: c, update: {} });
  }
  console.log("✅ Seed done");
}
main().finally(() => prisma.$disconnect());
