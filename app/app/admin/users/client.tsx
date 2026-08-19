"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import { createStaffAccount } from "@/src/actions/admin-users";

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
  lastLoginAt: string | null;
  mustChangePassword: boolean;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"SUPPORT" | "MODERATOR" | "FINANCE" | "ADMIN">("SUPPORT");
  const [createReason, setCreateReason] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

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
      <Button type="button" className="w-fit" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create staff account</Button>

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
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name / email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Auctions</th>
                <th className="px-4 py-3 text-right font-medium">Bids</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last login</th>
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
                  <td className="px-4 py-3 text-neutral-500">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</td>
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
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setTemporaryPassword(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{temporaryPassword ? "Temporary password" : "Create staff account"}</DialogTitle>
            <DialogDescription>
              {temporaryPassword ? "Copy this password now. It is displayed once and must be changed at first login." : "Create a least-privilege internal account. The action is audited."}
            </DialogDescription>
          </DialogHeader>
          {temporaryPassword ? (
            <code className="break-all rounded-md bg-muted p-3 text-sm">{temporaryPassword}</code>
          ) : (
            <div className="space-y-3">
              <div><Label htmlFor="staff-name">Full name</Label><Input id="staff-name" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={100} /></div>
              <div><Label htmlFor="staff-email">Email</Label><Input id="staff-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} maxLength={255} /></div>
              <div><Label htmlFor="staff-role">Role</Label><select id="staff-role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newRole} onChange={(event) => setNewRole(event.target.value as typeof newRole)}>{["SUPPORT", "MODERATOR", "FINANCE", "ADMIN"].map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><Label htmlFor="staff-reason">Reason</Label><Textarea id="staff-reason" value={createReason} onChange={(event) => setCreateReason(event.target.value)} maxLength={500} /></div>
            </div>
          )}
          <DialogFooter>
            {temporaryPassword ? <Button type="button" onClick={() => setCreateOpen(false)}>Done</Button> : <Button type="button" disabled={createPending || !newEmail || newName.trim().length < 2 || createReason.trim().length < 5} onClick={async () => {
              setCreatePending(true);
              try {
                const result = await createStaffAccount({ email: newEmail, fullName: newName, role: newRole }, createReason);
                setUsers((current) => [{ ...result.user, createdAt: result.user.createdAt.toISOString(), updatedAt: result.user.updatedAt.toISOString(), deletedAt: null, lastLoginAt: null }, ...current]);
                setTemporaryPassword(result.temporaryPassword);
                setNewEmail(""); setNewName(""); setCreateReason("");
              } finally { setCreatePending(false); }
            }}>{createPending ? "Creating..." : "Create account"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
