# AutoBid.vn - MVP demo web đấu giá online

AutoBid.vn là MVP demo cho một nền tảng đấu giá online. Project tập trung vào các luồng cốt lõi: đăng ký/đăng nhập, xem danh sách phiên đấu giá từ database, xem chi tiết phiên đấu giá, tạo phiên đấu giá, đặt giá thủ công bằng transaction, profile cơ bản và admin MVP.

> Đây là MVP demo, chưa nên dùng cho giao dịch tiền thật. Trước khi production thật cần bổ sung rate limit, monitoring, security review, anti-abuse, kiểm thử tải, quy trình vận hành và payment compliance nếu có thanh toán.

## Tech stack

- Next.js App Router 16
- React 19
- TypeScript
- Tailwind CSS / shadcn UI
- Prisma ORM
- PostgreSQL / Supabase Database
- Supabase Auth
- ESLint

## Yêu cầu môi trường

- Node.js phiên bản phù hợp với Next.js 16
- npm
- PostgreSQL local hoặc Supabase PostgreSQL
- Supabase project đã bật Auth
- Docker nếu muốn chạy PostgreSQL local bằng `docker-compose`

## Cài đặt dependencies

Chạy trong thư mục `app/`:

```bash
npm install
```

## Cấu hình `.env`

Copy file mẫu:

```bash
cp .env.example .env
```

Trên Windows PowerShell có thể dùng:

```powershell
Copy-Item .env.example .env
```

Các biến môi trường chính:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Ghi chú bảo mật:

- `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` được phép dùng phía client.
- `DATABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` là secret, chỉ dùng server-side, không commit và không expose ra browser.
- Không đưa `.env` lên git.

## Prisma generate / migrate / seed

Chạy trong thư mục `app/`:

```bash
npx prisma generate
npx prisma validate
npx prisma migrate deploy
npx prisma db seed
```

Cho development local, nếu cần tạo migration mới:

```bash
npx prisma migrate dev
```

Nếu dùng PostgreSQL local bằng Docker, chạy từ root repository:

```bash
docker-compose up -d
```

## Chạy dev

Trong thư mục `app/`:

```bash
npm run dev
```

Mở `http://localhost:3000`.

## Build production

Trong thư mục `app/`:

```bash
npm run lint
npm run build
npm run start
```

## Cấu trúc project

```text
app/
├── app/                    # Next.js App Router pages/routes
│   ├── admin/              # Admin MVP routes
│   ├── auctions/           # Listing/detail/create auction
│   ├── auth/               # Login/register
│   └── profile/            # Profile MVP
├── components/             # UI components, layout/sidebar/auth status
├── hooks/                  # React hooks
├── lib/                    # Shared UI/utils aliases
├── prisma/                 # Prisma schema, migrations, seed
├── public/                 # Static assets
├── src/
│   ├── actions/            # Server actions
│   ├── lib/                # Auth, Prisma, Supabase, audit helpers
│   └── types/              # Zod schemas and TypeScript types
├── proxy.ts                # Next.js proxy for auth/session/redirect handling
├── package.json
└── README.md
```

## Route chính

- `/` - Trang chủ, hiển thị featured auctions từ database.
- `/auctions` - Danh sách phiên đấu giá theo trạng thái.
- `/auctions/[id]` - Chi tiết phiên đấu giá, lịch sử bid, form đặt giá.
- `/auctions/new` - Tạo phiên đấu giá mới.
- `/auth/login` - Đăng nhập.
- `/auth/register` - Đăng ký.
- `/profile` - Profile MVP và thống kê cơ bản của user.
- `/admin` - Dashboard admin MVP, yêu cầu role `ADMIN`.
- `/admin/users` - Quản lý user MVP, yêu cầu role `ADMIN`.
- `/admin/auctions` - Quản lý/cancel auction MVP, yêu cầu role `ADMIN`.

Route alias trong `proxy.ts`:

- `/login` -> `/auth/login`
- `/register` -> `/auth/register`
- `/auctions/create` -> `/auctions/new`

## Tính năng đã hoàn thành trong MVP

- Auth cơ bản bằng Supabase Auth.
- Đồng bộ profile local trong PostgreSQL qua Prisma.
- Role-based access cơ bản cho admin.
- Auction listing lấy dữ liệu thật từ DB.
- Auction detail lấy dữ liệu thật từ DB.
- Tạo auction thật từ form `/auctions/new`.
- Manual bid thật:
  - Validate đăng nhập.
  - Chặn seller tự bid.
  - Chặn bid thấp hơn `currentPrice + bidStep`.
  - Chặn bid khi auction không active hoặc đã hết hạn.
  - Dùng Prisma transaction và row lock để cập nhật bid/current price/winner.
- Profile MVP:
  - Thông tin user.
  - Thống kê số auction đã tạo, bid đã đặt, auction đang thắng.
- Admin MVP:
  - Dashboard cơ bản.
  - Danh sách user, khóa/mở khóa user thường.
  - Danh sách auction, cancel auction còn hợp lệ.
- Audit log cho một số hành động quan trọng.
- BigInt/Date được serialize trước khi truyền sang Client Components.
- Không dùng mock data trong business flow chính của auction listing/detail/create/bid.

## Tính năng chưa hoàn thành / giới hạn MVP

- Chưa có thanh toán, ví, ký quỹ hoặc escrow.
- Chưa phù hợp cho giao dịch tiền thật.
- Chưa có realtime bid/countdown qua websocket/realtime channel.
- Chưa triển khai auto-bid/proxy bidding hoàn chỉnh.
- Chưa có upload ảnh qua Supabase Storage; form hiện nhận URL ảnh.
- Chưa có workflow moderation/duyệt auction nâng cao.
- Chưa có notification delivery thật qua email/push.
- Chưa có rate limiting/anti-abuse production-grade.
- Chưa có monitoring, alerting, tracing, backup/restore playbook.
- Chưa có test suite tự động đầy đủ cho các luồng nghiệp vụ.

## Checklist QA thủ công khuyến nghị

Routes cần kiểm tra:

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

Luồng cần kiểm tra:

1. Login/logout.
2. Xem auction list.
3. Xem auction detail.
4. Tạo auction.
5. Đặt bid hợp lệ.
6. Bid thấp hơn minimum bị chặn.
7. Seller tự bid bị chặn.
8. Auction hết hạn không bid được.
9. Non-admin vào admin bị chặn.
10. Admin vào admin được nếu có admin account.

## Ghi chú bảo mật

- Không commit `.env` hoặc secret key.
- Không expose `SUPABASE_SERVICE_ROLE_KEY` hoặc `DATABASE_URL` sang client.
- Không log PII/secrets trong client. Server logs hiện chỉ dùng cho lỗi kỹ thuật; cần tích hợp logger có redaction trước production.
- Admin role phải luôn đọc từ DB/server, không tin dữ liệu client.
- Cần bật RLS/policy Supabase phù hợp nếu truy cập trực tiếp Supabase từ client.
- Cần thêm rate limit cho login, register, create auction và place bid trước production.
- Cần security review cho transaction bid, authorization, upload file, audit log và admin actions.
- Nếu bổ sung payment/wallet/escrow, cần kiểm tra compliance, reconciliation, fraud detection và dispute handling.