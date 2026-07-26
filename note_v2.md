# BÁO CÁO PHÂN TÍCH DỰ ÁN CYBERNET — NETPLAY HUB PLUS

> **Dự án:** Hệ thống quản lý quán Internet (CyberNet)
> **Framework:** TanStack Start + React 19 + Tailwind CSS v4 + Prisma + SQLite/PostgreSQL
> **Mục tiêu:** Quản lý PC cho thuê, bán đồ ăn/uống, combo, POS, hóa đơn, phân hạng khách hàng

---

## I. TỔNG QUAN KIẾN TRÚC

### 1. Core Stack

| Thành phần      | Công nghệ                                  | Ghi chú                                              |
| --------------- | ------------------------------------------ | ---------------------------------------------------- |
| Meta-framework  | TanStack Start v1.167                      | SSR trên Cloudflare Workers                          |
| UI Library      | React 19.2                                 | Server Functions, file-based routing                 |
| Router          | TanStack Router v1.168                     | File-based routes, auto-generated `routeTree.gen.ts` |
| CSS             | Tailwind v4 + tw-animate-css               | shadcn/ui new-york style                             |
| ORM             | Prisma v6.19                               | SQLite (dev) / PostgreSQL (prod)                     |
| Auth            | JWT (jose, HS256) + cookie-based session   | 24h expiry, sign/verify, getCurrentUser              |
| Mã hóa          | AES-256-CBC (node:crypto)                  | Mật khẩu user & customer                             |
| Build           | Vite 7 + @lovable.dev/vite-tanstack-config | Bundle sẵn các Vite plugins                          |
| Deploy          | Cloudflare Workers (wrangler.jsonc)        | Entry: `src/server.ts`                               |
| Package Manager | bun (npm tương thích)                      | Supply-chain guard 24h                               |
| **i18n**        | **react-i18next + i18next**                | **vi/en translation files, language switcher**       |
| **Test**        | **Vitest v4**                              | **10 tests — format, utils, encryption**             |
| **Real-time**   | **SSE (Server-Sent Events)**               | **`/api/sse` endpoint, event bus, client hook**      |

### 2. Cấu trúc thư mục

```
src/
├── __tests__/          # Test files (3 files, 10 tests)
├── components/         # UI components (admin-shell, theme-provider)
│   └── ui/            # 46 shadcn/ui primitives
├── hooks/             # useLocalOnly, useIsMobile, useRealtime
├── integrations/
│   └── supabase/      # Supabase client + auth middleware
├── lib/               # Server logic (7 files + i18n config + locales)
├── routes/            # 18 route files (flat file-based)
├── server.ts          # Cloudflare Workers entry (SSR error wrapper)
├── start.ts           # TanStack Start instance (middleware)
└── styles/            # Global CSS
prisma/
└── schema.prisma      # 15 models (190+ dòng)
public/images/         # Uploaded images
.github/workflows/     # CI workflow
```

---

## II. DANH SÁCH TÍNH NĂNG ĐÃ TRIỂN KHAI

### A. HỆ THỐNG XÁC THỰC & PHÂN QUYỀN

| STT | Tính năng             | Chi tiết                                                              | Trạng thái |
| --- | --------------------- | --------------------------------------------------------------------- | ---------- |
| 1   | Đăng nhập Admin       | Username + password → localStorage → `/admin`; chỉ localhost          | ✅         |
| 2   | Đăng nhập Khách hàng  | Phone + password (mã hóa AES-256-CBC) → localStorage → `/play`        | ✅         |
| 3   | Đăng ký Khách hàng    | Tên + SĐT + mật khẩu → tạo Customer → tự động đăng nhập               | ✅         |
| 4   | Kiểm tra IP localhost | Chặn truy cập `/admin/*` từ máy ngoài (`useLocalOnly`, inline checks) | ✅         |
| 5   | Phân quyền nhân viên  | Admin (11 menu) / Cashier (5 menu)                                    | ✅         |
| 6   | **JWT Auth (MỚI)**    | **jose HS256 JWT, cookie-based, 24h expiry, getCurrentUser, logout**  | ✅         |

### B. QUẢN LÝ MÁY (Machines)

| STT | Tính năng                   | Chi tiết                                                           | Trạng thái |
| --- | --------------------------- | ------------------------------------------------------------------ | ---------- |
| 6   | Danh sách máy               | Grid view, filter theo trạng thái (all/in_use/idle/maintenance)    | ✅         |
| 7   | Thêm máy mới                | Tên, khu vực (Thường/VIP/PS5/Stream), giá/giờ, trạng thái          | ✅         |
| 8   | Sửa thông tin máy           | Cập nhật tên, khu vực, giá, trạng thái                             | ✅         |
| 9   | Xóa máy                     | Xóa vĩnh viễn                                                      | ✅         |
| 10  | Gán khách vào máy           | Chọn tên khách + số giờ → cập nhật customer, startedAt, remaining  | ✅         |
| 11  | Kết thúc phiên              | Xóa customer, reset remaining, chuyển về idle + tạo MachineSession | ✅         |
| 12  | Đếm ngược thời gian         | Real-time countdown timer trên card máy (client-side)              | ✅         |
| 13  | Hiển thị trạng thái         | Màu sắc phân biệt: xanh=idle, đỏ=in_use, vàng=maintenance          | ✅         |
| 14  | Auto-end khi hết giờ        | Tự động kết thúc phiên khi countdown về 0, chuyển về idle          | ✅         |
| 15  | **Lịch sử phiên máy (MỚI)** | **Xem lịch sử các phiên đã kết thúc của từng máy**                 | ✅         |

### C. QUẢN LÝ THỰC ĐƠN (Menu)

| STT | Tính năng                            | Chi tiết                                                                     | Trạng thái |
| --- | ------------------------------------ | ---------------------------------------------------------------------------- | ---------- |
| 16  | Danh sách món                        | 3 tab: All, Items, Combos                                                    | ✅         |
| 17  | Thêm món mới                         | Tên, danh mục (Đồ uống/Ăn vặt/Đồ ăn), giá, giá vốn, tồn kho, ngưỡng tồn, ảnh | ✅         |
| 18  | Sửa món                              | Cập nhật tất cả field, dọn ảnh cũ khi đổi                                    | ✅         |
| 19  | Xóa món                              | Xóa món + ảnh đi kèm                                                         | ✅         |
| 20  | Upload ảnh                           | Base64 → canvas resize (max 800px) → lưu public/images/                      | ✅         |
| 21  | Quản lý tồn kho                      | Nhập kho (add stock)                                                         | ✅         |
| 22  | CRUD Combo                           | Tên, giá, giờ chơi (seconds), chọn món + số lượng                            | ✅         |
| 23  | Xóa Combo                            | Xóa combo + ảnh, cascade xóa ComboItem                                       | ✅         |
| 24  | **Cảnh báo tồn kho thấp (MỚI)**      | **Hiển thị badge vàng khi stock ≤ threshold, cảnh báo trong notification**   | ✅         |
| 25  | **Nhập hàng (Purchase Order) (MỚI)** | **Form nhập hàng với số lượng, đơn giá, nhà cung cấp, ghi chú**              | ✅         |
| 26  | **Lịch sử nhập hàng (MỚI)**          | **Xem lịch sử các đơn nhập hàng**                                            | ✅         |
| 27  | **Giá vốn & lợi nhuận (MỚI)**        | **Theo dõi giá vốn từng món (cost field)**                                   | ✅         |

### D. QUẢN LÝ BÀN PHÍM CƠ (Keyboards)

| STT | Tính năng          | Chi tiết                                                  | Trạng thái |
| --- | ------------------ | --------------------------------------------------------- | ---------- |
| 28  | Danh sách bàn phím | Tên, brand, giá/giờ, trạng thái (idle/rented/maintenance) | ✅         |
| 29  | Thêm bàn phím      | Tên, brand, giá/giờ, upload ảnh                           | ✅         |
| 30  | Sửa bàn phím       | Cập nhật thông tin + trạng thái                           | ✅         |
| 31  | Xóa bàn phím       | Xóa + ảnh                                                 | ✅         |
| 32  | Cho thuê bàn phím  | Gán vào máy đang có khách                                 | ✅         |
| 33  | Trả bàn phím       | Giải phóng khỏi máy                                       | ✅         |

### E. QUẢN LÝ KHÁCH HÀNG (Customers)

| STT | Tính năng                     | Chi tiết                                                          | Trạng thái |
| --- | ----------------------------- | ----------------------------------------------------------------- | ---------- |
| 34  | Danh sách khách               | Search theo tên/SĐT, sort theo tổng chi tiêu                      | ✅         |
| 35  | Thêm khách                    | Tên, SĐT, mật khẩu (mã hóa)                                       | ✅         |
| 36  | Sửa khách                     | Tên, SĐT, hạng (Thường/VIP), visits, total, points                | ✅         |
| 37  | Xóa khách                     | Xóa vĩnh viễn                                                     | ✅         |
| 38  | Phân hạng VIP                 | Icon crown cho VIP, filter hạng                                   | ✅         |
| 39  | Dashboard khách (play)        | 4 tab: Home, Food, Extend, Account                                | ✅         |
| 40  | **Loyalty Points (MỚI)**      | **Tích điểm khi mua hàng (1₫ = 1 điểm), đổi điểm khi thanh toán** | ✅         |
| 41  | **Lịch sử điểm thưởng (MỚI)** | **Xem lịch sử tích/tiêu điểm trong dialog chi tiết khách hàng**   | ✅         |

### F. POS & HÓA ĐƠN (Invoices)

| STT | Tính năng                          | Chi tiết                                                                      | Trạng thái |
| --- | ---------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| 42  | Tạo hóa đơn từ POS                 | Lọc zone → chọn máy → nhập tên khách → set giờ → thêm món → chọn phương thức  | ✅         |
| 43  | Phương thức thanh toán             | Tiền mặt / QR / Ví điện tử                                                    | ✅         |
| 44  | Tính tiền tự động                  | Phí giờ chơi + tiền đồ ăn                                                     | ✅         |
| 45  | Danh sách hóa đơn                  | 50 hóa đơn gần nhất (Admin Reports + Dashboard)                               | ✅         |
| 46  | Lịch sử hóa đơn KH                 | Xem hóa đơn theo tên khách                                                    | ✅         |
| 47  | Hóa đơn chờ (Chờ)                  | Tạo invoice với status "Chờ" (dịch vụ chửi thuê)                              | ✅         |
| 48  | **Invoice Items (MỚI)**            | **Lưu chi tiết từng món trong hóa đơn**                                       | ✅         |
| 49  | **Giảm giá / Mã khuyến mãi (MỚI)** | **Nhập mã giảm giá tại POS, tự động tính giảm**                               | ✅         |
| 50  | **Hoàn/trả hóa đơn (MỚI)**         | **Tạo hóa đơn hoàn tiền, đánh dấu refunded**                                  | ✅         |
| 51  | **Tích điểm tự động (MỚI)**        | **Tự động tích điểm thưởng khi thanh toán**                                   | ✅         |
| 52  | **POS cải tiến (MỚI)**             | **Lọc máy theo khu vực, nhập tên khách, persist items, gán customer vào máy** | ✅         |

### G. BÁO CÁO & THỐNG KÊ

| STT | Tính năng                    | Chi tiết                                                      | Trạng thái |
| --- | ---------------------------- | ------------------------------------------------------------- | ---------- |
| 53  | Tổng quan Dashboard          | Doanh thu hôm nay, máy đang dùng/tổng, khách đang hoạt động   | ✅         |
| 54  | Báo cáo doanh thu            | Tổng doanh thu, tổng hóa đơn, tổng giờ máy                    | ✅         |
| 55  | Biểu đồ doanh thu            | Line chart (recharts) doanh thu theo tháng                    | ✅         |
| 56  | Bảng hóa đơn gần nhất        | 50 invoice mới nhất (Admin Dashboard + Reports)               | ✅         |
| 57  | **Báo cáo theo ngày (MỚI)**  | **Bar chart + table doanh thu từng ngày trong 30 ngày**       | ✅         |
| 58  | **Báo cáo theo món (MỚI)**   | **Thống kê món bán chạy, số lượng, doanh thu**                | ✅         |
| 59  | **Báo cáo theo khách (MỚI)** | **Top khách, visits, tổng chi, điểm thưởng (sortable table)** | ✅         |
| 60  | **Báo cáo giờ máy (MỚI)**    | **Tổng giờ máy, doanh thu, sessions theo từng máy**           | ✅         |

### H. GIAO DIỆN KHÁCH HÀNG (Customer Play)

| STT | Tính năng                      | Chi tiết                                                                                | Trạng thái |
| --- | ------------------------------ | --------------------------------------------------------------------------------------- | ---------- |
| 61  | Home tab                       | Countdown thời gian còn lại, thông báo hết giờ                                          | ✅         |
| 62  | Cảnh báo sắp hết giờ           | Banner cảnh báo khi còn ≤5 phút                                                         | ✅         |
| 63  | Thông báo hết giờ              | Banner đỏ khi hết giờ, yêu cầu gia hạn                                                  | ✅         |
| 64  | Food tab                       | Xem menu, đặt đồ ăn/uống                                                                | ✅         |
| 65  | Extend tab                     | Nạp thêm giờ (thủ công) hoặc mua combo kèm giờ                                          | ✅         |
| 66  | Account tab                    | Thông tin cá nhân, lịch sử, thống kê                                                    | ✅         |
| 67  | Dịch vụ chửi thuê              | Tính năng "Thuê chửi" 10.000đ (VIP area)                                                | ✅         |
| 68  | Chuyển đổi theme               | Dark/Light/System, lưu localStorage                                                     | ✅         |
| 69  | **Thanh toán sau phiên (MỚI)** | **Khi admin kết thúc phiên, khách có 2 lựa chọn: đến quầy hoặc thanh toán online (QR)** | ✅         |

### I. GIAO DIỆN ADMIN

| STT | Tính năng          | Chi tiết                                                                                                       | Trạng thái |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------- | ---------- |
| 69  | Sidebar điều hướng | 11 mục (Dashboard, Máy, Bàn phím, POS, Dịch vụ, Khách hàng, Nhân viên, Báo cáo, Khuyến mãi, Cấu hình, Nhật ký) | ✅         |
| 70  | Avatar & đăng xuất | User info + logout button                                                                                      | ✅         |
| 71  | Notification bell  | Badge đếm cursing request pending + hàng sắp hết                                                               | ✅         |
| 72  | Theme toggle       | Dark/Light/System cycle                                                                                        | ✅         |

### J. TÍNH NĂNG NỀN TẢNG

| STT | Tính năng                       | Chi tiết                                                                            | Trạng thái |
| --- | ------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| 73  | SSR error recovery              | Bắt lỗi h3-swallowed, trả error page đẹp                                            | ✅         |
| 74  | Singleton Prisma                | Tránh leak connection ở dev                                                         | ✅         |
| 75  | Mã hóa mật khẩu                 | AES-256-CBC với ENCRYPTION_KEY (32-byte hex)                                        | ✅         |
| 76  | Upload ảnh                      | Resize canvas, lưu local filesystem                                                 | ✅         |
| 77  | Format tiền tệ                  | `formatVND()` — locale vi-VN                                                        | ✅         |
| 78  | Custom 404                      | Trang 404 tiếng Việt với nút về trang chủ                                           | ✅         |
| 79  | Error boundary                  | Có retry button                                                                     | ✅         |
| 80  | 46 shadcn/ui components         | Accordion, Dialog, Sheet, Dropdown, Table, v.v.                                     | ✅         |
| 81  | Docker Compose                  | PostgreSQL + App container                                                          | ✅         |
| 82  | Seed data                       | 12 máy, 16 món, 4 combo, 4 keyboard, 5 khách, 2 user                                | ✅         |
| 83  | Settings Backend                | Setting model Prisma + getSettings/updateSettings functions                         | ✅         |
| 84  | Settings UI kết nối DB          | Form tĩnh → load/save từ database thực tế (store info, giá, toggle)                 | ✅         |
| 85  | Auto-end Shift                  | Toggle lưu setting auto_end_shift (true/false) vào DB                               | ✅         |
| 86  | Maintenance Mode                | Chặn non-admin khi maintenance on, hiển thị trang bảo trì                           | ✅         |
| 87  | Test Framework                  | Vitest v4 + 3 test files (format, utils, encryption) — 10 tests passing             | ✅         |
| 88  | **Multi-language (i18n) (MỚI)** | **react-i18next + vi/en translation files + language switcher + t() in all routes** | ✅         |

### K. TÍNH NĂNG MỚI (Batch 2)

| STT | Tính năng                       | Chi tiết                                                          | Trạng thái |
| --- | ------------------------------- | ----------------------------------------------------------------- | ---------- |
| 89  | **Audit Log (MỚI)**             | **Ghi lại toàn bộ thao tác nhân viên (CRUD user)**                | ✅         |
| 90  | **Nhật ký đăng nhập (MỚI)**     | **Ghi lại IP, thời gian, thành công/thất bại**                    | ✅         |
| 91  | **Responsive mobile (MỚI)**     | **AdminShell mobile drawer + hamburger, responsive grids**        | ✅         |
| 92  | **Quản lý nhân viên (MỚI)**     | **CRUD User từ UI (admin/users), active/inactive**                | ✅         |
| 93  | **Discount/Coupon (MỚI)**       | **Mã giảm giá %/₫, hạn dùng, số lượt, active toggle**             | ✅         |
| 94  | **Rate limiting (MỚI)**         | **Chặn đăng nhập sai ≥5 lần trong 15 phút**                       | ✅         |
| 95  | **CI Workflow (MỚI)**           | **GitHub Actions: lint + test trên push/PR**                      | ✅         |
| 96  | **Loyalty Points (MỚI)**        | **Tích điểm tự động khi thanh toán (1000₫ = 1 điểm)**             | ✅         |
| 97  | **Notifications mở rộng (MỚI)** | **Hiển thị cả cảnh báo tồn kho thấp trong notification bell**     | ✅         |
| 98  | **Machine Session (MỚI)**       | **Tự động tạo MachineSession khi kết thúc phiên**                 | ✅         |
| 99  | **Invoice Items (MỚI)**         | **Lưu chi tiết từng món trong hóa đơn**                           | ✅         |
| 100 | **Real-time (SSE) (MỚI)**       | **SSE endpoint `/api/sse`, event bus, broadcast từ 18 mutations** | ✅         |
| 101 | **JWT Auth (MỚI)**              | **jose HS256 JWT, cookie-based session, getCurrentUser, logout**  | ✅         |

### L. TÍNH NĂNG MỚI (Batch 3)

| STT | Tính năng                             | Chi tiết                                                                | Trạng thái |
| --- | ------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| 102 | **POS cải tiến (MỚI)**                | **Lọc zone, nhập tên khách, persists invoice items, gán customer**      | ✅         |
| 103 | **Thanh toán sau phiên (MỚI)**        | **Play page overlay 2 tùy chọn: đến quầy hoặc QR online**               | ✅         |
| 104 | **Docker fix (MỚI)**                  | **RUN→CMD, host 0.0.0.0, prisma db push tự động, README sửa lệnh**      | ✅         |
| 105 | **Translation keys hoàn thiện (MỚI)** | **Thêm 70+ key còn thiếu cho keyboard/report/auditLog/pos/play/common** | ✅         |
| 106 | **Dashboard revenue hôm nay (MỚI)**   | **Lọc hóa đơn theo ngày local timezone, handle Date/string createdAt**  | ✅         |

---

## III. CHỨC NĂNG CHƯA TRIỂN KHAI / CÒN THIẾU

| STT | Tính năng                    | Mức độ  | Ghi chú                                                           |
| --- | ---------------------------- | ------- | ----------------------------------------------------------------- |
| 1   | **JWT/session thực sự**      | ✅      | jose + HS256 JWT, cookie-based, 24h expiry, getCurrentUser        |
| 2   | **Responsive mobile**        | 🟢      | AdminShell mobile drawer + hamburger, responsive grids throughout |
| 5   | **Tách bill**                | 🟢 Thấp | Chia hóa đơn cho nhiều khách                                      |
| 6   | **Quẹt thẻ / NFC**           | 🟢 Thấp | Chỉ có QR, Tiền mặt, Ví điện tử                                   |
| 7   | **Tích hợp máy in bill**     | 🟢 Thấp | Tự động in hóa đơn khi thanh toán                                 |
| 8   | **VAT/thuế**                 | 🟢 Thấp | Tính thuế trên hóa đơn                                            |
| 9   | **Block máy từ xa**          | 🟢 Thấp | Admin không thể remote shutdown/block PC                          |
| 10  | **Tích hợp phần mềm chẵn**   | 🟢 Thấp | Kết nối phần mềm quản lý net chuyên dụng                          |
| 11  | **Biểu đồ so sánh**          | 🟢 Thấp | So sánh doanh thu các tháng, các năm                              |
| 12  | **Xuất báo cáo (Excel/PDF)** | 🟢 Thấp | Export báo cáo ra file                                            |
| 13  | **In hóa đơn**               | 🟢 Thấp | In hóa đơn trực tiếp                                              |
| 14  | **Đặt hàng online trước**    | 🟢 Thấp | Khách đặt đồ trước khi đến quán                                   |
| 15  | **Nhắn tin/notify khách**    | 🟢 Thấp | SMS/Zalo thông báo khuyến mãi                                     |
| 16  | **Confirm dialog chuẩn**     | 🟢 Thấp | Một số chỗ dùng confirm() browser                                 |
| 17  | **Forgot password**          | 🟢 Thấp | Admin và customer đều chưa có quên mật khẩu                       |
| 18  | **Ca làm việc (shift)**      | 🟢 Thấp | Quản lý nhân viên theo ca                                         |

---

## IV. CƠ SỞ DỮ LIỆU — 15 TABLES

| Bảng                   | Fields                                                                                                    | Ghi chú                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Machine**            | id, name, area, status, customer, startedAt, remaining, pricePerHour, image                               | Area: Thường/VIP/PS5/Stream     |
| **MachineSession**     | id, machineId, machineName, customerName, startedAt, endedAt, hoursUsed, amount                           | Lịch sử phiên máy               |
| **MenuItem**           | id, name, category, price, cost, image, stock, lowStockThreshold                                          | cost = giá vốn                  |
| **Customer**           | id, name, phone, password, visits, total, tier, points                                                    | points = điểm thưởng            |
| **Keyboard**           | id, name, brand, pricePerHour, status, image, machineId                                                   | Status: idle/rented/maintenance |
| **Invoice**            | id, machine, customer, amount, method, status, time, discountId, discountAmount, refundedAt, refundReason | Denormalized + refund           |
| **InvoiceItem**        | id, invoiceId, name, price, qty, type                                                                     | Chi tiết từng món trong hóa đơn |
| **User**               | id, username, password, role, active                                                                      | active: true/false              |
| **Combo**              | id, name, price, seconds, image, active                                                                   | seconds = giây chơi             |
| **ComboItem**          | id, comboId, menuItemId, qty                                                                              | Junction table                  |
| **CursingRequest**     | id, machine, customer, price, status                                                                      | Dịch vụ chửi thuê               |
| **Setting**            | id, key, value                                                                                            | Key-value store                 |
| **AuditLog**           | id, userId, username, action, target, details, ip, createdAt                                              | Nhật ký thao tác                |
| **Discount**           | id, code, name, type, value, minAmount, maxUses, usedCount, active, expiresAt                             | Mã giảm giá                     |
| **PurchaseOrder**      | id, itemId, itemName, qty, unitCost, totalCost, supplier, note                                            | Đơn nhập hàng                   |
| **LoyaltyTransaction** | id, customerId, points, type, reference                                                                   | Lịch sử điểm thưởng             |
| **LoginAttempt**       | id, ip, username, success, createdAt                                                                      | Lịch sử đăng nhập               |

---

## V. API SERVER FUNCTIONS (48 functions)

| Nhóm             | Số lượng | Danh sách                                                                                                                                         |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machines         | 6        | listMachines, createMachine, updateMachine, deleteMachine, getMachineSessions, getLastMachineSessionByCustomer                                    |
| Menu Items       | 8        | listMenu, createMenuItem, updateMenuItem, addStock, deleteMenuItem, getLowStockItems, getOutOfStockItems, createPurchaseOrder, listPurchaseOrders |
| Keyboards        | 6        | listKeyboards, createKeyboard, updateKeyboard, deleteKeyboard, rentKeyboard, returnKeyboard                                                       |
| Customers        | 4        | listCustomers, createCustomer, updateCustomer, deleteCustomer                                                                                     |
| Invoices         | 6        | listInvoices, createInvoice, getInvoicesByCustomer, refundInvoice, getCustomerById, getMachineByCustomerName                                      |
| Combos           | 4        | listCombos, createCombo, updateCombo, deleteCombo                                                                                                 |
| Auth             | 6        | loginUser, loginCustomer, getCurrentUser, getCustomerFromToken, logoutUser, (rate limited)                                                        |
| Cursing          | 3        | createCursingRequest, listCursingRequests, completeCursingRequest                                                                                 |
| Reports          | 6        | getSalesReport, getDailyReport, getMenuReport, getCustomerReport, getEmployeeReport, getMachineHoursReport                                        |
| Settings         | 2        | getSettings, updateSettings                                                                                                                       |
| Users            | 4        | listUsers, createUser, updateUser, deleteUser                                                                                                     |
| Discounts        | 5        | listDiscounts, createDiscount, updateDiscount, deleteDiscount, validateDiscount                                                                   |
| Loyalty          | 3        | earnLoyaltyPoints, burnLoyaltyPoints, getLoyaltyTransactions                                                                                      |
| Audit            | 2        | getAuditLogs, getLoginAttempts                                                                                                                    |
| Keyboard Billing | 1        | getRentedKeyboardsByMachine                                                                                                                       |
| Utility          | 2        | uploadImage, (deleteImageFile internal)                                                                                                           |

---

## VI. SEED DATA HIỆN TẠI

| Loại      | Số lượng | Chi tiết                                                             |
| --------- | -------- | -------------------------------------------------------------------- |
| User      | 2        | admin (admin), thungan (cashier)                                     |
| Machine   | 12       | 8 Thường + 3 VIP + 2 PS5 (Stream chưa có máy)                        |
| Menu Item | 16       | 9 Đồ uống + 2 Ăn vặt + 5 Đồ ăn                                       |
| Combo     | 4        | Sáng (60k/3h), Chiều (60k/3h), Game Thủ (55k/3h), Đêm Khuya (70k/3h) |
| Keyboard  | 4        | Razer, Logitech, Corsair, SteelSeries                                |
| Customer  | 5        | 3 VIP + 2 Thường, có points tương ứng với tổng chi                   |

---

## VII. TỔNG KẾT & ĐÁNH GIÁ

### Tổng quan: **Dự án đã hoàn thiện đáng kể — ~95% yêu cầu cốt lõi**

**Điểm mạnh:**

- ✅ **106+ tính năng đã triển khai** (tăng từ 71+)
- ✅ Kiến trúc hiện đại: TanStack Start + React 19 + SSR + Cloudflare Workers
- ✅ UI chuyên nghiệp: shadcn/ui + dark/light theme + 46 components
- ✅ 17 bảng dữ liệu, 48 server functions
- ✅ Đầy đủ core nghiệp vụ quán net

**Đã hoàn thành trong Batch 2:**
| Tính năng | Mô tả |
|---|---|
| Audit Log (A5) | Ghi lại thao tác nhân viên + nhật ký đăng nhập |
| Quản lý nhân viên (J4) | CRUD User từ UI, active/inactive |
| Discount/Coupon (C1) | Mã giảm giá %/₫, hạn dùng, số lượt |
| Hoàn trả hóa đơn (C2) | Refund invoice + lưu lý do |
| Lịch sử phiên máy (D3) | MachineSession tự động khi end session |
| Báo cáo chi tiết (E1-E5) | Theo ngày, món, khách, giờ máy |
| Inventory (F1-F3) | Low stock alert, purchase order, giá vốn |
| Loyalty (G1) | Tích/tiêu điểm thưởng |
| Lịch sử giao dịch (G2) | Xem chi tiết điểm + hóa đơn |
| Rate limiting (J1) | Chặn login sai ≥5 lần/15 phút |
| Session log (J3) | Ghi IP, kết quả đăng nhập |
| CI workflow (A2) | GitHub Actions tự động lint + test |
| Notifications (B4) | Low stock + cursing trong notification bell |
| Multi-language (A4) | react-i18next + vi/en translation files + language switcher |
| Real-time SSE (A3) | SSE endpoint `/api/sse`, event bus, broadcast từ 18 mutation handlers, client hook invalidation |
| Responsive mobile (A4) | AdminShell mobile drawer, hamburger menu, ComboForm grid fix, all tables scrollable |
| JWT Auth (A5) | jose HS256 JWT, cookie-based session, 24h expiry, sign/verify/getCurrentUser |

**Đã hoàn thành trong Batch 3:**
| Tính năng | Mô tả |
|---|---|
| POS cải tiến | Lọc zone, nhập tên khách, persists items, gán customer vào máy |
| Thanh toán sau phiên | Khi admin end session, khách chọn: đến quầy hoặc QR online |
| Docker fix | Dockerfile đúng (CMD), host 0.0.0.0, prisma db push tự động |
| Translation keys hoàn thiện | 70+ key còn thiếu cho keyboard, report, auditLog, pos, play, common |
| Dashboard revenue hôm nay | Lọc hóa đơn theo ngày local timezone |
| Server functions mới | getLastMachineSessionByCustomer |

### Tỉ lệ hoàn thiện ước tính: **~95-98%**

> _Dự án gần như hoàn thiện cho vận hành thực tế. Các tính năng còn lại chủ yếu là cải tiến nhỏ._
