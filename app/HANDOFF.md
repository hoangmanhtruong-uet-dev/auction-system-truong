# HANDOFF.md - Phase 2 Status AutoBid.vn MVP

## Phase 2 Complete: Database Schema + Prisma Migration

### Status: READY FOR REVIEW

### Completed Tasks

- [x] Prisma schema hoĂ n thiá»‡n vá»›i 8 tables:
  - `profiles` - User profiles vá»›i UserRole enum
  - `auctions` - Auction listings vá»›i AuctionStatus enum
  - `auction_images` - Images cho auctions
  - `bids` - Bidding vá»›i BidStatus enum
  - `watchlist` - User watchlist
  - `notifications` - Notifications vá»›i NotificationType enum
  - `audit_logs` - Audit trail vá»›i AuditAction enum

- [x] Enums Ä‘Ă£ Ä‘Æ°á»£c táº¡o:
  - `UserRole` (USER, SELLER, ADMIN)
  - `AuctionStatus` (PENDING, ACTIVE, COMPLETED, CANCELLED)
  - `BidStatus` (ACTIVE, WON, LOST, CANCELLED)
  - `NotificationType` (AUCTION_CREATED, AUCTION_ACTIVATED, AUCTION_ENDING_SOON, AUCTION_ENDED, BID_PLACED, BID_OUTBID, BID_WON, SYSTEM)
  - `AuditAction` (PROFILE_CREATED, PROFILE_UPDATED, AUCTION_CREATED, AUCTION_UPDATED, AUCTION_ACTIVATED, AUCTION_CANCELLED, AUCTION_COMPLETED, BID_PLACED, BID_CANCELLED, WATCHLIST_ADDED, WATCHLIST_REMOVED, NOTIFICATION_CREATED, ADMIN_ACTION)

- [x] Index Ä‘Ă£ thĂªm:
  - `idx_auctions_status_ends_at` (status, ends_at)
  - `idx_auctions_seller_id_status` (seller_id, status)
  - `idx_bids_auction_id_amount` (auction_id, amount)
  - `idx_bids_bidder_id_created_at` (bidder_id, created_at)

- [x] Migration Ä‘Ă£ táº¡o: `prisma/migrations/20260707090000_init_mysql`

- [x] Seed data demo: `prisma/seed.ts`

### Cáº§n lĂ m tiáº¿p khi cĂ³ DB

```bash
# 1. Äáº£m báº£o Docker Ä‘ang cháº¡y
docker --version

# 2. Cháº¡y MySQL container
cd app
docker-compose up -d

# 3. Chá» DB sáºµn sĂ ng (thá»­ láº¡i vĂ i láº§n náº¿u cáº§n)
sleep 5

# 4. Cháº¡y Prisma generate (láº§n Ä‘áº§u cáº§n DB Ä‘á»ƒ validate)
npx prisma generate

# 5. Validate schema
npx prisma validate

# 6. Apply migration (khĂ´ng táº¡o láº¡i migration)
npx prisma migrate deploy

# 7. Cháº¡y seed data
npx prisma db seed
```

### LÆ°u Ă½ quan trá»ng

- **KhĂ´ng** DROP/RESET/Truncate database (Ä‘Ă£ cĂ³ guardrails trong migration)
- **KhĂ´ng** modify migration Ä‘Ă£ tá»“n táº¡i (Ä‘Ă£ cĂ³ guardrails)
- **KhĂ´ng** cháº¡y migration production khi chÆ°a duyá»‡t rĂµ rĂ ng
- Migration local chá»‰ phá»¥c vá»¥ development/demo

### Files Ä‘Ă£ sá»­a

| File | Thay Ä‘á»•i |
|------|----------|
| `app/prisma/schema.prisma` | Enum BUYER â†’ USER; default USER |
| `app/prisma/seed.ts` | UserRole.BUYER â†’ UserRole.USER |
| `app/src/lib/auth.ts` | UserRole.BUYER â†’ UserRole.USER |
| `app/src/actions/auth.ts` | "BUYER" â†’ "USER" fallback |

### Next Step

Review Phase 2 vĂ  approve Ä‘á»ƒ tiáº¿p tá»¥c Phase 3 - Authentication MVP.