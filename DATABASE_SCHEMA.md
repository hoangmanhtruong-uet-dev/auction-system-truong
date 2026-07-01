# Database Schema - AutoBid.vn

## Overview

- **Database**: PostgreSQL
- **ORM**: Prisma
- **Conventions**: 
  - UUID as primary keys
  - camelCase for column names
  - timestamps (createdAt, updatedAt)
  - soft deletes (deletedAt) khi cần

---

## Table Schemas

### 1. users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user', 'seller', 'admin'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_users_email` ON (email)
- `idx_users_role` ON (role)

---

### 2. verification_codes

```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'verify_email', -- 'verify_email'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_verification_codes_user_id` ON (user_id)
- `idx_verification_codes_code` ON (code)

---

### 3. auctions

```sql
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]', -- Array of image URLs (max 5)
  start_price BIGINT NOT NULL, -- VND, minimum value: 1000
  current_price BIGINT NOT NULL DEFAULT 0,
  bid_step BIGINT NOT NULL DEFAULT 10000, -- VND
  duration INTEGER NOT NULL DEFAULT 15, -- minutes
  auto_extension_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_extensions INTEGER NOT NULL DEFAULT 3,
  current_extension_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled'
  seller_id UUID NOT NULL REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_auctions_status` ON (status)
- `idx_auctions_ends_at` ON (ends_at)
- `idx_auctions_seller_id` ON (seller_id)
- `idx_auctions_winner_id` ON (winner_id)

**Triggers**:
- `set_auctions_ends_at`: Tự động tính `ends_at` khi `duration` hoặc `status` thay đổi

---

### 4. bids

```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  bid_price BIGINT NOT NULL, -- VND
  is_auto_bid BOOLEAN NOT NULL DEFAULT FALSE,
  auto_bid_max_price BIGINT, -- VND, null nếu không phải auto-bid
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'won', 'lost', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_bids_auction_id` ON (auction_id)
- `idx_bids_user_id` ON (user_id)
- `idx_bids_status` ON (status)
- `idx_bids_bid_price` ON (bid_price)

**Triggers**:
- `set_bids_user_id`: Không cho phép seller đặt giá cho chính mình

---

### 5. audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'bid_placed', 'auction_created', 'auction_ended', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'auction', 'bid', 'user'
  resource_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_audit_logs_user_id` ON (user_id)
- `idx_audit_logs_resource_id` ON (resource_id)
- `idx_audit_logs_created_at` ON (created_at)

---

## Relationships

```
users (1) ----< (N) verification_codes
users (1) ----< (N) auctions (as seller)
users (1) ----< (N) bids
auctions (1) ----< (N) bids
users (1) ----< (N) auctions (as winner, optional)
users (1) ----< (N) audit_logs (optional)
```

---

## Prisma Schema (schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  passwordHash  String
  fullName      String
  phone         String?
  role          String    @default("user") // user, seller, admin
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  verificationCodes VerificationCode[]
  auctionsAsSeller  Auction[]
  bids              Bid[]
  auctionsAsWinner  Auction?

  @@map("users")
}

model VerificationCode {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  code      String
  type      String   @default("verify_email")
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("verification_codes")
}

model Auction {
  id                      String    @id @default(uuid())
  title                   String
  description             String
  images                  Json      @default([])
  startPrice              BigInt
  currentPrice            BigInt    @default(0)
  bidStep                 BigInt    @default(10000)
  duration                Int       @default(15)
  autoExtensionEnabled    Boolean   @default(true)
  maxExtensions           Int       @default(3)
  currentExtensionCount   Int       @default(0)
  status                  String    @default("pending") // pending, active, completed, cancelled
  sellerId                String
  winnerId                String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  endsAt                  DateTime?
  deletedAt               DateTime?

  seller        User        @relation(fields: [sellerId], references: [id])
  winner        User?       @relation(fields: [winnerId], references: [id])
  bids          Bid[]

  @@map("auctions")
}

model Bid {
  id               String   @id @default(uuid())
  auction          Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)
  auctionId        String
  user             User     @relation(fields: [userId], references: [id])
  userId           String
  bidPrice         BigInt
  isAutoBid        Boolean  @default(false)
  autoBidMaxPrice  BigInt?
  status           String   @default("active") // active, won, lost, cancelled
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  @@map("bids")
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String
  resourceType String
  resourceId  String
  oldValues   Json?
  newValues   Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@map("audit_logs")
}
```

---

## Migration Strategy

1. **Initial migration**: `npx prisma migrate dev --name init`
2. **Add new columns**: `npx prisma migrate dev --name add-column-X`
3. **Production**: `npx prisma migrate deploy`
4. **Rollback**: `npx prisma migrate reset --skip-generate`

---

## Data Type Notes

- **BigInt**: Dùng cho prices (VND), tránh lỗi precision của FLOAT
- **JSONB**: Dùng cho images, oldValues, newValues (audit logs)
- **UUID**: Dùng cho primary keys, đảm bảo uniqueness
- **Timestamp with time zone**: Luôn dùng để lưu thời gian (UTC)