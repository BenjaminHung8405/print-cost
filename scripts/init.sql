-- ==========================================
-- PRINTCOST DATABASE INITIALIZATION
-- Schema V4 - Ironclad Edition (REFINED)
-- ==========================================
-- Production-grade initialization script cho PostgreSQL 16
-- Đã vá: IMMUTABLE constraint enforcement + ENUM-typed trigger variables

-- ==========================================
-- 0. TẠO CÁC HÀM TIỆN ÍCH & THỦ TỤC PHÒNG THủ
-- ==========================================

-- Hàm làm tròn Half-Up đến 100đ gần nhất, khóa chặt số âm ở mức DB
-- IMMUTABLE (không phải STABLE): CHECK constraint trong PostgreSQL chỉ được đảm bảo
-- thực thi đáng tin cậy khi UPDATE nếu hàm là IMMUTABLE. Hàm vẫn được phép dùng
-- RAISE EXCEPTION vì cùng input âm luôn cho cùng kết quả exception (bất biến).
CREATE OR REPLACE FUNCTION round_to_100(raw_value NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
    IF raw_value < 0 THEN
        RAISE EXCEPTION 'LỖI HỆ THỐNG: Giá trị tài chính không được phép âm (%)', raw_value;
    END IF;
    RETURN ROUND(raw_value / 100, 0) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function tự động cập nhật cột updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger khóa cứng Đơn hàng (Chặn UPDATE/DELETE khi cancelled + is_loss_counted)
CREATE OR REPLACE FUNCTION enforce_order_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'cancelled' AND OLD.is_loss_counted = TRUE THEN
        RAISE EXCEPTION 'LỖI BẢO MẬT: Đơn hàng số % đã bị khóa do hủy và tính hao hụt xưởng. Không thể chỉnh sửa!', OLD.id;
    END IF;
    
    -- Xử lý an toàn cho luồng trả về của trigger
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- order_status_enum phải được tạo TRƯỚC hàm trigger sử dụng nó
CREATE TYPE order_status_enum AS ENUM ('draft', 'printing', 'completed', 'shipping', 'delivered', 'cancelled');

-- Trigger khóa cứng Chi tiết đơn hàng (Chặn khi order cha bị lock)
CREATE OR REPLACE FUNCTION enforce_order_items_lock()
RETURNS TRIGGER AS $$
DECLARE
    -- Dùng đúng kiểu ENUM thay vì VARCHAR(50) để tránh bẫy ép kiểu ngầm định.
    -- Nếu Postgres thực hiện implicit cast giữa ENUM và VARCHAR, điều kiện so sánh
    -- 'cancelled' có thể không khớp trong một số phiên bản/cấu hình driver.
    v_status order_status_enum;
    v_is_loss_counted BOOLEAN;
BEGIN
    -- Truy vấn trạng thái từ đơn hàng cha
    SELECT status, is_loss_counted INTO v_status, v_is_loss_counted 
    FROM orders 
    WHERE id = COALESCE(OLD.order_id, NEW.order_id);
    
    -- Phòng thủ: Nếu đơn hàng cha không tồn tại
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LỖI TOÀN VẸN: Không tìm thấy Đơn hàng tương ứng với mã số %', COALESCE(OLD.order_id, NEW.order_id);
    END IF;
    
    -- Thực thi khóa logic (so sánh ENUM với ENUM literal, an toàn tuyệt đối)
    IF v_status = 'cancelled' AND v_is_loss_counted = TRUE THEN
        RAISE EXCEPTION 'LỖI BẢO MẬT: Không thể thay đổi chi tiết đơn hàng vì Đơn hàng cha đã bị khóa cứng!';
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. CỤM CẤU HÌNH GỐC (SETTINGS)
-- ==========================================

CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    price_per_kg NUMERIC(12, 2) NOT NULL CHECK (price_per_kg > 0),
    fail_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (fail_rate >= 1.00),
    default_margin NUMERIC(5, 2) NOT NULL CHECK (default_margin BETWEEN 0.00 AND 1.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE operational_configs (
    key VARCHAR(100) PRIMARY KEY,
    CONSTRAINT check_valid_keys CHECK (key IN ('machine_depreciation_per_hour', 'labor_cost_per_minute', 'maintenance_reset_hours')),
    value NUMERIC(12, 4) NOT NULL CHECK (value >= 0),
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE item_type_enum AS ENUM ('accessory', 'packaging');

CREATE TABLE fixed_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    item_type item_type_enum NOT NULL,
    cost NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. CỤM SẢN PHẨM MẪU (PRODUCTS TEMPLATE)
-- ==========================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    material_id INT REFERENCES materials(id) ON DELETE RESTRICT,
    weight_gram NUMERIC(10, 2) NOT NULL CHECK (weight_gram > 0),
    print_time_seconds INT NOT NULL CHECK (print_time_seconds > 0),
    labor_time_minutes INT NOT NULL DEFAULT 0 CHECK (labor_time_minutes >= 0),
    batch_quantity INT NOT NULL DEFAULT 1 CHECK (batch_quantity > 0),
    margin_override NUMERIC(5, 2) CHECK (margin_override BETWEEN 0.00 AND 1.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_fixed_items (
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    fixed_item_id INT REFERENCES fixed_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (product_id, fixed_item_id)
);

-- ==========================================
-- 3. CỤM ĐƠN HÀNG & SNAPSHOT (LEDGER)
-- ==========================================

-- order_status_enum đã được khai báo ở Section 0 (trước trigger function sử dụng nó)

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_contact VARCHAR(150),
    status order_status_enum DEFAULT 'draft',
    is_loss_counted BOOLEAN DEFAULT FALSE,
    calculation_version INT NOT NULL DEFAULT 1 CHECK (calculation_version > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL, 
    
    -- Snapshot Metadata
    snapshot_product_name VARCHAR(255) NOT NULL,
    snapshot_material_name VARCHAR(50) NOT NULL,
    snapshot_weight_gram NUMERIC(10, 2) NOT NULL CHECK (snapshot_weight_gram > 0),
    snapshot_print_time_seconds INT NOT NULL CHECK (snapshot_print_time_seconds > 0),
    snapshot_labor_time_minutes INT NOT NULL CHECK (snapshot_labor_time_minutes >= 0),
    snapshot_fail_rate NUMERIC(5, 2) NOT NULL CHECK (snapshot_fail_rate >= 1.00),
    snapshot_margin NUMERIC(5, 2) NOT NULL CHECK (snapshot_margin BETWEEN 0.00 AND 1.00),
    snapshot_batch_quantity INT NOT NULL DEFAULT 1 CHECK (snapshot_batch_quantity > 0),
    item_calculation_version INT NOT NULL DEFAULT 1 CHECK (item_calculation_version > 0),
    
    -- Chi tiết cấu thành Chi phí gốc (Raw)
    raw_material_cost NUMERIC(12, 4) NOT NULL CHECK (raw_material_cost >= 0),
    raw_machine_cost NUMERIC(12, 4) NOT NULL CHECK (raw_machine_cost >= 0),
    raw_labor_cost NUMERIC(12, 4) NOT NULL CHECK (raw_labor_cost >= 0),
    raw_fixed_items_cost NUMERIC(12, 4) NOT NULL CHECK (raw_fixed_items_cost >= 0),
    
    -- Generated Column ngăn chặn drift giá vốn đơn vị
    raw_unit_cogs NUMERIC(12, 4) GENERATED ALWAYS AS (
        raw_material_cost + raw_machine_cost + raw_labor_cost + raw_fixed_items_cost
    ) STORED,
    
    -- Kiểm soát giá bán lẻ thực tế thu tiền (Ép chết App phải pass dữ liệu đã làm tròn)
    final_unit_price NUMERIC(12, 2) NOT NULL CHECK (final_unit_price >= 0),
    CONSTRAINT check_price_is_rounded CHECK (final_unit_price = round_to_100(final_unit_price)),
    
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Generated Column ngăn chặn drift tổng giá dòng
    total_item_price NUMERIC(12, 2) GENERATED ALWAYS AS (final_unit_price * quantity) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. ĐĂNG KÝ INDEX ĐỂ TỐI ƯU HÓA TRUY VẤN
-- ==========================================

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_products_material_id ON products(material_id);
CREATE INDEX idx_product_fixed_items_product_id ON product_fixed_items(product_id);
CREATE INDEX idx_product_fixed_items_fixed_item_id ON product_fixed_items(fixed_item_id);

-- ==========================================
-- 5. ĐĂNG KÝ TRIGGER BẢO VỆ VÀ CẬP NHẬT
-- ==========================================

-- Trigger cập nhật thời gian updated_at
CREATE TRIGGER update_materials_modtime BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_fixed_items_modtime BEFORE UPDATE ON fixed_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_operational_configs_modtime BEFORE UPDATE ON operational_configs FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Trigger khóa cứng dữ liệu (Ironclad Lock)
CREATE TRIGGER lock_orders_on_demand BEFORE UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION enforce_order_lock();
CREATE TRIGGER lock_order_items_on_demand BEFORE INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION enforce_order_items_lock();

-- ==========================================
-- 6. BIỂU MẪU BÁO CÁO DOANH THU (VIEW)
-- ==========================================

CREATE OR REPLACE VIEW view_orders_summary AS
SELECT 
    o.id AS order_id,
    o.customer_name,
    o.status,
    o.is_loss_counted,
    o.calculation_version,
    COALESCE(SUM(oi.raw_unit_cogs * oi.quantity::NUMERIC), 0) AS total_raw_cogs,
    COALESCE(SUM(oi.total_item_price), 0) AS total_final_invoice_price,
    o.created_at,
    o.updated_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- ==========================================
-- 7. SEED DATA - CẤU HÌNH KHỞI TẠO (VỚI PHÒNG THỦ ON CONFLICT)
-- ==========================================

-- Thêm cấu hình vận hành (bao gồm maintenance_reset_hours)
-- ON CONFLICT (key) DO NOTHING: chỉ định rõ PRIMARY KEY column, tránh lỗi "no unique constraint"
INSERT INTO operational_configs (key, value, description) VALUES
('machine_depreciation_per_hour', 5000.0000, 'Tiền điện và khấu hao máy in mỗi giờ'),
('labor_cost_per_minute', 500.0000, 'Tiền công thợ xử lý hậu kỳ mỗi phút'),
('maintenance_reset_hours', 100.0000, 'Chu kỳ bảo trì, tra dầu mỡ máy in (giờ)')
ON CONFLICT (key) DO NOTHING;

-- Thêm danh mục nhựa kèm margin
INSERT INTO materials (name, price_per_kg, fail_rate, default_margin) VALUES
('PLA', 250000.00, 1.10, 0.40),
('PETG', 203000.00, 1.00, 0.30),
('ABS', 280000.00, 1.15, 0.35),
('TPU', 350000.00, 1.05, 0.45)
ON CONFLICT (name) DO NOTHING;

-- Thêm vật tư phụ
INSERT INTO fixed_items (name, item_type, cost) VALUES
('Sticker niêm phong', 'packaging', 376.00),
('Hộp carton', 'packaging', 859.00),
('Giấy pelure', 'packaging', 385.00),
('Giấy tổ ong', 'packaging', 780.00),
('Khoen 12mm', 'accessory', 400.00),
('Móc khoá', 'accessory', 830.00),
('Dây cotton', 'accessory', 150.00),
('Túi nilon ziplock', 'packaging', 450.00)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 8. VERIFICATION & SCHEMA STATUS
-- ==========================================

-- Hiển thị thống kê bảng
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Hiển thị thông báo thành công
DO $$ 
BEGIN 
    RAISE NOTICE 'PRINTCOST DATABASE V4 - IRONCLAD EDITION (REFINED) - INITIALIZATION COMPLETE';
    RAISE NOTICE 'Tables: materials, operational_configs, fixed_items, products, product_fixed_items, orders, order_items';
    RAISE NOTICE 'Functions: round_to_100 [IMMUTABLE], update_modified_column, enforce_order_lock, enforce_order_items_lock [ENUM-typed]';
    RAISE NOTICE 'Triggers: Auto-lock mechanisms + updated_at automation ACTIVE';
    RAISE NOTICE 'Views: view_orders_summary ready for reporting';
END $$;
