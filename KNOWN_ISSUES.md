# KNOWN_ISSUES.md - AutoBid.vn

Danh sách các vấn đề kỹ thuật đã biết nhưng chưa fix ngay trong giai đoạn MVP.

---

## 1. Manual Bid Flow — Đã Hardened ✅ (MVP Stage)

### Các fix đã thực hiện trong `placeBid` (`app/src/actions/auction.ts`)

| Fix | Status | Mô tả |
|-----|--------|-------|
| Row-level locking | ✅ | `prisma.$transaction` + `SELECT ... FOR UPDATE` lock auction row |
| Lifecycle refresh | ✅ | Gọi `refreshAuctionStatus` trong transaction để update trạng thái auction trước xử lý |
| Seller tự bid | ✅ | `assertNotSellerBidder` check — không cho seller bid vào sản phẩm của mình |
| Minimum bid | ✅ | `amount >= currentPrice + bidStep` — reject bid thấp hơn required |
| Stale UI (price changed) | ✅ | `expectedCurrentPrice` check — nếu khác DB price thì trả lỗi: "Giá hiện tại đã thay đổi, vui lòng tải lại." |
| Auction expired | ✅ | `refreshAuctionStatus` update auction thành ENDED nếu `now >= endsAt` |
| Auto-bid disabled | ✅ | Kiểm tra `!isAutoBidEnabled` — không cho auto-bid tại MVP |
| Audit log | ✅ | Ghi `AuditAction.BID_PLACED` với chi tiết auction, bidder, amount |
| Bid status | ✅ | UpdateOldActiveBids -> LOST, Create new bid -> ACTIVE |
| Error messages | ✅ | Tất cả lỗi trả về tiếng Việt có dấu |
| Client-side guard | ✅ | Submit button disabled + loading state trong `auction-detail-client.tsx` |

### Transaction flow (sơ đồ luồng trong `placeBid`)
```plaintext
[placeBid request]
        ↓
prisma.$transaction(async (tx) => {
        ↓
  SELECT ... FOR UPDATE auction (row lock)
        ↓
  refreshAuctionStatus(auction) ← update status if expired
        ↓
  [checks: ACTIVE? not seller? amount>=minimum? expectedPrice match?]
        ↓
  tx.bid.updateMany({ where: {auctionId, status:ACTIVE}, data:{status:LOST} })
        ↓
  tx.bid.create({ status:ACTIVE, amount, bidderId, auctionId })
        ↓
  tx.auction.update({ currentPrice, winnerId })
        ↓
  createAuditLog(BID_PLACED)
        ↓
  return newBid
})
        ↓
[return success or throw BidFlowError]
```

### Kiểm tra build/lint
```
npm run lint   → ✅ 0 errors, 31 warnings (các warning là pre-existing)
npm run build  → ✅ Compiled successfully
```

---

## 2. Remaining Production Risks — cần xử lý trước production deploy

Dưới đây là các risk còn tồn đọng ở `placeBid` cần xử lý trước production deploy.

### Rate limiting (Distributed)
- **Hiện tại**: In-memory Map (`Map<string, number[]>`), chỉ hoạt động trên single instance.
- **Giới hạn**: 1 bid / 2 giây per user per auction.
- **Cần làm**: Thay bằng Redis-backed sliding window (ioredis + `INCR`/`EXPIRE`).
- **Mức ưu tiên**: High — nếu deploy multi-instance, rate limit bị reset mỗi instance.
- **Ponytail**: Trong `app/src/lib/rate-limit.ts`.

### Idempotency
- **Hiện tại**: Không có idempotency key.
- **Rủi ro**: Nếu client gửi duplicate request (network retry, double-click dù UI đã disabled), có thể tạo multiple bids.
- **Cần làm**:
  - Client gửi `idempotencyKey` (UUID) trong request header hoặc body.
  - Server check unique constraint trên `(auctionId, bidderId, idempotencyKey)`.
  - Dùng unique index hoặc "insert if not exists" pattern.
- **Mức ưu tiên**: Medium — UI đã có disabled button + loading state, nhưng không đủ an toàn tuyệt đối.
- **Ponytail**: Trong `app/src/actions/auction.ts` function `placeBid`.

### Distributed lock
- **Hiện tại**: Prisma transaction + `SELECT ... FOR UPDATE` lock row auction.
- **Rủi ro**: FOR UPDATE lock chỉ hoạt động trong cùng database transaction. Khi deploy multi-instance với connection pool, vẫn an toàn vì FOR UPDATE là row-level lock ở database. Tuy nhiên, nếu bid processing phức tạp hơn (auto-bid chain, check nhiều service), cần Redis-based distributed lock (Redlock) để tránh deadlock hoặc timeout.
- **Cần làm**: Hiện tại chưa cần. FOR UPDATE đủ an toàn cho MVP manual bid.
- **Mức ưu tiên**: Low — chỉ cần khi có auto-bid hoặc multi-service architecture.
- **Ponytail**: Trong `app/src/actions/auction.ts` function `placeBid`.

### DB constraint: 1 ACTIVE bid per auction
- **Hiện tại**: Chỉ có app-level guard (updateMany + create). Không có partial unique index.
- **Rủi ro**: Nếu có bug transaction, có thể tạo 2 ACTIVE bid cho cùng auction.
- **Cần làm**: Partial unique index `WHERE status = 'ACTIVE' AND deleted_at IS NULL` — nhưng Prisma không hỗ trợ partial index qua schema, cần raw SQL migration.
- **Mức ưu tiên**: Medium — app-level guard đủ chặt, nhưng DB constraint là defense-in-depth.
- **Ponytail**: Chưa thêm migration vì Prisma không hỗ trợ partial unique index. TODO: Thêm raw SQL migration khi có DBA review.

---

## 2. npm audit - Moderate Vulnerabilities

| # | Package | Version | Severity | Issue | Impact |
|---|---------|---------|----------|-------|--------|
| 1 | `@hono/node-server` (transitive, via `prisma`) | < 1.19.13 | Moderate | Middleware bypass via repeated slashes in `serveStatic` | Only affects Prisma CLI in dev mode. No runtime impact. |
| 2 | `postcss` (transitive, via `next`) | < 8.5.10 | Moderate | XSS via unescaped `</style>` in CSS Stringify Output | Build-time only. Not exploitable in production runtime. |

### Lý do chưa fix ngay
- Cả hai vulnerability đều nằm ở **dev/build-time dependencies**, không ảnh hưởng đến production runtime.
- `npm audit fix --force` sẽ nâng major version của `prisma` và `next`, tiềm ẩn rủi ro breaking changes.
- Sẽ cập nhật khi:
  - Next.js release bản mới nhất với postcss >= 8.5.10.
  - Prisma dev channel không còn phụ thuộc `@hono/node-server` version cũ.

### Khi nào cần xử lý
- Trước khi deploy lên production thật (không phải demo).
- Khi có bản vá an toàn (patch/minor update) từ Next.js hoặc Prisma.

---

## 3. Security Items (Đã implement ở MVP)

| Item | Status |
|------|--------|
| Rate limiting (bid actions) | ✅ In-memory, single-instance |
| Row-level locking (SELECT FOR UPDATE) | ✅ Prisma transaction |
| Audit logs chi tiết | ✅ AuditAction.BID_PLACED, AUDIT_ACTION.AUCTION_CREATED |
| Input sanitization | ✅ Zod schema validation |
| Seller tự bid | ✅ assertNotSellerBidder |
| Bid khi auction hết giờ | ✅ refreshAuctionStatus trong transaction |
| Bid thấp hơn minimum | ✅ Kiểm tra amount >= currentPrice + bidStep |
| Stale UI (price changed) | ✅ expectedCurrentPrice check + toast warning |
| Double submit (client) | ✅ Button disabled + loading state |

---

## 4. Performance / Architecture Items

- [ ] Chưa có caching layer (Redis) - Backlog
- [ ] Chưa có message queue cho bid processing - Backlog
- [ ] Chưa có database indexing tối ưu - Cần review sau Phase 4/5
