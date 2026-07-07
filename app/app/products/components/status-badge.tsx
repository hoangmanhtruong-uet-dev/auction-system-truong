"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Circle, Clock, CheckCircle, XCircle, Zap, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { AuctionStatus } from "@prisma/client";

const statusVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors backdrop-blur-sm",
  {
    variants: {
      variant: {
        pending: "bg-neutral-800/80 text-neutral-300 ring-neutral-600/30 shadow-sm",
        active: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 shadow-sm shadow-emerald-500/10 hover:bg-emerald-500/20",
        completed: "bg-neutral-800/80 text-neutral-400 ring-neutral-600/30 shadow-sm",
        cancelled: "bg-red-500/10 text-red-400 ring-red-500/20 shadow-sm shadow-red-500/10 hover:bg-red-500/20",
        sold: "bg-amber-500/10 text-amber-400 ring-amber-500/20 shadow-sm shadow-amber-500/10 hover:bg-amber-500/20",
        ending: "bg-amber-500/10 text-amber-400 ring-amber-500/20 shadow-sm shadow-amber-500/10 animate-pulse",
        noBid: "bg-amber-500/5 text-amber-400 ring-amber-500/10 shadow-sm",
        paid: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 shadow-sm shadow-emerald-500/10 hover:bg-emerald-500/20",
      },
    },
    defaultVariants: {
      variant: "pending",
    },
  },
);

type StatusVariant = NonNullable<VariantProps<typeof statusVariants>["variant"]>;

const statusLabels: Record<AuctionStatus, string> = {
  PENDING: "Bản nháp",
  ACTIVE: "Đang đấu giá",
  COMPLETED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

interface ProductStatusBadgeProps extends VariantProps<typeof statusVariants> {
  status: AuctionStatus;
  hasBid?: boolean;
  endsAt?: string | null;
  paidAt?: string | null;
  className?: string;
}

export function ProductStatusBadge({ 
  status, 
  hasBid = false, 
  endsAt,
  paidAt,
  className 
}: ProductStatusBadgeProps) {
  const now = Date.now();

  let variant: StatusVariant = "pending";
  let Icon: React.ElementType = Circle;
  let label: string = statusLabels[status] || status;

  switch (status) {
    case "PENDING":
      variant = "pending";
      Icon = Clock;
      label = "Sắp diễn ra";
      break;
    case "ACTIVE":
      if (endsAt) {
        const endsDate = typeof endsAt === "string" ? new Date(endsAt).getTime() : 0;
        if (endsDate > 0 && endsDate < now) {
          variant = "completed";
          Icon = CheckCircle;
          label = "Đã kết thúc";
        } else if (endsDate > 0 && endsDate - now < 30 * 60 * 1000) {
          variant = "ending";
          Icon = Zap;
        } else if (!hasBid) {
          variant = "noBid";
          Icon = Circle;
        } else {
          variant = "active";
          Icon = Zap;
        }
      } else {
        variant = "active";
        Icon = Zap;
      }
      break;
    case "COMPLETED":
      if (paidAt) {
        variant = "paid";
        Icon = ShieldCheck;
        label = "Đã thanh toán";
      } else {
        variant = "completed";
        Icon = CheckCircle;
        label = "Đã kết thúc";
      }
      break;
    case "CANCELLED":
      variant = "cancelled";
      Icon = XCircle;
      label = "Đã hủy";
      break;
  }

  return (
    <div className={cn(statusVariants({ variant, className }))} style={{ gap: "6px" }}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}
