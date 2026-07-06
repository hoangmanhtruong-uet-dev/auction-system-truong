"use client";

import { useCallback, useState } from "react";
import { Gavel, Search, Filter, SortDesc } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { AuctionStatus } from "@prisma/client";
import { adminCancelAuction } from "@/src/actions/admin-auctions";

type AdminAuction = {
  id: string;
  title: string;
  seller: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  status: AuctionStatus;
  currentPrice: string;
  endsAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chưa bắt đầu",
  ACTIVE: "Đang diễn ra",
  COMPLETED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const formatCurrency = (price: number): string => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function AdminAuctionsClient({
  initialAuctions,
  error,
}: {
  initialAuctions: AdminAuction[] | null;
  error?: string;
}) {
  const [auctions, setAuctions] = useState<AdminAuction[]>(initialAuctions ?? []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dialogAuctionId, setDialogAuctionId] = useState<string | null>(null);
  const [dialogReason, setDialogReason] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const openCancelDialog = useCallback((auctionId: string) => {
    setDialogAuctionId(auctionId);
    setDialogReason("");
    setDialogError("");
  }, []);

  const handleCancelAuction = useCallback(async () => {
    if (!dialogAuctionId) return;
    if (dialogReason.trim().length < 5) {
      setDialogError("Lý do phải có ít nhất 5 ký tự.");
      return;
    }

    setLoadingId(dialogAuctionId);
    setDialogAuctionId(null);
    try {
      const result = await adminCancelAuction(dialogAuctionId, dialogReason);
      if (result.success) {
        setAuctions((prev) => prev.filter((a) => a.id !== dialogAuctionId));
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setLoadingId(null);
    }
  }, [dialogAuctionId, dialogReason]);

  if (error) {
    return (
      <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý đấu giá</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Xem và quản lý tất cả phiên đấu giá trong hệ thống.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gavel className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive mb-2">Lỗi: {error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!initialAuctions) {
    return (
      <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý đấu giá</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Xem và quản lý tất cả phiên đấu giá trong hệ thống.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mb-4"></div>
            <p className="text-muted-foreground">Đang tải...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredAuctions = auctions.filter((auction) => {
    const matchesSearch =
      auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.seller.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "" || auction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (auctions.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý đấu giá</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Xem và quản lý tất cả phiên đấu giá trong hệ thống.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có phiên đấu giá nào trong hệ thống.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý đấu giá</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Xem và quản lý {auctions.length} phiên đấu giá. Trạng thái được cập nhật theo thời gian thực.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <CardTitle>Tất cả phiên đấu giá</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tiêu đề hoặc người bán..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full sm:w-40 rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PENDING">Chưa bắt đầu</option>
                  <option value="ACTIVE">Đang diễn ra</option>
                  <option value="COMPLETED">Đã kết thúc</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
              <Button variant="outline" size="sm">
                <SortDesc className="h-4 w-4 mr-2" />
                Sắp xếp
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tiêu đề</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Người bán</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Giá hiện tại</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kết thúc</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAuctions.map((auction) => (
                  <tr key={auction.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 max-w-[200px] sm:max-w-[300px] truncate">
                      <Link
                        href={`/auctions/${auction.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {auction.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {auction.seller.avatarUrl ? (
                          <img
                            src={auction.seller.avatarUrl}
                            alt={auction.seller.fullName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">
                              {auction.seller.fullName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="max-w-[100px] sm:max-w-[150px] truncate">{auction.seller.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_COLOR[auction.status]} hover:${STATUS_COLOR[auction.status]}`}>
                        {STATUS_LABEL[auction.status] || auction.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(parseFloat(auction.currentPrice))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {auction.endsAt ? formatDateTime(auction.endsAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {auction.status === "PENDING" || auction.status === "ACTIVE" ? (
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={loadingId === auction.id}
                          onClick={() => openCancelDialog(auction.id)}
                        >
                          {loadingId === auction.id ? "..." : "Hủy"}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAuctions.length === 0 && auctions.length > 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Không tìm thấy kết quả nào.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAuctionId !== null} onOpenChange={(open) => { if (!open) setDialogAuctionId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ phiên đấu giá</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do huỷ phiên đấu giá này. Lý do phải có ít nhất 5 ký tự.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reason">Lý do</Label>
            <Textarea
              id="reason"
              value={dialogReason}
              onChange={(e) => { setDialogReason(e.target.value); setDialogError(""); }}
              placeholder="Nhập lý do huỷ..."
              rows={4}
            />
            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAuctionId(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAuction}
              disabled={loadingId === dialogAuctionId}
            >
              {loadingId === dialogAuctionId ? "..." : "Xác nhận huỷ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}