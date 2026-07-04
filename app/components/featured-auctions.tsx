"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRemainingTime } from "@/lib/utils";
import { listAuctions, type SerializedAuctionListItem } from "@/src/actions/auction";

export function FeaturedAuctions() {
  const [auctions, setAuctions] = useState<SerializedAuctionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listAuctions({ status: "ACTIVE", take: 6 })
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(typeof result.error === "string" ? result.error : "Không thể tải phiên đấu giá nổi bật.");
          setAuctions([]);
          return;
        }

        setAuctions(result.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Lỗi hệ thống khi tải phiên đấu giá nổi bật.");
        setAuctions([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-medium">Không thể tải dữ liệu</p>
        <p className="mt-1">{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            setAuctions([]);
            setLoading(true);
            setError(null);
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48" />
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-8 text-center">
        <p className="text-muted-foreground">Hiện chưa có phiên đấu giá nào đang diễn ra.</p>
        <Button asChild className="mt-4">
          <Link href="/auctions/new">Tạo phiên mới</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {auctions.map((auction) => (
        <Link key={auction.id} href={`/auctions/${auction.id}`}>
          <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
            <div
              className="h-48 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundColor: auction.thumbnailUrl ? "transparent" : undefined,
                backgroundImage: auction.thumbnailUrl ? `url(${auction.thumbnailUrl})` : undefined,
              }}
            >
              {!auction.thumbnailUrl && (
                <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
              )}
            </div>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg line-clamp-1">{auction.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    Bởi {auction.seller.fullName}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium shrink-0 ${
                    auction.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : auction.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {auction.status === "ACTIVE"
                    ? "Đang diễn ra"
                    : auction.status === "PENDING"
                      ? "Sắp diễn ra"
                      : "Đã kết thúc"}
                </span>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Giá hiện tại</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(auction.currentPrice === "0" ? auction.startPrice : auction.currentPrice)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-muted-foreground">
                    {auction.status === "ACTIVE" ? "Còn lại" : "Trạng thái"}
                  </p>
                  <p className="text-sm font-medium text-amber-600 sm:mt-1">
                    {formatRemainingTime(auction.endsAt)}
                  </p>
                </div>
              </div>
              {auction.bidCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{auction.bidCount} lượt đặt giá</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
