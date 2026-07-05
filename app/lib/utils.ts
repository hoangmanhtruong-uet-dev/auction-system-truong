import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | bigint) {
  const amount = typeof value === "bigint" ? Number(value) : Number(value);

  if (!Number.isFinite(amount)) {
    return "0 ₫";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberWithCommas(value: number | string | bigint) {
  const amount = typeof value === "bigint" ? Number(value) : Number(value);
  return new Intl.NumberFormat("vi-VN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRemainingTime(value: string | Date | null | undefined, now: number = Date.now()) {
  if (!value) {
    return "Chưa mở";
  }

  const endDate = typeof value === "string" ? new Date(value) : value;
  const diffMs = endDate.getTime() - now;

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Đã kết thúc";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} ngày ${hours} giờ`;
  }

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
