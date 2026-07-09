// @ts-check
import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure-unit tests for RBAC logic.
 * These test the permission/rank rules in isolation — no DB, no HTTP.
 * If a real DB-based integration test suite is added later, these remain
 * as the fast unit layer.
 *
 * Run: node --test src/__tests__/rbac.test.mjs
 * (Or: npm run test  once "test" script is added to package.json)
 */

// Inline the minimal RBAC types/logic so these tests don't import TS files.
// The truth lives in rbac.ts — this file tests the same rules expressed in JS.
// When rbac.ts changes, sync the rules below (or convert this file to TS + tsx).

/** @type {Readonly<Record<string, number>>} */
const ROLE_RANK = Object.freeze({
  USER: 10,
  SELLER: 20,
  SUPPORT: 30,
  MODERATOR: 40,
  FINANCE: 40,
  ADMIN: 80,
  SUPER_ADMIN: 100,
});

/** @type {Readonly<Record<string, readonly string[]>>} */
const ROLE_PERMISSIONS = Object.freeze({
  USER: Object.freeze([
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.create", "bids.read.own",
    "bids.read.auction", "watchlist.manage.self", "notifications.read.self",
    "notifications.manage.self",
  ]),
  SELLER: Object.freeze([
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.create", "bids.read.own",
    "bids.read.auction", "watchlist.manage.self", "notifications.read.self",
    "notifications.manage.self",
    "auctions.create", "auctions.update.own", "auctions.delete.own",
    "auctions.cancel.own",
  ]),
  SUPPORT: Object.freeze([
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.read.auction",
    "auctions.read.all", "bids.read.all", "users.read.all",
    "audit_logs.read",
  ]),
  MODERATOR: Object.freeze([
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.read.auction",
    "auctions.read.all", "bids.read.all", "users.read.all",
    "audit_logs.read",
    "auctions.update.any", "auctions.cancel.any", "auctions.delete.any",
    "auctions.finalize", "users.suspend", "users.verify",
  ]),
  FINANCE: Object.freeze([
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.read.auction",
    "auctions.read.all", "bids.read.all", "users.read.all",
    "audit_logs.read",
    "payments.read.all", "payments.mark_paid",
  ]),
  ADMIN: Object.freeze([
    "admin.area.access",
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.create", "bids.read.own",
    "bids.read.auction", "watchlist.manage.self", "notifications.read.self",
    "notifications.manage.self",
    "auctions.read.all", "bids.read.all", "users.read.all",
    "audit_logs.read",
    "auctions.update.any", "auctions.cancel.any", "auctions.delete.any",
    "auctions.finalize", "users.suspend", "users.verify",
    "payments.read.all", "payments.mark_paid",
    "users.update.role", "settings.read", "settings.update",
  ]),
  SUPER_ADMIN: Object.freeze([
    "admin.area.access",
    "profile.read.self", "profile.update.self", "auctions.read.public",
    "auctions.read.detail", "bids.create", "bids.read.own",
    "bids.read.auction", "watchlist.manage.self", "notifications.read.self",
    "notifications.manage.self",
    "auctions.read.all", "bids.read.all", "users.read.all",
    "audit_logs.read",
    "auctions.update.any", "auctions.cancel.any", "auctions.delete.any",
    "auctions.finalize", "users.suspend", "users.verify",
    "payments.read.all", "payments.mark_paid",
    "users.update.role", "settings.read", "settings.update",
    "permissions.manage",
  ]),
});

/**
 * @param {string | null | undefined} role
 * @param {string} permission
 */
function hasPermission(role, permission) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RBAC — admin.area.access", () => {
  it("ADMIN has admin.area.access", () => {
    assert.ok(hasPermission("ADMIN", "admin.area.access"));
  });
  it("SUPER_ADMIN has admin.area.access", () => {
    assert.ok(hasPermission("SUPER_ADMIN", "admin.area.access"));
  });
  it("USER does NOT have admin.area.access", () => {
    assert.equal(hasPermission("USER", "admin.area.access"), false);
  });
  it("SELLER does NOT have admin.area.access", () => {
    assert.equal(hasPermission("SELLER", "admin.area.access"), false);
  });
  it("SUPPORT does NOT have admin.area.access", () => {
    assert.equal(hasPermission("SUPPORT", "admin.area.access"), false);
  });
  it("MODERATOR does NOT have admin.area.access", () => {
    assert.equal(hasPermission("MODERATOR", "admin.area.access"), false);
  });
  it("FINANCE does NOT have admin.area.access", () => {
    assert.equal(hasPermission("FINANCE", "admin.area.access"), false);
  });
  it("null/falsy user does NOT have admin.area.access", () => {
    assert.equal(hasPermission(null, "admin.area.access"), false);
    assert.equal(hasPermission(undefined, "admin.area.access"), false);
  });
});

describe("RBAC — SUPPORT/MODERATOR/FINANCE have domain permissions, NOT admin shell, CANNOT bid", () => {
  it("SUPPORT has users.read.all but not admin.area.access or bids.create", () => {
    assert.ok(hasPermission("SUPPORT", "users.read.all"));
    assert.ok(hasPermission("SUPPORT", "auctions.read.all"));
    assert.ok(hasPermission("SUPPORT", "audit_logs.read"));
    assert.equal(hasPermission("SUPPORT", "admin.area.access"), false);
    assert.equal(hasPermission("SUPPORT", "bids.create"), false);
  });
  it("MODERATOR has auctions.cancel.any but not admin.area.access or bids.create", () => {
    assert.ok(hasPermission("MODERATOR", "auctions.cancel.any"));
    assert.equal(hasPermission("MODERATOR", "admin.area.access"), false);
    assert.equal(hasPermission("MODERATOR", "bids.create"), false);
  });
  it("FINANCE has payments.read.all but not admin.area.access or bids.create", () => {
    assert.ok(hasPermission("FINANCE", "payments.read.all"));
    assert.equal(hasPermission("FINANCE", "admin.area.access"), false);
    assert.equal(hasPermission("FINANCE", "bids.create"), false);
  });
  it("MODERATOR and FINANCE can view bids but not create them", () => {
    assert.ok(hasPermission("MODERATOR", "bids.read.auction"));
    assert.ok(hasPermission("FINANCE", "bids.read.auction"));
    assert.equal(hasPermission("MODERATOR", "bids.create"), false);
    assert.equal(hasPermission("FINANCE", "bids.create"), false);
  });
});

describe("RBAC — action permissions still assigned correctly", () => {
  it("ADMIN has users.update.role", () => {
    assert.ok(hasPermission("ADMIN", "users.update.role"));
  });
  it("ADMIN has settings.update", () => {
    assert.ok(hasPermission("ADMIN", "settings.update"));
  });
  it("SUPER_ADMIN has permissions.manage", () => {
    assert.ok(hasPermission("SUPER_ADMIN", "permissions.manage"));
  });
  it("MODERATOR can cancel any auction", () => {
    assert.ok(hasPermission("MODERATOR", "auctions.cancel.any"));
  });
  it("FINANCE can mark payment", () => {
    assert.ok(hasPermission("FINANCE", "payments.mark_paid"));
  });
  it("USER cannot read users.all", () => {
    assert.equal(hasPermission("USER", "users.read.all"), false);
  });
});

describe("RBAC — ROLE_RANK peer-order rules", () => {
  it("MODERATOR and FINANCE have same rank (40)", () => {
    assert.equal(ROLE_RANK["MODERATOR"], ROLE_RANK["FINANCE"]);
    assert.equal(ROLE_RANK["MODERATOR"], 40);
  });
  it("ADMIN rank (80) > FINANCE rank (40)", () => {
    assert.ok(ROLE_RANK["ADMIN"] > ROLE_RANK["FINANCE"]);
  });
  it("SUPER_ADMIN rank (100) > ADMIN rank (80)", () => {
    assert.ok(ROLE_RANK["SUPER_ADMIN"] > ROLE_RANK["ADMIN"]);
  });
  it("USER rank (10) < SUPPORT rank (30)", () => {
    assert.ok(ROLE_RANK["USER"] < ROLE_RANK["SUPPORT"]);
  });
});