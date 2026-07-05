"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { Ban, CalendarClock, CircleDollarSign, Gavel, User } from "lucide-react";
import { AuctionStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AdminAuction } from "@/src/actions/admin-auctions";

const STATUS_LABEL: Record<AuctionStatus, string> = {
  PENDING: "Sắp diễn ra",
  ACTIVE: "Đang diễn ra",
  COMPLETED: "Đã kết thúc",
  CANCELLED: "Đã huỷ",
};

const STATUS_COLOR: Record<AuctionStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function canCancelAuction(auction: AdminAuction): boolean {
  return [AuctionStatus.PENDING, AuctionStatus.ACTIVE, AuctionStatus.COMPLETED, AuctionStatus.CANCELLED].includes(auction.status);
}

export function AdminAuctionsClient({ initialAuctions }: { initialAuctions: AdminAuction[] }) {
  const [auctions, setAuctions] = useState<AdminAuction[]>(initialAuctions);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = useCallback((auction: AdminAuction) => {
    if (!canCancelAuction(auction)) {
      setError("Phiên đấu giá này không thể huỷ.");
      return;
    }

    const reason = window.prompt(`Nhập lý do huỷ phiên đấu giá "${auction.title}"`);
    if (!reason) {
      return;
    }

    setLoadingId(auction.id);
    setError(null);

    startTransition(async () => {
      try {
        const { adminCancelAuction } = await import("@/src/actions/admin-auctions");
        const result = await adminCancelAuction(auction.id, reason);

        if (result.success) {
          setAuctions((prev) =>
            prev.map((item) =>
              item.id === auction.id
                ? {
                    ...item,
                    status: AuctionStatus.CANCELLED,
                  }
                : item,
            ),
          );
        }
      } catch {
        setError("Không thể huỷ phiên đấu giá");
      } finally {
        setLoadingId(null);
      }
    });
  }, []);

  return (
    <div className="container mx-auto max-w-6xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý đấu giá</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Xem danh sách phiên đấu giá thật từ cơ sở dữ liệu và huỷ phiên khi còn hợp lệ.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tất cả phiên đấu giá</CardTitle>
          <CardDescription>Hiển thị {auctions.length} phiên đấu giá chưa bị xoá mềm.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Gavel className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có phiên đấu giá nào trong hệ thống.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seller</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">CurrentPrice</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">EndsAt</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">CreatedAt</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction) => {
                    const cancelable = canCancelAuction(auction);
                    const isLoading = loadingId === auction.id || (isPending && loadingId === auction.id);

                    return (
                      <tr key={auction.id} className="border-b border-border last:border-b-0 hover:bg-muted/50">
                        <td className="max-w-[260px] px-4 py-3">
                          <Link href={`/auctions/${auction.id}`} className="font-medium hover:underline">
                            {auction.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {auction.seller.fullName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLOR[auction.status]
                            }`}
                          >
                            {STATUS_LABEL[auction.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatCurrency(auction.currentPrice)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDateTime(auction.endsAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(auction.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="destructive"
                            size="xs"
                            disabled={!cancelable || isLoading}
                            title={cancelable ? "Huỷ phiên đấu giá" : "Không thể huỷ phiên đã kết thúc/đã huỷ"}
                            onClick={() => handleCancel(auction)}
                          >
                            <Ban className="mr-1 h-3.5 w-3.5" />
                            {isLoading ? "Đang huỷ..." : "Huỷ"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}