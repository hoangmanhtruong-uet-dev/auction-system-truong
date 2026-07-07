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
      <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
        <p className="font-semibold text-red-400 mb-2">Không thể tải dữ liệu</p>
        <p className="text-sm text-red-300/80 mb-4">{error}</p>
        <Button
          type="button"
          variant="outline"
          className="border-red-500/20 bg-red-950/10 text-red-300 hover:bg-red-500/10"
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
          <Card key={i} className="overflow-hidden border-white/5 bg-white/[0.02]">
            <Skeleton className="h-48 w-full" />
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
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
        <p className="text-neutral-400 mb-4">Hiện chưa có phiên đấu giá nào đang diễn ra.</p>
        <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold rounded-xl">
          <Link href="/auctions/new">Tạo phiên mới</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {auctions.map((auction) => (
        <Link key={auction.id} href={`/auctions/${auction.id}`}>
          <Card className="overflow-hidden h-full border-white/5 bg-white/[0.03] hover:border-amber-500/30 hover:bg-white/[0.05] hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 group">
            <div
              className="h-48 w-full bg-cover bg-center bg-no-repeat relative overflow-hidden"
              style={{
                backgroundColor: auction.thumbnailUrl ? "transparent" : undefined,
                backgroundImage: auction.thumbnailUrl ? `url(${auction.thumbnailUrl})` : undefined,
              }}
            >
              {!auction.thumbnailUrl && (
                <div className="h-full w-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Status badge on image */}
              <div className="absolute top-3 right-3">
                <span
                  className={`px-3 py-1 text-xs rounded-full font-semibold shadow-lg backdrop-blur-md ${
                    auction.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : auction.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-neutral-600/20 text-neutral-400 border border-neutral-500/30"
                  }`}
                >
                  {auction.status === "ACTIVE"
                    ? "Đang diễn ra"
                    : auction.status === "PENDING"
                      ? "Sắp diễn ra"
                      : "Đã kết thúc"}
                </span>
              </div>
            </div>
            <CardContent className="p-5 sm:p-6 relative z-10">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-lg text-white leading-snug line-clamp-2 mb-1 group-hover:text-amber-400 transition-colors">
                    {auction.title}
                  </h3>
                  <p className="text-sm text-neutral-400 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[10px]">
                      {auction.seller.fullName.charAt(0)}
                    </span>
                    <span className="truncate">{auction.seller.fullName}</span>
                  </p>
                </div>
                <div className="flex items-end justify-between pt-2 border-t border-white/5">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Giá hiện tại</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(auction.currentPrice === "0" ? auction.startPrice : auction.currentPrice)}
                    </p>
                    {auction.currentPrice !== "0" && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        +{auction.currentPrice !== auction.startPrice ? "Đã đấu giá" : "Giá khởi điểm"}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                      {auction.status === "ACTIVE" ? "Còn lại" : "Trạng thái"}
                    </p>
                    <p className={`text-sm font-semibold ${auction.status === "ACTIVE" ? "text-amber-400" : "text-neutral-400"}`}>
                      {formatRemainingTime(auction.endsAt)}
                    </p>
                  </div>
                </div>
                {auction.bidCount > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-2 py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                    <span className="text-sm font-semibold text-amber-400">{auction.bidCount}</span>
                    <span className="text-xs text-neutral-400">lượt đặt giá</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}