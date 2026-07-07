"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AuctionStatus } from "@prisma/client";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Gavel,
  Grid3X3,
  Heart,
  LayoutList,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { ProductStatCard } from "@/app/products/components/stats-card";
import { ProductStatusBadge } from "@/app/products/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDateTime, formatRemainingTime } from "@/lib/utils";
import {
  deleteSellerProduct,
  listSellerProducts,
  type SellerProductItem,
} from "@/src/actions/auction";

type ProductTab = "all" | "draft" | "upcoming" | "active" | "ended" | "sold" | "cancelled";
type SortKey = "newest" | "highest-start" | "most-bids" | "ending-soon" | "ended-recent";
type ViewMode = "grid" | "table";

const statusFilterOptions: Array<{ value: ProductTab; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "draft", label: "Bản nháp" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "active", label: "Đang đấu giá" },
  { value: "ended", label: "Đã kết thúc" },
  { value: "sold", label: "Đã bán" },
  { value: "cancelled", label: "Bị hủy / bị ẩn" },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "highest-start", label: "Giá khởi điểm cao nhất" },
  { value: "most-bids", label: "Nhiều bid nhất" },
  { value: "ending-soon", label: "Sắp kết thúc" },
  { value: "ended-recent", label: "Đã kết thúc gần nhất" },
];

function getDerivedStatus(product: SellerProductItem): ProductTab {
  const now = Date.now();
  const startsAt = product.startsAt ? new Date(product.startsAt).getTime() : null;
  const endsAt = product.endsAt ? new Date(product.endsAt).getTime() : null;

  if (product.status === "CANCELLED") return "cancelled";
  if (product.winnerId) return "sold";
  if (product.status === "PENDING") return startsAt && startsAt > now ? "upcoming" : "draft";
  if (product.status === "ACTIVE") return endsAt && endsAt <= now ? "ended" : "active";
  return "ended";
}

function getShortDescription(description: string) {
  return description.length > 120 ? `${description.slice(0, 120).trim()}...` : description;
}

function ProductsPageHeader({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-neutral-900 to-black p-6 sm:p-8 shadow-2xl">
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Seller dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">Sản phẩm của tôi</h1>
          <p className="mt-3 text-base text-neutral-400">
            Quản lý các sản phẩm và phiên đấu giá bạn đã đăng. Theo dõi bid, lượt quan tâm và trạng thái bán hàng tại một nơi.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20">
            <Link href="/auctions/new">
              <Plus className="h-4 w-4" />
              Đăng sản phẩm
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10">
            <Link href="/help">
              <BookOpen className="h-4 w-4" />
              Xem hướng dẫn đăng bán
            </Link>
          </Button>
          <Button type="button" variant="outline" size="lg" className="gap-2 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Làm mới
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="bg-white/5 border-white/10 p-4">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="mt-4 h-8 w-20 bg-white/10" />
            <Skeleton className="mt-2 h-3 w-32 bg-white/10" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="bg-white/5 border-white/10 overflow-hidden">
            <Skeleton className="h-48 w-full bg-white/10" />
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4 bg-white/10" />
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-8 w-1/2 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProductEmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <Search className="mb-4 h-12 w-12 text-neutral-500" />
          <h3 className="text-xl font-semibold text-white">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            Hãy thử đổi từ khóa, trạng thái hoặc cách sắp xếp để xem nhiều kết quả hơn.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-zinc-900/80 to-black border border-white/10">
      <CardContent className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <div className="flex flex-col justify-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <PackagePlus className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">Bạn chưa đăng sản phẩm nào</h3>
          <p className="mt-3 max-w-xl text-neutral-400">
            Bắt đầu tạo phiên đấu giá đầu tiên để tiếp cận người mua và theo dõi hiệu quả bán hàng ngay trên AutoBid.vn.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20">
              <Link href="/auctions/new">Đăng sản phẩm đầu tiên</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/10 text-neutral-300 hover:text-white hover:bg-white/10">
              <Link href="/help">Xem cách hoạt động</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            "Đăng sản phẩm nhanh với ảnh, giá khởi điểm và thời lượng đấu giá.",
            "Theo dõi lượt bid, giá hiện tại và người thắng theo dữ liệu thật.",
            "Quản lý, xem chi tiết hoặc ẩn phiên không còn phù hợp.",
          ].map((benefit) => (
            <div key={benefit} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
              <p className="text-sm text-neutral-300">{benefit}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductToolbar({
  search,
  setSearch,
  filter,
  setFilter,
  sort,
  setSort,
  view,
  setView,
  onReset,
}: {
  search: string;
  setSearch: (value: string) => void;
  filter: ProductTab;
  setFilter: (value: ProductTab) => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  view: ViewMode;
  setView: (value: ViewMode) => void;
  onReset: () => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên sản phẩm..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:flex">
          <select value={filter} onChange={(event) => setFilter(event.target.value as ProductTab)} className="h-9 rounded-md border border-white/10 bg-white/5 text-white px-3 text-sm focus:border-amber-500/50 focus:ring-amber-500/20 outline-none">
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-zinc-900">{option.label}</option>
            ))}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-9 rounded-md border border-white/10 bg-white/5 text-white px-3 text-sm focus:border-amber-500/50 focus:ring-amber-500/20 outline-none">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-zinc-900">{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant={view === "grid" ? "default" : "outline"} size="icon" onClick={() => setView("grid")} aria-label="Dạng card" className={view === "grid" ? "bg-amber-500 text-white hover:bg-amber-400" : "border-white/10 text-neutral-300 hover:text-white hover:bg-white/10"}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button type="button" variant={view === "table" ? "default" : "outline"} size="icon" onClick={() => setView("table")} aria-label="Dạng bảng" className={view === "table" ? "bg-amber-500 text-white hover:bg-amber-400" : "border-white/10 text-neutral-300 hover:text-white hover:bg-white/10"}>
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" className="gap-2 text-neutral-300 hover:text-white hover:bg-white/10" onClick={onReset}>
            <SlidersHorizontal className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteProductDialog({
  product,
  onCancel,
  onConfirm,
  pending,
}: {
  product: SellerProductItem | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md border border-white/10 bg-zinc-900 shadow-2xl">
        <CardContent className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">Ẩn / xóa sản phẩm?</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Thao tác này sẽ ẩn &ldquo;{product.title}&rdquo; khỏi danh sách công khai. Phiên đang có bid sẽ không thể xóa để đảm bảo toàn vẹn dữ liệu.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="border-white/10 text-neutral-300 hover:text-white hover:bg-white/10">Hủy</Button>
            <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending} className="bg-red-500 hover:bg-red-400 text-white">
              {pending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductCard({ product, onDelete }: { product: SellerProductItem; onDelete: (product: SellerProductItem) => void }) {
  const derived = getDerivedStatus(product);
  const price = product.currentPrice === "0" ? product.startPrice : product.currentPrice;
  const canEdit = product.status === "PENDING" || (product.status === "ACTIVE" && product.bidCount === 0);

  return (
    <Card className="group overflow-hidden bg-gradient-to-br from-zinc-900/90 to-black border border-white/10 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-amber-500/30 hover:bg-zinc-800/90">
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
        {product.thumbnailUrl ? (
          <div className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${product.thumbnailUrl})` }} />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
            <Package className="h-12 w-12 text-neutral-600" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <ProductStatusBadge status={product.status} hasBid={product.bidCount > 0} endsAt={product.endsAt} paidAt={product.paidAt} />
        </div>
        {derived === "active" && product.endsAt && new Date(product.endsAt).getTime() - Date.now() < 30 * 60 * 1000 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-semibold text-white shadow-lg shadow-amber-500/20">
            Sắp kết thúc
          </div>
        )}
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="line-clamp-1 text-lg font-semibold text-white">{product.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{getShortDescription(product.description)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/5 border border-white/5 p-3">
          <div>
            <p className="text-xs text-neutral-500">Giá khởi điểm</p>
            <p className="font-semibold text-white">{formatCurrency(product.startPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Giá hiện tại</p>
            <p className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400">{formatCurrency(price)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-neutral-400"><Gavel className="h-4 w-4 text-amber-400/70" />{product.bidCount} bid</div>
          <div className="flex items-center gap-2 text-neutral-400"><Heart className="h-4 w-4 text-red-400/70" />{product.watchlistCount} theo dõi</div>
          <div className="col-span-2 flex items-center gap-2 text-neutral-400"><Clock className="h-4 w-4 text-neutral-500" />Kết thúc: {formatDateTime(product.endsAt)}</div>
          {derived === "active" && <div className="col-span-2 text-sm font-medium text-amber-400">Còn lại: {formatRemainingTime(product.endsAt)}</div>}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-white/5 p-4">
        <Button asChild size="sm" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20">
          <Link href={`/auctions/${product.id}`}>Xem phiên đấu giá</Link>
        </Button>
        {canEdit && (
          <Button asChild size="sm" variant="outline" className="border-white/10 text-neutral-300 hover:text-white hover:bg-white/10">
            <Link href={`/auctions/new?edit=${product.id}`}>Chỉnh sửa</Link>
          </Button>
        )}
        {derived === "ended" && (
          <Button asChild size="sm" variant="outline" className="border-white/10 text-neutral-300 hover:text-white hover:bg-white/10">
            <Link href="/auctions/new">Đăng lại</Link>
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => onDelete(product)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProductTable({ products, onDelete }: { products: SellerProductItem[]; onDelete: (product: SellerProductItem) => void }) {
  return (
    <Card className="hidden overflow-hidden bg-white/5 border-white/10 lg:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sản phẩm</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Giá hiện tại</th>
              <th className="px-4 py-3 font-medium">Bid</th>
              <th className="px-4 py-3 font-medium">Theo dõi</th>
              <th className="px-4 py-3 font-medium">Kết thúc</th>
              <th className="px-4 py-3 text-right font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-16 rounded-lg bg-cover bg-center bg-neutral-800 border border-white/10" style={product.thumbnailUrl ? { backgroundImage: `url(${product.thumbnailUrl})` } : undefined} />
                    <div>
                      <p className="font-medium text-white">{product.title}</p>
                      <p className="line-clamp-1 text-xs text-neutral-500">{product.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4"><ProductStatusBadge status={product.status} hasBid={product.bidCount > 0} endsAt={product.endsAt} paidAt={product.paidAt} /></td>
                <td className="px-4 py-4 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400">{formatCurrency(product.currentPrice === "0" ? product.startPrice : product.currentPrice)}</td>
                <td className="px-4 py-4 text-neutral-300">{product.bidCount}</td>
                <td className="px-4 py-4 text-neutral-300">{product.watchlistCount}</td>
                <td className="px-4 py-4 text-neutral-400">{formatDateTime(product.endsAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm" className="border-white/10 text-neutral-300 hover:text-white hover:bg-white/10"><Link href={`/auctions/${product.id}`}><Eye className="h-4 w-4" /></Link></Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => onDelete(product)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<SellerProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProductTab>("all");
  const [statusFilter, setStatusFilter] = useState<ProductTab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<SellerProductItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadProducts = () => {
    setLoading(true);
    setError(null);

    listSellerProducts()
      .then((result) => {
        if (!result.success) {
          setError(result.error);
          setProducts([]);
          return;
        }
        setProducts(result.data);
      })
      .catch(() => {
        setError("Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.");
        setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const counts = useMemo(() => {
    const base: Record<ProductTab, number> = { all: products.length, draft: 0, upcoming: 0, active: 0, ended: 0, sold: 0, cancelled: 0 };
    products.forEach((product) => {
      base[getDerivedStatus(product)] += 1;
    });
    return base;
  }, [products]);

  const stats = useMemo(() => {
    const totalBids = products.reduce((sum, item) => sum + item.bidCount, 0);
    const totalWatchers = products.reduce((sum, item) => sum + item.watchlistCount, 0);
    const highestValue = products.reduce((max, item) => Math.max(max, Number(item.currentPrice === "0" ? item.startPrice : item.currentPrice)), 0);

    return { totalBids, totalWatchers, highestValue };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    return products
      .filter((product) => {
        const derived = getDerivedStatus(product);
        const tabMatch = activeTab === "all" || derived === activeTab;
        const filterMatch = statusFilter === "all" || derived === statusFilter;
        const searchMatch = !lowerSearch || product.title.toLowerCase().includes(lowerSearch);
        return tabMatch && filterMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sort === "highest-start") return Number(b.startPrice) - Number(a.startPrice);
        if (sort === "most-bids") return b.bidCount - a.bidCount;
        if (sort === "ending-soon") return new Date(a.endsAt ?? 8640000000000000).getTime() - new Date(b.endsAt ?? 8640000000000000).getTime();
        if (sort === "ended-recent") return new Date(b.endsAt ?? 0).getTime() - new Date(a.endsAt ?? 0).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, activeTab, statusFilter, search, sort]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSort("newest");
    setActiveTab("all");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteSellerProduct(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Đã ẩn sản phẩm khỏi danh sách.");
      setDeleteTarget(null);
      loadProducts();
    });
  };

  return (
    <div className="min-h-screen relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8 relative">
        <ProductsPageHeader onRefresh={loadProducts} refreshing={loading} />

        {loading ? (
          <ProductsSkeleton />
        ) : error ? (
          <Card className="bg-red-500/10 border-red-500/30 text-red-200">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-red-400" />
              <h2 className="text-xl font-semibold text-red-200">Không thể tải dữ liệu</h2>
              <p className="mt-2 text-sm text-red-300">{error}</p>
              <Button type="button" variant="outline" className="mt-5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10" onClick={loadProducts}>Thử lại</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ProductStatCard className="bg-white/5 border-white/10" title="Tổng sản phẩm đã đăng" value={String(products.length)} subtitle="Tất cả phiên còn hiển thị" icon={Package} />
              <ProductStatCard className="bg-white/5 border-white/10" title="Đang đấu giá" value={String(counts.active)} subtitle="Có thể nhận bid ngay" icon={Gavel} trend={counts.active > 0 ? "up" : "neutral"} trendValue="Đang mở bán" />
              <ProductStatCard className="bg-white/5 border-white/10" title="Đã kết thúc" value={String(counts.ended)} subtitle="Chờ xử lý hoặc đăng lại" icon={Clock} />
              <ProductStatCard className="bg-white/5 border-white/10" title="Đã bán / có người thắng" value={String(counts.sold)} subtitle="Dựa trên winnerId" icon={Trophy} trend={counts.sold > 0 ? "up" : "neutral"} trendValue="Có chuyển đổi" />
              <ProductStatCard className="bg-white/5 border-white/10" title="Bản nháp" value={String(counts.draft)} subtitle="PENDING chưa mở phiên" icon={PackagePlus} />
              <ProductStatCard className="bg-white/5 border-white/10" title="Tổng lượt bid" value={String(stats.totalBids)} subtitle="Tính từ bảng bids" icon={BarChart3} />
              <ProductStatCard className="bg-white/5 border-white/10" title="Tổng lượt theo dõi" value={String(stats.totalWatchers)} subtitle="Tính từ watchlist" icon={Heart} />
              <ProductStatCard className="bg-white/5 border-white/10" title="Giá trị cao nhất" value={formatCurrency(stats.highestValue)} subtitle="Giá hiện tại/khởi điểm cao nhất" icon={Sparkles} />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductTab)}>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 md:w-auto bg-white/5 border border-white/10">
                {[
                  ["all", "Tất cả"],
                  ["draft", "Bản nháp"],
                  ["upcoming", "Sắp diễn ra"],
                  ["active", "Đang đấu giá"],
                  ["ended", "Đã kết thúc"],
                  ["sold", "Đã bán"],
                  ["cancelled", "Bị hủy"],
                ].map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-2 px-3 py-1.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:shadow-none text-neutral-400"
                  >
                    {label}
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-500">{counts[value as ProductTab]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <ProductToolbar
              search={search}
              setSearch={setSearch}
              filter={statusFilter}
              setFilter={setStatusFilter}
              sort={sort}
              setSort={setSort}
              view={view}
              setView={setView}
              onReset={resetFilters}
            />

            {filteredProducts.length === 0 ? (
              <ProductEmptyState filtered={products.length > 0} />
            ) : view === "table" ? (
              <>
                <ProductTable products={filteredProducts} onDelete={setDeleteTarget} />
                <div className="grid gap-4 lg:hidden">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onDelete={setDeleteTarget} />
                  ))}
                </div>
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onDelete={setDeleteTarget} />
                ))}
              </div>
            )}
          </>
        )}

        <DeleteProductDialog
          product={deleteTarget}
          pending={isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}