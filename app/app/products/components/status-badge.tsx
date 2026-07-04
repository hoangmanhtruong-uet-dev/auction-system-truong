"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Circle, Clock, CheckCircle, XCircle, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { AuctionStatus } from "@prisma/client";

const statusVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        pending: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-400/30",
        active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-500/30",
        completed: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-400/30",
        cancelled: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30",
        sold: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-500/30",
        ending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30",
        noBid: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30",
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
  className?: string;
}

export function ProductStatusBadge({ 
  status, 
  hasBid = false, 
  endsAt,
  className 
}: ProductStatusBadgeProps) {
  const now = Date.now();

  let variant: StatusVariant = "pending";
  let Icon: React.ElementType = Circle;

  switch (status) {
    case "PENDING":
      variant = "pending";
      Icon = Clock;
      break;
    case "ACTIVE":
      if (endsAt) {
        const endsDate = typeof endsAt === "string" ? new Date(endsAt).getTime() : 0;
        if (endsDate > 0 && endsDate < now) {
          variant = "completed";
          Icon = CheckCircle;
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
      variant = "completed";
      Icon = CheckCircle;
      break;
    case "CANCELLED":
      variant = "cancelled";
      Icon = XCircle;
      break;
  }

  const label = statusLabels[status] || status;

  return (
    <div className={cn(statusVariants({ variant, className }))} style={{ gap: "6px" }}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}