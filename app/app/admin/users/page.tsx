import { getAdminUsers } from "@/src/actions/admin-users";
import { requirePagePermission } from "@/src/lib/authorization";
import { AdminUsersClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requirePagePermission("users.read.all");
  const { users } = await getAdminUsers({ take: 50 });

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    deletedAt: u.deletedAt?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));

  return <AdminUsersClient initialUsers={serializedUsers} currentAdminId={admin.id} />;
}
