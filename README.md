# 🖥️ CyberNet — Internet Café Management System

<div align="center">

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TanStack](https://img.shields.io/badge/TanStack-Start-FF4154?logo=tanstack&logoColor=white)](https://tanstack.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS%20v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Quản lý quán net toàn diện** — máy tính, gọi món, thanh toán, combo, khách hàng và báo cáo doanh thu.

</div>

---

## 🎬 Demo

<https://github.com/user-attachments/assets/897eddd1-4c80-4546-96a6-726e16c92dc0>



---

## 📖 Giới thiệu / About

**CyberNet** là hệ thống quản lý quán net (quán internet) hoàn chỉnh: theo dõi phiên chơi máy tính, gọi đồ ăn / nước uống từ kiosk, combo, thanh toán tại quầy (POS), hóa đơn, phân hạng khách hàng và khuyến mãi. Giao diện được xây dựng hiện đại, phản hồi thời gian thực nhờ **SSE (Server-Sent Events)**.

**CyberNet** is a complete internet café (quán net) management system: PC rental session tracking, food & drink ordering from the kiosk, combos, point-of-sale (POS) payments, invoices, customer tiers, and promotions. The UI is modern and real-time powered by **SSE (Server-Sent Events)**.

---

## ✨ Tính năng / Features

### 🖥️ Kiosk — `/play`
- Xem thời gian chơi còn lại, giá / giờ theo máy & khu vực
- Gọi món trực tiếp từ màn hình kiosk, hủy đơn trong 30s
- Thanh toán bằng mã QR / gọi thu ngân / thanh toán tại quầy
- Đặt combo tăng giờ chơi ngay từ ghế

### 🛠️ Admin — `/admin`
| Module | Chức năng |
|--------|-----------|
| Máy tính (`admin.machines`) | Quản lý máy (bật/tắt phiên, kết thúc, gia hạn, trạng thái theo khu vực) |
| Menu (`admin.menu`) | Món ăn / nước uống, tồn kho, ảnh, ngưỡng báo hết hàng |
| POS (`admin.pos`) | Bán hàng tại quầy, liên kết hóa đơn máy, thu tiền |
| Combo (`admin`) | Gói combo đồ + giờ chơi |
| Khuyến mãi (`admin.discounts`) | Mã giảm giá theo phần trăm / số tiền |
| Khách hàng (`admin.customers`) | Thông tin, lượt truy cập, tổng chi tiêu, hạng VIP, điểm thưởng |
| Bàn phím (`admin.keyboards`) | Cho thuê bàn phím gaming |
| Nhập hàng (`admin.purchase-orders`) | Ghi nhận đơn nhập hàng, giá vốn |
| Báo cáo (`admin.reports`) | Doanh thu, thống kê |
| Nhân viên (`admin.users`) | Tài khoản admin / thu ngân |
| Nhật ký (`admin.audit-log`) | Lịch sử thao tác, IP |
| Thanh toán (`admin.payments`) | Theo dõi giao dịch & hoàn tiền |
| Cài đặt (`admin.settings`) | Cấu hình hệ thống |

### ⚡ Real-time
- **SSE (Server-Sent Events)**: hóa đơn, đơn gọi món, tồn kho, thông báo cập nhật tức thời giữa kiosk ↔ admin.

---

## 🧰 Công nghệ / Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) + React 19 + TanStack Router (file-based) |
| Build | Vite 7 via `@lovable.dev/vite-tanstack-config` |
| Style | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (new-york) + tw-animate-css |
| Database | Prisma — SQLite (dev) / PostgreSQL (Docker) |
| Auth | Supabase |
| Encryption | AES-256-CBC (`ENCRYPTION_KEY`, 32-byte hex) |
| Server Target | Cloudflare Workers (`wrangler.jsonc` → `src/server.ts`) |
| Package Manager | [bun](https://bun.sh) (có 24h supply-chain guard) hoặc npm |

---

## ⚙️ Yêu cầu / Prerequisites

- **Node.js 20+** (khuyến nghị 24 LTS)
- **npm** hoặc **bun**
- **Docker** (nếu dùng PostgreSQL)

> 💡 Chưa cài Node? Trong thư mục dự án có file **`node-v24.16.0-x64.msi`** — bấm đúp chạy như phần mềm thường (không cần mở trong VS Code), sau đó kiểm tra lại bằng:
>
> ```bash
> npm -v
> ```
>
> Thấy số phiên bản là được. ✅

---

## 🚀 Cài đặt & Chạy / Quick Start

### Cách 1 — Đầy đủ (đã reset database + dữ liệu mẫu)

> Chỉ chạy bước DB khi cần tạo / nạp lại dữ liệu.

```bash
npm install
npx prisma generate
npx prisma db push     
npx prisma db seed     
npm run dev
```

> `npx prisma db push` tạo database theo schema, `npx prisma db seed` nạp dữ liệu mẫu.
> lần sau chỉ cần `npm run dev` để chạy dev server.

### Cách 2 — Docker (PostgreSQL, lần đầu)

```bash
docker-compose up --build -d
```

Đối với những lần sau: `docker-compose up -d` — Xóa: `docker-compose down`

### Kiểm tra database

```bash
npx prisma studio
```

---

## 👤 Tài khoản demo / Demo Accounts

| Vai trò | Username  | Password     |
|---------|-----------|--------------|
| Admin   | `admin`   | `admin123`   |
| Thu ngân (cashier) | `thungan` | `thungan123` |

---

## 🔐 Biến môi trường / Environment Variables

Sao chép `.env.example` thành `.env` và điền giá trị. `ENCRYPTION_KEY` được tự sinh khi cài đặt (hoặc chạy lại `node scripts/setup-env.js`).

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Chuỗi kết nối database, mặc định `file:./dev.db` (SQLite) |
| `SUPABASE_URL` | URL Supabase project |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `VITE_SUPABASE_URL` | URL Supabase (cho client) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (cho client) |
| `ENCRYPTION_KEY` | 32-byte hex key dùng AES-256-CBC (bí mật — không commit) |

---

## 📟 Lệnh / Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Dev-mode build |
| `npm run build:node` | Build node entry (`vite.config.node.ts`) |
| `npm start` | Chạy build sản phẩm (`node prod.mjs`) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (flat config) |
| `npm run format` | Prettier (100 printWidth, trailingComma all) |
| `npm test` | Chạy test với Vitest |
| `npm run db:push` | Prisma schema → DB |
| `npm run db:seed` | Nạp dữ liệu mẫu |
| `docker-compose up -d --build` | Chạy toàn bộ (PostgreSQL + app) |

> `postinstall` tự chạy `prisma generate --schema=./prisma/schema.prisma`.

---

## 🧪 Kiểm thử / Testing

Dùng [Vitest](https://vitest.dev):

```bash
npm test
```

Các bộ test hiện có:

| File | Nội dung |
|------|----------|
| `src/__tests__/encryption.test.ts` | AES encrypt/decrypt, hashPassword, verifyPassword |
| `src/__tests__/format.test.ts` | formatVND, formatDate |
| `src/__tests__/utils.test.ts` | `cn()` (clsx + tailwind-merge) |
| `src/__tests__/error-page.test.ts` | renderErrorPage |
| `src/__tests__/locales.test.ts` | Đồng bộ key i18n vi ↔ en |
| `src/__tests__/database.test.ts` | CRUD, constraints, relations, cascade delete (Prisma + SQLite) |

Yêu cầu: đã chạy `npx prisma db push` + `npx prisma db seed` để có `dev.db` với dữ liệu mẫu. CI (GitHub Actions `.github/workflows/ci.yml`) chạy đúng quy trình này trước khi `npm test`.

---

## 📁 Cấu trúc dự án / Project Structure

```
├── prisma/
│   ├── schema.prisma        # Models MongoDB → SQLite/PostgreSQL
│   └── seed.js              # Dữ liệu mẫu
├── src/
│   ├── routes/              # Flat file-based routes (router.gen.ts tự sinh)
│   ├── lib/
│   │   ├── functions/       # Server functions (createServerFn)
│   │   ├── encryption.ts    # AES-256-CBC
│   │   ├── format.ts        # formatVND, formatDate
│   │   ├── prisma.server.ts # Singleton Prisma client
│   │   └── locales/         # i18n vi/en
│   ├── components/          # App + ui (shadcn)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client & middleware
│   ├── server.ts            # SSR entry (wraps h3 errors)
│   └── __tests__/           # Vitest suites
├── eslint.config.js         # ESLint flat config
├── vitest.config.ts
└── wrangler.jsonc           # Cloudflare Workers config
```

---

## 🌐 Truy cập / Access

```
http://localhost:8080
```

- Kiosk người chơi: `http://localhost:8080/play`
- Trang quản trị: `http://localhost:8080/admin`
- Kiểm tra database: `npx prisma studio`

---

## 🧬 CI/CD

`.github/workflows/ci.yml` chạy tự động trên mỗi **push / pull request**:

1. `npm install`
2. `npx prisma generate` → `npx prisma db push` → `npx prisma db seed`
3. `npm run lint`
4. `npm test`

---

## 📄 License

Dự án nội bộ — chưa công bố License cụ thể.

---

<div align="center">Made with ☕ + ❤️ for Vietnamese internet 🇻🇳</div>
