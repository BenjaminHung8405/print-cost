# 📋 Đặc tả Yêu cầu Chức năng (Functional Requirements)

Chào bạn, dưới đây là đặc tả chi tiết từng màn hình, từng nút bấm và cách thức hệ thống xử lý dữ liệu cho dự án **PrintCost**. Vì hệ thống này phục vụ cá nhân bạn quản lý xưởng in, tiêu chí hàng đầu là **"Nhập liệu tối giản - Tính toán chính xác - Thao tác nhanh gọn"**.

Dưới đây là đặc tả chức năng chi tiết cho 4 mô-đun cốt lõi của hệ thống.

---

## 1. Mô-đun 1: Quản lý cấu hình thông số gốc (Settings Module)

Đây là "gốc" của mọi tính toán. Hệ thống cần một giao diện (bảng điều khiển) để bạn cập nhật giá thị trường khi có biến động.

### 📌 Chức năng 1.1: Quản lý danh mục Nhựa (Material Settings)

* **Mô tả:** Cho phép thêm/sửa/xóa các loại cuộn nhựa in.
* **Dữ liệu đầu vào:**
  * Tên nhựa (Ví dụ: `PLA`, `PETG`, `ABS`).
  * Giá mua theo cuộn 1kg (VND) (Ví dụ: `250,000`).
  * Tỷ lệ hỏng/rủi ro (`Fail Rate`) (Ví dụ: PLA là `1.10` tức là cộng thêm 10% bù hao; PETG không điền mặc định là `1.0`).
  * Biên lợi nhuận mong muốn (`%`) (Ví dụ: PLA là `40%`, PETG là `30%`).
* **Hệ thống tự động xử lý:** 
  * Tự động tính ra `Giá nhựa trên mỗi gram` = `Giá 1kg / 1000`. (Ví dụ: `250đ/g`).

### 📌 Chức năng 1.2: Quản lý Chi phí vận hành (Operational Costs)

* **Mô tả:** Cấu hình các chi phí cố định phát sinh khi máy chạy hoặc khi bạn bỏ công làm việc.
* **Dữ liệu đầu vào:**
  * `Khấu hao máy + Điện (/giờ)`: Số tiền cố định cho 1 giờ máy chạy (Ví dụ: `5,000 đ`).
  * `Công thợ (/phút)`: Số tiền trả cho công sức bạn xử lý hậu kỳ, gỡ support, lắp ráp mỗi phút (Ví dụ: `500 đ`).

### 📌 Chức năng 1.3: Danh mục Phụ kiện & Bao bì cố định (Fixed Items Cost)

* **Mô tả:** Quản lý giá tiền các vật tư phụ. Thay vì mỗi lần tạo sản phẩm phải gõ lại giá tiền cái hộp hay cái móc khóa, bạn chỉ cần quản lý ở đây.
* **Cơ chế tính đơn giá tự động:** Để tối giản hóa việc nhập liệu, khi nhập thông tin phụ kiện/bao bì, bạn có hai lựa chọn nhập liệu:
  1. Nhập trực tiếp đơn giá của sản phẩm.
  2. Nhập **Giá tiền tổng của gói/lô** (VND) và **Số lượng sản phẩm** trong gói/lô đó. Hệ thống sẽ **tự động tính toán và điền Đơn giá**:
     $$\text{Đơn giá} = \frac{\text{Giá tiền tổng}}{\text{Số lượng}}$$
     * *Ví dụ:* Nhập mua Sticker niêm phong với Giá tiền tổng là `376,000 đ`, Số lượng `1,000` cái $\rightarrow$ Hệ thống tự động tính ra đơn giá `376 đ/cái`.
* **Danh sách quản lý gồm:**
  * *Bao bì:* Sticker niêm phong, Hộp carton, Giấy pelure, Giấy tổ ong...
  * *Phụ kiện:* Khoen 12mm, Móc khoá, Nam châm, Ốc vít...
* **Thao tác:** Cho phép bạn thêm mới, cập nhật giá tổng/số lượng (tự động cập nhật đơn giá), cập nhật trực tiếp đơn giá, và xóa từng item này bất cứ lúc nào.

---

## 2. Mô-đun 2: Quản lý sản phẩm & Bộ tính toán tự động (Calculation Engine)

Mô-đun này thay thế hoàn toàn bảng tính số 2 trong Excel của bạn. Đây là nơi bạn định nghĩa các "mẫu sản phẩm" để sau này mang đi lên đơn hàng.

### 📌 Chức năng 2.1: Biểu mẫu thêm mới/Cập nhật sản phẩm

* **Dữ liệu đầu vào (Bạn nhập):**
  * Tên sản phẩm (Ví dụ: `Keycap`, `Uzi Jesus`, `Fishbone`).
  * Chọn loại nhựa (Dropdown list lấy từ Mô-đun 1).
  * Trọng lượng (gram) (Ví dụ: `16.88`).
  * Thời gian in (`Giờ : Phút : Giây`) (Ví dụ: `01:35:00`).
  * Thời gian công thợ (`Phút`) (Ví dụ: `16`).
  * *Chọn chi phí phụ kiện & bao bì đính kèm:* Hệ thống sẽ hiển thị danh sách dạng checkbox/số lượng. Bạn chỉ cần tick chọn (Ví dụ: Tick chọn 1 Hộp carton + 1 Giấy pelure, hệ thống tự hiểu Chi phí bao bì = 859 + 385 = 1.244đ).

### 📌 Chức năng 2.2: Công thức tính toán thời gian thực (Real-time Calculation)

Ngay khi bạn đang nhập các thông số trên giao diện, hệ thống **không đợi bấm lưu** mà phải lập tức tính toán và hiển thị ngay lên màn hình các chỉ số sau:

1. **Chi phí vật liệu (Nhựa + Rủi ro):**
   $$\text{Chi phí vật liệu} = \text{Trọng lượng (g)} \times \text{Giá nhựa/g (của loại nhựa đã chọn)} \times \text{Tỷ lệ hỏng (Fail Rate)}$$
   * *Ví dụ với Keycap (PLA):* $16.88 \times 250 \times 1.10 = 4,642 \text{ đ}$ (Khớp 100% với Excel của bạn).

2. **Chi phí máy (Điện + Khấu hao):**
   $$\text{Chi phí máy} = \left(\frac{\text{Tổng số giây in}}{3,600}\right) \times \text{Khấu hao \& Điện mỗi giờ}$$
   * *Ví dụ với Uzi Jesus (6h 11p = 22,260 giây):* $\left(\frac{22,260}{3,600}\right) \times 5,000 = 30,917 \text{ đ}$ (Trong Excel của bạn hiển thị 38,917đ, có thể công thức Excel cũ bị lệch một chút do định dạng Time của Excel, hệ thống mới quy ra Giây sẽ chuẩn xác tuyệt đối).

3. **Chi phí nhân công (Công thợ):**
   $$\text{Chi phí nhân công} = \text{Thời gian công thợ (Phút)} \times \text{Công thợ mỗi phút}$$

4. **TỔNG GIÁ VỐN (COGS):**
   $$\text{COGS} = \text{Chi phí vật liệu} + \text{Chi phí máy} + \text{Chi phí nhân công} + \text{Chi phí phụ kiện} + \text{Chi phí bao bì}$$

5. **GIÁ BÁN GỢI Ý (Bán lẻ):**
   $$\text{Giá bán gợi ý} = \frac{\text{COGS}}{1 - \text{Lợi nhuận mong muốn (\%)}}$$
   * *Ví dụ với Keycap:* Giá vốn $14,959 \text{ đ}$, biên lợi nhuận PLA $40\% \rightarrow 14,959 / (1 - 0.4) = 24,931 \text{ đ}$.

---

## 3. Mô-đun 3: Quản lý Đơn hàng (Order Module)

Khi có khách đặt hàng, bạn không cần vào tính lại từ đầu mà sẽ tận dụng các sản phẩm đã cấu hình ở Mô-đun 2.

### 📌 Chức năng 3.1: Tạo đơn hàng mới

* **Thao tác:**
  1. Nhập thông tin khách hàng (Tên, Số điện thoại/Facebook để tiện liên hệ).
  2. Bấm "Thêm sản phẩm" -> Chọn từ danh mục sản phẩm có sẵn -> Nhập số lượng.
  3. Hệ thống tự động nhân số lượng và tính Tổng tiền đơn hàng.
* **Tính năng linh hoạt (Override Price):** Cho phép bạn sửa trực tiếp giá bán của sản phẩm trên đơn hàng này (Ví dụ: Giá bán gợi ý là 25.000đ nhưng bạn muốn giảm giá cho khách quen còn 22.000đ, app phải cho phép sửa riêng cho đơn này mà không ảnh hưởng đến giá gốc của sản phẩm).

### 📌 Chức năng 3.2: Quản lý trạng thái đơn hàng (Order Status)

Giúp bạn kiểm soát xưởng in xem máy nào đang rảnh, đơn nào chưa làm. Đơn hàng sẽ đi qua các trạng thái:
`Mới tạo` $\rightarrow$ `Đang in` $\rightarrow$ `Đã in xong (Chờ đóng gói)` $\rightarrow$ `Đang giao` $\rightarrow$ `Thành công` (hoặc `Đã hủy`).

---

## 4. Mô-đun 4: Xuất hóa đơn & Thống kê (Invoice & Analytics)

### 📌 Chức năng 4.1: Xuất hóa đơn (Invoice Preview & Export)

* Sau khi chốt đơn, hệ thống có nút **"Xuất hóa đơn"**.
* App sẽ render ra một giao diện hóa đơn tối giản, sạch đẹp (Có tên xưởng của bạn, ngày tháng, chi tiết các món, tổng tiền, kèm số tài khoản ngân hàng hoặc mã QR ngân hàng).
* Bạn có thể bấm **"Tải ảnh"** hoặc **"Tải file PDF"** để gửi ngay qua Zalo/Messenger cho khách mà không cần ghi tay.

### 📌 Chức năng 4.2: Thống kê hiệu suất xưởng in

* Hiển thị tổng doanh thu và tổng lợi nhuận thu về theo tháng.
* Thống kê **Tổng lượng nhựa đã tiêu thụ** (để bạn biết khi nào sắp hết nhựa để mua cuộn mới).
* Thống kê **Tổng số giờ máy đã chạy** (giúp bạn biết máy đã chạy bao nhiêu tiếng để bảo trì, tra dầu mỡ).

---

## 🎯 ĐÁNH GIÁ VỀ SỰ KHÁC BIỆT SO VỚI EXCEL

Khi chuyển sang App, lỗi ám ảnh nhất trên Excel là **sai định dạng thời gian (ví dụ nhập 1:35:00 biến thành ngày tháng hoặc số thập phân)** sẽ biến mất hoàn toàn. Hệ thống sẽ lưu thời gian in dưới dạng số nguyên (Giây hoặc Phút) ở backend, còn frontend sẽ hiển thị giao diện nhập ô Giờ - Phút cực kỳ thân thiện cho bạn.
