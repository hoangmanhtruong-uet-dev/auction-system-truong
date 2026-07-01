# Security & Concurrency Checklist - AutoBid.vn

Đấu giá trực tuyến là hệ thống có tính nhạy cảm cao về mặt giao dịch tài chính, thời gian thực, và dễ gặp các cuộc tấn công trục lợi (sniper bidding, bid shielding, shill bidding). Dưới đây là danh sách kiểm tra bảo mật chi tiết được áp dụng cho thiết kế AutoBid.vn.

---

## 1. Concurrency & Race Conditions (Critical)

### 1.1 Race Conditions khi nhiều người cùng đặt giá (Bid Collision)
- [ ] **Sử dụng Database Transactions**: Mọi hành động đặt giá (`placeBid`) phải chạy trong một Database Transaction (chế độ cô lập ít nhất là `Read Committed` hoặc `Serializable`).
- [ ] **Row-level Locking (SELECT FOR UPDATE)**: Khi một lượt bid được gửi lên, hệ thống phải thực hiện lock bản ghi phiên đấu giá (`SELECT * FROM auctions WHERE id = ? FOR UPDATE`) trước khi thực hiện bất kỳ kiểm tra logic nào để đảm bảo không có hai luồng xử lý cùng một lúc cho một phiên.
- [ ] **Optimistic/Pessimistic Locking**: Đảm bảo Prisma thực hiện câu lệnh SQL tương đương `SELECT FOR UPDATE` hoặc sử dụng raw SQL transaction nếu Prisma Client không hỗ trợ tối ưu.

---

## 2. Bidding Logic Security

### 2.1 Shill Bidding Protection (Tự nâng giá)
- [ ] **Cấm Seller tham gia đấu giá**: Hệ thống bắt buộc phải kiểm tra chéo: `userId` (người đặt bid) !== `sellerId` (người tạo phiên đấu giá). Nếu trùng, chặn ngay lập tức.
- [ ] **Cấm tự nâng giá qua Auto-bid**: Hệ thống kiểm tra điều kiện tương tự khi thiết lập cấu hình auto-bid.

### 2.2 Bid Shielding Prevention (Đặt giá ảo rồi rút lui)
- [ ] **Không cho phép hủy Bid tùy tiện**: Trong đấu giá tiêu chuẩn, một khi đã bid thành công thì không được phép tự ý hủy. Chỉ có Admin mới có quyền hủy bid trong các trường hợp tranh chấp đặc biệt.
- [ ] **Giới hạn số lượng bid trong thời gian ngắn (Rate Limiting)**: Tránh việc gửi hàng loạt bid lên để gây nghẽn hệ thống (DoS) và che mắt các bidder khác.

### 2.3 Sniper Protection Validation
- [ ] **Time Extension logic phía server**: Không tin cậy thời gian gửi từ phía client. Toàn bộ logic kiểm tra thời gian kết thúc (`endsAt`) và gia hạn 2 phút phải được thực hiện bằng thời gian hiện tại của database server (`NOW()`).

---

## 3. Authentication & Authorization (AuthN/AuthZ)

### 3.1 Session Security
- [ ] **Secure Cookies**: JWT/Session tokens lưu tại HttpOnly, Secure, SameSite=Strict cookies để tránh tấn công XSS đánh cắp session.
- [ ] **Token Expiration**: Thời gian hết hạn của Access Token ngắn (ví dụ: 15 phút), Refresh Token dài hơn và được lưu trữ an toàn.

### 3.2 Role-Based Access Control (RBAC)
- [ ] **Phân quyền APIs/Server Actions**:
  - `admin*` actions phải kiểm tra quyền `role === 'admin'`.
  - `createAuction` phải kiểm tra người dùng đã xác thực email (`emailVerified === true`) và có role phù hợp.
  - Kiểm tra tính sở hữu: Người dùng chỉ có quyền chỉnh sửa/xóa các phiên đấu giá hoặc hồ sơ của chính mình.

---

## 4. Input Validation & Data Integrity

### 4.1 SQL Injection & XSS Protection
- [ ] **Sử dụng ORM (Prisma)**: Prisma tự động sử dụng parameterized queries để phòng chống SQL Injection. Không sử dụng string concatenation cho SQL trừ khi thật sự cần thiết (và phải được sanitize kĩ lưỡng).
- [ ] **Sanitize đầu vào văn bản**: Toàn bộ input từ người dùng (như `title`, `description`) phải được lọc mã HTML nguy hiểm bằng thư viện như `dompurify` hoặc `sanitize-html` để tránh tấn công Stored XSS.
- [ ] **Zod Schema Validation**: Mọi Server Action phải thực hiện kiểm tra định dạng dữ liệu đầu vào thông qua schema Zod trước khi xử lý.

### 4.2 Integer Overflow Protection
- [ ] **Sử dụng BigInt**: Toàn bộ các trường tiền tệ (giá khởi điểm, giá hiện tại, bước giá, giá đặt) phải sử dụng kiểu dữ liệu `BigInt` (PostgreSQL `BIGINT`). Điều này ngăn ngừa hoàn toàn lỗi tràn số (Integer Overflow) khi người dùng cố tình gửi các con số khổng lồ để làm lỗi hệ thống.

---

## 5. Audit Logging & Monitoring

### 5.1 Ghi nhận nhật ký đầy đủ (Audit Trails)
- [ ] **Audit Log cho các thao tác nhạy cảm**:
  - Đăng nhập thất bại / Thay đổi mật khẩu.
  - Tạo / Hủy phiên đấu giá.
  - Mọi lượt bid được đặt thành công hoặc bị từ chối do lỗi logic.
  - Thay đổi thông tin số dư / tài khoản.
- [ ] **Thông tin ghi nhận**: Lưu trữ IP address, User-Agent, UserId, Timestamp và nội dung thay đổi (old values vs new values) dưới dạng JSONB.

---

## 6. Rate Limiting & DDoS Prevention

### 6.1 Rate Limiting chi tiết
- [ ] **Bidding Rate Limit**: Giới hạn mỗi user/IP chỉ được phép gọi action `placeBid` tối đa 5 lần trong 10 giây để tránh spam bots.
- [ ] **Auth Rate Limit**: Giới hạn login/register/verify email tối đa 5 lần trong 1 phút trên mỗi IP.
- [ ] **API Route Rate Limit**: Sử dụng Middleware của Next.js kết hợp với Redis (hoặc bộ nhớ tạm ở MVP) để chặn request vượt ngưỡng.