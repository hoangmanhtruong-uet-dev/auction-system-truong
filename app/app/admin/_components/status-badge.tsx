import type { AuctionStatus, BidStatus, UserRole } from "@prisma/client";
import { CheckCircle2, Clock, MinusCircle, Shield, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const auctionLabels: Record<AuctionStatus, string> = {
  PENDING: "Cho mo",
  ACTIVE: "Dang chay",
  COMPLETED: "Hoan tat",
  CANCELLED: "Da huy",
};

const bidLabels: Record<BidStatus, string> = {
  ACTIVE: "Dang giu",
  WON: "Thang",
  LOST: "Thua",
  CANCELLED: "Da huy",
};

const roleLabels: Record<UserRole, string> = {
  USER: "User",
  SELLER: "Seller",
  SUPPORT: "Support",
  MODERATOR: "Moderator",
  FINANCE: "Finance",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const styles = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
};

export function StatusBadge({
  type,
  value,
  className,
}: {
  type: "auction" | "bid" | "role" | "payment" | "user" | "autoBid";
  value: string | boolean | null;
  className?: string;
}) {
  let label = String(value ?? "-");
  let style = styles.neutral;
  let Icon = MinusCircle;

  if (type === "auction") {
    const status = value as AuctionStatus;
    label = auctionLabels[status] ?? status;
    style =
      status === "ACTIVE"
        ? styles.success
        : status === "PENDING"
          ? styles.warning
          : status === "COMPLETED"
            ? styles.info
            : styles.danger;
    Icon = status === "ACTIVE" ? CheckCircle2 : status === "CANCELLED" ? XCircle : Clock;
  }

  if (type === "bid") {
    const status = value as BidStatus;
    label = bidLabels[status] ?? status;
    style = status === "WON" ? styles.success : status === "LOST" ? styles.neutral : status === "CANCELLED" ? styles.danger : styles.info;
    Icon = status === "CANCELLED" ? XCircle : CheckCircle2;
  }

  if (type === "role") {
    const role = value as UserRole;
    label = roleLabels[role] ?? role;
    style = role === "ADMIN" || role === "SUPER_ADMIN" ? styles.warning : role === "SELLER" || role === "FINANCE" ? styles.info : styles.neutral;
    Icon = Shield;
  }

  if (type === "payment") {
    const paid = Boolean(value);
    label = paid ? "Da thanh toan" : "Chua thanh toan";
    style = paid ? styles.success : styles.warning;
    Icon = paid ? CheckCircle2 : Clock;
  }

  if (type === "user") {
    const blocked = Boolean(value);
    label = blocked ? "Bi khoa" : "Hoat dong";
    style = blocked ? styles.danger : styles.success;
    Icon = blocked ? XCircle : CheckCircle2;
  }

  if (type === "autoBid") {
    const auto = Boolean(value);
    label = auto ? "Auto-bid cu" : "Manual";
    style = auto ? styles.warning : styles.neutral;
    Icon = auto ? Clock : CheckCircle2;
  }

  return (
    <Badge variant="outline" className={cn("gap-1 rounded-md px-2 py-0.5 font-medium", style, className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
