# TASKS.md - Phase Plan AutoBid.vn MVP

## Nguyên tắc triển khai

- Stack chính: **Next.js + TypeScript + Supabase + Prisma + PostgreSQL + Tailwind CSS + shadcn/ui**.
- MVP chỉ phục vụ demo/học tập, chưa vận hành thương mại thật.
- Không làm payment thật, escrow thật, KYC thật, crypto, bất động sản, xe hơi.
- Không viết bidding engine phức tạp trong giai đoạn skeleton.
- Mọi thay đổi database phải đi qua Prisma migration.
- Không chạy lệnh nguy hiểm như drop/reset database nếu chưa được duyệt rõ ràng.
- UI phải responsive, hiện đại, ưu tiên shadcn/ui + Tailwind.
- Logic đấu giá nhạy cảm phải chạy ở server, không tin dữ liệu từ client.

---

## Phase 0 - Product & Architecture Planning

### Mục tiêu
Hoàn thiện tài liệu sản phẩm, kiến trúc sơ bộ, schema dữ liệu, API/action list và checklist bảo mật.

### Deliverables
- [x] `PRD.md`
- [x] `DATABASE_SCHEMA.md`
- [x] `API_SPEC.md`
- [x] `SECURITY_CHECKLIST.md`
- [x] `TASKS.md`

### Test checklist
- [x] PRD mô tả rõ MVP scope và out-of-scope.
- [x] User roles và user flow đầy đủ cho Guest/User/Seller/Admin.
- [x] Database schema có các bảng cốt lõi: users, auctions, bids, verification_codes, audit_logs.
- [x] API/action list có auth, auction, bid, admin actions.
- [x] Security checklist có concurrency, race condition, RBAC, rate limit, audit log.

---

## Phase 1 - Project Skeleton & Tooling

### Mục tiêu
Khởi tạo project Next.js TypeScript, Tailwind, shadcn/ui, Prisma, Supabase client skeleton.

### Tasks
- [x] Khởi tạo Next.js App Router project.
- [x] Cấu hình TypeScript strict mode.
- [x] Cấu hình Tailwind CSS.
- [x] Cấu hình shadcn/ui base components.
- [x] Cài Prisma và tạo `prisma/schema.prisma` skeleton.
- [x] Tạo `.env.example`.
- [x] Tạo cấu trúc thư mục:
  - `app/`
  - `app/actions/`
  - `components/`
  - `components/ui/`
  - `lib/`
  - `prisma/`
  - `types/`
- [x] Tạo placeholder pages cho các màn hình chính.

### Test checklist
- [x] `npm run lint` chạy không lỗi.
- [x] `npm run build` chạy thành công.
- [x] Trang `/` render được.
- [x] Không có secret thật trong repository.
- [x] Prisma schema parse được bằng `npx prisma generate`.
- [x] Routes hoạt động trên desktop/tablet/mobile.
- [x] shadcn/ui base components import đúng.
- [x] TypeScript strict mode hoạt động.

---

## Phase 2 - Database Schema + Prisma Migration

### Mục tiêu
Hoàn thiện Prisma schema cho MVP, tạo migration local, seed data demo, cập nhật schema documentation.

### Tasks
- [x] Hoàn thiện Prisma schema gồm:
  - [x] profiles (with UserRole enum)
  - [x] auctions (with AuctionStatus enum)
  - [x] auction_images
  - [x] bids (with BidStatus enum)
  - [x] watchlist
  - [x] notifications (with NotificationType enum)
  - [x] audit_logs (with AuditAction enum)
- [x] Thêm foreign key và relation hợp lý
- [x] Thêm index quan trọng:
  - [x] auctions(status, ends_at)
  - [x] auctions(seller_id, status)
  - [x] bids(auction_id, amount)
  - [x] bids(bidder_id, created_at)
- [x] Tạo migration local bằng Prisma (`phase_2_database_schema`)
- [x] Tạo seed data demo (`prisma/seed.ts`)
- [x] Cập nhật DATABASE_SCHEMA.md
- [x] Cập nhật TASKS.md
- [x] Bổ sung Docker local PostgreSQL setup (`docker-compose.yml`)
- [x] Bổ sung handoff notes (`app/HANDOFF.md`)

### Test checklist
- [x] `npx prisma generate` chạy thành công
- [x] `npx prisma validate` không lỗi
- [x] Migration đã tạo: `prisma/migrations/phase_2_database_schema`
- [x] Seed file: `prisma/seed.ts` với profiles, auctions, bids, notifications mẫu
- [x] Docker compose local PostgreSQL đã được thêm để chạy migration local an toàn
- [x] TypeScript compilation passed (`npm run lint` và `npx tsc --noEmit`)
- [x] Không DROP/RESET/Truncate database
- [x] Không có migration production

---

## Phase 3 - Authentication MVP

### Mục tiêu
Cho phép user đăng ký, đăng nhập, xác thực email cơ bản/mock.

### Tasks
- [ ] Tạo auth UI: `/login`, `/register`.
- [ ] Tạo Supabase auth client/server helpers.
- [ ] Tạo user profile mapping giữa Supabase Auth và bảng app `users`.
- [ ] Tạo server actions:
  - [ ] `registerUser`
  - [ ] `loginUser`
  - [ ] `verifyEmail`
  - [ ] `getCurrentUserProfile`
- [ ] Tạo middleware bảo vệ route cần đăng nhập.
- [ ] Tạo mock email verification code.

### Test checklist
- [ ] User đăng ký được với email hợp lệ.
- [ ] Password yếu bị từ chối.
- [ ] Email verification code hết hạn sau thời gian cấu hình.
- [ ] User chưa login không vào được dashboard.
- [ ] Session không bị expose ở client không cần thiết.

---

## Phase 4 - Auction Listing MVP

### Mục tiêu
User tạo phiên đấu giá và khách xem danh sách/chi tiết phiên đấu giá.

### Tasks
- [ ] Tạo UI trang chủ `/` hiển thị auction cards.
- [ ] Tạo UI chi tiết `/auctions/[id]`.
- [ ] Tạo UI tạo auction `/auctions/create`.
- [ ] Tạo server actions:
  - [ ] `createAuction`
  - [ ] `listAuctions`
  - [ ] `getAuctionDetails`
- [ ] Validate input bằng Zod.
- [ ] Lưu ảnh ở MVP dạng URL list, chưa upload storage phức tạp.
- [ ] Tính `endsAt` phía server.

### Test checklist
- [ ] User đã login tạo được auction hợp lệ.
- [ ] User chưa login không tạo được auction.
- [ ] Giá khởi điểm và bước giá không được âm/không hợp lệ.
- [ ] Tối đa 5 ảnh.
- [ ] Auction active xuất hiện ở trang chủ.
- [ ] Auction detail hiển thị đúng giá hiện tại, seller, thời gian kết thúc.

---

## Phase 5 - Manual Bid MVP

### Mục tiêu
Cho phép user đặt bid thủ công an toàn, chưa cần proxy bidding đầy đủ.

### Tasks
- [ ] Tạo UI bid box trong `/auctions/[id]`.
- [ ] Tạo server action `placeBid`.
- [ ] Validate auction status, thời gian kết thúc, bidStep.
- [ ] Chặn seller tự bid sản phẩm của mình.
- [ ] Dùng transaction khi cập nhật bid/currentPrice/winnerId.
- [ ] Tạo audit log cho bid thành công/thất bại quan trọng.
- [ ] Tạo bid history UI.

### Test checklist
- [ ] Bid thấp hơn `currentPrice + bidStep` bị từ chối.
- [ ] Seller bid chính auction của mình bị từ chối.
- [ ] Auction hết hạn không nhận bid.
- [ ] Hai bid gần như đồng thời không làm sai `currentPrice`.
- [ ] Bid thành công cập nhật `currentPrice` và `winnerId`.

---

## Phase 6 - Auto-Bid / Proxy Bidding MVP

### Mục tiêu
Thêm proxy bidding đơn giản theo max price.

### Tasks
- [ ] Thiết kế rõ bảng/logic lưu auto-bid max.
- [ ] Xử lý cạnh tranh giữa manual bid và auto-bid.
- [ ] Xử lý cạnh tranh giữa nhiều auto-bid.
- [ ] Cập nhật bid history để phân biệt bid user và system auto-increment.
- [ ] Tạo unit tests cho các scenario proxy bidding.

### Test checklist
- [ ] Auto-bid không vượt `autoBidMaxPrice`.
- [ ] Người có max cao hơn thắng với giá tối thiểu cần thiết.
- [ ] Nếu max bằng nhau, bid sớm hơn thắng.
- [ ] Auto-bid không tạo vòng lặp vô hạn.
- [ ] Audit log ghi đủ các bước quan trọng.

---

## Phase 7 - Realtime & Time Extension

### Mục tiêu
Cập nhật realtime giá hiện tại, người đang thắng, thời gian còn lại, bid history; thêm anti-sniping extension.

### Tasks
- [ ] Supabase Realtime channel cho auction detail.
- [ ] Client subscribe auction updates.
- [ ] Server publish/update qua thay đổi DB.
- [ ] Time extension: nếu bid trong 2 phút cuối, gia hạn thêm 2 phút.
- [ ] Giới hạn tối đa 3 lần extension.
- [ ] Countdown client chỉ là hiển thị; server là nguồn sự thật.

### Test checklist
- [ ] Hai trình duyệt thấy giá cập nhật gần realtime.
- [ ] Bid trong 2 phút cuối gia hạn đúng 2 phút.
- [ ] Không gia hạn quá 3 lần.
- [ ] Refresh trang vẫn hiển thị đúng `endsAt`.
- [ ] Client clock sai không ảnh hưởng kết quả đấu giá.

---

## Phase 8 - Admin MVP

### Mục tiêu
Admin xem và quản lý dữ liệu cơ bản.

### Tasks
- [ ] Tạo `/admin`.
- [ ] Tạo `/admin/auctions`.
- [ ] Tạo `/admin/users`.
- [ ] Server actions:
  - [ ] `adminCancelAuction`
  - [ ] `adminToggleUserBlock`
- [ ] RBAC middleware/helper cho admin.
- [ ] Audit log cho admin actions.

### Test checklist
- [ ] User thường không truy cập được admin pages.
- [ ] Admin hủy auction thì auction chuyển `cancelled`.
- [ ] Bid liên quan auction bị hủy/cập nhật trạng thái phù hợp.
- [ ] Lý do hủy được ghi vào audit log.

---

## Phase 9 - Hardening, QA & Deployment Prep

### Mục tiêu
Tăng độ ổn định, bảo mật và chuẩn bị deploy demo.

### Tasks
- [ ] Rate limiting cho auth và bid actions.
- [ ] Input sanitization cho title/description.
- [ ] Error handling chuẩn hóa.
- [ ] Logging không leak PII/secrets.
- [ ] Seed data demo.
- [ ] README setup local.
- [ ] Deployment notes cho Vercel + Supabase.

### Test checklist
- [ ] Không có secret trong code.
- [ ] Build production thành công.
- [ ] Các route chính hoạt động responsive mobile/tablet/desktop.
- [ ] Rate limit hoạt động với spam request.
- [ ] XSS payload trong description không render thành script.
- [ ] Prisma migrations chạy được trên database mới.

---

## Backlog sau MVP

- [ ] Payment gateway.
- [ ] Escrow thật.
- [ ] KYC/identity verification.
- [ ] Seller rating/reputation.
- [ ] Dispute management.
- [ ] Notification email/push.
- [ ] Upload ảnh qua Supabase Storage.
- [ ] Watchlist/favorites.
- [ ] Advanced fraud detection.
- [ ] Legal compliance workflow cho vận hành thương mại.