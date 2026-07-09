"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  Clock,
  Eye,
  Filter,
  Gavel,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatRemainingTime } from "@/lib/utils";
import { listAuctionCards, type AuctionListingItem } from "@/src/actions/auction-list";

const INITIAL_VISIBLE_COUNT = 9;
const LOAD_MORE_COUNT = 9;

const STATUS_LABELS = {
  ACTIVE: "Đang đấu giá",
  PENDING: "Sắp diễn ra",
  COMPLETED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
} as const;

const FALLBACK_CATEGORIES = [
  "Xe cộ",
  "Bất động sản",
  "Đồng hồ",
  "Trang sức",
  "Điện thoại",
  "Laptop",
  "Máy ảnh",
  "Sưu tầm",
  "Đồ cổ",
  "Thời trang",
];

type SortValue = "endingSoon" | "priceAsc" | "priceDesc" | "bidsDesc" | "newest";

function getDisplayPrice(auction: AuctionListingItem) {
  return Number(auction.currentPrice === "0" ? auction.startPrice : auction.currentPrice);
}

function AuctionCard({ auction, now }: { auction: AuctionListingItem; now: number }) {
  const endsAt = auction.endsAt;
  const isEndingSoon = endsAt && new Date(endsAt).getTime() - now < 30 * 60 * 1000;
  const price = auction.currentPrice === "0" ? auction.startPrice : auction.currentPrice;
  const status = auction.status;

  return (
    <Card className="group relative overflow-hidden border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/5">
      <Link href={`/auctions/${auction.id}`} className="block" aria-label={`Xem chi tiết ${auction.title}`}>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

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
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-white/70",
                  status === "ACTIVE" && "animate-pulse bg-white",
                )}
              />
              {STATUS_LABELS[status]}
            </span>
          </div>

          {isEndingSoon && status === "ACTIVE" && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                Sắp kết thúc
              </span>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="truncate">{auction.category ?? "Chưa phân loại"}</span>
            <span className="h-1 w-1 rounded-full bg-neutral-700" />
            <span>{auction.bidCount} bid</span>
          </div>
          <Link href={`/auctions/${auction.id}`} className="block">
            <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-bold text-white/90 transition-colors group-hover:text-amber-400">
              {auction.title}
            </h3>
          </Link>
          <p className="truncate text-sm text-neutral-400">Bởi {auction.seller.fullName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3">
          <div>
            <p className="text-xs text-neutral-500">Giá hiện tại</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-amber-400">
              {formatCurrency(price)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Giá khởi điểm</p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {formatCurrency(auction.startPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Bước giá</p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {formatCurrency(auction.bidStep)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Thời gian</p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {status === "ACTIVE" && endsAt ? formatRemainingTime(endsAt) : STATUS_LABELS[status]}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            asChild
            className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400"
          >
            <Link href={`/auctions/${auction.id}`}>
              <Gavel className="h-4 w-4" />
              {status === "ACTIVE" ? "Đặt giá nhanh" : "Xem chi tiết"}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Link href={`/auctions/${auction.id}`} aria-label={`Xem chi tiết ${auction.title}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
            <Skeleton className="h-24 w-full bg-white/5" />
            <Skeleton className="h-10 w-full bg-white/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center backdrop-blur-sm">
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
          Thử đổi bộ lọc, tìm kiếm từ khóa khác hoặc quay lại sau khi có phiên mới.
        </p>
      </div>
    </div>
  );
}

export function AuctionsClient() {
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("endingSoon");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [now] = useState(() => Date.now());
  const [auctions, setAuctions] = useState<Record<string, AuctionListingItem[]>>({
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

    listAuctionCards({ status, take: 100 })
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const cleanup = loadData(activeTab);
    return cleanup;
  }, [activeTab]);

  function resetVisibleCount() {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  const stats = useMemo(() => {
    const allAuctions = Object.values(auctions).flat();
    const totalBids = allAuctions.reduce((sum, auction) => sum + auction.bidCount, 0);
    const highestPrice = allAuctions.reduce((max, auction) => Math.max(max, getDisplayPrice(auction)), 0);
    const sellerIds = new Set(allAuctions.map((auction) => auction.sellerId));

    return {
      activeCount: auctions.active.length,
      totalBids,
      highestPrice,
      sellerCount: sellerIds.size,
    };
  }, [auctions]);

  const categoryOptions = useMemo(() => {
    const loadedCategories = Object.values(auctions)
      .flat()
      .map((auction) => auction.category)
      .filter((category): category is string => Boolean(category));

    return Array.from(new Set([...FALLBACK_CATEGORIES, ...loadedCategories])).sort((a, b) =>
      a.localeCompare(b, "vi"),
    );
  }, [auctions]);

  const filteredAuctions = useMemo(() => {
    const currentAuctions = auctions[activeTab] ?? [];
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    return currentAuctions
      .filter((auction) => {
        const price = getDisplayPrice(auction);
        const matchesSearch =
          !normalizedSearch ||
          auction.title.toLowerCase().includes(normalizedSearch) ||
          auction.seller.fullName.toLowerCase().includes(normalizedSearch) ||
          auction.description.toLowerCase().includes(normalizedSearch);
        const matchesCategory = categoryFilter === "all" || auction.category === categoryFilter;
        const matchesMin = min === null || Number.isNaN(min) || price >= min;
        const matchesMax = max === null || Number.isNaN(max) || price <= max;

        return matchesSearch && matchesCategory && matchesMin && matchesMax;
      })
      .sort((a, b) => {
        if (sortBy === "priceAsc") return getDisplayPrice(a) - getDisplayPrice(b);
        if (sortBy === "priceDesc") return getDisplayPrice(b) - getDisplayPrice(a);
        if (sortBy === "bidsDesc") return b.bidCount - a.bidCount;
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aEnd - bEnd;
      });
  }, [activeTab, auctions, categoryFilter, maxPrice, minPrice, searchQuery, sortBy]);

  const visibleAuctions = filteredAuctions.slice(0, visibleCount);
  const hasMore = filteredAuctions.length > visibleCount;
  const hasActiveFilters =
    searchQuery.trim() !== "" || categoryFilter !== "all" || minPrice.trim() !== "" || maxPrice.trim() !== "";

  function clearFilters() {
    resetVisibleCount();
    setSearchQuery("");
    setCategoryFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("endingSoon");
  }

  function renderTabContent(tab: string) {
    if (loading[tab]) {
      return <AuctionSkeletons />;
    }

    if (errors[tab]) {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <TrendingUp className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-lg font-semibold text-white/80">Không thể tải dữ liệu</p>
          <p className="mt-2 text-sm text-neutral-400">{errors[tab]}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => loadData(tab)}
          >
            Thử lại
          </Button>
        </div>
      );
    }

    if (filteredAuctions.length === 0) {
      return <EmptyState tab={tab} />;
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Hiển thị <strong className="text-white">{visibleAuctions.length}</strong> trên{" "}
            <strong className="text-white">{filteredAuctions.length}</strong> phiên phù hợp
          </span>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={clearFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {visibleAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} now={now} />
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-white/5 px-8 text-white hover:bg-white/10"
              onClick={() => setVisibleCount((count) => count + LOAD_MORE_COUNT)}
            >
              Xem thêm phiên đấu giá
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-zinc-950 to-neutral-950">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -inset-40 bg-gradient-radial from-amber-500/5 via-transparent to-transparent opacity-30" />
        <div className="container relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Tất cả phiên đấu giá
            </h1>
            <p className="mt-2 text-neutral-400">
              Tìm nhanh phiên phù hợp theo trạng thái, danh mục, khoảng giá và thời gian kết thúc.
            </p>
          </div>
        </div>
      </div>

      <div className="container relative z-10 mx-auto -mt-6 max-w-7xl px-4">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <Users className="h-6 w-6 text-neutral-200" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sellerCount}</p>
                <p className="text-xs text-neutral-400">Người bán</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <TrendingUp className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.highestPrice > 0 ? formatCurrency(stats.highestPrice) : "-"}
                </p>
                <p className="text-xs text-neutral-400">Giá trị cao nhất</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs
          defaultValue="active"
          className="w-full"
          onValueChange={(value) => {
            resetVisibleCount();
            setActiveTab(value);
          }}
        >
          <div className="space-y-4">
            <TabsList className="h-auto w-full gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl sm:w-auto">
              <TabsTrigger
                value="active"
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none"
              >
                Đang diễn ra
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none"
              >
                Sắp diễn ra
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none"
              >
                Đã kết thúc
              </TabsTrigger>
            </TabsList>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                Bộ lọc nâng cao
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_1fr_1fr_1fr_1fr_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    placeholder="Tìm theo tên phiên, người bán hoặc mô tả..."
                    value={searchQuery}
                    onChange={(event) => {
                      resetVisibleCount();
                      setSearchQuery(event.target.value);
                    }}
                    className="h-11 border-white/10 bg-black/20 pl-9 text-white placeholder:text-neutral-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                  />
                </div>

                <label className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      resetVisibleCount();
                      setCategoryFilter(event.target.value);
                    }}
                    className="h-11 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  inputMode="numeric"
                  placeholder="Giá từ"
                  value={minPrice}
                  onChange={(event) => {
                    resetVisibleCount();
                    setMinPrice(event.target.value);
                  }}
                  className="h-11 border-white/10 bg-black/20 text-white placeholder:text-neutral-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                />

                <Input
                  inputMode="numeric"
                  placeholder="Giá đến"
                  value={maxPrice}
                  onChange={(event) => {
                    resetVisibleCount();
                    setMaxPrice(event.target.value);
                  }}
                  className="h-11 border-white/10 bg-black/20 text-white placeholder:text-neutral-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                />

                <label className="relative">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      resetVisibleCount();
                      setSortBy(event.target.value as SortValue);
                    }}
                    className="h-11 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="endingSoon">Kết thúc sớm nhất</option>
                    <option value="priceAsc">Giá thấp đến cao</option>
                    <option value="priceDesc">Giá cao đến thấp</option>
                    <option value="bidsDesc">Lượt bid nhiều nhất</option>
                    <option value="newest">Mới tạo gần đây</option>
                  </select>
                </label>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters && sortBy === "endingSoon"}
                >
                  Xóa lọc
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="active" className="mt-6">
            {renderTabContent("active")}
          </TabsContent>
          <TabsContent value="upcoming" className="mt-6">
            {renderTabContent("upcoming")}
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            {renderTabContent("completed")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
