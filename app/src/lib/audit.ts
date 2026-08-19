import { prisma } from "@/src/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";

const SENSITIVE_KEY = /password|secret|token|cookie|authorization|api[-_]?key|cvv|card/i;

function sanitizeAuditValue(value: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitizeAuditValue(item as Prisma.InputJsonValue),
      ]),
    );
  }
  return typeof value === "string" && value.length > 2000 ? `${value.slice(0, 2000)}...[TRUNCATED]` : value;
}

export async function createAuditLog({
  profileId,
  action,
  resourceType,
  resourceId,
  oldValues,
  newValues,
}: {
  profileId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        profileId,
        action,
        resourceType,
        resourceId,
        ...(oldValues !== undefined ? { oldValues: sanitizeAuditValue(oldValues) } : {}),
        ...(newValues !== undefined ? { newValues: sanitizeAuditValue(newValues) } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log", error instanceof Error ? error.name : "unknown");
  }
}

/**
 * Create audit log for admin actions with IP/user agent if available.
 */
export async function createAdminAuditLog({
  profileId,
  action,
  resourceType,
  resourceId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: {
  profileId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        profileId,
        action,
        resourceType,
        resourceId,
        ...(oldValues !== undefined ? { oldValues: sanitizeAuditValue(oldValues) } : {}),
        ...(newValues !== undefined ? { newValues: sanitizeAuditValue(newValues) } : {}),
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to create admin audit log", error instanceof Error ? error.name : "unknown");
  }
}
