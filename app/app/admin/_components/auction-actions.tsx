"use client";

import Link from "next/link";
import { useState } from "react";
import { AuctionStatus } from "@prisma/client";
import { Eye, Pencil, Receipt, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { adminCancelAuction, adminMarkAuctionPaid } from "@/src/actions/admin-auctions";

import { ConfirmActionDialog } from "./confirm-action-dialog";

export function AuctionActions({
  auction,
  onChanged,
}: {
  auction: {
    id: string;
    status: AuctionStatus;
    winner: unknown | null;
    paidAt: string | null;
  };
  onChanged: (id: string, patch: { status?: AuctionStatus; paidAt?: string | null }) => void;
}) {
  const [dialog, setDialog] = useState<"cancel" | "paid" | null>(null);
  const canCancel = auction.status === "PENDING" || auction.status === "ACTIVE" || (auction.status === "COMPLETED" && !auction.paidAt);
  const canMarkPaid = auction.status === "COMPLETED" && Boolean(auction.winner) && !auction.paidAt;

  return (
    <div className="flex justify-end gap-1">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Xem chi tiết">
        <Link href={`/auctions/${auction.id}`}>
          <Eye className="size-4" />
        </Link>
      </Button>
      <DisabledAction icon={<Pencil className="size-4" />} label="Edit sẽ bật khi project có form sửa auction an toàn" />
      <ActionButton
        disabled={!canMarkPaid}
        reason={
          auction.paidAt
            ? "Auction đã thanh toán"
            : auction.status !== "COMPLETED"
              ? "Chỉ áp dụng cho auction COMPLETED"
              : !auction.winner
                ? "Auction chưa có winner"
                : "Xác nhận thanh toán thủ công"
        }
        onClick={() => setDialog("paid")}
      >
        <Receipt className="size-4" />
      </ActionButton>
      <ActionButton
        disabled={!canCancel}
        reason={canCancel ? "Hủy auction" : "Không thể hủy ở trạng thái hiện tại"}
        onClick={() => setDialog("cancel")}
        destructive
      >
        <XCircle className="size-4" />
      </ActionButton>
      <DisabledAction icon={<Trash2 className="size-4" />} label="Delete chưa bật vì chưa có action xóa an toàn" />

      <ConfirmActionDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title="Hủy phiên đấu giá"
        description="Thao tác này sẽ chuyển auction sang CANCELLED và ghi audit log. Vui lòng nhập lý do rõ ràng."
        confirmLabel="Xác nhận hủy"
        variant="destructive"
        requireReason
        onConfirm={async (reason) => {
          await adminCancelAuction(auction.id, reason);
          onChanged(auction.id, { status: AuctionStatus.CANCELLED });
        }}
      />
      <ConfirmActionDialog
        open={dialog === "paid"}
        onOpenChange={(open) => setDialog(open ? "paid" : null)}
        title="Xác nhận đã thanh toán"
        description="MVP hiện xác nhận thanh toán thủ công. Hãy chỉ đánh dấu khi đội vận hành đã đối soát xong."
        confirmLabel="Mark paid"
        onConfirm={async () => {
          await adminMarkAuctionPaid(auction.id);
          onChanged(auction.id, { paidAt: new Date().toISOString() });
        }}
      />
    </div>
  );
}

function ActionButton({
  disabled,
  reason,
  destructive,
  onClick,
  children,
}: {
  disabled: boolean;
  reason: string;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            type="button"
            variant={destructive ? "destructive" : "ghost"}
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            aria-label={reason}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
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
