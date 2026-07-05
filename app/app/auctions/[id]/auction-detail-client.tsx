"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Gavel,
  Heart,
  Share2,
  Timer,
  Trophy,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { placeBid, cancelAutoBid, type SerializedAuctionDetails } from "@/src/actions/auction";
import type { SafeUser } from "@/src/lib/auth";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { withTimeout } from "@/src/lib/request-utils";

/* ---------- helpers ---------- */

const STATUS_POLL_INTERVAL_MS = 5_000;
const RECONNECT_POLL_INTERVAL_MS = 5_000;

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Sắp diễn ra",
    ACTIVE: "Đang đấu giá",
    COMPLETED: "Đã kết thúc",
    CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "COMPLETED") return "secondary";
  if (status === "CANCELLED") return "destructive";
  return "outline";
}

function getServerNow(): number {
  return Date.now();
}

/* ---------- Countdown ---------- */

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState(() => getLabel(endsAt));

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    function tick() {
      setLabel(getLabel(endsAt));
    }
    tick();
    timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Clock className="h-4 w-4" />
      <span className="tabular-nums">{label}</span>
    </div>
  );
}

function getLabel(endsAt: string) {
  const end = new Date(endsAt).getTime();
  const now = getServerNow();
  const diff = end - now;
  if (diff <= 0) return "Kết thúc";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
}

/* ---------- Gallery ---------- */

function AuctionGallery({
  auction,
}: {
  auction: SerializedAuctionDetails;
}) {
  const [selectedImage, setSelectedImage] = useState(
    auction.thumbnailUrl ?? auction.images[0]?.url ?? null,
  );

  useEffect(() => {
    setSelectedImage(auction.thumbnailUrl ?? auction.images[0]?.url ?? null);
  }, [auction.thumbnailUrl, auction.images]);

  if (!selectedImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted">
        <Image src="/placeholder.svg" alt={auction.title} width={400} height={400} className="rounded-2xl object-cover" priority />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border">
        <Image
          src={selectedImage}
          alt={auction.title}
          width={640}
          height={480}
          className="aspect-square w-full object-cover"
          priority
        />
      </div>
      {auction.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {auction.images.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelectedImage(img.url)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                selectedImage === img.url ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <Image src={img.url} alt={img.altText ?? ""} width={80} height={80} className="size-20 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Tabs ---------- */

function AuctionInfoTabs({
  auction,
  currentPrice,
  minimumBid,
}: {
  auction: SerializedAuctionDetails;
  currentPrice: string;
  minimumBid: string;
}) {
  const [tab, setTab] = useState<"details" | "seller" | "terms">("details");

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex border-b">
        {[
          { key: "details" as const, label: "Chi tiết" },
          { key: "seller" as const, label: "Người bán" },
          { key: "terms" as const, label: "Điều khoản" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4 text-sm leading-relaxed text-muted-foreground">
        {tab === "details" && <p>{auction.description || "Chưa có mô tả chi tiết."}</p>}
        {tab === "seller" && (
          <div className="flex items-center gap-3">
            {auction.seller.avatarUrl && (
              <Image
                src={auction.seller.avatarUrl}
                alt={auction.seller.fullName}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-foreground">{auction.seller.fullName}</p>
              <p className="text-xs">Người bán</p>
            </div>
          </div>
        )}
        {tab === "terms" && (
          <ul className="list-disc pl-5 space-y-1">
            <li>Giá khởi điểm: {formatCurrency(auction.startPrice)}</li>
            <li>Bước giá: {formatCurrency(auction.bidStep)}</li>
            <li>Giá hiện tại: {formatCurrency(currentPrice)}</li>
            <li>Giá tối thiểu: {formatCurrency(minimumBid)}</li>
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Bid History ---------- */

function BidHistory({
  auction,
  isRealtimeConnected,
}: {
  auction: SerializedAuctionDetails;
  isRealtimeConnected: boolean;
}) {
  const [bidLog, setBidLog] = useState(auction.bids);

  useEffect(() => {
    setBidLog(auction.bids);
  }, [auction.bids]);

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Lịch sử đấu giá</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isRealtimeConnected ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span>Đang nhận cập nhật realtime</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Tự động làm mới khi có cập nhật</span>
            </>
          )}
        </div>
      </div>
      <div className="max-h-80 space-y-0 overflow-y-auto">
        {bidLog.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Chưa có lượt đặt giá nào.</p>
        )}
        {bidLog.map((bid, i) => {
          const isWinner = auction.winnerId === bid.bidder.id && auction.status === "COMPLETED";
          const isAuto =
            bid.isAutoBid || (i > 0 && bid.bidder.id === bidLog[i - 1]?.bidder.id && bid.amount === bidLog[i - 1]?.amount);
          return (
            <div
              key={bid.id}
              className={`flex items-center justify-between border-b px-4 py-2.5 last:border-0 ${
                isWinner ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {bid.bidder.avatarUrl ? (
                  <Image
                    src={bid.bidder.avatarUrl}
                    alt={bid.bidder.fullName}
                    width={24}
                    height={24}
                    className="shrink-0 rounded-full"
                  />
                ) : (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {bid.bidder.fullName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 truncate text-sm">
                  <span className="font-medium">{bid.bidder.fullName}</span>
                  {isAuto && (
                    <span className="ml-1.5 text-xs text-primary">(Auto-bid)</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right text-sm">
                <span className="font-semibold tabular-nums">{formatCurrency(bid.amount)}</span>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(bid.createdAt).toLocaleTimeString("vi-VN")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Bid Panel ---------- */

function BidPanel({
  auction,
  currentUser,
  currentPrice,
  minimumBid,
  isEndedByTime,
  onEnded,
  isRealtimeConnected,
  isOffline,
  onPriceChanged,
}: {
  auction: SerializedAuctionDetails;
  currentUser: SafeUser | null;
  currentPrice: string;
  minimumBid: string;
  isEndedByTime: boolean;
  onEnded: () => void;
  isRealtimeConnected: boolean;
  isOffline: boolean;
  onPriceChanged?: () => void;
}) {
  const [bidPrice, setBidPrice] = useState(minimumBid);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAutoBidMode, setIsAutoBidMode] = useState(false);
  const [autoBidMaxPrice, setAutoBidMaxPrice] = useState("");
  // Track last known price to detect changes
  const previousMinimumBidRef = useRef(minimumBid);
  const router = useRouter();

  const isSeller = currentUser?.id === auction.sellerId;
  const isActive = auction.status === "ACTIVE" && !isEndedByTime;
  const bidAmount = bidPrice ? Number(bidPrice) : 0;
  const isBidTooLow = bidPrice !== "" && BigInt(bidPrice) < BigInt(minimumBid);
  const autoBidMaxBidAmount = autoBidMaxPrice ? Number(autoBidMaxPrice) : 0;
  const isAutoBidMaxInvalid = isAutoBidMode && autoBidMaxBidAmount <= bidAmount;

  // Check if user has an active autobid on this auction
  const hasActiveAutoBid = useMemo(() => {
    return auction.bids.some(
      (bid) => bid.isAutoBid && bid.status === "ACTIVE" && bid.bidder.id === currentUser?.id,
    );
  }, [auction.bids, currentUser?.id]);

  // Detect price changes & warn user
  useEffect(() => {
    if (previousMinimumBidRef.current !== minimumBid) {
      const prevMin = previousMinimumBidRef.current;
      previousMinimumBidRef.current = minimumBid;
      if (BigInt(bidPrice || "0") > BigInt("0")) {
        if (BigInt(minimumBid) > BigInt(prevMin)) {
          toast.warning(`Giá đã thay đổi. Giá tối thiểu hiện tại là ${formatCurrency(minimumBid)}.`);
          if (onPriceChanged) onPriceChanged();
        }
      }
    }
  }, [minimumBid, bidPrice, onPriceChanged]);

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
    // Check offline first
    if (isOffline) {
      const msg = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // Validate autobid max price
    if (isAutoBidMode && !autoBidMaxPrice) {
      setError("Vui lòng nhập giá tối đa cho Auto-bid.");
      toast.error("Vui lòng nhập giá tối đa cho Auto-bid.");
      return;
    }

    if (isAutoBidMode && BigInt(autoBidMaxPrice) <= BigInt(minimumBid)) {
      setError(`Giá tối đa phải lớn hơn giá tối thiểu hiện tại (${formatCurrency(minimumBid)}).`);
      toast.error(`Giá tối đa phải lớn hơn giá tối thiểu hiện tại.`);
      return;
    }

    const validationMessage = validateBid();
    if (validationMessage) {
      setError(validationMessage);
      toast.error(validationMessage);
      return;
    }

    // Disable button immediately to prevent double submit
    setIsPending(true);
    setIsConfirmOpen(false);
    setError(null);

    try {
      const result = await placeBid({
        auctionId: auction.id,
        bidPrice: bidAmount,
        isAutoBid: isAutoBidMode,
        autoBidMaxPrice: isAutoBidMode ? autoBidMaxBidAmount : undefined,
        expectedCurrentPrice: currentPrice,
      });

      if (result.success) {
        toast.success(
          isAutoBidMode
            ? `Đã bật Auto-bid thành công! Hệ thống sẽ đặt giá thay bạn đến mức ${formatCurrency(autoBidMaxBidAmount)}.`
            : `Đã đặt giá thành công.`,
        );
        setBidPrice(minimumBid);
        setAutoBidMaxPrice("");
        setIsAutoBidMode(false);
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
    } catch (err) {
      let message = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
      if (err instanceof Error && err.message === "SESSION_EXPIRED") {
        message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      }
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleCancelAutoBid() {
    if (!hasActiveAutoBid) return;

    if (isOffline) {
      toast.error("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn hủy Auto-bid này?")) return;

    setIsPending(true);

    try {
      const result = await cancelAutoBid(auction.id);
      if (result.success) {
        toast.success("Đã hủy Auto-bid thành công.");
        router.refresh();
        return;
      }

      toast.error(typeof result.error === "string" ? result.error : "Không thể hủy Auto-bid.");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setIsPending(false);
    }
  }

  const isSubmitDisabled = isPending || isOffline || !isActive;

  return (
    <>
      <Card className="sticky top-20 overflow-hidden border-primary/10 shadow-lg">
        <CardHeader className="space-y-4 border-b bg-gradient-to-br from-primary/5 to-background">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {formatCurrency(currentPrice)}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Giá hiện tại
              </p>
            </div>
            <Badge variant={getStatusVariant(auction.status) as "default" | "secondary" | "destructive" | "outline"}>
              {getStatusLabel(auction.status)}
            </Badge>
          </div>

          {/* Realtime status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isOffline ? (
              <span className="flex items-center gap-1 text-destructive">
                <WifiOff className="h-3 w-3" />
                Mất kết nối
              </span>
            ) : isRealtimeConnected ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <Wifi className="h-3 w-3" />
                Realtime
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Đang kết nối lại...
              </span>
            )}
          </div>

          {!isEndedByTime && auction.endsAt && (
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>Thời gian còn lại</span>
              </div>
              <CountdownTimer endsAt={auction.endsAt} />
            </div>
          )}

          {auction.status === "ACTIVE" && !isEndedByTime && auction.autoExtensionEnabled && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500" />
              Tự động gia hạn khi có bid vào 2 phút cuối (còn {auction.maxExtensions - auction.currentExtensionCount} lần)
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {!currentUser && (
            <Alert variant="default" className="border-primary/20 bg-primary/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Chưa đăng nhập</AlertTitle>
              <AlertDescription>
                <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Đăng nhập để tiếp tục.
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Offline warning in BidPanel */}
          {isOffline && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Mất kết nối</AlertTitle>
              <AlertDescription>
                Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.
              </AlertDescription>
            </Alert>
          )}

          {/* Session info/expired state handled by parent via currentUser === null check */}
          {currentUser === null && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Phiên đăng nhập đã hết hạn</AlertTitle>
              <AlertDescription>
                <Link href="/auth/login" className="font-medium underline-offset-4 hover:underline">
                  Vui lòng đăng nhập lại.
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {(auction.status === "COMPLETED" || isEndedByTime) && !isOffline && (
            <Alert variant="default">
              <Trophy className="h-4 w-4" />
              <AlertTitle>
                {auction.winnerId === currentUser?.id ? "Chúc mừng! Bạn đã thắng phiên đấu giá này." : "Phiên đấu giá đã kết thúc."}
              </AlertTitle>
              {auction.winnerId && (
                <AlertDescription>
                  {auction.winnerId === currentUser?.id
                    ? "Vui lòng chờ hướng dẫn thanh toán từ người bán."
                    : `Người thắng: ${auction.bids.find((b) => b.bidder.id === auction.winnerId)?.bidder.fullName ?? "Đang cập nhật"}`}
                </AlertDescription>
              )}
            </Alert>
          )}

          {auction.status === "CANCELLED" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Phiên đấu giá đã bị hủy.</AlertTitle>
            </Alert>
          )}

          {currentUser && isActive && !isOffline && (
            <>
              <div>
                <Label htmlFor="bidPrice">Giá đặt của bạn</Label>
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="bidPrice"
                      type="number"
                      inputMode="numeric"
                      min={minimumBid}
                      value={bidPrice}
                      onChange={(e) => {
                        setBidPrice(e.target.value);
                        setError(null);
                      }}
                      disabled={isPending}
                      className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        isBidTooLow ? "border-destructive ring-destructive/20" : ""
                      }`}
                      placeholder={formatCurrency(minimumBid)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      đ
                    </span>
                  </div>
                  <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={isSubmitDisabled || isSeller} className="shrink-0">
                        {isPending ? (
                          <>
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            Đang xử lý
                          </>
                        ) : (
                          <>
                            <Gavel className="mr-1 h-4 w-4" />
                            Đặt giá
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Xác nhận đặt giá</DialogTitle>
                        <DialogDescription>
                          Bạn sắp đặt giá <strong>{formatCurrency(bidPrice)}</strong> cho phiên đấu giá này.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Giá hiện tại</span>
                          <span>{formatCurrency(currentPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Giá đặt của bạn</span>
                          <span className="font-semibold">{formatCurrency(bidPrice)}</span>
                        </div>
                        {isAutoBidMode && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Auto-bid tối đa</span>
                            <span className="font-semibold">{formatCurrency(autoBidMaxBidAmount)}</span>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                          Hủy
                        </Button>
                        <Button disabled={isPending} onClick={submitBid}>
                          {isPending ? "Đang xử lý..." : "Xác nhận"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 5, 10].map((mul) => (
                  <Button key={mul} variant="outline" size="sm" onClick={() => setQuickBid(mul)} disabled={isPending}>
                    +{mul} bước
                  </Button>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="autoBidMode"
                    type="checkbox"
                    checked={isAutoBidMode}
                    onChange={(event) => setIsAutoBidMode(event.target.checked)}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <Label htmlFor="autoBidMode" className="text-sm cursor-pointer">
                    Auto-bid
                  </Label>
                </div>
              </div>
              {isAutoBidMode && (
                <div>
                  <Label htmlFor="autoBidMaxPrice">Giá tối đa Auto-bid</Label>
                  <div className="mt-1.5 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="autoBidMaxPrice"
                        type="number"
                        inputMode="numeric"
                        value={autoBidMaxPrice}
                        onChange={(e) => {
                          setAutoBidMaxPrice(e.target.value);
                          setError(null);
                        }}
                        disabled={isPending}
                        className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          isAutoBidMaxInvalid ? "border-destructive ring-destructive/20" : ""
                        }`}
                        placeholder="Giá tối đa"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        đ
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>

        {currentUser && hasActiveAutoBid && (
          <CardFooter className="flex-col gap-2 border-t bg-muted/30 pt-4">
            <div className="flex w-full items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Auto-bid đang hoạt động
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isPending || !isActive}
              onClick={handleCancelAutoBid}
            >
              {isPending ? "Đang xử lý..." : "Hủy Auto-bid"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}

/* ---------- Main Auction Detail Page Component ---------- */

export default function AuctionDetailClient({
  auction: initialAuction,
  currentUser,
}: {
  auction: SerializedAuctionDetails;
  currentUser: SafeUser | null;
}) {
  const [auction, setAuction] = useState(initialAuction);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isEndedByTime, setIsEndedByTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const currentPrice = useMemo(() => {
    if (auction.bids.length > 0) {
      return auction.bids[auction.bids.length - 1].amount;
    }
    return auction.startPrice;
  }, [auction]);

  const minimumBid = useMemo(() => {
    const price = BigInt(currentPrice) + BigInt(auction.bidStep);
    const step = BigInt(auction.bidStep);
    const remainder = price % step;
    if (remainder === BigInt(0)) return price.toString();
    return (price + step - remainder).toString();
  }, [currentPrice, auction.bidStep]);

  /** Fetch fresh data from server action */
  async function refetchAuction() {
    setIsLoading(true);
    setFetchError(null);

    try {
      const result = await withTimeout(
        async () => {
          // Import server action and use it directly (still a server action, not a fetch)
          const { getAuctionById } = await import("@/src/actions/auction");
          return getAuctionById(auction.id);
        },
        15_000,
      );

      if (result.success && result.data) {
        setAuction(result.data as unknown as SerializedAuctionDetails);
        if (result.data.status === "COMPLETED" || result.data.status === "CANCELLED") {
          if (result.data.status === "COMPLETED") {
            setIsEndedByTime(true);
          }
        }
        toast.success("Dữ liệu vừa được cập nhật.");
      } else {
        setFetchError(typeof result.error === "string" ? result.error : "Không thể tải dữ liệu.");
      }
    } catch (err) {
      setFetchError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  /** Start polling when realtime is disconnected */
  function startPolling() {
    stopPolling();
    pollingRef.current = setInterval(() => {
      refetchAuction();
    }, RECONNECT_POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  // --- EventSource (realtime fallback) ---
  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;

    function connect() {
      if (eventSource) eventSource.close();

      eventSource = new EventSource(`/api/auctions/${auction.id}/stream`);

      eventSource.onopen = () => {
        setIsRealtimeConnected(true);
        reconnectAttempts = 0;
        stopPolling();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "PRICE_UPDATE" || data.type === "BID_PLACED") {
            refetchAuction();
          }
        } catch {
          // silently ignore malformed messages
        }
      };

      eventSource.onerror = () => {
        setIsRealtimeConnected(false);

        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        reconnectAttempts++;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30_000);
      reconnectTimer = setTimeout(() => {
        connect();
      }, delay);
        }

        // Fallback to polling
        startPolling();
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction.id]);

  // --- Refetch on network restore ---
  useEffect(() => {
    if (isOnline) {
      refetchAuction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // --- Refetch on tab focus (visibilitychange) ---
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refetchAuction();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Mark ended by time (check periodically) ---
  useEffect(() => {
    if (auction.status !== "ACTIVE" || !auction.endsAt) return;

    function checkEnded() {
      const now = getServerNow();
      const end = new Date(auction.endsAt!).getTime();
      if (now >= end) {
        setIsEndedByTime(true);
        refetchAuction();
      }
    }

    checkEnded();
    const timer = setInterval(checkEnded, STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction.status, auction.endsAt]);

  // --- Loading state (initial load only) ---
  if (isLoading && !auction) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error state (full page fetch error) ---
  if (fetchError && !auction) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Không thể tải phiên đấu giá</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <span>{fetchError}</span>
            <Button variant="outline" onClick={refetchAuction} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{auction.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mã phiên: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{auction.id}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Yêu thích">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Chia sẻ">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Realtime disconnect badge */}
      {!isRealtimeConnected && !isOnline && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Mất kết nối realtime</AlertTitle>
          <AlertDescription>
            Phiên đấu giá đang dùng cập nhật định kỳ. Một số thông tin có thể chưa được cập nhật kịp thời.
          </AlertDescription>
        </Alert>
      )}

      {/* Data loading indicator */}
      {isLoading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang cập nhật dữ liệu...
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Giá khởi điểm</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(auction.startPrice)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Bước giá</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(auction.bidStep)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Người bán</p>
          <p className="mt-1 text-lg font-bold truncate">{auction.seller.fullName}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Lượt bid</p>
          <p className="mt-1 text-lg font-bold">{auction.bidCount}</p>
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
          isOffline={!isOnline}
          onPriceChanged={() => refetchAuction()}
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