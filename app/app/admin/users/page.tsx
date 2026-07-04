import { getAdminUsers } from "@/src/actions/admin-users";
import { AdminUsersClient } from "./client";

export default async function AdminUsersPage() {
  const { users } = await getAdminUsers({ take: 50 });

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    deletedAt: u.deletedAt?.toISOString() ?? null,
  }));

  return <AdminUsersClient initialUsers={serializedUsers} />;
}
