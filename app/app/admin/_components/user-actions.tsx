"use client";

import type { UserRole } from "@prisma/client";
import { Ban, Eye, KeyRound, RotateCcw, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resetStaffPassword, toggleUserBlock, updateUserRole } from "@/src/actions/admin-users";

import { ConfirmActionDialog } from "./confirm-action-dialog";

const ROLE_OPTIONS: UserRole[] = ["USER", "SELLER", "SUPPORT", "MODERATOR", "FINANCE", "ADMIN", "SUPER_ADMIN"];

export function UserActions({
  user,
  currentAdminId,
  onChanged,
}: {
  user: { id: string; role: UserRole; deletedAt: string | null };
  currentAdminId: string;
  onChanged: (id: string, patch: { deletedAt?: string | null; role?: UserRole }) => void;
}) {
  const [dialog, setDialog] = useState<"block" | "unblock" | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [nextRole, setNextRole] = useState<UserRole>(user.role);
  const [roleReason, setRoleReason] = useState("");
  const [rolePending, setRolePending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const isSelf = user.id === currentAdminId;
  const canToggleBlock = user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !isSelf;
  const isBlocked = Boolean(user.deletedAt);

  async function submitRoleChange() {
    setRolePending(true);
    try {
      const result = await updateUserRole(user.id, nextRole, roleReason);
      onChanged(user.id, { role: result.user.role });
      setRoleDialogOpen(false);
      setRoleReason("");
    } finally {
      setRolePending(false);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Xem user">
            <Eye className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Chi tiet dang hien thi truc tiep tren bang</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button type="button" variant="ghost" size="icon-sm" disabled={isSelf} aria-label="Reset password" onClick={() => setResetDialogOpen(true)}>
              <KeyRound className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Reset password and revoke all sessions</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isSelf}
              aria-label="Doi role user"
              onClick={() => {
                setNextRole(user.role);
                setRoleDialogOpen(true);
              }}
            >
              <ShieldAlert className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{isSelf ? "Khong tu doi role cua chinh minh" : "Doi role co audit log"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant={isBlocked ? "outline" : "destructive"}
              size="icon-sm"
              disabled={!canToggleBlock}
              aria-label={isBlocked ? "Mo khoa user" : "Khoa user"}
              onClick={() => setDialog(isBlocked ? "unblock" : "block")}
            >
              {isBlocked ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSelf
            ? "Khong tu thao tac tren chinh minh"
            : user.role === "ADMIN" || user.role === "SUPER_ADMIN"
              ? "Khong khoa admin bang action nay"
              : isBlocked
                ? "Mo khoa user"
                : "Khoa user"}
        </TooltipContent>
      </Tooltip>
      <ConfirmActionDialog
        open={dialog !== null}
        onOpenChange={(open) => setDialog(open ? dialog : null)}
        title={dialog === "unblock" ? "Mo khoa nguoi dung" : "Khoa nguoi dung"}
        description="Thao tac su dung truong deletedAt hien co va se ghi audit log kem ly do."
        confirmLabel="Xac nhan"
        variant={dialog === "block" ? "destructive" : "default"}
        requireReason
        onConfirm={async (reason) => {
          const result = await toggleUserBlock(user.id, dialog === "block", reason);
          onChanged(user.id, { deletedAt: result.user.deletedAt ? result.user.deletedAt.toISOString() : null });
        }}
      />
      <ConfirmActionDialog
        open={resetDialogOpen && !temporaryPassword}
        onOpenChange={setResetDialogOpen}
        title="Reset staff password"
        description="All existing sessions will be revoked. The temporary password is displayed once."
        confirmLabel="Reset password"
        requireReason
        onConfirm={async (reason) => {
          const result = await resetStaffPassword(user.id, reason ?? "");
          setTemporaryPassword(result.temporaryPassword);
        }}
      />
      <Dialog open={Boolean(temporaryPassword)} onOpenChange={(open) => { if (!open) { setTemporaryPassword(null); setResetDialogOpen(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>Copy it now. It is not stored or shown again, and the user must change it at next login.</DialogDescription>
          </DialogHeader>
          <code className="break-all rounded-md bg-muted p-3 text-sm">{temporaryPassword}</code>
          <DialogFooter><Button type="button" onClick={() => { setTemporaryPassword(null); setResetDialogOpen(false); }}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Doi vai tro nguoi dung</DialogTitle>
            <DialogDescription>
              Cap nhat role trong RBAC va ghi audit log. Admin khong the ha SUPER_ADMIN, tu ha quyen, hoac cap role ngang/cao hon minh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`role-${user.id}`}>Role moi</Label>
              <select
                id={`role-${user.id}`}
                value={nextRole}
                onChange={(event) => setNextRole(event.target.value as UserRole)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`role-reason-${user.id}`}>Ly do</Label>
              <Textarea
                id={`role-reason-${user.id}`}
                value={roleReason}
                onChange={(event) => setRoleReason(event.target.value)}
                placeholder="Nhap ly do doi role..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={rolePending}>
              Huy
            </Button>
            <Button type="button" onClick={submitRoleChange} disabled={rolePending || roleReason.trim().length < 5 || nextRole === user.role}>
              {rolePending ? "Dang luu..." : "Cap nhat role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
