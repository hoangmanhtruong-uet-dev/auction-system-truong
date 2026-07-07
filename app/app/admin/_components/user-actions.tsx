"use client";

import { useState } from "react";
import { Ban, Eye, RotateCcw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleUserBlock } from "@/src/actions/admin-users";

import { ConfirmActionDialog } from "./confirm-action-dialog";

export function UserActions({
  user,
  currentAdminId,
  onChanged,
}: {
  user: { id: string; role: "USER" | "SELLER" | "ADMIN"; deletedAt: string | null };
  currentAdminId: string;
  onChanged: (id: string, patch: { deletedAt: string | null }) => void;
}) {
  const [dialog, setDialog] = useState<"block" | "unblock" | null>(null);
  const isSelf = user.id === currentAdminId;
  const canToggleBlock = user.role !== "ADMIN" && !isSelf;
  const isBlocked = Boolean(user.deletedAt);

  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Xem user drawer">
            <Eye className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Chi tiết đang hiển thị trực tiếp trên bảng</TooltipContent>
      </Tooltip>
      <DisabledAction icon={<ShieldAlert className="size-4" />} label="Change role sắp ra mắt, chưa bật để tránh tự hạ quyền admin thiếu an toàn" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant={isBlocked ? "outline" : "destructive"}
              size="icon-sm"
              disabled={!canToggleBlock}
              aria-label={isBlocked ? "Mở khóa user" : "Khóa user"}
              onClick={() => setDialog(isBlocked ? "unblock" : "block")}
            >
              {isBlocked ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSelf
            ? "Không tự thao tác trên chính mình"
            : user.role === "ADMIN"
              ? "Không khóa admin bằng MVP action"
              : isBlocked
                ? "Mở khóa user"
                : "Khóa user"}
        </TooltipContent>
      </Tooltip>
      <ConfirmActionDialog
        open={dialog !== null}
        onOpenChange={(open) => setDialog(open ? dialog : null)}
        title={dialog === "unblock" ? "Mở khóa người dùng" : "Khóa người dùng"}
        description="Thao tác sử dụng trường deletedAt hiện có và sẽ ghi audit log kèm lý do."
        confirmLabel="Xác nhận"
        variant={dialog === "block" ? "destructive" : "default"}
        requireReason
        onConfirm={async (reason) => {
          const result = await toggleUserBlock(user.id, dialog === "block", reason);
          onChanged(user.id, { deletedAt: result.user.deletedAt ? result.user.deletedAt.toISOString() : null });
        }}
      />
    </div>
  );
}

function DisabledAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button type="button" variant="ghost" size="icon-sm" disabled aria-label={label}>
            {icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
