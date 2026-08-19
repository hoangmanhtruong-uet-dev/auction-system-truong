export const LOGIN_FAILURE_LIMIT = 5;
export const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

export function shouldLockAccount(failedLoginCount: number) {
  return failedLoginCount >= LOGIN_FAILURE_LIMIT;
}

export function isAccountLocked(lockedUntil: Date | null, now = new Date()) {
  return Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());
}

export function isSessionFresh(lastSeenAt: Date, expiresAt: Date, now: Date, idleTimeoutMs: number) {
  return expiresAt.getTime() > now.getTime() && lastSeenAt.getTime() > now.getTime() - idleTimeoutMs;
}
