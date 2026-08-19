# AutoBid.vn - MVP demo web Ä‘áº¥u giĂ¡ online

AutoBid.vn lĂ  MVP demo cho má»™t ná»n táº£ng Ä‘áº¥u giĂ¡ online. Project táº­p trung vĂ o cĂ¡c luá»“ng cá»‘t lĂµi: Ä‘Äƒng kĂ½/Ä‘Äƒng nháº­p, xem danh sĂ¡ch phiĂªn Ä‘áº¥u giĂ¡ tá»« database, xem chi tiáº¿t phiĂªn Ä‘áº¥u giĂ¡, táº¡o phiĂªn Ä‘áº¥u giĂ¡, Ä‘áº·t giĂ¡ thá»§ cĂ´ng báº±ng transaction, profile cÆ¡ báº£n vĂ  admin MVP.

> ÄĂ¢y lĂ  MVP demo, chÆ°a nĂªn dĂ¹ng cho giao dá»‹ch tiá»n tháº­t. TrÆ°á»›c khi production tháº­t cáº§n bá»• sung rate limit, monitoring, security review, anti-abuse, kiá»ƒm thá»­ táº£i, quy trĂ¬nh váº­n hĂ nh vĂ  payment compliance náº¿u cĂ³ thanh toĂ¡n.

## Tech stack

- Next.js App Router 16
- React 19
- TypeScript
- Tailwind CSS / shadcn UI
- Prisma ORM
- MySQL Database
- Custom JWT-based Authentication
- ESLint

## YĂªu cáº§u mĂ´i trÆ°á»ng

- Node.js phiĂªn báº£n phĂ¹ há»£p vá»›i Next.js 16
- npm
- MySQL database
- Docker náº¿u muá»‘n cháº¡y MySQL local báº±ng `docker-compose`

## CĂ i Ä‘áº·t dependencies

Cháº¡y trong thÆ° má»¥c `app/`:

```bash
npm install
```

## Cáº¥u hĂ¬nh `.env`

Copy file máº«u:

```bash
cp .env.example .env
```

TrĂªn Windows PowerShell cĂ³ thá»ƒ dĂ¹ng:

```powershell
Copy-Item .env.example .env
```

CĂ¡c biáº¿n mĂ´i trÆ°á»ng chĂ­nh:

```env
DATABASE_URL="mysql://autobid:autobid@localhost:3306/autobid"
JWT_SECRET="your-random-secret-key"
JWT_EXPIRES_IN_SECONDS="604800"
```

Ghi chĂº báº£o máº­t:

- `DATABASE_URL` vĂ  `JWT_SECRET` lĂ  secret, chá»‰ dĂ¹ng server-side, khĂ´ng commit vĂ  khĂ´ng expose ra browser.
- KhĂ´ng Ä‘Æ°a `.env` lĂªn git.

## Prisma generate / migrate / seed

Cháº¡y trong thÆ° má»¥c `app/`:

```bash
npx prisma generate
npx prisma validate
npx prisma migrate deploy
npx prisma db seed
```

Cho development local, náº¿u cáº§n táº¡o migration má»›i:

```bash
npx prisma migrate dev
```

Náº¿u dĂ¹ng MySQL local báº±ng Docker, cháº¡y tá»« root repository:

```bash
docker-compose up -d
```

## Cháº¡y dev

Trong thÆ° má»¥c `app/`:

```bash
npm run dev
```

Má»Ÿ `http://localhost:3000`.

## Build production

Trong thÆ° má»¥c `app/`:

```bash
npm run lint
npm run build
npm run start
```

## Runtime processes and health

Web and background workers run as separate processes:

```bash
# terminal 1
npm run dev

# terminal 2 (requires DATABASE_URL, REDIS_URL and worker variables)
npm run start:worker
```

Production/staging commands:

```bash
npm run build
npm run start:web
npm run start:worker
```

Health endpoints:

- `GET /api/health/live` checks that the web process is alive.
- `GET /api/health/ready` checks environment validation, MySQL, Redis, queue access and optionally the worker heartbeat.

Set `REQUIRE_WORKER_HEARTBEAT=true` in staging so readiness fails when the required worker process is stale. Financial processing is fail-closed: keep `FINANCIAL_OPERATIONS_ENABLED=false` and `REAL_MONEY_PAYMENTS_ENABLED=false` until the separate settlement/ledger/payment review is complete.

Docker targets and Compose:

```bash
docker build --target web -t autobid-web ./app
docker build --target worker -t autobid-worker ./app
docker compose -f compose.local.yml up --build
```

## Cáº¥u trĂºc project

```text
app/
â”œâ”€â”€ app/                    # Next.js App Router pages/routes
â”‚   â”œâ”€â”€ admin/              # Admin MVP routes
â”‚   â”œâ”€â”€ auctions/           # Listing/detail/create auction
â”‚   â”œâ”€â”€ auth/               # Login/register
â”‚   â””â”€â”€ profile/            # Profile MVP
â”œâ”€â”€ components/             # UI components, layout/sidebar/auth status
â”œâ”€â”€ hooks/                  # React hooks
â”œâ”€â”€ lib/                    # Shared UI/utils aliases
â”œâ”€â”€ prisma/                 # Prisma schema, migrations, seed
â”œâ”€â”€ public/                 # Static assets
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ actions/            # Server actions
â”‚   â”œâ”€â”€ lib/                # Auth, Prisma, audit helpers
â”‚   â””â”€â”€ types/              # Zod schemas and TypeScript types
â”œâ”€â”€ proxy.ts                # Next.js proxy for auth/session/redirect handling
â”œâ”€â”€ package.json
â””â”€â”€ README.md
```

## Route chĂ­nh

- `/` - Trang chá»§, hiá»ƒn thá»‹ featured auctions tá»« database.
- `/auctions` - Danh sĂ¡ch phiĂªn Ä‘áº¥u giĂ¡ theo tráº¡ng thĂ¡i.
- `/auctions/[id]` - Chi tiáº¿t phiĂªn Ä‘áº¥u giĂ¡, lá»‹ch sá»­ bid, form Ä‘áº·t giĂ¡.
- `/auctions/new` - Táº¡o phiĂªn Ä‘áº¥u giĂ¡ má»›i.
- `/auth/login` - ÄÄƒng nháº­p.
- `/auth/register` - ÄÄƒng kĂ½.
- `/profile` - Profile MVP vĂ  thá»‘ng kĂª cÆ¡ báº£n cá»§a user.
- `/admin` - Dashboard admin MVP, yĂªu cáº§u role `ADMIN`.
- `/admin/users` - Quáº£n lĂ½ user MVP, yĂªu cáº§u role `ADMIN`.
- `/admin/auctions` - Quáº£n lĂ½/cancel auction MVP, yĂªu cáº§u role `ADMIN`.

Route alias trong `proxy.ts`:

- `/login` -> `/auth/login`
- `/register` -> `/auth/register`
- `/auctions/create` -> `/auctions/new`

## TĂ­nh nÄƒng Ä‘Ă£ hoĂ n thĂ nh trong MVP

- Auth cÆ¡ báº£n báº±ng JWT token-based authentication lÆ°u trong httpOnly cookie.
- Äá»“ng bá»™ profile local trong MySQL qua Prisma.
- Role-based access cÆ¡ báº£n cho admin.
- Auction listing láº¥y dá»¯ liá»‡u tháº­t tá»« DB.
- Auction detail láº¥y dá»¯ liá»‡u tháº­t tá»« DB.
- Táº¡o auction tháº­t tá»« form `/auctions/new`.
- Manual bid tháº­t:
  - Validate Ä‘Äƒng nháº­p.
  - Cháº·n seller tá»± bid.
  - Cháº·n bid tháº¥p hÆ¡n `currentPrice + bidStep`.
  - Cháº·n bid khi auction khĂ´ng active hoáº·c Ä‘Ă£ háº¿t háº¡n.
  - DĂ¹ng Prisma transaction vĂ  row lock Ä‘á»ƒ cáº­p nháº­t bid/current price/winner.
- Profile MVP:
  - ThĂ´ng tin user.
  - Thá»‘ng kĂª sá»‘ auction Ä‘Ă£ táº¡o, bid Ä‘Ă£ Ä‘áº·t, auction Ä‘ang tháº¯ng.
- Admin MVP:
  - Dashboard cÆ¡ báº£n.
  - Danh sĂ¡ch user, khĂ³a/má»Ÿ khĂ³a user thÆ°á»ng.
  - Danh sĂ¡ch auction, cancel auction cĂ²n há»£p lá»‡.
- Audit log cho má»™t sá»‘ hĂ nh Ä‘á»™ng quan trá»ng.
- BigInt/Date Ä‘Æ°á»£c serialize trÆ°á»›c khi truyá»n sang Client Components.
- KhĂ´ng dĂ¹ng mock data trong business flow chĂ­nh cá»§a auction listing/detail/create/bid.

## TĂ­nh nÄƒng chÆ°a hoĂ n thĂ nh / giá»›i háº¡n MVP

- ChÆ°a cĂ³ thanh toĂ¡n, vĂ­, kĂ½ quá»¹ hoáº·c escrow.
- ChÆ°a phĂ¹ há»£p cho giao dá»‹ch tiá»n tháº­t.
- ChÆ°a cĂ³ realtime bid/countdown qua websocket/realtime channel.
- ChÆ°a triá»ƒn khai auto-bid/proxy bidding hoĂ n chá»‰nh.
- ChÆ°a cĂ³ upload áº£nh; form hiá»‡n nháº­n URL áº£nh.
- ChÆ°a cĂ³ workflow moderation/duyá»‡t auction nĂ¢ng cao.
- ChÆ°a cĂ³ notification delivery tháº­t qua email/push.
- ChÆ°a cĂ³ rate limiting/anti-abuse production-grade.
- ChÆ°a cĂ³ monitoring, alerting, tracing, backup/restore playbook.
- ChÆ°a cĂ³ test suite tá»± Ä‘á»™ng Ä‘áº§y Ä‘á»§ cho cĂ¡c luá»“ng nghiá»‡p vá»¥.

## Checklist báº£o máº­t vĂ  error handling cáº§n kiá»ƒm tra

- Network offline mode disable form/submit Ä‘Ăºng chÆ°a?
- Reconnect cĂ³ refetch AuctionDetail, update price warnings khĂ´ng?
- Session háº¿t háº¡n cĂ³ logout vĂ  redirect Ä‘Ăºng khĂ´ng?
- Error message cĂ³ thĂ¢n thiá»‡n vĂ  khĂ´ng expose internals khĂ´ng?
- Idempotency/submit prevention hoáº¡t Ä‘á»™ng Ä‘Ăºng chÆ°a?
- ErrorBoundary cĂ³ báº¯t Ä‘Æ°á»£c all errors khĂ´ng?

## TĂ­nh nÄƒng báº£o máº­t vĂ  error handling Ä‘Ă£ bá»• sung (v0.2)

- Network status detection (online/offline) vá»›i `useNetworkStatus` hook.
- Global NetworkStatusBanner hiá»ƒn thá»‹ khi máº¥t káº¿t ná»‘i.
- Auction detail refetch khi reconnect, warning khi giĂ¡ thay Ä‘á»•i.
- Create auction form giá»¯ dá»¯ liá»‡u khi offline, disable submit.
- Request timeout vĂ  retry logic (GET only).
- Auth session error handling (401, SESSION_EXPIRED, SESSION_REVOKED).
- Stale data warnings vĂ  auto-refetch khi quay láº¡i tab.
- ErrorBoundary bao quanh toĂ n app.
- Multi-tab behavior: bid/update qua polling/realtime fallback.

## Multi-session policy

Há»‡ thá»‘ng hiá»‡n cho phĂ©p Ä‘Äƒng nháº­p trĂªn nhiá»u thiáº¿t bá»‹ cĂ¹ng lĂºc. Äiá»u nĂ y giĂºp UX thuáº­n tiá»‡n nhÆ°ng cĂ³ thá»ƒ lĂ m giáº£m an toĂ n náº¿u thiáº¿t bá»‹ bá»‹ leak token.

Náº¿u cáº§n single-session:
- server cáº§n lÆ°u `sessionVersion` hoáº·c `activeSessionId` trong DB.
- má»—i login má»›i táº¡o session version má»›i vĂ  invalidate version cÅ©.
- cĂ¡c thiáº¿t bá»‹ cÅ© nháº­n `SESSION_REVOKED` sáº½ logout vĂ  yĂªu cáº§u Ä‘Äƒng nháº­p láº¡i.

## Checklist QA thá»§ cĂ´ng khuyáº¿n nghá»‹

Routes cáº§n kiá»ƒm tra:

- `/`
- `/auctions`
- `/auctions/[id]`
- `/auctions/new`
- `/auth/login`
- `/auth/register`
- `/profile`
- `/admin`
- `/admin/users`
- `/admin/auctions`

Luá»“ng cáº§n kiá»ƒm tra:

1. Login/logout.
2. Xem auction list.
3. Xem auction detail.
4. Táº¡o auction.
5. Äáº·t bid há»£p lá»‡.
6. Bid tháº¥p hÆ¡n minimum bá»‹ cháº·n.
7. Seller tá»± bid bá»‹ cháº·n.
8. Auction háº¿t háº¡n khĂ´ng bid Ä‘Æ°á»£c.
9. Non-admin vĂ o admin bá»‹ cháº·n.
10. Admin vĂ o admin Ä‘Æ°á»£c náº¿u cĂ³ admin account.

## Ghi chĂº báº£o máº­t

- KhĂ´ng commit `.env` hoáº·c secret key.
- KhĂ´ng expose `DATABASE_URL` hoáº·c `JWT_SECRET` sang client.
- KhĂ´ng log PII/secrets trong client. Server logs hiá»‡n chá»‰ dĂ¹ng cho lá»—i ká»¹ thuáº­t; cáº§n tĂ­ch há»£p logger cĂ³ redaction trÆ°á»›c production.
- Admin role pháº£i luĂ´n Ä‘á»c tá»« DB/server, khĂ´ng tin dá»¯ liá»‡u client.
- JWT token cáº§n dĂ¹ng secret Ä‘á»§ máº¡nh vĂ  chá»‰ lÆ°u trong httpOnly cookie.
- Cáº§n thĂªm rate limit cho login, register, create auction vĂ  place bid trÆ°á»›c production.
- Cáº§n security review cho transaction bid, authorization, upload file, audit log vĂ  admin actions.
- Náº¿u bá»• sung payment/wallet/escrow, cáº§n kiá»ƒm tra compliance, reconciliation, fraud detection vĂ  dispute handling.
