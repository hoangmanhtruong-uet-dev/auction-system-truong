"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

import { AdminDataTable, TableEmptyState } from "../_components/admin-data-table";
import { StatusBadge } from "../_components/status-badge";
import { UserActions } from "../_components/user-actions";

type AdminRole = "USER" | "SELLER" | "SUPPORT" | "MODERATOR" | "FINANCE" | "ADMIN" | "SUPER_ADMIN";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count: {
    auctionsAsSeller: number;
    bids: number;
  };
};

const ROLE_OPTIONS: AdminRole[] = ["USER", "SELLER", "SUPPORT", "MODERATOR", "FINANCE", "ADMIN", "SUPER_ADMIN"];

export function AdminUsersClient({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: AdminUser[];
  currentAdminId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | AdminRole>("all");

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

  function handleUserChanged(id: string, patch: { deletedAt?: string | null; role?: AdminRole }) {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-amber-400">Users</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Quan ly nguoi dung</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Quan ly role RBAC, so auction, so bid va trang thai tai khoan. Doi role va block user deu ghi audit log.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 shadow-xl backdrop-blur-xl md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border-white/10 bg-black/20 pl-9 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20"
            placeholder="Tim ten hoac email..."
          />
        </div>
        <select
          className="h-9 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-neutral-300 focus:border-amber-500/50 focus:ring-amber-500/20"
          value={role}
          onChange={(event) => setRole(event.target.value as "all" | AdminRole)}
        >
          <option value="all" className="bg-neutral-800">Tat ca role</option>
          {ROLE_OPTIONS.map((item) => (
            <option key={item} value={item} className="bg-neutral-800">{item}</option>
          ))}
        </select>
      </div>

      <AdminDataTable>
        {filtered.length === 0 ? (
          <TableEmptyState title="Khong co user phu hop" description="Thu doi bo loc hoac kiem tra du lieu nguoi dung." />
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-neutral-500">
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
            <tbody className="divide-y divide-white/10 text-neutral-300">
              {filtered.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{user.fullName}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge type="role" value={user.role} /></td>
                  <td className="px-4 py-3 text-right">{user._count.auctionsAsSeller}</td>
                  <td className="px-4 py-3 text-right">{user._count.bids}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDateTime(user.createdAt)}</td>
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
