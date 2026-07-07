import { getAdminUsers } from "@/src/actions/admin-users";
import { requireAdmin } from "@/src/lib/auth";
import { AdminUsersClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const { users } = await getAdminUsers({ take: 50 });

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    deletedAt: u.deletedAt?.toISOString() ?? null,
  }));

  return <AdminUsersClient initialUsers={serializedUsers} currentAdminId={admin.id} />;
}
