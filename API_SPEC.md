# API / Server Action Specification - AutoBid.vn

## Overview

Vì sử dụng **Next.js 14 App Router**, toàn bộ tương tác backend-frontend sẽ được triển khai bằng **Next.js Server Actions** (hoặc API Routes nếu cần tích hợp webhook/third-party).

- **Kiểu trả về chung của Server Action**:
```typescript
interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
```

---

## 1. Authentication & User Actions (`app/actions/auth.ts`)

### 1.1 Register User
- **Action**: `registerUser(data: RegisterInput)`
- **Input**:
  - `email`: string (required, email format)
  - `password`: string (required, min 8 chars, 1 uppercase, 1 special char)
  - `fullName`: string (required)
  - `phone`: string (optional)
- **Workflow**:
  1. Validate input (Zod schema).
  2. Mã hóa mật khẩu sử dụng `bcrypt`.
  3. Tạo `User` record với trạng thái `emailVerified = false`.
  4. Tạo `VerificationCode` (6 chữ số ngẫu nhiên, hết hạn sau 15 phút).
  5. Gửi email code xác thực (mock ở MVP).
- **Return**: `ActionResponse<{ userId: string }>`

### 1.2 Verify Email
- **Action**: `verifyEmail(data: VerifyEmailInput)`
- **Input**:
  - `userId`: string (required)
  - `code`: string (required, 6 digits)
- **Workflow**:
  1. Tìm code khớp với `userId`, loại `verify_email`, chưa dùng và chưa hết hạn.
  2. Nếu tìm thấy: Cập nhật `emailVerified = true` trong `User`, đánh dấu code đã dùng.
  3. Nếu không: Trả về lỗi.
- **Return**: `ActionResponse<{ verified: boolean }>`

### 1.3 Login User
- **Action**: `loginUser(data: LoginInput)`
- **Input**:
  - `email`: string (required)
  - `password`: string (required)
- **Workflow**:
  1. Kiểm tra email tồn tại.
  2. So khớp password hash.
  3. Khởi tạo session qua Supabase Auth.
- **Return**: `ActionResponse<{ session: any }>`

### 1.4 Get Profile
- **Action**: `getCurrentUserProfile()`
- **Input**: None (Lấy ID từ session token)
- **Return**: `ActionResponse<UserDTO>`

---

## 2. Auction Actions (`app/actions/auctions.ts`)

### 2.1 Create Auction Listing
- **Action**: `createAuction(data: CreateAuctionInput)`
- **Input**:
  - `title`: string (required, 5-255 chars)
  - `description`: string (required, min 20 chars)
  - `images`: string[] (required, max 5 URLs)
  - `startPrice`: bigint (required, >= 1000)
  - `bidStep`: bigint (required, >= 10000)
  - `duration`: number (required, minutes, e.g. 15, 30, 60, 1440)
- **Workflow**:
  1. Xác thực session người dùng (phải là role `seller` hoặc `user` được phép).
  2. Validate input qua Zod.
  3. Tính toán `endsAt` dựa trên `duration`.
  4. Tạo `Auction` với status = `active` (cho phép active ngay trong MVP).
  5. Ghi nhận audit log.
- **Return**: `ActionResponse<Auction>`

### 2.2 Get Auction Details
- **Action**: `getAuctionDetails(auctionId: string)`
- **Input**: `auctionId` (UUID)
- **Return**: `ActionResponse<AuctionDetailsDTO>` (kèm thông tin Seller, Lịch sử Bids)

### 2.3 List Auctions (Filtering & Pagination)
- **Action**: `listAuctions(filters: ListAuctionsFilter)`
- **Input**:
  - `status`: 'active' | 'completed' | 'pending' | 'all' (default: 'active')
  - `query`: string (search title/description)
  - `page`: number (default: 1)
  - `limit`: number (default: 12)
- **Return**: `ActionResponse<{ items: Auction[], total: number }>`

---

## 3. Bidding Actions (`app/actions/bids.ts`)

### 3.1 Place Bid (Manual & Auto-bid)
- **Action**: `placeBid(data: PlaceBidInput)`
- **Input**:
  - `auctionId`: string (required)
  - `bidPrice`: bigint (required, manual bid)
  - `isAutoBid`: boolean (required)
  - `autoBidMaxPrice`: bigint (optional, required if `isAutoBid` = true)
- **Workflow** (Xem DATABASE_SCHEMA & PRD cho logic chi tiết):
  1. Xác thực người dùng.
  2. Bắt đầu transaction database (`Prisma.$transaction`).
  3. Lock row của Auction để chống race condition.
  4. Validate:
     - Phiên đấu giá có đang `active` không?
     - Đã quá hạn chưa?
     - Người đặt có phải là Seller không? (Cấm bid của chính mình)
     - `bidPrice` có lớn hơn `currentPrice + bidStep` không?
  5. Xử lý logic Auto-bid:
     - Nếu `isAutoBid` là true, lưu `autoBidMaxPrice`.
     - So sánh với các auto-bid hiện tại khác trong phiên.
     - Tự động nhảy bước giá.
  6. Xử lý Time Extension (Gia hạn bắn tỉa):
     - Nếu thời gian kết thúc (`endsAt`) còn lại dưới 2 phút, cộng thêm 2 phút.
     - Kiểm tra giới hạn `maxExtensions` (tối đa 3 lần).
  7. Lưu record `Bid` mới.
  8. Cập nhật `currentPrice` và `winnerId` của Auction.
  9. Trigger Realtime event qua Supabase Channel để cập nhật giao diện người dùng.
- **Return**: `ActionResponse<Bid>`

### 3.2 Get Bid History
- **Action**: `getAuctionBidHistory(auctionId: string)`
- **Input**: `auctionId`
- **Return**: `ActionResponse<BidDTO[]>`

---

## 4. Admin Actions (`app/actions/admin.ts`)

### 4.1 Cancel Auction
- **Action**: `adminCancelAuction(auctionId: string, reason: string)`
- **Input**: `auctionId`, `reason`
- **Workflow**:
  1. Xác thực Admin session.
  2. Chuyển trạng thái Auction thành `cancelled`.
  3. Hủy bỏ tất cả các bids liên quan (`status = cancelled`).
  4. Ghi log lý do hủy.
- **Return**: `ActionResponse`

### 4.2 Block/Unblock User
- **Action**: `adminToggleUserBlock(userId: string, isBlocked: boolean)`
- **Input**: `userId`, `isBlocked`
- **Return**: `ActionResponse`