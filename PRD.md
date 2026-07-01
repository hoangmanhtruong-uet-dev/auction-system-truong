# Product Requirements Document (PRD)
## Web Đấu Giá Tự Động MVP - "AutoBid.vn"

---

### 1. Overview

**Mục tiêu sản phẩm**: Xây dựng nền tảng đấu giá trực tuyến đơn giản, thân thiện cho hàng nghệ thuật, sưu tầm, đồ công nghệ, phụ kiện, đồ decor.

**Phạm vi MVP**:
- Người dùng có thể tạo phiên đấu giá, đặt giá, và tham gia đấu giá
- Hệ thống tự động tăng giá theo bước và gia hạn thời gian khi cần
- Giao diện hiện đại, responsive, dễ sử dụng
- Chưa có thanh toán thật, escrow thật, KYC thật (chỉ mock/demo)

**Không bao gồm (Out of Scope MVP)**:
- Thanh toán thật (payment gateway)
- Escrow thật
- Xác thực KYC thực tế
- Giao dịch crypto
- Bất động sản, xe hơi, hàng hóa bị cấm
- Ứng dụng mobile (chỉ web)

---

### 2. User Roles

| Vai trò | Mô tả | Quyền hạn |
|---------|-------|-----------|
| **Guest** | Người dùng chưa đăng nhập | Xem phiên đấu giá, xem chi tiết sản phẩm |
| **User** | Người dùng đã đăng nhập | Tạo phiên đấu giá, đặt giá, đặt auto-bid, xem lịch sử |
| **Seller** | Người bán (có thể là User hoặc Guest nếu đăng bán) | Quản lý phiên đấu giá của mình, xem người thắng |
| **Admin** | Quản trị hệ thống | Xem toàn bộ dữ liệu, quản lý phiên đấu giá, xử lý vi phạm |

---

### 3. User Flow

#### 3.1 Flow người dùng mới (Guest -> User)

```
1. Truy cập trang chủ -> Thấy danh sách phiên đấu giá
2. Click "Đăng nhập/Đăng ký" -> Chọn đăng nhập hoặc đăng ký
3. Đăng ký: nhập email -> nhận code xác thực -> nhập code -> tạo mật khẩu -> đăng nhập thành công
4. Đăng nhập: nhập email + mật khẩu -> đăng nhập thành công
```

#### 3.2 Flow người bán (Seller)

```
1. Đăng nhập -> Click "Đăng bán"
2. Điền thông tin: tên sản phẩm, mô tả, hình ảnh, giá khởi điểm, thời gian đấu giá, bước giá
3. Submit -> Phiên đấu giá được tạo, trạng thái: "Đang chờ"
4. Admin/hoặc Seller tự kích hoạt -> Trạng thái: "Đang diễn ra"
```

#### 3.3 Flow người mua (Bidder)

```
1. Xem danh sách phiên đấu giá -> Click vào phiên muốn tham gia
2. Xem thông tin chi tiết sản phẩm, người bán, giá hiện tại, thời gian còn lại
3. Đặt giá:
   -方式 1: Đặt giá trực tiếp (nhập mức giá muốn trả)
   -方式 2: Đặt auto-bid (nhập mức giá tối đa hệ thống sẽ tự động đấu)
4. Hệ thống xử lý bid:
   - Kiểm tra giá hợp lệ (cao hơn giá hiện tại + bước giá)
   - Cập nhật giá hiện tại
   - Cập nhật người thắng hiện tại
   - Nếu thời gian còn lại <= 2 phút -> gia hạn thêm 2 phút (tối đa 3 lần)
5. Xem lịch sử bid của mình -> Xem trạng thái thắng/thua
```

#### 3.4 Flow Admin

```
1. Đăng nhập với role Admin
2. Truy cập trang Admin
3. Xem danh sách phiên đấu giá -> Chọn phiên -> Xem chi tiết
4. Xử lý:
   - Kích hoạt phiên đấu giá
   - Dừng đấu giá sớm
   - Xác nhận người thắng
   - Ghi chú vi phạm (nếu có)
```

---

### 4. Core Features

#### 4.1 Phiên đấu giá (Auction Listing)

| Thuộc tính | Mô tả | Required |
|-----------|-------|----------|
| ID | UUID | Yes |
| Title | Tên phiên đấu giá | Yes |
| Description | Mô tả chi tiết | Yes |
| Images | Danh sách hình ảnh (tối đa 5) | Yes |
| Start Price | Giá khởi điểm (VND) | Yes |
| Current Price | Giá hiện tại (tự động tính) | No (read-only) |
| Bid Step | Bước giá (VND) | Yes |
| Duration | Thời gian đấu giá (phút) | Yes |
| Auto-Extension Enabled | Có thời gian gia hạn không? | Yes |
| Max Extensions | Số lần gia hạn tối đa | Yes |
| Current Extension Count | Số lần gia hạn hiện tại | No |
| Status | Trạng thái (pending/active/completed/cancelled) | Yes |
| Seller ID | ID người bán | Yes |
| Winner ID | ID người thắng (nếu có) | No |
| Created At | Thời gian tạo | Yes |
| Updated At | Thời gian cập nhật | Yes |
| Ends At | Thời gian kết thúc (tự động tính) | No |

#### 4.2 Lượt đặt giá (Bid)

| Thuộc tính | Mô tả | Required |
|-----------|-------|----------|
| ID | UUID | Yes |
| Auction ID | ID phiên đấu giá | Yes |
| User ID | ID người đặt giá | Yes |
| Bid Price | Giá đặt (VND) | Yes |
| Is Auto-Bid | Có phải auto-bid không? | Yes |
| Auto-Bid Max Price | Mức giá tối đa auto-bid (nếu có) | No |
| Status | Trạng thái (active/won/lost/cancelled) | Yes |
| Created At | Thời gian đặt giá | Yes |
| Updated At | Thời gian cập nhật | Yes |

#### 4.3 User

| Thuộc tính | Mô tả | Required |
|-----------|-------|----------|
| ID | UUID | Yes |
| Email | Email | Yes |
| Email Verified | Đã xác thực email chưa? | Yes |
| Password Hash | Mật khẩu (hash) | Yes |
| Full Name | Họ tên | Yes |
| Phone | Số điện thoại | No |
| Role | Vai trò (user/seller/admin) | Yes |
| Created At | Thời gian tạo | Yes |
| Updated At | Thời gian cập nhật | Yes |

#### 4.4 Verification Code (Email verification)

| Thuộc tính | Mô tả | Required |
|-----------|-------|----------|
| ID | UUID | Yes |
| User ID | ID người dùng | Yes |
| Code | Mã xác thực (6 chữ số) | Yes |
| Type | Loại (verify_email) | Yes |
| Expires At | Thời gian hết hạn | Yes |
| Used | Đã sử dụng chưa? | Yes |
| Created At | Thời gian tạo | Yes |

---

### 5. UI/UX Screens

#### 5.1 Public Pages

| Trang | Mô tả |
|-------|-------|
| `/` | Trang chủ - danh sách phiên đấu giá đang diễn ra |
| `/auctions/:id` | Chi tiết phiên đấu giá |
| `/login` | Đăng nhập |
| `/register` | Đăng ký |

#### 5.2 Authenticated Pages

| Trang | Mô tả |
|-------|-------|
| `/dashboard` | Trang chủ sau khi đăng nhập |
| `/auctions/my` | Các phiên đấu giá tôi đang tham gia |
| `/auctions/create` | Đăng bán - tạo phiên đấu giá mới |
| `/bids/history` | Lịch sử đặt giá của tôi |
| `/profile` | Thông tin cá nhân |

#### 5.3 Admin Pages

| Trang | Mô tả |
|-------|-------|
| `/admin` | Trang Admin - tổng quan hệ thống |
| `/admin/auctions` | Quản lý phiên đấu giá |
| `/admin/users` | Quản lý người dùng |

---

### 6. Bidding Engine Logic (MVP)

#### 6.1 Auto-Bid (Proxy Bidding)

- User nhập mức giá tối đa họ sẵn sàng trả
- Hệ thống tự động đặt giá tăng dần từ giá hiện tại + bước giá
- Khi có người khác đặt giá cao hơn, hệ thống tự động tăng lên mức giá tối đa (hoặc cao hơn 1 bước)
- Ví dụ: Giá hiện tại 100k, bước giá 10k, auto-bid max 150k
  - Người khác đặt 110k -> Auto-bid lên 120k
  - Người khác đặt 130k -> Auto-bid lên 140k
  - Người khác đặt 150k -> Thua (max reached)
  - Người khác đặt 160k -> Thua (bị vượt)

#### 6.2 Time Extension (Sniper Protection)

- Nếu có bid mới trong vòng 2 phút cuối của phiên đấu giá -> gia hạn thêm 2 phút
- Tối đa 3 lần gia hạn
- Sau khi gia hạn, đồng hồ đếm ngược reset về thời gian còn lại ban đầu

#### 6.3 Bid Validation

- Giá đặt phải cao hơn giá hiện tại + bước giá
- Người đặt giá không thể là người bán (nếu là seller)
- Phiên đấu giá phải đang diễn ra (status = active)

#### 6.4 Winner Determination

- Người có giá cao nhất khi phiên đấu giá kết thúc
- Nếu có nhiều người đặt cùng mức giá -> người đặt trước thắng

---

### 7. Non-Functional Requirements

#### 7.1 Performance

| Yêu cầu | Mục tiêu |
|---------|----------|
| Thời gian tải trang | < 2s |
| Thời gian cập nhật giá realtime | < 1s |
| Thời gian xử lý 1 bid | < 500ms |
| Concurrent users | 1000 users |

#### 7.2 Availability

- Uptime 99.5% (không bao gồm downtime bảo trì)
- Backup dữ liệu hàng ngày

#### 7.3 Security

- CSRF protection
- XSS protection
- SQL injection protection
- Rate limiting
- Email verification
- Mật khẩu hash (bcrypt/scrypt)

#### 7.4 Scalability

- Thiết kế dễ dàng mở rộng sang microservices
- Tách biệt logic bidding engine
- Sử dụng queue cho các tác vụ nặng

---

### 8. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes (Server Actions) |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| Hosting | Vercel (Frontend) + Supabase (Database/Auth) |

---

### 9. Success Metrics

| Metric | Mục tiêu MVP |
|--------|--------------|
| Số phiên đấu giá | 50+ |
| Số người dùng | 200+ |
| Tỷ lệ giữ chân (7 ngày) | > 40% |
| Tỷ lệ chuyển đổi (guest -> user) | > 30% |
| Thời gian load trang | < 2s |

---

### 10. Risks & Mitigations

| Rủi ro | Cách mitigation |
|--------|----------------|
| Bidding engine bị tấn công | Code review, security testing, rate limiting |
| Realtime lag | Sử dụng Supabase Realtime đã được tối ưu |
| User giả mạo | Email verification,未来 KYC |
| Thẻ tín dụng/gian lận | Không lưu thông tin thẻ, future use payment gateway |