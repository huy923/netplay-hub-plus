# 🗄️ Database Setup Guide - Netplay Hub Plus

## Tự động Setup (Khuyên dùng)

Khi bạn chạy `npm install` hoặc `bun install`, database sẽ **tự động được tạo và seeded** với dữ liệu mẫu.

```bash
# 1. Cài dependencies (database sẽ tự động setup)
npm install
# hoặc
bun install

# 2. Chạy development server
npm run dev
```

**Đó là tất cả!** Database đã sẵn sàng ✅

---

## 📍 Database Location

File SQLite lưu tại:
```
prisma/dev.db
```

---

## 🛠️ Database Commands

### Xem dữ liệu trực quan (Prisma Studio)
```bash
npm run db:studio
```
Mở giao diện web để xem, chỉnh sửa dữ liệu dễ dàng.

### Seed lại dữ liệu (reset)
```bash
npm run db:seed
```

### Reset hoàn toàn (xóa tất + tạo lại)
```bash
npm run db:reset
```

### Tạo migration khi thay đổi schema
```bash
npm run db:migrate
```

### Đẩy schema lên database (không cần migration)
```bash
npx prisma db push
```

---

## 📊 Dữ liệu Mặc định

### Máy (Machines)
- 12 máy tính (4 Thường, 3 VIP, 2 PS5)
- Trạng thái: in_use, idle, maintenance
- Giá: 8,000₫ - 20,000₫/giờ

### Menu Items
- 8 item (3 đồ uống, 3 ăn vặt, 2 combo)
- Giá: 12,000₫ - 70,000₫

### Hóa đơn (Invoices)
- 5 hóa đơn mẫu
- Trạng thái: Đã thanh toán, Chờ, Hủy

### User (Tài khoản)
- **admin** / admin123 (Admin role)
- **cashier** / cashier123 (Cashier role)

---

## 🔧 Schema / Cấu trúc Dữ liệu

Xem file [prisma/schema.prisma](prisma/schema.prisma) để hiểu cấu trúc:

```prisma
model Machine {
  id           String
  name         String
  area         String      // "VIP" | "Thường" | "PS5"
  status       String      // "in_use" | "idle" | "maintenance"
  customer     String?
  pricePerHour Int        // VND
  ...
}

model MenuItem {
  id       String
  name     String
  category String    // "Đồ uống" | "Ăn vặt" | "Combo"
  price    Int       // VND
  emoji    String
  ...
}

model Invoice {
  id       String
  machine  String
  customer String
  amount   Int            // VND
  method   String         // "Tiền mặt" | "QR" | "Ví điện tử"
  status   String         // "Đã thanh toán" | "Chờ" | "Hủy"
  ...
}

model User {
  id       String
  username String
  password String
  role     String    // "admin" | "cashier"
  ...
}
```

---

## 🚀 Sử dụng Database trong Code

### Import Client
```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
```

### Ví dụ Queries

```typescript
// Lấy tất cả máy
const machines = await prisma.machine.findMany();

// Lấy máy theo ID
const machine = await prisma.machine.findUnique({
  where: { id: "1" }
});

// Lấy máy đang sử dụng
const inUseMachines = await prisma.machine.findMany({
  where: { status: "in_use" }
});

// Tạo máy mới
await prisma.machine.create({
  data: {
    name: "Máy 08",
    area: "Thường",
    pricePerHour: 8000
  }
});

// Cập nhật máy
await prisma.machine.update({
  where: { id: "1" },
  data: { status: "idle" }
});

// Xóa máy
await prisma.machine.delete({
  where: { id: "1" }
});
```

---

## 🔐 Bảo mật

⚠️ **QUAN TRỌNG**: Mật khẩu trong seed.ts là mẫu tạm thời. Trong production:

1. **Hash mật khẩu** với bcrypt
2. **Không commit .env** vào Git
3. **Đặt environment variables** trên server production

Ví dụ hash mật khẩu:
```typescript
import bcrypt from "bcrypt";

const hashedPassword = await bcrypt.hash("password123", 10);
await prisma.user.create({
  data: {
    username: "admin",
    password: hashedPassword,
    role: "admin"
  }
});
```

---

## 📝 Troubleshooting

### ❌ Database locked
```bash
# Xóa file database và recreate
rm prisma/dev.db
npm run db:seed
```

### ❌ Prisma client not generated
```bash
npx prisma generate
```

### ❌ Port 5173 đã dùng
```bash
npm run dev -- --port 3000
```

### ❌ Permission denied khi migrate
```bash
chmod +x prisma/migrations/*
npm run db:migrate
```

---

## 💡 Tips

- Dùng **Prisma Studio** để xem dữ liệu dễ hơn: `npm run db:studio`
- SQLite tốt cho development, dùng **PostgreSQL** cho production
- Thêm **@prisma/inspect** để debug queries: `npm install @prisma/inspect`

---

## 🎯 Tiếp theo

1. ✅ Database đã setup
2. ⏭️ Tạo API endpoints để query database
3. ⏭️ Kết nối React components với database
4. ⏭️ Deploy lên production (đổi sang PostgreSQL)

Chúc bạn coding vui! 🎉
