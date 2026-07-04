"use client";

import Link from "next/link";
import { Clock, Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatRemainingTime } from "@/lib/utils";
import { listAuctions, type SerializedAuctionListItem } from "@/src/actions/auction";

export function AuctionsClient() {
  const [activeTab, setActiveTab] = useState("active");
  const [auctions, setAuctions] = useState<Record<string, SerializedAuctionListItem[]>>({
    active: [],
    upcoming: [],
    completed: [],
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({
    active: true,
    upcoming: true,
    completed: true,
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({
    active: null,
    upcoming: null,
    completed: null,
  });

  const loadData = (tab: string) => {
    const statusMap: Record<string, string> = {
      active: "ACTIVE",
      upcoming: "PENDING",
      completed: "COMPLETED",
    };

    const status = statusMap[tab] ?? "ACTIVE";
    let cancelled = false;

    setLoading((prev) => ({ ...prev, [tab]: true }));
    setErrors((prev) => ({ ...prev, [tab]: null }));

    listAuctions({ status, take: 50 })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!result.success) {
          setAuctions((prev) => ({ ...prev, [tab]: [] }));
          setErrors((prev) => ({
            ...prev,
            [tab]:
              typeof result.error === "string" ? result.error : "Không thể tải danh sách phiên đấu giá.",
          }));
          return;
        }

        setAuctions((prev) => ({ ...prev, [tab]: result.data ?? [] }));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAuctions((prev) => ({ ...prev, [tab]: [] }));
        setErrors((prev) => ({ ...prev, [tab]: "Lỗi hệ thống khi tải danh sách phiên đấu giá." }));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading((prev) => ({ ...prev, [tab]: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    // Data fetching needs to reset per-tab loading/error state before the async request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(activeTab);
  }, [activeTab]);

  return (
    <div className="container mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tất cả phiên đấu giá</h1>
        <div className="flex w-full gap-2 md:w-auto">
          <div className="relative min-w-0 flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." className="pl-9" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="active">Đang diễn ra</TabsTrigger>
          <TabsTrigger value="upcoming">Sắp diễn ra</TabsTrigger>
          <TabsTrigger value="completed">Đã kết thúc</TabsTrigger>
        </TabsList>
        {["active", "upcoming", "completed"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading[tab] ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
            ) : errors[tab] ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <p className="font-medium">Không thể tải dữ liệu</p>
                <p className="mt-1">{errors[tab]}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setLoading((prev) => ({ ...prev, [tab]: true }));
                    setActiveTab(tab);
                  }}
                >
                  Thử lại
                </Button>
              </div>
            ) : auctions[tab].length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {tab === "active"
                    ? "Không có phiên đấu giá nào đang diễn ra."
                    : tab === "upcoming"
                      ? "Không có phiên đấu giá sắp diễn ra."
                      : "Không có phiên đấu giá đã kết thúc."}
                </p>
                {tab === "active" && (
                  <Button asChild className="mt-4">
                    <Link href="/auctions/new">Tạo phiên mới</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {auctions[tab].map((auction) => (
                  <Link key={auction.id} href={`/auctions/${auction.id}`}>
                    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                      <div
                        className="h-48 bg-cover bg-center bg-no-repeat"
                        style={
                          auction.thumbnailUrl
                            ? {
                                backgroundColor: "transparent",
                                backgroundImage: `url(${auction.thumbnailUrl})`,
                              }
                            : undefined
                        }
                      >
                        {!auction.thumbnailUrl && (
                          <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
                        )}
                      </div>
                        <CardContent className="p-4 sm:p-6">
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                            <h3 className="font-semibold text-lg truncate">{auction.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">
                              Bởi {auction.seller.fullName}
                            </p>
                          </div>
                          {tab === "active" && auction.endsAt && (
                            <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-amber-600 sm:ml-2">
                              <Clock className="h-4 w-4" />
                              <span>{formatRemainingTime(auction.endsAt)}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">Giá hiện tại</p>
                            <p className="break-words text-xl font-bold sm:text-2xl">
                              {formatCurrency(
                                auction.currentPrice === "0" ? auction.startPrice : auction.currentPrice,
                              )}
                            </p>
                          </div>
                          <Button asChild size="sm">
                            <Link href={`/auctions/${auction.id}`}>
                              {tab === "completed" ? "Xem chi tiết" : "Đặt giá"}
                            </Link>
                          </Button>
                        </div>
                        {auction.bidCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {auction.bidCount} lượt đặt giá
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}