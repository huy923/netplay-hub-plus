## Nếu bạn chưa cài node thì có file `node-v24.16.0-x64.msi` đó click nó chạy là được nó chạy như file phần mềm không mở nó trong vscode xong thì kiểm tra chạy lệnh

```bash
npm -v
```

nó hiện phiên bản là được

## Cách chạy dự án chạy lệnh trong terminal

```bash
npm install &&
npx prisma generate &&
npm run dev
```

## Cái này chạy khi sửa database nếu muốn nạp lại dữ liệu thì chạy không thì thôi

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

## Truy cập

```txt
http://localhost:8080
```

## Tài khoản

### admin

```bash
admin
admin123
```

### thu ngân

```bash
thungan
thungan123
```

## Lần sau chỉ cần

```bash
npm run dev
```

w

## Kiểm tra database

```bash
npx prisma studio
```

## Nếu dùng Docker (lần đầu)

```bash
docker-compose up --build -d
```

## Lần sau chỉ cần

```bash
docker-compose up -d
```

## Xóa docker

```bash
docker-compose down
```
