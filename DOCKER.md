# Docker Guide for Netplay Hub Plus

## Tệp Docker được tạo

- **Dockerfile** - Build sản xuất (production-ready image)
- **Dockerfile.dev** - Build phát triển (với hot reload)
- **docker-compose.yml** - Orchestration cho production và development
- **.dockerignore** - Loại trừ các tệp không cần thiết

## Chạy trên Docker

### 1. Production Mode (Recommended)

```bash
# Build và chạy image sản xuất
docker-compose up

# Hoặc build riêng
docker build -t netplay-hub-plus .
docker run -p 5173:5173 netplay-hub-plus
```

Ứng dụng sẽ chạy trên `http://localhost:5173`

### 2. Development Mode (Với hot reload)

```bash
# Chạy với hot reload
docker-compose up app-dev

# Ứng dụng sẽ chạy trên http://localhost:5174
```

### 3. Lệnh hữu ích

```bash
# Xem logs
docker-compose logs -f

# Dừng container
docker-compose down

# Rebuild image
docker-compose up --build

# Chạy lệnh bên trong container
docker-compose exec app bun run lint
docker-compose exec app bun run format
```

## Chi tiết cấu hình

### Dockerfile (Production)
- Multi-stage build để giảm kích thước image
- Sử dụng Node 20 Alpine (nhẹ)
- Build ứng dụng với Vite
- Chạy `bun run preview` trên production

### Dockerfile.dev (Development)
- Cài đặt tất cả dependencies (bao gồm dev)
- Mount volumes để hot reload
- Chạy `bun run dev`

### docker-compose.yml
- **app**: Service production
- **app-dev**: Service development (profile riêng)
- Health check tự động
- Port mapping: `5173` (prod), `5174` (dev)

## Kiến trúc ứng dụng

- **TanStack Start**: Full-stack React framework
- **Cloudflare Workers**: Backend trên edge network
- **Vite**: Build tool
- **Tailwind CSS + Radix UI**: UI components

## Tối ưu hóa

1. Image size được tối ưu bằng multi-stage build
2. Sử dụng Alpine Linux (nhỏ hơn ~80%)
3. Chỉ cài production deps trong runtime
4. Health check tự động giám sát

## Troubleshooting

**Vấn đề**: Port 5173 đã được sử dụng
```bash
docker-compose up -p 8080:5173 # Thay port
```

**Vấn đề**: Out of memory
```bash
docker run --memory=2g netplay-hub-plus
```

**Vấn đề**: Permissions denied
```bash
sudo docker-compose up
```

## Tiếp theo

- Tùy chỉnh Environment variables trong `.env`
- Thêm Database container (PostgreSQL, MongoDB) nếu cần
- Thiết lập CI/CD pipeline với GitHub Actions
- Deploy lên Docker Hub hoặc Container Registry
