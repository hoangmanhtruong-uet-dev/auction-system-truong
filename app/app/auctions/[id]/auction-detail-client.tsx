"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Hammer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime, formatRemainingTime } from "@/lib/utils";
import { placeBid, type SerializedAuctionDetails } from "@/src/actions/auction";

type CurrentUser = {
  id: string;
  fullName: string;
};

type AuctionDetailClientProps = {
  auction: SerializedAuctionDetails;
  currentUser: CurrentUser | null;
};

function getStatusLabel(status: SerializedAuctionDetails["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Đang diễn ra";
    case "PENDING":
      return "Sắp diễn ra";
    case "COMPLETED":
      return "Đã kết thúc";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function getStatusClassName(status: SerializedAuctionDetails["status"]) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "COMPLETED":
      return "bg-gray-100 text-gray-600";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

export function AuctionDetailClient({ auction, currentUser }: AuctionDetailClientProps) {
  const [remainingTime, setRemainingTime] = useState("Đang tính...");
  const [bidPrice, setBidPrice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const latestAuctionUpdateRef = useRef(auction.updatedAt);
  const router = useRouter();

  useEffect(() => {
    latestAuctionUpdateRef.current = auction.updatedAt;
  }, [auction.updatedAt]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    const eventSource = new EventSource(`/api/auctions/${auction.id}/stream`);

    eventSource.addEventListener("connected", () => {
      setIsRealtimeConnected(true);
    });

    eventSource.addEventListener("auction:update", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { updatedAt?: string };

        if (payload.updatedAt && payload.updatedAt !== latestAuctionUpdateRef.current) {
          latestAuctionUpdateRef.current = payload.updatedAt;
          router.refresh();
        }
      } catch {
        router.refresh();
      }
    });

    eventSource.onerror = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      setIsRealtimeConnected(false);
      eventSource.close();
    };
  }, [auction.id, router]);

  useEffect(() => {
    if (auction.status !== "ACTIVE") {
      return;
    }

    const firstTick = window.setTimeout(() => {
      setRemainingTime(formatRemainingTime(auction.endsAt));
    }, 0);

    const timer = window.setInterval(() => {
      setRemainingTime(formatRemainingTime(auction.endsAt));
    }, 1000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
    };
  }, [auction.status, auction.endsAt]);

  const currentPrice = useMemo(
    () => (BigInt(auction.currentPrice || 0) > BigInt(0) ? auction.currentPrice : auction.startPrice),
    [auction.currentPrice, auction.startPrice],
  );

  const minimumBid = useMemo(
    () => (BigInt(currentPrice) + BigInt(auction.bidStep)).toString(),
    [auction.bidStep, currentPrice],
  );

  return (
    <div className="container mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div>
          <div
            className="mb-4 h-48 rounded-lg bg-cover bg-center sm:h-64 md:h-80"
            style={{
              backgroundImage: auction.thumbnailUrl ? `url(${auction.thumbnailUrl})` : undefined,
            }}
            aria-label={auction.thumbnailUrl ? auction.title : undefined}
          >
            {!auction.thumbnailUrl && (
              <div className="flex h-full items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-sm text-muted-foreground dark:from-gray-800 dark:to-gray-900">
                Chưa có hình ảnh
              </div>
            )}
          </div>

          {auction.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-3">
              {auction.images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.altText || auction.title}
                  className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(auction.status)}`}>
              {getStatusLabel(auction.status)}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{auction.title}</h1>
            <p className="mt-1 break-all text-sm text-muted-foreground sm:text-base">ID: {auction.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="pt-5 sm:pt-6">
                <p className="text-sm text-muted-foreground">Giá hiện tại</p>
                <p className="mt-1 break-all text-xl font-bold text-blue-600 sm:text-3xl">{formatCurrency(currentPrice)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 sm:pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" />
                  <p className="text-xs text-muted-foreground sm:text-sm">{auction.status === "PENDING" ? "Bắt đầu" : "Còn lại"}</p>
                </div>
                <p className="mt-1 break-words text-xl font-bold text-amber-600 sm:text-2xl">
                  {auction.status === "ACTIVE"
                    ? remainingTime
                    : auction.status === "PENDING"
                      ? "Sắp bắt đầu"
                      : getStatusLabel(auction.status)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Thông tin phiên đấu giá</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Dữ liệu được lấy trực tiếp từ database.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs sm:gap-3 sm:text-sm">
              <div>
                <p className="font-medium">Mô tả</p>
                <p className="text-muted-foreground">{auction.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-medium">Danh mục</p>
                  <p className="text-muted-foreground">Chưa có trường category trong schema</p>
                </div>
                <div>
                  <p className="font-medium">Tình trạng</p>
                  <p className="text-muted-foreground">Chưa có trường condition trong schema</p>
                </div>
                <div>
                  <p className="font-medium">Người bán</p>
                  <p className="text-muted-foreground">{auction.seller.fullName}</p>
                </div>
                <div>
                  <p className="font-medium">Trạng thái</p>
                  <p className="text-muted-foreground">{getStatusLabel(auction.status)}</p>
                </div>
                <div>
                  <p className="font-medium">Giá khởi điểm</p>
                  <p className="text-muted-foreground">{formatCurrency(auction.startPrice)}</p>
                </div>
                <div>
                  <p className="font-medium">Bước giá</p>
                  <p className="text-muted-foreground">{formatCurrency(auction.bidStep)}</p>
                </div>
                <div>
                  <p className="font-medium">Bắt đầu lúc</p>
                  <p className="text-muted-foreground">{formatDateTime(auction.startsAt)}</p>
                </div>
                <div>
                  <p className="font-medium">Kết thúc lúc</p>
                  <p className="text-muted-foreground">{formatDateTime(auction.endsAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

           {auction.status === "ACTIVE" && (
             <Card>
               <CardHeader>
                 <CardTitle>Đặt giá thầu</CardTitle>
                 <CardDescription>Bước giá tối thiểu: {formatCurrency(auction.bidStep)}</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                {!currentUser && (
                  <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                    Bạn cần đăng nhập để đặt giá.{" "}
                    <Link href={`/auth/login?redirect=/auctions/${auction.id}`} className="font-medium underline">
                      Đăng nhập ngay
                    </Link>
                  </div>
                )}

                {currentUser && currentUser.id === auction.sellerId && (
                  <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                    Người bán không thể tự đặt giá cho phiên đấu giá của mình.
                  </div>
                )}

                {currentUser && currentUser.id !== auction.sellerId && (
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                       e.preventDefault();
                       setError(null);

                       if (!currentUser) {
                         setError("Vui lòng đăng nhập để đặt giá");
                         return;
                       }

                       if (currentUser.id === auction.sellerId) {
                         setError("Người bán không thể đặt giá cho phiên của mình");
                         return;
                       }

                        const amount = Number(bidPrice);
                        if (!Number.isSafeInteger(amount) || amount < 1000) {
                          setError("Giá đặt không hợp lệ.");
                          return;
                        }

                        const minimumBidAmount = BigInt(currentPrice) + BigInt(auction.bidStep);
                        if (BigInt(amount) < minimumBidAmount) {
                          setError(`Giá đặt phải lớn hơn hoặc bằng ${formatCurrency(minimumBidAmount)}.`);
                          return;
                        }

                       setIsPending(true);
                      try {
                        const result = await placeBid({
                          auctionId: auction.id,
                          bidPrice: amount,
                          isAutoBid: false,
                          expectedCurrentPrice: currentPrice,
                        });

                        if (result.success) {
                          setBidPrice("");
                          setError(null);
                          router.refresh();
                        } else {
                          setError(typeof result.error === "string" ? result.error : "Dữ liệu đặt giá không hợp lệ");
                          if (result.code === "CURRENT_PRICE_CHANGED") {
                            router.refresh();
                          }
                        }
                      } catch {
                        setError("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
                      } finally {
                        setIsPending(false);
                      }
                     }}
                   >
                     <div className="space-y-2">
                       <Label htmlFor="bid">Số tiền (VND)</Label>
                       <Input
                         id="bid"
                         name="bidPrice"
                         type="number"
                         min="1000"
                         step="1000"
                         placeholder={minimumBid}
                         value={bidPrice}
                         onChange={(e) => setBidPrice(e.target.value)}
                         disabled={isPending}
                       />
                       <p className="text-xs text-muted-foreground">
                         Giá hiện tại: {formatCurrency(currentPrice)} | Giá tối thiểu: {formatCurrency(minimumBid)}
                       </p>
                     </div>

                     <div className="space-y-2 pt-2">
                       <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoBid"
                          name="autoBid"
                          disabled
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="autoBid" className="cursor-not-allowed text-muted-foreground">
                          Auto-bid
                        </Label>
                      </div>
                      <p className="ml-6 text-xs text-muted-foreground">
                        Chức năng auto-bid sẽ được hỗ trợ sau.
                      </p>
                     </div>

                    <Button type="submit" className="w-full" disabled={isPending || !currentUser}>
                      {isPending && <Hammer className="mr-2 h-4 w-4 animate-pulse" />}
                      {isPending ? "Đang xử lý..." : `Đặt giá ${formatCurrency(bidPrice || 0)}`}
                     </Button>

                     {error && (
                       <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                         {error}
                       </div>
                     )}
                   </form>
                 )}
               </CardContent>
             </Card>
           )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Lịch sử đặt giá ({auction.bidCount} lần)</CardTitle>
                  <CardDescription>Hiển thị các bid thật từ bảng bids, mới nhất ở trên.</CardDescription>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                    isRealtimeConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                  title={isRealtimeConnected ? "Đang nhận cập nhật realtime" : "Đang kết nối realtime"}
                >
                  {isRealtimeConnected ? "Realtime" : "Connecting"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auction.bids.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Chưa có lượt đặt giá nào</p>
                ) : (
                  auction.bids.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between border-b py-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold dark:bg-gray-800">
                          {bid.bidder.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{bid.bidder.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(bid.createdAt)}
                            {bid.isAutoBid ? " · Auto-bid" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(bid.amount)}</p>
                        <p className="text-xs text-muted-foreground">{bid.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}