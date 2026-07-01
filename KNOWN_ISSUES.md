# KNOWN_ISSUES.md - AutoBid.vn

Danh sách các vấn đề kỹ thuật đã biết nhưng chưa fix ngay trong giai đoạn MVP.

---

## 1. npm audit - Moderate Vulnerabilities

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

## 2. Security Items (Chưa implement ở MVP)

Các mục trong `SECURITY_CHECKLIST.md` chưa được implement ở Phase 1 (skeleton). Sẽ hoàn thiện dần qua các Phase.

- [ ] Rate limiting (auth + bid actions) - Phase 8
- [ ] Input sanitization (XSS) - Phase 8
- [ ] Row-level locking (SELECT FOR UPDATE) - Phase 4
- [ ] Audit logs chi tiết - Phase 4

---

## 3. Performance / Architecture Items

- [ ] Chưa có caching layer (Redis) - Backlog
- [ ] Chưa có message queue cho bid processing - Backlog
- [ ] Chưa có database indexing tối ưu - Cần review sau Phase 4/5