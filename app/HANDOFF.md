# HANDOFF.md - Phase 2 Status AutoBid.vn MVP

## Phase 2 Complete: Database Schema + Prisma Migration

### Status: READY FOR REVIEW

### Completed Tasks

- [x] Prisma schema hoàn thiện với 8 tables:
  - `profiles` - User profiles với UserRole enum
  - `auctions` - Auction listings với AuctionStatus enum
  - `auction_images` - Images cho auctions
  - `bids` - Bidding với BidStatus enum
  - `watchlist` - User watchlist
  - `notifications` - Notifications với NotificationType enum
  - `audit_logs` - Audit trail với AuditAction enum

- [x] Enums đã được tạo:
  - `UserRole` (USER, SELLER, ADMIN)
  - `AuctionStatus` (PENDING, ACTIVE, COMPLETED, CANCELLED)
  - `BidStatus` (ACTIVE, WON, LOST, CANCELLED)
  - `NotificationType` (AUCTION_CREATED, AUCTION_ACTIVATED, AUCTION_ENDING_SOON, AUCTION_ENDED, BID_PLACED, BID_OUTBID, BID_WON, SYSTEM)
  - `AuditAction` (PROFILE_CREATED, PROFILE_UPDATED, AUCTION_CREATED, AUCTION_UPDATED, AUCTION_ACTIVATED, AUCTION_CANCELLED, AUCTION_COMPLETED, BID_PLACED, BID_CANCELLED, WATCHLIST_ADDED, WATCHLIST_REMOVED, NOTIFICATION_CREATED, ADMIN_ACTION)

- [x] Index đã thêm:
  - `idx_auctions_status_ends_at` (status, ends_at)
  - `idx_auctions_seller_id_status` (seller_id, status)
  - `idx_bids_auction_id_amount` (auction_id, amount)
  - `idx_bids_bidder_id_created_at` (bidder_id, created_at)

- [x] Migration đã tạo: `prisma/migrations/phase_2_database_schema`

- [x] Seed data demo: `prisma/seed.ts`

### Cần làm tiếp khi có DB

```bash
# 1. Đảm bảo Docker đang chạy
docker --version

# 2. Chạy PostgreSQL container
cd app
docker-compose up -d

# 3. Chờ DB sẵn sàng (thử lại vài lần nếu cần)
sleep 5

# 4. Chạy Prisma generate (lần đầu cần DB để validate)
npx prisma generate

# 5. Validate schema
npx prisma validate

# 6. Apply migration (không tạo lại migration)
npx prisma migrate deploy

# 7. Chạy seed data
npx prisma db seed
```

### Lưu ý quan trọng

- **Không** DROP/RESET/Truncate database (đã có guardrails trong migration)
- **Không** modify migration đã tồn tại (đã có guardrails)
- **Không** chạy migration production khi chưa duyệt rõ ràng
- Migration local chỉ phục vụ development/demo

### Files đã sửa

| File | Thay đổi |
|------|----------|
| `app/prisma/schema.prisma` | Enum BUYER → USER; default USER |
| `app/prisma/seed.ts` | UserRole.BUYER → UserRole.USER |
| `app/src/lib/auth.ts` | UserRole.BUYER → UserRole.USER |
| `app/src/actions/auth.ts` | "BUYER" → "USER" fallback |

### Next Step

Review Phase 2 và approve để tiếp tục Phase 3 - Authentication MVP.