# PrintCost - Mobile App (Flutter)

Ứng dụng di động quản lý in 3D dành cho thợ kỹ thuật tại xưởng, được xây dựng trên nền tảng **Flutter & Dart**.

## ⚠️ Cấu hình API Endpoint (Cực kỳ quan trọng - P0)

Điện thoại thật (iOS/Android) hoặc Emulator/Simulator **không thể kết nối** với Backend thông qua `localhost` hay `127.0.0.1`.

### Giải pháp kết nối trong mạng LAN:
1. Xác định địa chỉ IP cục bộ (LAN IP) của máy Mac Mini M4 (ví dụ: `192.168.1.15`).
   * Xem IP trên Mac: Chạy lệnh `ipconfig getifaddr en0` trong Terminal.
2. Cấu hình URL API trỏ về địa chỉ LAN IP đó. Có thể sử dụng một trong các cách sau:
   - **Cách 1: Sử dụng `--dart-define` khi khởi chạy ứng dụng (Khuyên dùng)**:
     ```bash
     flutter run --dart-define=API_URL=http://192.168.1.15:8080
     ```
   - **Cách 2: Cấu hình trực tiếp trong code (`lib/config/api_config.dart`)**:
     ```dart
     class ApiConfig {
       static const String baseUrl = String.fromEnvironment(
         'API_URL',
         defaultValue: 'http://192.168.1.15:8080',
       );
     }
     ```
   - **Cách 3: Sử dụng tệp `.env` (thông qua package `flutter_dotenv`)**:
     Tạo file `.env` tại thư mục gốc của mobile app:
     ```env
     API_URL=http://192.168.1.15:8080
     ```

---

## 🚀 Phát triển di động (Local Development)

### Yêu cầu hệ thống
* Đã cài đặt **Flutter SDK** và **Dart** (Khuyên dùng phiên bản mới nhất).
* Thiết bị giả lập (Android Emulator / iOS Simulator) hoặc thiết bị vật lý đã bật chế độ Developer Mode.

### Các bước chạy dự án
1. Tải các package phụ thuộc:
   ```bash
   flutter pub get
   ```
2. Khởi chạy ứng dụng:
   ```bash
   flutter run --dart-define=API_URL=http://<IP_MAC_MINI>:8080
   ```

## 📁 Cấu trúc thư mục khuyến nghị
```
frontend/mobile/
├── assets/            # Fonts, images, icons
├── lib/
│   ├── config/        # Cấu hình hệ thống (API URL, themes)
│   ├── models/        # Định nghĩa kiểu dữ liệu (Order, Material, Product)
│   ├── services/      # Các hàm call API bằng HTTP/Dio
│   ├── views/         # Các màn hình chính (screens) & widgets dùng chung
│   └── main.dart      # File entry point của Flutter
├── pubspec.yaml       # Tệp cấu hình các dependency của Flutter
└── README.md
```
