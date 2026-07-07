import Link from "next/link";

import { formatCurrency, formatDateTime } from "@/lib/utils";
import { listAdminBids } from "@/src/actions/admin-lists";

import { AdminDataTable, TableEmptyState } from "../_components/admin-data-table";
import { StatusBadge } from "../_components/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminBidsPage() {
  const bids = await listAdminBids();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Bids</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Latest bids</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Read-only log bid mới nhất. Auto-bid đang tắt, không có action tạo hoặc hủy bid trong admin.
        </p>
      </div>
      <AdminDataTable>
        {bids.length === 0 ? (
          <TableEmptyState title="Chưa có bid" description="Các bid manual sẽ xuất hiện tại đây khi người dùng đặt giá." />
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Auction</th>
                <th className="px-4 py-3 font-medium">Bidder</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bids.map((bid) => (
                <tr key={bid.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/auctions/${bid.auction.id}`} className="font-medium hover:underline">
                      {bid.auction.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{bid.auction.status}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{bid.bidder.fullName}</p>
                    <p className="text-xs text-muted-foreground">{bid.bidder.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(bid.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge type="bid" value={bid.status} /></td>
                  <td className="px-4 py-3"><StatusBadge type="autoBid" value={bid.isAutoBid} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(bid.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>
    </div>
  );
}
