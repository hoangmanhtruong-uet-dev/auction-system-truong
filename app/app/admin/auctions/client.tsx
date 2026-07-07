"use client";

import { useMemo, useState } from "react";
import { AuctionStatus } from "@prisma/client";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AdminAuction } from "@/src/actions/admin-auctions";

import { AdminDataTable, TableEmptyState, TableErrorState } from "../_components/admin-data-table";
import { AuctionActions } from "../_components/auction-actions";
import { StatusBadge } from "../_components/status-badge";

type PaymentFilter = "all" | "paid" | "unpaid";
type SortMode = "newest" | "ending-soon" | "highest-price";

export function AdminAuctionsClient({
  initialAuctions,
  error,
}: {
  initialAuctions: AdminAuction[] | null;
  error?: string;
}) {
  const [auctions, setAuctions] = useState<AdminAuction[]>(initialAuctions ?? []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AuctionStatus>("all");
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(25);

  const filtered = useMemo(() => {
    return auctions
      .filter((auction) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          auction.title.toLowerCase().includes(query) ||
          auction.seller.fullName.toLowerCase().includes(query) ||
          auction.seller.email.toLowerCase().includes(query);
        const matchesStatus = status === "all" || auction.status === status;
        const matchesPayment =
          payment === "all" ||
          (payment === "paid" && Boolean(auction.paidAt)) ||
          (payment === "unpaid" && auction.status === "COMPLETED" && Boolean(auction.winner) && !auction.paidAt);

        return matchesSearch && matchesStatus && matchesPayment;
      })
      .sort((a, b) => {
        if (sort === "ending-soon") {
          return new Date(a.endsAt ?? 8640000000000000).getTime() - new Date(b.endsAt ?? 8640000000000000).getTime();
        }
        if (sort === "highest-price") {
          return Number(b.currentPrice) - Number(a.currentPrice);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [auctions, payment, search, sort, status]);

  const visibleRows = filtered.slice(0, visibleCount);

  function handleAuctionChanged(id: string, patch: { status?: AuctionStatus; paidAt?: string | null }) {
    setAuctions((current) => current.map((auction) => (auction.id === id ? { ...auction, ...patch } : auction)));
  }

  if (error) {
    return <TableErrorState message={error} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Auctions</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Quản lý phiên đấu giá</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quản lý {auctions.length} auction, theo dõi trạng thái thanh toán và xử lý hủy có audit log.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-[1fr_160px_160px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Tìm title, seller..." />
        </div>
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as "all" | AuctionStatus)}>
          <option value="all">Tất cả status</option>
          <option value="PENDING">PENDING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" value={payment} onChange={(event) => setPayment(event.target.value as PaymentFilter)}>
          <option value="all">Tất cả payment</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
          <option value="newest">Newest</option>
          <option value="ending-soon">Ending soon</option>
          <option value="highest-price">Highest price</option>
        </select>
      </div>

      <AdminDataTable>
        {visibleRows.length === 0 ? (
          <TableEmptyState title="Không có auction phù hợp" description="Thử đổi bộ lọc hoặc kiểm tra dữ liệu auction trong DB." />
        ) : (
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Thumbnail</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Current price</th>
                <th className="px-4 py-3 text-right font-medium">Bids</th>
                <th className="px-4 py-3 font-medium">Starts</th>
                <th className="px-4 py-3 font-medium">Ends</th>
                <th className="px-4 py-3 font-medium">Winner</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map((auction) => (
                <tr key={auction.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div
                      className="size-12 rounded-lg border bg-muted bg-cover bg-center"
                      style={auction.thumbnailUrl ? { backgroundImage: `url(${auction.thumbnailUrl})` } : undefined}
                      aria-label={auction.thumbnailUrl ? `Ảnh ${auction.title}` : "Chưa có ảnh"}
                    />
                  </td>
                  <td className="max-w-64 px-4 py-3">
                    <a href={`/auctions/${auction.id}`} className="line-clamp-2 font-medium hover:underline">{auction.title}</a>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{auction.seller.fullName}</p>
                    <p className="text-xs text-muted-foreground">{auction.seller.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge type="auction" value={auction.status} /></td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(auction.currentPrice)}</td>
                  <td className="px-4 py-3 text-right">{auction.bidCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(auction.startsAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(auction.endsAt)}</td>
                  <td className="px-4 py-3">
                    {auction.winner ? (
                      <>
                        <p className="font-medium">{auction.winner.fullName}</p>
                        <p className="text-xs text-muted-foreground">{auction.winner.email}</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge type="payment" value={auction.paidAt} /></td>
                  <td className="px-4 py-3">
                    <AuctionActions auction={auction} onChanged={handleAuctionChanged} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>

      {filtered.length > visibleCount ? (
        <div className="flex justify-center">
          <button className="rounded-lg border bg-background px-4 py-2 text-sm hover:bg-muted" onClick={() => setVisibleCount((count) => count + 25)}>
            Xem thêm {Math.min(25, filtered.length - visibleCount)} dòng
          </button>
        </div>
      ) : null}
    </div>
  );
}
