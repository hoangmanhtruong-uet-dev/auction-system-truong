# Database Schema - AutoBid.vn (Phase 2 - MVP)

## Overview

- **Database**: PostgreSQL
- **ORM**: Prisma 6.x
- **Migration Tool**: Prisma Migrate
- **Conventions**:
  - UUID as primary keys
  - snake_case for database column names (via `@map`)
  - camelCase for Prisma model fields
  - timestamps (`created_at`, `updated_at`)
  - soft deletes (`deleted_at`) for profiles, auctions, bids
  - Enums for status/type fields (not raw strings)

---

## Enums

### UserRole
| Value | Description |
|---|---|
| `USER` | Regular bidder; can manage own profile, bids, watchlist, notifications |
| `SELLER` | Seller account; includes bidder permissions plus own auction create/update/delete/cancel |
| `SUPPORT` | Support staff; read-only operational visibility for users, auctions, bids, audit logs |
| `MODERATOR` | Moderation staff; support permissions plus auction moderation and user suspend/verify |
| `FINANCE` | Finance staff; support permissions plus payment read/mark-paid |
| `ADMIN` | Operational admin; moderator + finance + role/settings management |
| `SUPER_ADMIN` | Break-glass admin; admin permissions plus permission model management |

### AuctionStatus
| Value | Description |
|---|---|
| `PENDING` | Awaiting activation |
| `ACTIVE` | Accepting bids |
| `COMPLETED` | Auction ended normally |
| `CANCELLED` | Cancelled by seller/admin |

### BidStatus
| Value | Description |
|---|---|
| `ACTIVE` | Current active bid |
| `WON` | Winning bid |
| `LOST` | Outbid by higher bid |
| `CANCELLED` | Retracted/cancelled |

### NotificationType
| Value | Description |
|---|---|
| `AUCTION_CREATED` | New auction created |
| `AUCTION_ACTIVATED` | Auction went live |
| `AUCTION_ENDING_SOON` | 5 minutes remaining |
| `AUCTION_ENDED` | Auction finished |
| `BID_PLACED` | Someone placed a bid |
| `BID_OUTBID` | User was outbid |
| `BID_WON` | User won the auction |
| `SYSTEM` | System notification |

### AuditAction
| Value | Description |
|---|---|
| `PROFILE_CREATED` | New profile registered |
| `PROFILE_UPDATED` | Profile modified |
| `AUCTION_CREATED` | New auction created |
| `AUCTION_UPDATED` | Auction modified |
| `AUCTION_ACTIVATED` | Auction activated |
| `AUCTION_CANCELLED` | Auction cancelled |
| `AUCTION_COMPLETED` | Auction completed |
| `BID_PLACED` | Bid placed |
| `BID_CANCELLED` | Bid cancelled |
| `WATCHLIST_ADDED` | Added to watchlist |
| `WATCHLIST_REMOVED` | Removed from watchlist |
| `NOTIFICATION_CREATED` | Notification sent |
| `ADMIN_ACTION` | Admin action |

---

## Table Schemas

### 1. profiles

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          user_role NOT NULL DEFAULT 'USER',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL,
  deleted_at    TIMESTAMPTZ
);
```

**Indexes**:
- `profiles_email_key` UNIQUE ON (email)
- `idx_profiles_email` ON (email)
- `idx_profiles_role` ON (role)

---

### 2. auctions

```sql
CREATE TABLE auctions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   VARCHAR(255) NOT NULL,
  description             TEXT NOT NULL,
  start_price             BIGINT NOT NULL,             -- VND
  current_price           BIGINT NOT NULL DEFAULT 0,   -- VND, updated by highest bid
  bid_step                BIGINT NOT NULL DEFAULT 10000,-- VND minimum increment
  duration_minutes        INTEGER NOT NULL DEFAULT 15, -- planned duration
  auto_extension_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  max_extensions          INTEGER NOT NULL DEFAULT 3,
  current_extension_count INTEGER NOT NULL DEFAULT 0,
  status                  auction_status NOT NULL DEFAULT 'PENDING',
  seller_id               UUID NOT NULL REFERENCES profiles(id),
  winner_id               UUID REFERENCES profiles(id),
  starts_at               TIMESTAMPTZ,                 -- when auction goes live
  ends_at                 TIMESTAMPTZ,                 -- calculated end time
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMPTZ NOT NULL,
  deleted_at              TIMESTAMPTZ
);
```

**Indexes**:
- `idx_auctions_status_ends_at` ON (status, ends_at)
- `idx_auctions_seller_id_status` ON (seller_id, status)
- `idx_auctions_winner_id` ON (winner_id)

**Foreign Keys**:
- `seller_id` → `profiles(id)` ON DELETE RESTRICT
- `winner_id` → `profiles(id)` ON DELETE SET NULL

---

### 3. auction_images

```sql
CREATE TABLE auction_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_auction_images_auction_id_sort_order` ON (auction_id, sort_order)

---

### 4. bids

```sql
CREATE TABLE bids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id        UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id         UUID NOT NULL REFERENCES profiles(id),
  amount            BIGINT NOT NULL,              -- VND bid amount
  is_auto_bid       BOOLEAN NOT NULL DEFAULT FALSE,
  auto_bid_max_price BIGINT,                      -- max price for auto-bid
  status            bid_status NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL,
  deleted_at        TIMESTAMPTZ
);
```

**Indexes**:
- `idx_bids_auction_id_amount` ON (auction_id, amount)
- `idx_bids_bidder_id_created_at` ON (bidder_id, created_at)
- `idx_bids_status` ON (status)

**Foreign Keys**:
- `auction_id` → `auctions(id)` ON DELETE CASCADE
- `bidder_id` → `profiles(id)` ON DELETE RESTRICT

---

### 5. watchlist

```sql
CREATE TABLE watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, auction_id)
);
```

**Indexes**:
- `uq_watchlist_profile_id_auction_id` UNIQUE ON (profile_id, auction_id)
- `idx_watchlist_auction_id` ON (auction_id)

---

### 6. notifications

```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  metadata   JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_notifications_profile_id_read_at_created_at` ON (profile_id, read_at, created_at)
- `idx_notifications_auction_id` ON (auction_id)
- `idx_notifications_type` ON (type)

---

### 7. audit_logs

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        audit_action NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   UUID NOT NULL,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_audit_logs_profile_id` ON (profile_id)
- `idx_audit_logs_resource_type_resource_id` ON (resource_type, resource_id)
- `idx_audit_logs_created_at` ON (created_at)
- `idx_audit_logs_action` ON (action)

---

## Relationships Diagram

```
profiles (1) ----< (N) auctions (as seller)
profiles (1) ----< (N) auctions (as winner, optional)
profiles (1) ----< (N) bids (as bidder)
profiles (1) ----< (N) watchlist
profiles (1) ----< (N) notifications
profiles (1) ----< (N) audit_logs (optional)
auctions (1) ----< (N) auction_images
auctions (1) ----< (N) bids
auctions (1) ----< (N) watchlist
auctions (1) ----< (N) notifications
```

---

## Migration Strategy (Local)

```bash
# Create new migration
npx prisma migrate dev --name <migration_name>

# Apply migration
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed demo data
npx prisma db seed
```

---

## Migration History

| # | Name | Date | Description |
|---|---|---|---|
| 1 | `phase_2_database_schema` | 2026-07-01 | Initial MVP schema: enums, profiles, auctions, auction_images, bids, watchlist, notifications, audit_logs |

---

## Commands for Testing

```bash
# Regenerate Prisma Client (after schema changes)
npx prisma generate

# Create migration
npx prisma migrate dev --name <name>

# Apply pending migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Check migration status
npx prisma migrate status

# Open Prisma Studio (GUI)
npx prisma studio
```

---

## Data Type Notes

- **BigInt**: Used for prices (VND), avoids FLOAT precision issues
- **JSONB**: Used for metadata (notifications), old_values/new_values (audit_logs)
- **UUID**: Primary keys for all tables, generated via `gen_random_uuid()`
- **TIMESTAMPTZ**: Always store UTC timestamps
- **INET**: PostgreSQL native IP address type for audit logs
