import Link from "next/link";
import { Activity, AlertTriangle, BadgeDollarSign, Clock, Gavel, Users, WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatNumberWithCommas } from "@/lib/utils";
import { getAdminDashboardData } from "@/src/actions/admin-dashboard";

import { AdminDataTable, TableEmptyState } from "./_components/admin-data-table";
import { StatCard } from "./_components/stat-card";
import { StatusBadge } from "./_components/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-amber-400">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Tổng quan vận hành</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-400">
          Theo dõi tình trạng auction, bid và thanh toán thủ công của MVP bằng dữ liệu thật từ hệ thống.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng auctions" value={formatNumberWithCommas(data.stats.totalAuctions)} icon={Gavel} />
        <StatCard title="Đang ACTIVE" value={formatNumberWithCommas(data.stats.activeAuctions)} icon={Activity} tone="success" />
        <StatCard title="Chờ PENDING" value={formatNumberWithCommas(data.stats.pendingAuctions)} icon={Clock} tone="warning" />
        <StatCard title="Đã COMPLETED" value={formatNumberWithCommas(data.stats.completedAuctions)} icon={BadgeDollarSign} />
        <StatCard title="Tổng users" value={formatNumberWithCommas(data.stats.totalUsers)} icon={Users} />
        <StatCard title="Tổng bids" value={formatNumberWithCommas(data.stats.totalBids)} icon={WalletCards} />
        <StatCard
          title="Tổng currentPrice"
          value={formatCurrency(data.stats.totalCurrentValue)}
          helper="Cộng giá hiện tại của các auction chưa xóa"
          icon={BadgeDollarSign}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-white">Recent auctions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable className="border-0 shadow-none">
              {data.recentAuctions.length === 0 ? (
                <TableEmptyState description="Chưa có auction nào trong hệ thống." />
              ) : (
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Auction</th>
                      <th className="px-4 py-3 font-medium">Seller</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Bid</th>
                      <th className="px-4 py-3 font-medium text-right">Giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-neutral-300">
                    {data.recentAuctions.map((auction) => (
                      <tr key={auction.id} className="transition-colors hover:bg-white/5">
                        <td className="px-4 py-3">
                          <Link href={`/auctions/${auction.id}`} className="font-medium text-white hover:text-amber-300 hover:underline">
                            {auction.title}
                          </Link>
                          <p className="text-xs text-neutral-500">Kết thúc: {formatDateTime(auction.endsAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-500">{auction.sellerName}</td>
                        <td className="px-4 py-3"><StatusBadge type="auction" value={auction.status} /></td>
                        <td className="px-4 py-3">{auction.bidCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-300">{formatCurrency(auction.currentPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </AdminDataTable>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-white">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertGroup
              title="Auction sắp hết giờ"
              items={data.alerts.endingSoon.map((item) => ({
                href: `/auctions/${item.id}`,
                title: item.title,
                meta: `${formatDateTime(item.endsAt)} · ${formatCurrency(item.currentPrice)}`,
              }))}
            />
            <AlertGroup
              title="Hoàn tất nhưng chưa paidAt"
              tone="warning"
              items={data.alerts.unpaidCompleted.map((item) => ({
                href: `/admin/payments`,
                title: item.title,
                meta: `${item.winnerName ?? "Chưa rõ winner"} · ${formatCurrency(item.currentPrice)}`,
              }))}
            />
            <AlertGroup
              title="Bị cancel gần đây"
              tone="danger"
              items={data.alerts.recentlyCancelled.map((item) => ({
                href: `/auctions/${item.id}`,
                title: item.title,
                meta: item.cancelReason ?? formatDateTime(item.canceledAt),
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-white">Recent bids</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable className="border-0 shadow-none">
            {data.recentBids.length === 0 ? (
              <TableEmptyState description="Chưa có bid nào được ghi nhận." />
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Auction</th>
                    <th className="px-4 py-3 font-medium">Bidder</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-neutral-300">
                  {data.recentBids.map((bid) => (
                    <tr key={bid.id} className="transition-colors hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link href={`/auctions/${bid.auctionId}`} className="font-medium text-white hover:text-amber-300 hover:underline">
                          {bid.auctionTitle}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{bid.bidderName}</td>
                      <td className="px-4 py-3"><StatusBadge type="autoBid" value={bid.isAutoBid} /></td>
                      <td className="px-4 py-3"><StatusBadge type="bid" value={bid.status} /></td>
                      <td className="px-4 py-3 text-neutral-500">{formatDateTime(bid.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-300">{formatCurrency(bid.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminDataTable>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertGroup({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: Array<{ href: string; title: string; meta: string }>;
  tone?: "default" | "warning" | "danger";
}) {
  const iconClass = tone === "danger" ? "text-red-500" : tone === "warning" ? "text-amber-400" : "text-neutral-400";

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className={`size-4 ${iconClass}`} />
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-white/10 border-dashed bg-white/5 p-3 text-sm text-neutral-500">Không có cảnh báo.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={`${item.href}-${item.title}`} href={item.href} className="block rounded-lg border border-white/10 bg-white/5 p-3 text-sm transition hover:bg-white/10 hover:text-amber-300">
              <span className="line-clamp-1 font-medium text-white">{item.title}</span>
              <span className="mt-1 block line-clamp-1 text-xs text-neutral-500">{item.meta}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}