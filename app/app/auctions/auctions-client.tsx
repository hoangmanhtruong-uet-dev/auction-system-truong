"use client";

import Link from "next/link";
import { Clock, Filter, Search, TrendingUp, Users, Eye, Gavel, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatRemainingTime } from "@/lib/utils";
import { listAuctions, type SerializedAuctionListItem } from "@/src/actions/auction";

function AuctionCard({ auction }: { auction: SerializedAuctionListItem }) {
  const endsAt = auction.endsAt;
  const isEndingSoon = endsAt && new Date(endsAt).getTime() - Date.now() < 30 * 60 * 1000;
  const price = auction.currentPrice === "0" ? auction.startPrice : auction.currentPrice;
  const status = auction.status;

  return (
    <Link href={`/auctions/${auction.id}`} className="group block">
      <Card className="relative overflow-hidden border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/5">
        {/* Thumbnail */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {auction.thumbnailUrl ? (
            <div
              className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${auction.thumbnailUrl})` }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-900 to-zinc-900">
              <Gavel className="h-12 w-12 text-neutral-700" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute left-3 top-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-sm",
                status === "ACTIVE" && "bg-emerald-500/90 text-white",
                status === "PENDING" && "bg-amber-500/90 text-white",
                status === "COMPLETED" && "bg-blue-500/90 text-white",
                status === "CANCELLED" && "bg-red-500/90 text-white",
              )}
            >
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "ACTIVE" && "bg-white animate-pulse",
                "bg-white/70",
              )} />
              {status === "ACTIVE" && "Đang đấu giá"}
              {status === "PENDING" && "Sắp diễn ra"}
              {status === "COMPLETED" && "Đã kết thúc"}
              {status === "CANCELLED" && "Đã hủy"}
            </span>
          </div>

          {/* Ending soon badge */}
          {isEndingSoon && status === "ACTIVE" && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                Sắp kết thúc
              </span>
            </div>
          )}
        </div>

        <CardContent className="space-y-3 p-4 sm:p-5">
          {/* Title & seller */}
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white/90 group-hover:text-amber-400 transition-colors">
              {auction.title}
            </h3>
            <p className="truncate text-sm text-neutral-400">
              Bởi {auction.seller.fullName}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-500">Giá hiện tại</p>
              <p className="text-2xl font-bold tracking-tight text-amber-400">
                {formatCurrency(price)}
              </p>
            </div>
            {status === "ACTIVE" && endsAt && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-amber-300/80">
                <Clock className="h-3.5 w-3.5" />
                {formatRemainingTime(endsAt)}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs text-neutral-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" />
                {auction.bidCount} bid
              </span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium transition-colors",
                "text-amber-400/70 group-hover:text-amber-400",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Xem chi tiết
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AuctionSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-white/10 bg-white/[0.03]">
          <Skeleton className="h-48 w-full rounded-none bg-white/5" />
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-5 w-3/4 bg-white/5" />
            <Skeleton className="h-4 w-1/2 bg-white/5" />
            <Skeleton className="h-8 w-1/3 bg-white/5" />
            <Skeleton className="h-4 w-2/3 bg-white/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ tab, onCreate }: { tab: string; onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center backdrop-blur-sm">
      {/* Glow effect */}
      <div className="absolute -inset-40 bg-gradient-radial from-amber-500/5 via-transparent to-transparent opacity-50" />

      <div className="relative">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <Gavel className="h-10 w-10 text-amber-400" />
        </div>
        <h3 className="text-2xl font-bold text-white/80">
          {tab === "active"
            ? "Chưa có phiên đấu giá đang diễn ra"
            : tab === "upcoming"
              ? "Chưa có phiên đấu giá sắp diễn ra"
              : "Chưa có phiên đấu giá đã kết thúc"}
        </h3>
        <p className="mt-3 text-neutral-400">
          {tab === "active"
            ? "Hãy tạo phiên đầu tiên hoặc chuyển sang tab khác."
            : tab === "upcoming"
              ? "Các phiên sắp diễn ra sẽ xuất hiện tại đây."
              : "Các phiên đã kết thúc sẽ xuất hiện tại đây."}
        </p>
        {tab === "active" && (
          <Button asChild className="mt-6 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400">
            <Link href="/auctions/new">
              <Plus className="h-4 w-4" />
              Tạo phiên mới
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function AuctionsClient() {
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
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
        if (cancelled) return;

        if (!result.success) {
          setAuctions((prev) => ({ ...prev, [tab]: [] }));
          setErrors((prev) => ({
            ...prev,
            [tab]: typeof result.error === "string" ? result.error : "Không thể tải danh sách phiên đấu giá.",
          }));
          return;
        }

        setAuctions((prev) => ({ ...prev, [tab]: result.data ?? [] }));
      })
      .catch(() => {
        if (cancelled) return;
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
    const cleanup = loadData(activeTab);
    return cleanup;
  }, [activeTab]);

  // Aggregate stats from all loaded auctions
  const stats = useMemo(() => {
    const allAuctions = Object.values(auctions).flat();
    const activeCount = auctions.active.length;
    // Use real bid count from DB
    const totalBids = allAuctions.reduce((sum, a) => sum + a.bidCount, 0);
    // Highest price among current prices
    const highestPrice = allAuctions.reduce((max, a) => {
      const p = Number(a.currentPrice === "0" ? a.startPrice : a.currentPrice);
      return p > max ? p : max;
    }, 0);
    // Count unique sellers (approximate from current data)
    const sellerIds = new Set(allAuctions.map((a) => a.sellerId));

    return {
      activeCount,
      totalBids,
      highestPrice,
      sellerCount: sellerIds.size,
    };
  }, [auctions]);

  const currentAuctions = auctions[activeTab] ?? [];

  // Filter by search query
  const filteredAuctions = searchQuery.trim()
    ? currentAuctions.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.seller.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : currentAuctions;

  const upcomingAuctions = auctions.upcoming ?? [];
  const upcomingFiltered = searchQuery.trim()
    ? upcomingAuctions.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.seller.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : upcomingAuctions;

  const completedAuctions = auctions.completed ?? [];
  const completedFiltered = searchQuery.trim()
    ? completedAuctions.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.seller.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : completedAuctions;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-zinc-950 to-neutral-950">
      {/* Page Header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -inset-40 bg-gradient-radial from-amber-500/5 via-transparent to-transparent opacity-30" />
        <div className="container relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Tất cả phiên đấu giá
              </h1>
              <p className="mt-2 text-neutral-400">
                Khám phá các phiên đấu giá đang diễn ra, sắp diễn ra và đã kết thúc
              </p>
            </div>
            <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400">
              <Link href="/auctions/new">
                <Plus className="h-4 w-4" />
                Tạo phiên mới
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto max-w-7xl px-4 -mt-6 relative z-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.activeCount}</p>
                <p className="text-xs text-neutral-400">Phiên đang chạy</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <Gavel className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalBids}</p>
                <p className="text-xs text-neutral-400">Tổng lượt bid</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sellerCount}</p>
                <p className="text-xs text-neutral-400">Người bán</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.highestPrice > 0 ? formatCurrency(stats.highestPrice) : "—"}</p>
                <p className="text-xs text-neutral-400">Giá trị cao nhất</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Tabs & Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs defaultValue="active" className="w-full sm:w-auto" onValueChange={setActiveTab}>
            <TabsList className="h-auto w-full gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl sm:w-auto">
              <TabsTrigger
                value="active"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                Đang diễn ra
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                Sắp diễn ra
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                Đã kết thúc
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              {loading.active ? (
                <AuctionSkeletons />
              ) : errors.active ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                    <TrendingUp className="h-7 w-7 text-red-400" />
                  </div>
                  <p className="text-lg font-semibold text-white/80">Không thể tải dữ liệu</p>
                  <p className="mt-2 text-sm text-neutral-400">{errors.active}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => loadData("active")}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : filteredAuctions.length === 0 ? (
                <EmptyState
                  tab="active"
                  onCreate={() => window.location.href = "/auctions/new"}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {filteredAuctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-6">
              {loading.upcoming ? (
                <AuctionSkeletons />
              ) : errors.upcoming ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                    <TrendingUp className="h-7 w-7 text-red-400" />
                  </div>
                  <p className="text-lg font-semibold text-white/80">Không thể tải dữ liệu</p>
                  <p className="mt-2 text-sm text-neutral-400">{errors.upcoming}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => loadData("upcoming")}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : upcomingFiltered.length === 0 ? (
                <EmptyState
                  tab="upcoming"
                  onCreate={() => window.location.href = "/auctions/new"}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {upcomingFiltered.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              {loading.completed ? (
                <AuctionSkeletons />
              ) : errors.completed ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                    <TrendingUp className="h-7 w-7 text-red-400" />
                  </div>
                  <p className="text-lg font-semibold text-white/80">Không thể tải dữ liệu</p>
                  <p className="mt-2 text-sm text-neutral-400">{errors.completed}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => loadData("completed")}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : completedFiltered.length === 0 ? (
                <EmptyState
                  tab="completed"
                  onCreate={() => window.location.href = "/auctions/new"}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {completedFiltered.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Tìm kiếm phiên đấu giá..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-neutral-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}