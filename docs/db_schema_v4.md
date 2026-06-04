# ARCHITECTURAL SPECIFICATION: PRINTCOST DATABASE SCHEMA V4

Tài liệu này định nghĩa cấu trúc cơ sở dữ liệu, các ràng buộc toàn vẹn tài chính, cơ chế đóng băng dữ liệu (Snapshot), và quy tắc vận hành cốt lõi của hệ thống quản lý xưởng in 3D **PrintCost**. Toàn bộ mã nguồn backend và frontend phải tuân thủ nghiêm ngặt các quy tắc trong tài liệu này.

---

## 1. NGUYÊN TẮC THIẾT KẾ CỐT LÕI (CORE PRINCIPLES)

* **Toàn vẹn tài chính (Financial Integrity):** Không sử dụng kiểu dữ liệu `FLOAT` hay `REAL` để lưu trữ tiền tệ. Tất cả các trường chi phí phải sử dụng `NUMERIC` với độ chính xác cố định để tránh sai số dấu phẩy động.
* **Thiết kế phòng thủ tầng cứng (Defensive DB-Level Design):** Các quy tắc làm tròn, chặn số âm, kiểm soát trạng thái phải được khóa chặt bằng `CHECK Constraints` và `Triggers` trực tiếp trong Database, không phụ thuộc hoàn toàn vào logic của tầng Ứng dụng (App-level).
* **Đóng băng lịch sử (Snapshot Isolation):** Khi đơn hàng được chốt, toàn bộ thông tin sản phẩm, giá nhựa, cấu hình vận hành tại thời điểm đó phải được nhân bản và lưu chết vào chi tiết đơn hàng (`order_items`). Mọi thay đổi về giá gốc trong tương lai không được phép làm ảnh hưởng đến dữ liệu lịch sử.
* **Không trùng lặp tính toán (Anti-Drift):** Các trường tổng tiền hoặc tổng chi phí cấu thành bắt buộc phải sử dụng thuộc tính `GENERATED ALWAYS AS ... STORED` để triệt tiêu hoàn toàn rủi ro sai lệch dữ liệu giữa tầng ứng dụng và DB.

---

## 2. QUY TẮC TÍNH TOÁN & LÀM TRÒN (BUSINESS RULES & MATH)

### 2.1 Quy tắc làm tròn (Rounding Semantics)

* Hàm làm tròn hệ thống: `round_to_100(raw_value)`
* Hành vi: Làm tròn gần nhất đến **100đ** (Round Half-Up).
* Chặn số âm: Nếu `raw_value < 0`, hệ thống sẽ chặn đứng và ném ra Exception.
* Phạm vi áp dụng: Chỉ áp dụng cho **Giá bán ra thực tế (`final_unit_price`)**. Tuyệt đối **KHÔNG** làm tròn các chi phí vốn trung gian (`raw_*`) để bảo toàn độ chính xác khi phân tích hiệu suất xưởng.

### 2.2 Công thức tính toán của bộ máy định giá (Calculation Engine)

Khi tính toán chi phí cho một sản phẩm mẫu hoặc một dòng trong đơn hàng, bộ máy tính toán phải áp dụng chuỗi công thức sau:

1. **Chi phí vật liệu (Nhựa + Rủi ro):**

$$\text{Raw Material Cost} = \text{Weight (gram)} \times \left( \frac{\text{Price per kg}}{1000} \right) \times \text{Fail Rate}$$


2. **Chi phí máy (Điện + Khấu hao):**

$$\text{Raw Machine Cost} = \left( \frac{\text{Print Time in Seconds}}{3600} \right) \times \text{Depreciation per Hour}$$


3. **Chi phí nhân công:**

$$\text{Raw Labor Cost} = \text{Labor Time in Minutes} \times \text{Labor Cost per Minute}$$


4. **Tổng giá vốn đơn vị (Raw Unit COGS):**

$$\text{Raw Unit COGS} = \text{Raw Material Cost} + \text{Raw Machine Cost} + \text{Raw Labor Cost} + \sum(\text{Fixed Items Cost})$$


5. **Giá bán gợi ý gốc (Raw Suggested Price):**

$$\text{Raw Suggested Price} = \frac{\text{Raw Unit COGS}}{1 - \text{Margin}}$$


6. **Giá bán gợi ý hoàn thiện (Final Suggested Price):**

$$\text{Final Suggested Price} = \text{round\_to\_100}(\text{Raw Suggested Price})$$



---

## 3. CẤU TRÚC CHI TIẾT CÁC BẢNG (DATABASE ENTITIES)

### 3.1 Cụm cấu hình hệ thống (System Settings)

#### Bảng `materials` (Danh mục vật liệu nhựa)

* `id` (SERIAL, PK)
* `name` (VARCHAR(50), UNIQUE, NOT NULL): Tên loại nhựa (Ví dụ: 'PLA', 'PETG').
* `price_per_kg` (NUMERIC(12, 2), NOT NULL): Giá mua gốc của 1 cuộn nhựa 1kg. Ràng buộc: `> 0`.
* `fail_rate` (NUMERIC(5, 2), NOT NULL, DEFAULT 1.00): Hệ số hao hụt. Ràng buộc: `_rate >= 1.00`.
* `default_margin` (NUMERIC(5, 2), NOT NULL): Biên lợi nhuận mặc định. Ràng buộc: `BETWEEN 0.00 AND 1.00`.

#### Bảng `operational_configs` (Chi phí vận hành cố định)

* `key` (VARCHAR(100), PK): Khóa định danh chữ. Ràng buộc: `IN ('machine_depreciation_per_hour', 'labor_cost_per_minute')`.
* `value` (NUMERIC(12, 4), NOT NULL): Đơn giá chi tiết. Ràng buộc: `>= 0`.

#### Bảng `fixed_items` (Vật tư phụ & Bao bì)

* `id` (SERIAL, PK)
* `name` (VARCHAR(100), UNIQUE, NOT NULL): Ví dụ: 'Hộp carton', 'Móc khoá'.
* `item_type` (ENUM('accessory', 'packaging'), NOT NULL)
* `cost` (NUMERIC(12, 2), NOT NULL): Đơn giá vật tư. Ràng buộc: `>= 0`.

### 3.2 Cụm sản phẩm mẫu (Product Templates)

#### Bảng `products` (Danh mục sản phẩm khuôn mẫu)

* `id` (SERIAL, PK)
* `name` (VARCHAR(255), NOT NULL)
* `material_id` (INT, FK -> `materials.id` ON DELETE RESTRICT)
* `weight_gram` (NUMERIC(10, 2), NOT NULL): Khối lượng phôi nhựa. Ràng buộc: `> 0`.
* `print_time_seconds` (INT, NOT NULL): Tổng thời gian máy chạy tính bằng **Giây**. Ràng buộc: `> 0`.
* `labor_time_minutes` (INT, NOT NULL, DEFAULT 0): Thời gian công thợ tính bằng **Phút**. Ràng buộc: `>= 0`.
* `margin_override` (NUMERIC(5, 2)): Biên lợi nhuận ghi đè riêng cho sản phẩm này. Ràng buộc: `NULL` hoặc `BETWEEN 0.00 AND 1.00`.

#### Bảng `product_fixed_items` (Bảng trung gian định nghĩa vật tư đính kèm)

* `product_id` (INT, PK, FK -> `products.id` ON DELETE CASCADE)
* `fixed_item_id` (INT, PK, FK -> `fixed_items.id` ON DELETE RESTRICT)
* `quantity` (INT, NOT NULL, DEFAULT 1): Số lượng sử dụng. Ràng buộc: `> 0`.

### 3.3 Cụm đơn hàng & Sổ cái lịch sử (Orders & Snapshot Ledger)

#### Bảng `orders` (Quản lý đơn hàng)

* `id` (SERIAL, PK)
* `customer_name` (VARCHAR(150), NOT NULL)
* `customer_contact` (VARCHAR(150)): Thông tin liên hệ (Zalo, SĐT, Facebook).
* `status` (ENUM('draft', 'printing', 'completed', 'shipping', 'delivered', 'cancelled'), DEFAULT 'draft')
* `is_loss_counted` (BOOLEAN, DEFAULT FALSE): Đánh dấu đơn hàng bị bùng/hủy nhưng vẫn tính chi phí phôi nhựa vào hao hụt xưởng.
* `calculation_version` (INT, NOT NULL, DEFAULT 1): Theo dõi phiên bản logic định giá. Ràng buộc: `> 0`.

#### Bảng `order_items` (Bản ghi đóng băng chi tiết đơn hàng)

* `id` (SERIAL, PK)
* `order_id` (INT, NOT NULL, FK -> `orders.id` ON DELETE CASCADE)
* `product_id` (INT, FK -> `products.id` ON DELETE SET NULL)
* `snapshot_product_name` (VARCHAR(255), NOT NULL)
* `snapshot_material_name` (VARCHAR(50), NOT NULL)
* `snapshot_weight_gram` (NUMERIC(10, 2), NOT NULL CHECK (snapshot_weight_gram > 0))
* `snapshot_print_time_seconds` (INT, NOT NULL CHECK (snapshot_print_time_seconds > 0))
* `snapshot_labor_time_minutes` (INT, NOT NULL CHECK (snapshot_labor_time_minutes >= 0))
* `snapshot_fail_rate` (NUMERIC(5, 2), NOT NULL CHECK (snapshot_fail_rate >= 1.00))
* `snapshot_margin` (NUMERIC(5, 2), NOT NULL CHECK (snapshot_margin BETWEEN 0.00 AND 1.00))
* `item_calculation_version` (INT, NOT NULL, DEFAULT 1 CHECK (item_calculation_version > 0))
* `raw_material_cost` (NUMERIC(12, 4), NOT NULL CHECK (raw_material_cost >= 0))
* `raw_machine_cost` (NUMERIC(12, 4), NOT NULL CHECK (raw_machine_cost >= 0))
* `raw_labor_cost` (NUMERIC(12, 4), NOT NULL CHECK (raw_labor_cost >= 0))
* `raw_fixed_items_cost` (NUMERIC(12, 4), NOT NULL CHECK (raw_fixed_items_cost >= 0))
* `raw_unit_cogs` (NUMERIC(12, 4), **GENERATED ALWAYS AS (raw_material_cost + raw_machine_cost + raw_labor_cost + raw_fixed_items_cost) STORED**)
* `final_unit_price` (NUMERIC(12, 2), NOT NULL): Giá chốt bán cho khách. Ràng buộc: `>= 0` và bắt buộc phải thỏa mãn: `final_unit_price = round_to_100(final_unit_price)`.
* `quantity` (INT, NOT NULL, DEFAULT 1 CHECK (quantity > 0))
* `total_item_price` (NUMERIC(12, 2), **GENERATED ALWAYS AS (final_unit_price * quantity) STORED**)

---

## 4. QUY TẮC MÁY TRẠNG THÁI & KHÓA DỮ LIỆU (STATE MACHINE & LOCKING RULES)

Hệ thống triển khai cơ chế bảo vệ dữ liệu tối cao thông qua Database Trigger để ngăn chặn lỗi thao tác hoặc lỗi logic từ tầng mã nguồn:

### 4.1 Quy tắc khóa cứng dữ liệu (Ironclad Data Lock)

* **Điều kiện kích hoạt:** Khi bản ghi trong bảng `orders` có `status = 'cancelled'` đồng thời `is_loss_counted = TRUE`.
* **Hệ quả tại bảng `orders`:** Bất kỳ hành động `UPDATE` hoặc `DELETE` nào tác động lên dòng này đều bị Database từ chối lập tức và ném lỗi hệ thống.
* **Hệ quả tại bảng `order_items`:** Bất kỳ hành động `INSERT`, `UPDATE`, hoặc `DELETE` nào tác động lên các dòng chi tiết thuộc mã đơn hàng cha đã khóa đều bị chặn đứng hoàn toàn.

### 4.2 Quy tắc đồng bộ thời gian thực

* Mọi thao tác chỉnh sửa (`UPDATE`) dữ liệu trên các bảng: `materials`, `fixed_items`, `products`, `orders`, `operational_configs` bắt buộc phải tự động cập nhật trường `updated_at` về mốc thời gian hiện tại (`CURRENT_TIMESTAMP`).

---

## 5. ĐẶC TẢ TRUY XUẤT VÀ BÁO CÁO (ANALYTICS READ-MODEL)

Để tránh drift tổng tiền, tầng mã nguồn không được phép tự tính toán tổng tiền đơn hàng bằng các câu lệnh cộng dồn thủ công khi hiển thị danh sách. Mọi thông tin tổng hợp của đơn hàng phải được truy vấn trực tiếp từ View hệ thống:

### `view_orders_summary`

View này cung cấp thông tin tổng hợp thời gian thực của đơn hàng:

* `total_raw_cogs`: Tổng chi phí vốn thô chính xác tuyệt đối thu được từ công thức $\sum(\text{raw\_unit\_cogs} \times \text{quantity})$. Ép kiểu tường minh `quantity::NUMERIC` trong lõi truy vấn để bảo toàn kiểu dữ liệu.
* `total_final_invoice_price`: Tổng số tiền ghi trên hóa đơn và thu của khách $\sum(\text{total\_item\_price})$.

---

*Tài liệu kết thúc. Mọi thay đổi hoặc nâng cấp logic định giá tiếp theo bắt buộc phải tăng giá trị của `calculation_version`.*
