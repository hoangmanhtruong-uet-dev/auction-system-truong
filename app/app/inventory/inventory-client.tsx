"use client";

import Link from "next/link";
import {
  Archive,
  Boxes,
  CheckCircle2,
  FileCheck2,
  FileText,
  Gavel,
  History,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDateTime, formatRemainingTime } from "@/lib/utils";
import { deleteSellerProduct, listSellerProducts, type SellerProductItem } from "@/src/actions/auction";

type InventoryTab = "all" | "draft" | "ready" | "active" | "sold" | "stored";
type SortKey = "newest" | "highest-value" | "most-bids" | "ending-soon";

const tabs: Array<{ value: InventoryTab; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Chờ duyệt / Nháp" },
  { value: "ready", label: "Sẵn sàng đấu giá" },
  { value: "active", label: "Đang đấu giá" },
  { value: "sold", label: "Đã bán" },
  { value: "stored", label: "Không thành công / Lưu kho" },
];

function getInventoryStatus(product: SellerProductItem, now: number): InventoryTab {
  const startsAt = product.startsAt ? new Date(product.startsAt).getTime() : null;
  const endsAt = product.endsAt ? new Date(product.endsAt).getTime() : null;

  if (product.winnerId || product.paidAt) return "sold";
  if (product.status === "CANCELLED") return "stored";
  if (product.status === "COMPLETED") return "stored";
  if (product.status === "ACTIVE") return endsAt && endsAt <= now ? "stored" : "active";
  if (product.status === "PENDING") return startsAt && startsAt > now ? "ready" : "draft";
  return "draft";
}

function statusMeta(status: InventoryTab) {
  const map = {
    all: { label: "Tất cả", className: "bg-white/10 text-white ring-white/10" },
    draft: { label: "Chờ duyệt / Nháp", className: "bg-neutral-500/10 text-neutral-300 ring-neutral-500/20" },
    ready: { label: "Sẵn sàng đấu giá", className: "bg-blue-500/10 text-blue-300 ring-blue-500/20" },
    active: { label: "Đang đấu giá", className: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" },
    sold: { label: "Đã bán", className: "bg-amber-500/10 text-amber-300 ring-amber-500/20" },
    stored: { label: "Lưu kho", className: "bg-red-500/10 text-red-300 ring-red-500/20" },
  };

  return map[status];
}

function displayPrice(product: SellerProductItem) {
  return Number(product.currentPrice === "0" ? product.startPrice : product.currentPrice);
}

function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-28 bg-white/10" />
              <Skeleton className="h-8 w-16 bg-white/10" />
              <Skeleton className="h-3 w-36 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-white/10 bg-white/[0.03]">
            <Skeleton className="h-56 w-full rounded-none bg-white/10" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ title, value, subtitle, icon: Icon }: { title: string; value: string; subtitle: string; icon: React.ElementType }) {
  return (
    <Card className="border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-xl">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-neutral-400">{title}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryCard({
  product,
  status,
  onDelete,
}: {
  product: SellerProductItem;
  status: InventoryTab;
  onDelete: (product: SellerProductItem) => void;
}) {
  const meta = statusMeta(status);
  const price = product.currentPrice === "0" ? product.startPrice : product.currentPrice;
  const canEdit = status === "draft" || status === "ready";
  const canList = status === "draft" || status === "ready" || status === "stored";
  const docsCount = product.images.length + (product.thumbnailUrl ? 1 : 0);

  return (
    <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-zinc-900/90 to-black shadow-xl transition-all duration-300 hover:border-amber-500/30">
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative min-h-56 bg-neutral-900">
          {product.thumbnailUrl ? (
            <div className="h-full min-h-56 bg-cover bg-center" style={{ backgroundImage: `url(${product.thumbnailUrl})` }} />
          ) : (
            <div className="flex h-full min-h-56 items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
              <Boxes className="h-14 w-14 text-neutral-600" />
            </div>
          )}
          <div className={cn("absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ring-1 backdrop-blur-sm", meta.className)}>
            {meta.label}
          </div>
        </div>

        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300/70">
                Mã tài sản {product.id.slice(0, 8)}
              </p>
              <h2 className="mt-1 line-clamp-2 text-xl font-bold text-white">{product.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{product.description}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-right">
              <p className="text-xs text-neutral-500">Giá hiện tại</p>
              <p className="text-lg font-bold text-amber-300">{formatCurrency(price)}</p>
              <p className="mt-1 text-xs text-neutral-500">Khởi điểm {formatCurrency(product.startPrice)}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-neutral-500">Hồ sơ tài sản</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                <FileText className="h-4 w-4 text-amber-400" />
                {docsCount} tệp ảnh
              </div>
              <p className="mt-1 text-xs text-neutral-500">Ảnh, video, chứng từ</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-neutral-500">Kiểm định</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                {status === "ready" || status === "active" || status === "sold" ? "Đã sẵn sàng" : "Cần bổ sung"}
              </div>
              <p className="mt-1 text-xs text-neutral-500">Chứng thực trước đấu giá</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-neutral-500">Vòng đời</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                <History className="h-4 w-4 text-blue-300" />
                {product.bidCount} bid
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {status === "active" && product.endsAt ? `Còn ${formatRemainingTime(product.endsAt)}` : formatDateTime(product.updatedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Log & History
            </p>
            <div className="grid gap-2 text-sm text-neutral-300 md:grid-cols-3">
              <span>Nhập kho: {formatDateTime(product.createdAt)}</span>
              <span>Duyệt/lên sàn: {formatDateTime(product.startsAt)}</span>
              <span>Giá cao nhất: {formatCurrency(price)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canList && (
              <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400">
                <Link href={`/auctions/new?inventory=${product.id}`}>
                  <Gavel className="h-4 w-4" />
                  Đưa lên sàn
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
              <Link href={`/auctions/${product.id}`}>
                <PackageCheck className="h-4 w-4" />
                Xem phiên
              </Link>
            </Button>
            {canEdit && (
              <Button asChild variant="outline" className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Link href={`/auctions/new?edit=${product.id}`}>
                  <FileCheck2 className="h-4 w-4" />
                  Chỉnh sửa
                </Link>
              </Button>
            )}
            <Button type="button" variant="outline" className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20">
              <UploadCloud className="h-4 w-4" />
              Yêu cầu kiểm định
            </Button>
            <Button type="button" variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => onDelete(product)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function InventoryClient() {
  const [products, setProducts] = useState<SellerProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [now] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  const loadInventory = () => {
    setLoading(true);
    setError(null);

    listSellerProducts()
      .then((result) => {
        if (!result.success) {
          setError(typeof result.error === "string" ? result.error : "Không thể tải kho tài sản.");
          setProducts([]);
          return;
        }

        setProducts(result.data ?? []);
      })
      .catch(() => {
        setError("Không thể tải kho tài sản. Vui lòng thử lại sau.");
        setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory();
  }, []);

  const enrichedProducts = useMemo(
    () => products.map((product) => ({ product, status: getInventoryStatus(product, now) })),
    [now, products],
  );

  const counts = useMemo(() => {
    const base: Record<InventoryTab, number> = { all: products.length, draft: 0, ready: 0, active: 0, sold: 0, stored: 0 };
    enrichedProducts.forEach(({ status }) => {
      base[status] += 1;
    });
    return base;
  }, [enrichedProducts, products.length]);

  const stats = useMemo(() => {
    const sold = enrichedProducts.filter((item) => item.status === "sold").length;
    const stored = enrichedProducts.filter((item) => item.status === "stored" || item.status === "draft" || item.status === "ready").length;
    return {
      total: products.length,
      active: counts.active,
      sold,
      stored,
    };
  }, [counts.active, enrichedProducts, products.length]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedProducts
      .filter(({ product, status }) => {
        const matchesTab = activeTab === "all" || status === activeTab;
        const matchesSearch =
          !query ||
          product.title.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query);
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => {
        if (sort === "highest-value") return displayPrice(b.product) - displayPrice(a.product);
        if (sort === "most-bids") return b.product.bidCount - a.product.bidCount;
        if (sort === "ending-soon") {
          const aEnd = a.product.endsAt ? new Date(a.product.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
          const bEnd = b.product.endsAt ? new Date(b.product.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
          return aEnd - bEnd;
        }
        return new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime();
      });
  }, [activeTab, enrichedProducts, search, sort]);

  function deleteAsset(product: SellerProductItem) {
    startTransition(async () => {
      const result = await deleteSellerProduct(product.id);
      if (!result.success) {
        toast.error(typeof result.error === "string" ? result.error : "Không thể rút tài sản.");
        return;
      }

      toast.success("Đã rút tài sản khỏi kho hiển thị.");
      loadInventory();
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-zinc-950 to-neutral-950">
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-neutral-900 to-black p-6 shadow-2xl sm:p-8">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-amber-500/5 blur-[100px]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
                <Boxes className="h-3.5 w-3.5 text-amber-400" />
                My Inventory
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Kho của tôi</h1>
              <p className="mt-3 text-neutral-400">
                Quản lý tài sản trước, trong và sau khi đưa lên sàn đấu giá. Theo dõi hồ sơ, kiểm định, lịch sử và thao tác nhanh ở một nơi.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400">
                <Link href="/auctions/new">
                  <PackagePlus className="h-4 w-4" />
                  Thêm tài sản / Đăng bán
                </Link>
              </Button>
              <Button type="button" variant="outline" className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={loadInventory} disabled={loading || isPending}>
                <RefreshCw className={cn("h-4 w-4", (loading || isPending) && "animate-spin")} />
                Làm mới
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <InventorySkeleton />
        ) : error ? (
          <Card className="border-red-500/20 bg-red-500/10 text-red-100">
            <CardContent className="p-8 text-center">
              <p className="font-semibold">Không thể tải Kho của tôi</p>
              <p className="mt-2 text-sm text-red-200/80">{error}</p>
              <Button type="button" variant="outline" className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={loadInventory}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MiniStat title="Tổng số tài sản" value={String(stats.total)} subtitle="Toàn bộ tài sản trong kho" icon={Boxes} />
              <MiniStat title="Tài sản đang đấu giá" value={String(stats.active)} subtitle="Đang mở nhận bid" icon={Gavel} />
              <MiniStat title="Tài sản đã bán" value={String(stats.sold)} subtitle="Có winner hoặc thanh toán" icon={CheckCircle2} />
              <MiniStat title="Tài sản lưu kho" value={String(stats.stored)} subtitle="Nháp, sẵn sàng hoặc cần đăng lại" icon={Archive} />
            </div>

            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                  Bộ lọc tài sản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)}>
                  <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="gap-2 rounded-lg px-3 py-2 text-sm text-neutral-400 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
                      >
                        {tab.label}
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{counts[tab.value]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Tìm theo tên tài sản hoặc mô tả..."
                      className="h-11 border-white/10 bg-black/20 pl-9 text-white placeholder:text-neutral-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                    />
                  </div>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortKey)}
                    className="h-11 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="newest">Mới nhập kho</option>
                    <option value="highest-value">Giá trị cao nhất</option>
                    <option value="most-bids">Nhiều bid nhất</option>
                    <option value="ending-soon">Sắp kết thúc</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {filteredProducts.length === 0 ? (
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <Boxes className="mb-4 h-12 w-12 text-neutral-500" />
                  <h2 className="text-xl font-semibold text-white">Chưa có tài sản phù hợp</h2>
                  <p className="mt-2 max-w-md text-sm text-neutral-400">
                    Thử đổi bộ lọc hoặc bắt đầu thêm tài sản mới vào kho để chuẩn bị đưa lên sàn.
                  </p>
                  <Button asChild className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400">
                    <Link href="/auctions/new">Thêm tài sản đầu tiên</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredProducts.map(({ product, status }) => (
                  <InventoryCard
                    key={product.id}
                    product={product}
                    status={status}
                    onDelete={deleteAsset}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
