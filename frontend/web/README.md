# PrintCost — Web App (Next.js)

Giao diện web quản lý và tính toán giá in 3D cho hệ thống **PrintCost**.
Xây dựng trên **Next.js 14** (App Router) + **Tailwind CSS v4** + **shadcn/ui**.

---

## ⚡ Quick Start

> **Yêu cầu:** Node.js ≥ 18, pnpm ≥ 11

```bash
# 1. Cài dependencies (CHỈ dùng pnpm — không dùng npm/yarn)
pnpm install

# 2. Chạy dev server
pnpm dev
```

Mở trình duyệt → **http://localhost:3000** (tự redirect về `/orders/create`)

---

## 📜 Scripts

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` | Chạy dev server ở `localhost:3000` |
| `pnpm build` | Build production |
| `pnpm start` | Chạy production build |
| `pnpm lint` | Kiểm tra linting |
| `pnpm kill-port` | Kill process đang chiếm port 3000 |
| `pnpm fresh` | Kill port 3000 → tự động chạy lại `dev` |

> ⚠️ **Không dùng `npm audit fix --force`** — lệnh này sẽ downgrade Next.js về version 9.x và làm hỏng App Router.

---

## 🗂️ Cấu trúc thư mục

```
frontend/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (fonts, theme script)
│   │   ├── globals.css         # Tailwind v4 + shadcn tokens (light/dark)
│   │   ├── page.tsx            # "/" → redirect /orders/create
│   │   ├── orders/
│   │   │   ├── page.tsx        # Danh sách đơn hàng (coming soon)
│   │   │   └── create/
│   │   │       └── page.tsx    # Tạo đơn hàng (main feature)
│   │   ├── materials/          # Quản lý vật liệu (coming soon)
│   │   └── fixed-items/        # Vật tư & phụ kiện (coming soon)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── collapsible.tsx # Custom (không dùng Radix)
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── select.tsx
│   │   ├── create-order/       # Components cho trang tạo đơn
│   │   │   ├── create-order-page.tsx   # Orchestrator chính
│   │   │   ├── customer-info-card.tsx  # Form thông tin khách
│   │   │   ├── order-item-card.tsx     # Card chọn sản phẩm + số lượng
│   │   │   └── pricing-receipt.tsx     # Hóa đơn tạm tính
│   │   └── theme-toggle.tsx    # Nút chuyển light/dark mode
│   └── lib/
│       ├── pricing.ts          # Engine tính giá (Big.js, DB Schema V4)
│       └── utils.ts            # cn() helper
├── .npmrc                      # pnpm config (shamefully-hoist)
├── package.json                # packageManager: pnpm@11.1.1
└── pnpm-lock.yaml              # Lock file (commit vào git)
```

---

## 🎨 Hệ thống theme (Light / Dark)

Dùng class-based dark mode của Tailwind v4. Không cần Context Provider.

**Cơ chế hoạt động:**
1. `layout.tsx` inject một `<script>` inline trước first paint → đọc `localStorage` → thêm class `.dark` vào `<html>` nếu cần (tránh flash trắng khi reload)
2. `ThemeToggle` component toggle class `.dark` và lưu vào `localStorage` với key `printcost-theme`
3. `globals.css` định nghĩa 2 bộ CSS variable: `:root` (light) và `.dark` (dark)

**Để thay đổi màu sắc**, chỉ cần sửa trong `globals.css`:
```css
:root { --primary: #2563EB; }   /* light */
.dark  { --primary: #3B82F6; }  /* dark  */
```

---

## 💰 Engine tính giá (`src/lib/pricing.ts`)

Implement đúng công thức **DB Schema V4**. Tất cả tính toán trung gian dùng `big.js` để tránh floating-point drift.

| Thành phần | Công thức |
|---|---|
| Chi phí nhựa | `weight_g × (price_per_kg / 1000) × fail_rate` |
| Chi phí máy | `(print_time_s / 3600) × 5.000 đ` |
| Chi phí công | `labor_minutes × 500 đ` |
| Bao bì | `2.400 đ` (cố định) |
| COGS | Tổng 4 dòng trên |
| Giá bán | `COGS / (1 - margin)` → làm tròn 100đ |

> 📌 **TODO:** Các constant `MATERIALS`, `PRODUCT_TEMPLATES` hiện đang hardcode. Sau này sẽ replace bằng API calls khi backend sẵn sàng (`GET /api/materials`, `GET /api/templates`).

---

## 🐳 Docker

```bash
# Production (từ thư mục gốc project)
docker-compose up -d

# Dev với hot-reload
docker build -f Dockerfile.dev -t printcost-web-dev .
docker run -p 3000:3000 -v $(pwd)/src:/app/src printcost-web-dev
```

---

## 🔧 Troubleshooting

### `EADDRINUSE: address already in use :::3000`
Port 3000 đang bị chiếm bởi process cũ (thường do terminal trước chưa stop đúng cách).
```bash
pnpm fresh        # = kill port 3000 + pnpm dev
# hoặc thủ công:
pnpm kill-port && pnpm dev
```

### `Couldn't find a 'pages' directory`
Next.js bị downgrade về version 9.x (do `npm audit fix --force`). Cách fix:
```bash
rm -rf node_modules pnpm-lock.yaml
# Sửa package.json: "next": "14.2.35" (không có dấu ^)
pnpm install
```

### `ERR_PNPM_IGNORED_BUILDS`
pnpm 11 yêu cầu approve build scripts lần đầu:
```bash
pnpm approve-builds   # chọn package nào cần approve (hoặc bỏ qua hết)
pnpm dev              # chạy lại
```
