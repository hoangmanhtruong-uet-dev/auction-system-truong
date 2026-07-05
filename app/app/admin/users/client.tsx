"use client";

import { useCallback, useState } from "react";
import { Ban, CheckCircle2, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "SELLER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  USER: "Người dùng",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
};

const ROLE_COLOR: Record<string, string> = {
  USER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  SELLER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ADMIN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminUsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dialogUserId, setDialogUserId] = useState<string | null>(null);
  const [dialogCurrentBlocked, setDialogCurrentBlocked] = useState(false);
  const [dialogReason, setDialogReason] = useState("");
  const [dialogError, setDialogError] = useState("");

  const openBlockDialog = useCallback((userId: string, currentBlocked: boolean) => {
    setDialogUserId(userId);
    setDialogCurrentBlocked(currentBlocked);
    setDialogReason("");
    setDialogError("");
  }, []);

  const handleToggleBlock = useCallback(async () => {
    if (!dialogUserId) return;
    if (dialogReason.trim().length < 5) {
      setDialogError("Lý do phải có ít nhất 5 ký tự.");
      return;
    }

    setLoadingId(dialogUserId);
    setDialogUserId(null);
    try {
      const { toggleUserBlock } = await import("@/src/actions/admin-users");
      const result = await toggleUserBlock(dialogUserId, !dialogCurrentBlocked, dialogReason);
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === dialogUserId
              ? {
                  ...u,
                  deletedAt: result.user.deletedAt ? result.user.deletedAt.toISOString() : null,
                }
              : u
          )
        );
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setLoadingId(null);
    }
  }, [dialogUserId, dialogCurrentBlocked, dialogReason]);

  if (users.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Xem và quản lý tất cả người dùng trong hệ thống.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có người dùng nào trong hệ thống.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Xem và quản lý tất cả người dùng trong hệ thống.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tất cả người dùng</CardTitle>
          <CardDescription>
            Hiển thị {users.length} người dùng. Trạng thái <span className="font-medium text-yellow-600 dark:text-yellow-400">Bị khóa</span> được xác định qua trường deletedAt.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên hiển thị</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vai trò</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 max-w-[200px] truncate font-medium">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{user.fullName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          ROLE_COLOR[user.role] || ROLE_COLOR.USER
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.deletedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          <Ban className="h-3 w-3" />
                          Bị khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant={user.deletedAt ? "outline" : "destructive"}
                        size="xs"
                        disabled={loadingId === user.id || user.role === "ADMIN"}
                        title={
                          user.role === "ADMIN"
                            ? "Không thể khóa quản trị viên"
                            : user.deletedAt
                            ? "Mở khóa người dùng"
                            : "Khóa người dùng"
                        }
                        onClick={() => openBlockDialog(user.id, !!user.deletedAt)}
                      >
                        {loadingId === user.id
                          ? "..."
                          : user.deletedAt
                          ? "Mở khóa"
                          : "Khóa"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogUserId !== null} onOpenChange={(open) => { if (!open) setDialogUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogCurrentBlocked ? "Mở khóa người dùng" : "Khóa người dùng"}
            </DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do cho thao tác quản trị này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reason">Lý do</Label>
            <Textarea
              id="reason"
              value={dialogReason}
              onChange={(e) => { setDialogReason(e.target.value); setDialogError(""); }}
              placeholder="Nhập lý do thao tác (ít nhất 5 ký tự)..."
              rows={3}
            />
            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogUserId(null)}>
              Hủy
            </Button>
            <Button
              variant={dialogCurrentBlocked ? "outline" : "destructive"}
              onClick={handleToggleBlock}
              disabled={loadingId === dialogUserId}
            >
              {loadingId === dialogUserId ? "..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}