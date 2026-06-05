# PrintCost - Web App (Next.js)

Giao diện web quản lý và tính toán giá in 3D dành cho hệ thống **PrintCost**. Được xây dựng trên Next.js (App Router) và Vanilla CSS.

## 🚀 Phát triển cục bộ (Local Development)

### Chạy trực tiếp trên máy host
1. Cài đặt các package cần thiết:
   ```bash
   npm install
   ```
2. Cấu hình biến môi trường: tạo file `.env.local` hoặc cấu hình biến môi trường:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```
3. Khởi chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy ở địa chỉ [http://localhost:3000](http://localhost:3000).

### Chạy qua Docker Compose
Dịch vụ frontend web được cấu hình tự động chạy thông qua Docker Compose ở thư mục gốc:
```bash
docker-compose up -d
```

## 🛠️ Cấu trúc thư mục dự kiến
```
frontend/web/
├── public/          # Static files (images, icons)
├── src/
│   ├── app/         # Next.js App Router (Layouts & Pages)
│   ├── components/  # Reusable UI components
│   └── styles/      # CSS files (Vanilla CSS)
├── Dockerfile       # Production build configuration
└── Dockerfile.dev   # Hot-reload development build
```
