"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { adminMarkAuctionPaid } from "@/src/actions/admin-auctions";

import { AdminDataTable, TableEmptyState } from "../_components/admin-data-table";
import { ConfirmActionDialog } from "../_components/confirm-action-dialog";
import { StatusBadge } from "../_components/status-badge";

type PaymentRow = {
  id: string;
  title: string;
  currentPrice: string;
  finishedAt: string | null;
  paidAt: string | null;
  seller: { fullName: string; email: string };
  winner: { fullName: string; email: string } | null;
  bidCount: number;
};

export function AdminPaymentsClient({ initialPayments }: { initialPayments: PaymentRow[] }) {
  const [rows, setRows] = useState(initialPayments);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("unpaid");
  const [payingId, setPayingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => filter === "all" || (filter === "paid" ? Boolean(row.paidAt) : !row.paidAt));
  }, [filter, rows]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Payments</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Quản lý thanh toán MVP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          MVP hiện xác nhận thanh toán thủ công. Không giả lập cổng thanh toán online khi chưa tích hợp.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Receipt className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Completed auctions có winner</p>
              <p className="text-sm text-muted-foreground">Mark paid sẽ ghi `paidAt` và audit log.</p>
            </div>
          </div>
          <select className="h-9 rounded-lg border bg-background px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as "all" | "paid" | "unpaid")}>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </select>
        </CardContent>
      </Card>

      <AdminDataTable>
        {filtered.length === 0 ? (
          <TableEmptyState title="Không có payment phù hợp" description="Danh sách chỉ gồm auction COMPLETED có winner." />
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Auction</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Winner</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Finished</th>
                <th className="px-4 py-3 font-medium">Payment state</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/auctions/${row.id}`} className="font-medium hover:underline">{row.title}</Link>
                    <p className="text-xs text-muted-foreground">{row.bidCount} bids</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.seller.fullName}</p>
                    <p className="text-xs text-muted-foreground">{row.seller.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.winner?.fullName ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">{row.winner?.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.currentPrice)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.finishedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge type="payment" value={row.paidAt} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" disabled={Boolean(row.paidAt)} onClick={() => setPayingId(row.id)}>
                      Mark paid
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>

      <ConfirmActionDialog
        open={Boolean(payingId)}
        onOpenChange={(open) => setPayingId(open ? payingId : null)}
        title="Xác nhận thanh toán thủ công"
        description="Chỉ xác nhận sau khi đã đối soát thanh toán ngoài hệ thống."
        confirmLabel="Mark paid"
        onConfirm={async () => {
          if (!payingId) return;
          await adminMarkAuctionPaid(payingId);
          setRows((current) => current.map((row) => (row.id === payingId ? { ...row, paidAt: new Date().toISOString() } : row)));
        }}
      />
    </div>
  );
}
