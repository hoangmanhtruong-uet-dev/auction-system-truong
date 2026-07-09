import type { UserRole } from "@prisma/client";

export const PERMISSIONS = [
  "admin.area.access",
  "profile.read.self",
  "profile.update.self",
  "auctions.read.public",
  "auctions.read.detail",
  "auctions.create",
  "auctions.update.own",
  "auctions.delete.own",
  "auctions.cancel.own",
  "auctions.read.all",
  "auctions.update.any",
  "auctions.cancel.any",
  "auctions.delete.any",
  "auctions.finalize",
  "bids.create",
  "bids.read.own",
  "bids.read.auction",
  "bids.read.all",
  "watchlist.manage.self",
  "notifications.read.self",
  "notifications.manage.self",
  "users.read.all",
  "users.update.role",
  "users.suspend",
  "users.verify",
  "payments.read.all",
  "payments.mark_paid",
  "audit_logs.read",
  "settings.read",
  "settings.update",
  "permissions.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Bidding is a separate concern — staff roles (SUPPORT, MODERATOR, FINANCE)
// can view auction data but must not participate as bidders.
const USER_BIDDING_PERMISSIONS = [
  "bids.create",
  "bids.read.own",
  "bids.read.auction",
] as const satisfies readonly Permission[];

const USER_PERMISSIONS = [
  "profile.read.self",
  "profile.update.self",
  "auctions.read.public",
  "auctions.read.detail",
  ...USER_BIDDING_PERMISSIONS,
  "watchlist.manage.self",
  "notifications.read.self",
  "notifications.manage.self",
] as const satisfies readonly Permission[];

const SELLER_PERMISSIONS = [
  ...USER_PERMISSIONS,
  "auctions.create",
  "auctions.update.own",
  "auctions.delete.own",
  "auctions.cancel.own",
] as const satisfies readonly Permission[];

const STAFF_VIEW_PERMISSIONS = [
  "auctions.read.public",
  "auctions.read.detail",
  "bids.read.auction",
] as const satisfies readonly Permission[];

const SUPPORT_PERMISSIONS = [
  // Staff cannot bid — explicit whitelist without bids.create
  "profile.read.self",
  "profile.update.self",
  ...STAFF_VIEW_PERMISSIONS,
  "auctions.read.all",
  "bids.read.all",
  "users.read.all",
  "audit_logs.read",
] as const satisfies readonly Permission[];

const MODERATOR_PERMISSIONS = [
  ...SUPPORT_PERMISSIONS,
  "auctions.update.any",
  "auctions.cancel.any",
  "auctions.delete.any",
  "auctions.finalize",
  "users.suspend",
  "users.verify",
] as const satisfies readonly Permission[];

const FINANCE_PERMISSIONS = [
  ...SUPPORT_PERMISSIONS,
  "payments.read.all",
  "payments.mark_paid",
] as const satisfies readonly Permission[];

// ADMIN intentionally combines moderation and finance operations.
// SUPER_ADMIN is reserved for permission model changes and recovery.
// Only ADMIN and SUPER_ADMIN get admin.area.access — guards the /admin shell.
// Other internal roles (SUPPORT, MODERATOR, FINANCE) have specific read/write
// permissions for their domain but cannot enter the admin UI.
const ADMIN_PERMISSIONS = [
  "admin.area.access",
  ...MODERATOR_PERMISSIONS,
  ...FINANCE_PERMISSIONS,
  "users.update.role",
  "settings.read",
  "settings.update",
] as const satisfies readonly Permission[];

const SUPER_ADMIN_PERMISSIONS = [
  "admin.area.access",
  ...ADMIN_PERMISSIONS,
  "permissions.manage",
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  USER: USER_PERMISSIONS,
  SELLER: SELLER_PERMISSIONS,
  SUPPORT: SUPPORT_PERMISSIONS,
  MODERATOR: MODERATOR_PERMISSIONS,
  FINANCE: FINANCE_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
};

// MODERATOR and FINANCE share rank 40 intentionally — they are peer roles
// with different domain scopes (moderation vs finance). Neither can modify
// the other's role; ADMIN (80) can change either. SUPER_ADMIN (100) can
// change all.
export const ROLE_RANK: Record<UserRole, number> = {
  USER: 10,
  SELLER: 20,
  SUPPORT: 30,
  MODERATOR: 40,
  FINANCE: 40,
  ADMIN: 80,
  SUPER_ADMIN: 100,
};

export function hasPermission(user: { role: UserRole } | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function hasAnyPermission(user: { role: UserRole } | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
