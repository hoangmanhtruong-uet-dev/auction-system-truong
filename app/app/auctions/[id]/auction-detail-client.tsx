"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Eye,
  Hammer,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDateTime, formatNumberWithCommas, formatRemainingTime } from "@/lib/utils";
import { placeBid, type SerializedAuctionDetails } from "@/src/actions/auction";

type CurrentUser = {
  id: string;
  fullName: string;
};

type AuctionDetailClientProps = {
  auction: SerializedAuctionDetails;
  currentUser: CurrentUser | null;
};

function getStatusLabel(status: SerializedAuctionDetails["status"], isEndedByTime = false) {
  if (isEndedByTime && status === "ACTIVE") {
    return "Đã kết thúc";
  }

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

function getStatusClassName(status: SerializedAuctionDetails["status"], isEndedByTime = false) {
  if (isEndedByTime && status === "ACTIVE") {
    return "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300";
  }

  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "COMPLETED":
      return "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
    default:
      return "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300";
  }
}

function parseVndInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }

  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized || "0";
}

function maskBidderName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Người dùng AutoBid";
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0].slice(0, 1)}***`;
  }

  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}***`;
}

function splitDescription(description: string) {
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      overview: ["Người bán chưa cập nhật mô tả chi tiết cho sản phẩm này."],
      bullets: [],
    };
  }

  const overview = lines.length > 1 ? lines.slice(0, 2) : [description.trim()];
  const bullets = lines.length > 1 ? lines.slice(2) : [];

  return { overview, bullets };
}

function CountdownTimer({
  endsAt,
  status,
  onEnded,
}: {
  endsAt: string | null;
  status: SerializedAuctionDetails["status"];
  onEnded: () => void;
}) {
  const [label, setLabel] = useState(status === "ACTIVE" ? "Đang tính..." : getStatusLabel(status));

  useEffect(() => {
    if (status !== "ACTIVE") {
      setLabel(getStatusLabel(status));
      return;
    }

    const tick = () => {
      const nextLabel = formatRemainingTime(endsAt);
      setLabel(nextLabel);

      if (nextLabel === "Đã kết thúc") {
        onEnded();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt, onEnded, status]);

  return <span>{status === "PENDING" ? "Sắp bắt đầu" : label}</span>;
}

function AuctionStatusBadge({
  status,
  isEndedByTime,
}: {
  status: SerializedAuctionDetails["status"];
  isEndedByTime: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
        status,
        isEndedByTime,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getStatusLabel(status, isEndedByTime)}
    </span>
  );
}

function AuctionGallery({ auction }: { auction: SerializedAuctionDetails }) {
  const [selectedImage, setSelectedImage] = useState(auction.thumbnailUrl ?? auction.images[0]?.url ?? null);

  useEffect(() => {
    setSelectedImage(auction.thumbnailUrl ?? auction.images[0]?.url ?? null);
  }, [auction.images, auction.thumbnailUrl]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border bg-muted/40 shadow-sm">
        {selectedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selectedImage} alt={auction.title} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
            <p className="text-sm font-medium">Chưa có ảnh sản phẩm</p>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <AuctionStatusBadge status={auction.status} isEndedByTime={false} />
        </div>
      </div>

      {auction.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {auction.images.map((image) => (
            <button
              type="button"
              key={image.id}
              onClick={() => setSelectedImage(image.url)}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted transition hover:opacity-90 ${
                selectedImage === image.url ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.altText || auction.title} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BidHistory({
  auction,
  isRealtimeConnected,
}: {
  auction: SerializedAuctionDetails;
  isRealtimeConnected: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Lịch sử đặt giá ({auction.bidCount} lần)</CardTitle>
            <CardDescription>Bid mới nhất hiển thị ở trên, thông tin người đặt được rút gọn.</CardDescription>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isRealtimeConnected
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isRealtimeConnected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
            {isRealtimeConnected ? "Realtime" : "Đang kết nối"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {auction.bids.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Hammer className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-medium">Chưa có lượt đặt giá</p>
            <p className="mt-1 text-sm text-muted-foreground">Hãy là người đầu tiên tham gia phiên đấu giá này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auction.bids.map((bid, index) => {
              const isLeading = bid.status === "ACTIVE" || bid.bidder.id === auction.winnerId || index === 0;
              return (
                <div
                  key={bid.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition ${
                    isLeading ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20" : "bg-card"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isLeading ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {bid.bidder.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{maskBidderName(bid.bidder.fullName)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(bid.createdAt)}
                        {bid.isAutoBid ? " · Auto-bid" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">{formatCurrency(bid.amount)}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isLeading
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                      }`}
                    >
                      {isLeading ? "Đang dẫn đầu" : bid.status === "CANCELLED" ? "Đã hủy" : "Bị vượt"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuctionInfoTabs({
  auction,
  currentPrice,
  minimumBid,
}: {
  auction: SerializedAuctionDetails;
  currentPrice: string;
  minimumBid: string;
}) {
  const description = splitDescription(auction.description);

  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="description">Mô tả</TabsTrigger>
        <TabsTrigger value="specs">Thông số</TabsTrigger>
        <TabsTrigger value="seller">Người bán</TabsTrigger>
        <TabsTrigger value="policy">Chính sách</TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Mô tả sản phẩm</CardTitle>
            <CardDescription>Thông tin được trình bày lại để dễ theo dõi hơn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <Info className="h-4 w-4 text-primary" />
                Mô tả tổng quan
              </h3>
              <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                {description.overview.map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            {description.bullets.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Chi tiết bổ sung
                </h3>
                <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  {description.bullets.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-lg bg-muted/50 px-3 py-2">
                      {item.replace(/^[-•*]\s*/, "")}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">Tình trạng</p>
                <p className="mt-1 text-sm text-muted-foreground">Chưa cập nhật</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">Phụ kiện đi kèm</p>
                <p className="mt-1 text-sm text-muted-foreground">Theo mô tả và ảnh sản phẩm từ người bán.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="specs" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Thông số phiên đấu giá</CardTitle>
            <CardDescription>Các thông tin quan trọng để ra quyết định đặt giá.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Danh mục", "Chưa phân loại"],
              ["Tình trạng", "Chưa cập nhật"],
              ["Thương hiệu", "Chưa cập nhật"],
              ["Khu vực", "Chưa cập nhật"],
              ["Giá khởi điểm", formatCurrency(auction.startPrice)],
              ["Giá hiện tại", formatCurrency(currentPrice)],
              ["Bước giá tối thiểu", formatCurrency(auction.bidStep)],
              ["Giá tối thiểu tiếp theo", formatCurrency(minimumBid)],
              ["Bắt đầu lúc", formatDateTime(auction.startsAt)],
              ["Kết thúc lúc", formatDateTime(auction.endsAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seller" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin người bán</CardTitle>
            <CardDescription>Thông tin định danh cơ bản của chủ phiên đấu giá.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {auction.seller.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{auction.seller.fullName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Người bán trên AutoBid.vn
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="policy" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Giao nhận & lưu ý kiểm tra</CardTitle>
            <CardDescription>Các lưu ý mặc định cho MVP trước khi có chính sách chi tiết theo từng sản phẩm.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                Chính sách giao nhận
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Người mua và người bán thống nhất phương thức nhận hàng sau khi phiên đấu giá kết thúc.
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Eye className="h-4 w-4 text-primary" />
                Lưu ý kiểm tra
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Kiểm tra ảnh, mô tả và tình trạng thực tế trước khi hoàn tất giao dịch với người bán.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function BidPanel({
  auction,
  currentUser,
  currentPrice,
  minimumBid,
  isEndedByTime,
  onEnded,
  isRealtimeConnected,
}: {
  auction: SerializedAuctionDetails;
  currentUser: CurrentUser | null;
  currentPrice: string;
  minimumBid: string;
  isEndedByTime: boolean;
  onEnded: () => void;
  isRealtimeConnected: boolean;
}) {
  const [bidPrice, setBidPrice] = useState(minimumBid);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const router = useRouter();

  const isSeller = currentUser?.id === auction.sellerId;
  const isActive = auction.status === "ACTIVE" && !isEndedByTime;
  const bidAmount = bidPrice ? Number(bidPrice) : 0;
  const isBidTooLow = bidPrice !== "" && BigInt(bidPrice) < BigInt(minimumBid);

  useEffect(() => {
    if (BigInt(bidPrice || "0") < BigInt(minimumBid)) {
      setError(`Giá tối thiểu đã cập nhật: ${formatCurrency(minimumBid)}.`);
      setBidPrice(minimumBid);
    }
  }, [bidPrice, minimumBid]);

  function setQuickBid(multiplier: number) {
    const next = BigInt(currentPrice) + BigInt(auction.bidStep) * BigInt(multiplier);
    setBidPrice(next.toString());
    setError(null);
  }

  function validateBid() {
    if (!currentUser) {
      return "Bạn cần đăng nhập để đặt giá.";
    }

    if (isSeller) {
      return "Người bán không thể tự đặt giá cho phiên đấu giá của mình.";
    }

    if (!isActive) {
      return "Phiên đấu giá chưa hoạt động hoặc đã kết thúc.";
    }

    if (!bidPrice || !Number.isSafeInteger(bidAmount) || bidAmount <= 0) {
      return "Vui lòng nhập số tiền đặt giá hợp lệ.";
    }

    if (BigInt(bidPrice) < BigInt(minimumBid)) {
      return `Giá đặt phải lớn hơn hoặc bằng ${formatCurrency(minimumBid)}.`;
    }

    return null;
  }

  async function submitBid() {
    const validationMessage = validateBid();
    if (validationMessage) {
      setError(validationMessage);
      toast.error(validationMessage);
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await placeBid({
        auctionId: auction.id,
        bidPrice: bidAmount,
        isAutoBid: false,
        expectedCurrentPrice: currentPrice,
      });

      if (result.success) {
        toast.success(`Đã đặt giá ${result.data?.bidPriceLabel ?? formatCurrency(bidAmount)} thành công.`);
        setBidPrice(minimumBid);
        setIsConfirmOpen(false);
        router.refresh();
        return;
      }

      const message = typeof result.error === "string" ? result.error : "Dữ liệu đặt giá không hợp lệ.";
      setError(message);
      toast.error(message);

      if (result.code === "CURRENT_PRICE_CHANGED" || result.code === "BID_TOO_LOW") {
        router.refresh();
      }
    } catch {
      const message = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Card className="sticky top-20 overflow-hidden border-primary/10 shadow-lg">
        <CardHeader className="space-y-4 border-b bg-gradient-to-br from-primary/5 to-background">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Đặt giá đấu</CardTitle>
              <CardDescription>Giá đặt là cam kết mua nếu bạn thắng phiên.</CardDescription>
            </div>
            <AuctionStatusBadge status={auction.status} isEndedByTime={isEndedByTime} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Giá hiện tại</p>
            <p className="mt-1 break-words text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {formatCurrency(currentPrice)}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Giá khởi điểm</p>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(auction.startPrice)}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Bước giá</p>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(auction.bidStep)}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Tối thiểu tiếp theo</p>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(minimumBid)}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Số lượt bid</p>
              <p className="mt-1 text-sm font-semibold">{auction.bidCount}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-amber-500" />
                {auction.status === "PENDING" ? "Trạng thái" : "Thời gian còn lại"}
              </p>
              <span className="text-sm font-bold text-amber-600">
                <CountdownTimer endsAt={auction.endsAt} status={auction.status} onEnded={onEnded} />
              </span>
            </div>
            {auction.winnerId && (auction.status === "COMPLETED" || isEndedByTime) && (
              <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Phiên đã có người thắng với mức giá {formatCurrency(currentPrice)}.
              </p>
            )}
          </div>

          {!currentUser && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-medium">Bạn cần đăng nhập để đặt giá.</p>
              <Button asChild className="mt-3 w-full">
                <Link href={`/auth/login?redirect=/auctions/${auction.id}`}>Đăng nhập để đặt giá</Link>
              </Button>
            </div>
          )}

          {currentUser && isSeller && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              <p className="font-medium">Bạn là người bán của sản phẩm này.</p>
              <p className="mt-1">Người bán không thể tự đặt giá cho phiên đấu giá của mình.</p>
            </div>
          )}

          {currentUser && !isSeller && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const validationMessage = validateBid();
                if (validationMessage) {
                  setError(validationMessage);
                  toast.error(validationMessage);
                  return;
                }
                setIsConfirmOpen(true);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="bid">Số tiền đặt giá (VND)</Label>
                <Input
                  id="bid"
                  name="bidPrice"
                  inputMode="numeric"
                  placeholder={formatNumberWithCommas(minimumBid)}
                  value={bidPrice ? formatNumberWithCommas(bidPrice) : ""}
                  onChange={(event) => {
                    setBidPrice(parseVndInput(event.target.value));
                    setError(null);
                  }}
                  disabled={isPending || !isActive}
                  className={isBidTooLow ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Tối thiểu: <span className="font-medium">{formatCurrency(minimumBid)}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 5, 10].map((multiplier) => (
                  <Button
                    key={multiplier}
                    type="button"
                    variant="outline"
                    onClick={() => setQuickBid(multiplier)}
                    disabled={isPending || !isActive}
                  >
                    +{multiplier} bước
                  </Button>
                ))}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <input type="checkbox" id="autoBid" disabled className="mt-0.5" />
                    <Label htmlFor="autoBid" className="cursor-not-allowed">
                      Auto-bid <span className="font-medium">(Sắp ra mắt)</span>
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Chức năng auto-bid sẽ được hỗ trợ ở phiên bản sau.</TooltipContent>
              </Tooltip>

              {error && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!isActive && (
                <div className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {auction.status === "PENDING"
                    ? "Phiên đấu giá chưa bắt đầu."
                    : "Phiên đấu giá đã kết thúc. Form đặt giá đã được khóa."}
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={isPending || !isActive}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? "Đang xử lý..." : bidPrice ? `Đặt giá ${formatCurrency(bidAmount)}` : "Đặt giá"}
              </Button>
            </form>
          )}

          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isRealtimeConnected ? "Đang nhận cập nhật realtime" : "Tự động làm mới khi có cập nhật"}
            </span>
            <span>AutoBid.vn</span>
          </div>
        </CardContent>
      </Card>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Xác nhận đặt giá</h2>
                <p className="mt-1 text-sm text-muted-foreground">Vui lòng kiểm tra kỹ thông tin trước khi xác nhận.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsConfirmOpen(false)} disabled={isPending}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sản phẩm</span>
                <span className="max-w-[220px] text-right font-medium">{auction.title}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Giá hiện tại</span>
                <span className="font-medium">{formatCurrency(currentPrice)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Giá bạn đặt</span>
                <span className="font-bold text-primary">{formatCurrency(bidAmount)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Sau khi đặt giá, bạn không thể rút lại. Hãy đảm bảo mức giá phù hợp với ngân sách của bạn.</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="button" onClick={submitBid} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AuctionDetailClient({ auction, currentUser }: AuctionDetailClientProps) {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isEndedByTime, setIsEndedByTime] = useState(false);
  const latestAuctionUpdateRef = useRef(auction.updatedAt);
  const router = useRouter();

  const currentPrice = useMemo(
    () => (BigInt(auction.currentPrice || 0) > BigInt(0) ? auction.currentPrice : auction.startPrice),
    [auction.currentPrice, auction.startPrice],
  );

  const minimumBid = useMemo(
    () => (BigInt(currentPrice) + BigInt(auction.bidStep)).toString(),
    [auction.bidStep, currentPrice],
  );

  useEffect(() => {
    latestAuctionUpdateRef.current = auction.updatedAt;
    setIsEndedByTime(auction.status === "ACTIVE" && auction.endsAt ? new Date(auction.endsAt).getTime() <= Date.now() : false);
  }, [auction.endsAt, auction.status, auction.updatedAt]);

  useEffect(() => {
    if (typeof EventSource !== "undefined") {
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
    }

    const pollingTimer = window.setInterval(() => {
      router.refresh();
    }, 8000);

    return () => window.clearInterval(pollingTimer);
  }, [auction.id, router]);

  return (
    <div className="container mx-auto max-w-7xl overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AuctionStatusBadge status={auction.status} isEndedByTime={isEndedByTime} />
            {isRealtimeConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Realtime
              </span>
            )}
          </div>
          <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{auction.title}</h1>
          <p className="mt-2 break-all text-xs text-muted-foreground sm:text-sm">Mã phiên: {auction.id}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:min-w-72">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Giá hiện tại</p>
            <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(currentPrice)}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Lượt bid</p>
            <p className="mt-1 text-lg font-bold">{auction.bidCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <AuctionGallery auction={auction} />

          <AuctionInfoTabs auction={auction} currentPrice={currentPrice} minimumBid={minimumBid} />

          <BidHistory auction={auction} isRealtimeConnected={isRealtimeConnected} />
        </div>

        <BidPanel
          auction={auction}
          currentUser={currentUser}
          currentPrice={currentPrice}
          minimumBid={minimumBid}
          isEndedByTime={isEndedByTime}
          onEnded={() => setIsEndedByTime(true)}
          isRealtimeConnected={isRealtimeConnected}
        />
      </div>

      <div className="mt-6 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Dữ liệu phiên đấu giá được lấy trực tiếp từ database và tự động làm mới khi có bid mới.
        </p>
      </div>
    </div>
  );
}