import { prisma } from "@/src/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";

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
        ...(oldValues !== undefined ? { oldValues } : {}),
        ...(newValues !== undefined ? { newValues } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
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
        ...(oldValues !== undefined ? { oldValues } : {}),
        ...(newValues !== undefined ? { newValues } : {}),
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to create admin audit log:", error);
  }
}