"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

import { AdminDataTable, TableEmptyState } from "../_components/admin-data-table";
import { StatusBadge } from "../_components/status-badge";
import { UserActions } from "../_components/user-actions";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "SELLER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count: {
    auctionsAsSeller: number;
    bids: number;
  };
};

export function AdminUsersClient({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: AdminUser[];
  currentAdminId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | AdminUser["role"]>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole = role === "all" || user.role === role;
      return matchesSearch && matchesRole;
    });
  }, [role, search, users]);

  function handleUserChanged(id: string, patch: { deletedAt: string | null }) {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Users</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Quản lý người dùng</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Theo dõi vai trò, số auction, số bid và trạng thái tài khoản dựa trên schema hiện tại.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Tìm tên hoặc email..." />
        </div>
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value as "all" | AdminUser["role"])}>
          <option value="all">Tất cả role</option>
          <option value="USER">USER</option>
          <option value="SELLER">SELLER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      <AdminDataTable>
        {filtered.length === 0 ? (
          <TableEmptyState title="Không có user phù hợp" description="Thử đổi bộ lọc hoặc kiểm tra dữ liệu người dùng." />
        ) : (
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name / email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Auctions</th>
                <th className="px-4 py-3 text-right font-medium">Bids</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge type="role" value={user.role} /></td>
                  <td className="px-4 py-3 text-right">{user._count.auctionsAsSeller}</td>
                  <td className="px-4 py-3 text-right">{user._count.bids}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(user.createdAt)}</td>
                  <td className="px-4 py-3"><StatusBadge type="user" value={user.deletedAt} /></td>
                  <td className="px-4 py-3">
                    <UserActions user={user} currentAdminId={currentAdminId} onChanged={handleUserChanged} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>
    </div>
  );
}
