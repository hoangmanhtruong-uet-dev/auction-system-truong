"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Gavel,
  Heart,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  User,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AuctionStatus,
  BidStatus,
  NotificationType,
  UserRole,
} from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime, formatRemainingTime } from "@/lib/utils";
import { logout } from "@/src/actions/auth";
import {
  deleteAccount,
  markAllNotificationsRead,
  updateNotifications,
  updateProfile,
} from "@/src/actions/profile";
import type { SafeUser } from "@/src/lib/auth";
import { toast } from "sonner";

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Người dùng",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
};

const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  PENDING: "Sắp diễn ra",
  ACTIVE: "Đang diễn ra",
  COMPLETED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

const BID_STATUS_LABELS: Record<BidStatus, string> = {
  ACTIVE: "Đang tham gia",
  WON: "Đã thắng",
  LOST: "Đã thua",
  CANCELLED: "Đã hủy",
};

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  AUCTION_CREATED: "Đấu giá",
  AUCTION_ACTIVATED: "Đấu giá",
  AUCTION_ENDING_SOON: "Đấu giá",
  AUCTION_ENDED: "Đấu giá",
  BID_PLACED: "Bid",
  BID_OUTBID: "Bid",
  BID_WON: "Giao dịch",
  SYSTEM: "Hệ thống",
};

type ProfileStats = {
  auctionsCreated: number;
  activeSelling: number;
  bidsPlaced: number;
  auctionsWinning: number;
  auctionsWon: number;
  watchlistCount: number;
  unreadNotifications: number;
  trustScore: number;
  totalBidValue: number;
};

type RecentBid = {
  id: string;
  auctionId: string;
  auctionTitle: string;
  auctionStatus: AuctionStatus;
  auctionCurrentPrice: string;
  auctionEndsAt: string | null;
  auctionImageUrl: string | null;
  amount: string;
  status: BidStatus;
  isAutoBid: boolean;
  createdAt: string;
};

type MyAuction = {
  id: string;
  title: string;
  status: AuctionStatus;
  currentPrice: string;
  startPrice: string;
  endsAt: string | null;
  createdAt: string;
  imageUrl: string | null;
  bidCount: number;
  watchCount: number;
};

type WatchlistItem = {
  id: string;
  createdAt: string;
  auction: {
    id: string;
    title: string;
    status: AuctionStatus;
    currentPrice: string;
    endsAt: string | null;
    imageUrl: string | null;
    bidCount: number;
  };
};

type UserNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  auctionId: string | null;
  auctionTitle: string | null;
};

type AuditLogItem = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
};

type UserPreference = {
  receiveEmailMarketing: boolean;
  receiveEmailAuction: boolean;
  receiveEmailNotification: boolean;
};

type ProfileClientProps = {
  user: SafeUser;
  stats: ProfileStats;
  recentBids: RecentBid[];
  myAuctions: MyAuction[];
  watchlistItems: WatchlistItem[];
  notifications: UserNotification[];
  auditLogs: AuditLogItem[];
  userPreference: UserPreference;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getAuctionStatusClassName(status: AuctionStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
    case "COMPLETED":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }
}

function getBidStatusClassName(status: BidStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
    case "WON":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "LOST":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }
}

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function AuctionThumb({
  src,
  title,
  icon: Icon = Package,
}: {
  src: string | null;
  title: string;
  icon?: React.ElementType;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        className="h-14 w-14 rounded-xl object-cover ring-1 ring-foreground/10 sm:h-16 sm:w-16"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 ring-1 ring-blue-100 dark:from-blue-950/40 dark:to-indigo-950/40 dark:text-blue-300 dark:ring-blue-900/60 sm:h-16 sm:w-16">
      <Icon className="h-6 w-6" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function LoadingPreview() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-3/4" />
    </div>
  );
}

export function ProfileClient({
  user,
  stats,
  recentBids,
  myAuctions,
  watchlistItems,
  notifications,
  auditLogs,
  userPreference,
}: ProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [emailNotifications, setEmailNotifications] = useState(
    userPreference.receiveEmailNotification
  );
  const [bidNotifications, setBidNotifications] = useState(
    userPreference.receiveEmailAuction
  );
  const [marketingNotifications, setMarketingNotifications] = useState(
    userPreference.receiveEmailMarketing
  );
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string[];
    phone?: string[];
    _errors?: string[];
    error?: string;
  }>({});

  const completionItems = useMemo(
    () => [
      { label: "Email đã xác minh", done: user.emailVerified },
      { label: "Có số điện thoại", done: Boolean(user.phone) },
      { label: "Đã tham gia đấu giá", done: stats.bidsPlaced > 0 },
      { label: "Đã theo dõi sản phẩm", done: stats.watchlistCount > 0 },
      { label: "Có hoạt động bán", done: stats.auctionsCreated > 0 },
    ],
    [stats.auctionsCreated, stats.bidsPlaced, stats.watchlistCount, user.emailVerified, user.phone]
  );

  const completedItems = completionItems.filter((item) => item.done).length;
  const hasChanges =
    fullName !== user.fullName ||
    phone !== (user.phone ?? "") ||
    address !== (user.address ?? "") ||
    city !== (user.city ?? "") ||
    bio !== (user.bio ?? "");

  async function handleLogout() {
    setIsLoggingOut(true);
    const result = await logout();
    if (result.success) {
      toast.success("Đã đăng xuất khỏi AutoBid.vn");
      router.push("/");
      router.refresh();
    } else {
      setIsLoggingOut(false);
      toast.error("Đăng xuất thất bại");
    }
  }

  function handleSave() {
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProfile({
        fullName,
        phone,
        address,
        city,
        bio,
      });

      if (result.success) {
        toast.success("Đã cập nhật hồ sơ", {
          description: "Thông tin cá nhân của bạn đã được lưu.",
        });
        setFullName(result.data.fullName);
        setPhone(result.data.phone ?? "");
        setAddress(result.data.address ?? "");
        setCity(result.data.city ?? "");
        setBio(result.data.bio ?? "");
        router.refresh();
        return;
      }

      setFieldErrors({ error: result.error });
      toast.error(result.error);
    });
  }

  function handlePlaceholderAction(message: string) {
    toast.info(message, {
      description: "UI đã sẵn sàng, cần bổ sung API/backend ở bước tiếp theo.",
    });
  }

  function handleSaveNotificationSettings() {
    startTransition(async () => {
      const result = await updateNotifications({
        receiveEmailNotification: emailNotifications,
        receiveEmailAuction: bidNotifications,
        receiveEmailMarketing: marketingNotifications,
      });

      if (result.success) {
        toast.success("Đã lưu cài đặt thông báo");
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  }

  function handleMarkAllNotificationsRead() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();

      if (result.success) {
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  }

  function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Bạn chắc chắn muốn xóa tài khoản? Hồ sơ sẽ bị vô hiệu hóa và bạn cần liên hệ quản trị viên để khôi phục."
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteAccount();

      if (result.success) {
        await logout();
        toast.success("Tài khoản đã được vô hiệu hóa");
        router.push("/");
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-background to-background">
      <div className="container mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Account Center
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Hồ sơ của tôi
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Quản lý thông tin cá nhân, bảo mật, hoạt động đấu giá, sản phẩm,
              watchlist và thông báo trong một trung tâm tài khoản thống nhất.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/auctions">
                Khám phá đấu giá
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auctions/new">
                <Package className="mr-2 h-4 w-4" />
                Tạo phiên mới
              </Link>
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-blue-100 bg-background/95 shadow-sm dark:border-blue-950/50">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-95" />
          <CardContent className="relative pt-24">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative -mt-12">
                  <Avatar className="h-28 w-28 border-4 border-background bg-background shadow-xl">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
                    <AvatarFallback className="bg-blue-600 text-2xl font-bold text-white">
                      {getInitials(user.fullName) || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() =>
                      handlePlaceholderAction("Chức năng đổi ảnh đại diện chưa kết nối backend")
                    }
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-lg ring-1 ring-foreground/10 transition hover:scale-105 hover:bg-muted"
                    aria-label="Đổi ảnh đại diện"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                      {user.fullName}
                    </h2>
                    <Badge className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    <Badge
                      className={
                        user.emailVerified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                      }
                    >
                      {user.emailVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Tham gia {formatDateTime(user.createdAt)}
                    </span>
                  </div>
                  <div className="mt-4 grid max-w-xl grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold">{stats.bidsPlaced}</p>
                      <p className="text-xs text-muted-foreground">Bid đã đặt</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold">{stats.auctionsCreated}</p>
                      <p className="text-xs text-muted-foreground">Phiên đã tạo</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold">{stats.trustScore}/100</p>
                      <p className="text-xs text-muted-foreground">Uy tín</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:pb-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    document
                      .querySelector('[data-value="personal"]')
                      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Chỉnh sửa hồ sơ
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    handlePlaceholderAction("Chức năng đổi mật khẩu chưa được triển khai")
                  }
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Đổi mật khẩu
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={isLoggingOut || isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Phiên đã tạo",
              value: stats.auctionsCreated,
              icon: Gavel,
              tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
              hint: `${stats.activeSelling} đang diễn ra`,
            },
            {
              label: "Tổng lượt bid",
              value: stats.bidsPlaced,
              icon: TrendingUp,
              tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
              hint: formatCurrency(stats.totalBidValue),
            },
            {
              label: "Phiên đang dẫn đầu",
              value: stats.auctionsWinning,
              icon: Trophy,
              tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
              hint: `${stats.auctionsWon} phiên đã thắng`,
            },
            {
              label: "Watchlist",
              value: stats.watchlistCount,
              icon: Heart,
              tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
              hint: `${stats.unreadNotifications} thông báo chưa đọc`,
            },
          ].map((item) => (
            <Card
              key={item.label}
              className="transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="gap-5">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto w-max justify-start rounded-2xl bg-muted/70 p-1">
              {[
                ["overview", LayoutDashboard, "Tổng quan"],
                ["personal", User, "Thông tin"],
                ["security", ShieldCheck, "Bảo mật"],
                ["activity", Activity, "Đấu giá"],
                ["products", Package, "Sản phẩm"],
                ["watchlist", Heart, "Watchlist"],
                ["notifications", Bell, "Thông báo"],
                ["settings", Settings, "Cài đặt"],
              ].map(([value, Icon, label]) => (
                <TabsTrigger
                  key={String(value)}
                  value={String(value)}
                  className="h-10 px-3"
                >
                  <Icon className="h-4 w-4" />
                  <span>{String(label)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Hoạt động gần đây</CardTitle>
                  <CardDescription>
                    Dòng thời gian tổng hợp từ bid, sản phẩm và audit log thật.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentBids.length === 0 && auditLogs.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="Chưa có hoạt động"
                      description="Khi bạn đặt giá, tạo phiên đấu giá hoặc cập nhật hồ sơ, hoạt động sẽ xuất hiện tại đây."
                      action={
                        <Button asChild>
                          <Link href="/auctions">Khám phá phiên đấu giá</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {recentBids.slice(0, 4).map((bid) => (
                        <div key={bid.id} className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                            <Gavel className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 border-b pb-4 last:border-0">
                            <p className="font-medium">
                              Đã đặt {formatCurrency(bid.amount)} cho{" "}
                              <Link
                                href={`/auctions/${bid.auctionId}`}
                                className="text-blue-600 hover:underline"
                              >
                                {bid.auctionTitle}
                              </Link>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(bid.createdAt)}
                              {bid.isAutoBid ? " · Auto-bid" : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                      {auditLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 border-b pb-4 last:border-0">
                            <p className="font-medium">
                              {log.action.replaceAll("_", " ").toLowerCase()}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {log.resourceType} · {formatDateTime(log.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle>Độ hoàn thiện hồ sơ</CardTitle>
                    <CardDescription>
                      Hoàn thiện thêm thông tin để tăng độ tin cậy khi giao dịch.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{completedItems}/5 mục</span>
                        <span className="text-muted-foreground">
                          {Math.round((completedItems / 5) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${(completedItems / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {completionItems.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-2 text-sm"
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={
                              item.done ? "text-foreground" : "text-muted-foreground"
                            }
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mẹo sử dụng AutoBid</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      • Theo dõi sản phẩm để nhận thông báo khi phiên sắp kết thúc.
                    </p>
                    <p>
                      • Đặt bid sớm giúp hệ thống ghi nhận hoạt động và tăng uy tín.
                    </p>
                    <p>
                      • Người bán nên thêm hình ảnh rõ ràng và mô tả chi tiết.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <OverviewList
                title="Phiên đã tham gia"
                items={recentBids.slice(0, 3)}
                emptyIcon={Gavel}
                emptyText="Chưa tham gia phiên nào"
                render={(bid) => (
                  <AuctionMiniRow
                    key={bid.id}
                    href={`/auctions/${bid.auctionId}`}
                    imageUrl={bid.auctionImageUrl}
                    title={bid.auctionTitle}
                    subtitle={`${formatCurrency(bid.amount)} · ${BID_STATUS_LABELS[bid.status]}`}
                  />
                )}
              />
              <OverviewList
                title="Đang theo dõi"
                items={watchlistItems.slice(0, 3)}
                emptyIcon={Heart}
                emptyText="Watchlist đang trống"
                render={(item) => (
                  <AuctionMiniRow
                    key={item.id}
                    href={`/auctions/${item.auction.id}`}
                    imageUrl={item.auction.imageUrl}
                    title={item.auction.title}
                    subtitle={`${formatCurrency(item.auction.currentPrice)} · ${formatRemainingTime(item.auction.endsAt)}`}
                  />
                )}
              />
              <OverviewList
                title="Thông báo mới"
                items={notifications.slice(0, 3)}
                emptyIcon={Bell}
                emptyText="Không có thông báo"
                render={(item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      {!item.readAt ? (
                        <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  </div>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="personal" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Thông tin cá nhân được lưu trực tiếp xuống bảng profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Họ và tên</Label>
                    <Input
                      id="fullName"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={isPending}
                      aria-invalid={Boolean(fieldErrors.fullName?.length)}
                    />
                    {fieldErrors.fullName?.[0] ? (
                      <p className="text-xs text-destructive">
                        {fieldErrors.fullName[0]}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user.email} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      placeholder="+84 912 345 678"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={isPending}
                      aria-invalid={Boolean(fieldErrors.phone?.length)}
                    />
                    {fieldErrors.phone?.[0] ? (
                      <p className="text-xs text-destructive">
                        {fieldErrors.phone[0]}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <Input id="role" value={ROLE_LABELS[user.role]} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Tỉnh / thành phố</Label>
                    <Input
                      id="city"
                      placeholder="Hà Nội"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Địa chỉ</Label>
                    <Input
                      id="address"
                      placeholder="Quận Cầu Giấy, Hà Nội"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bio">Giới thiệu ngắn</Label>
                  <textarea
                    id="bio"
                    placeholder="Chia sẻ ngắn về kinh nghiệm mua/bán đấu giá của bạn..."
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="min-h-28 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                {fieldErrors.error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {fieldErrors.error}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFullName(user.fullName);
                      setPhone(user.phone ?? "");
                      setAddress(user.address ?? "");
                      setCity(user.city ?? "");
                      setBio(user.bio ?? "");
                      setFieldErrors({});
                    }}
                    disabled={isPending}
                  >
                    Hủy thay đổi
                  </Button>
                  <Button onClick={handleSave} disabled={isPending || !hasChanges}>
                    {isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bảo mật tài khoản</CardTitle>
                  <CardDescription>
                    Quản lý mật khẩu, xác minh và thiết bị đăng nhập.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SecurityRow
                    icon={Mail}
                    title="Xác minh email"
                    description={user.email}
                    status={user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
                    verified={user.emailVerified}
                  />
                  <SecurityRow
                    icon={WalletCards}
                    title="Số điện thoại"
                    description={user.phone ?? "Chưa thêm số điện thoại"}
                    status={user.phone ? "Đã thêm" : "Cần bổ sung"}
                    verified={Boolean(user.phone)}
                  />
                  <SecurityRow
                    icon={Lock}
                    title="Mật khẩu"
                    description="Cập nhật định kỳ để bảo vệ tài khoản"
                    status="Đang hoạt động"
                    verified
                  />
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <Button
                      onClick={() =>
                        handlePlaceholderAction("Chức năng đổi mật khẩu chưa có API")
                      }
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Đổi mật khẩu
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handlePlaceholderAction(
                          "Chức năng đăng xuất khỏi tất cả thiết bị chưa có API"
                        )
                      }
                    >
                      Đăng xuất tất cả thiết bị
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phiên đăng nhập gần đây</CardTitle>
                  <CardDescription>
                    Placeholder UI cho lịch sử thiết bị và phiên đăng nhập.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ["Windows 11 · Chrome", "Thiết bị hiện tại", "Đang hoạt động"],
                    ["Mobile browser", "Ước tính từ phiên gần đây", "Placeholder"],
                  ].map(([device, meta, status]) => (
                    <div
                      key={device}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{device}</p>
                          <p className="text-xs text-muted-foreground">{meta}</p>
                        </div>
                      </div>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        {status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Hoạt động đấu giá</CardTitle>
                <CardDescription>
                  Lịch sử bid gần đây được lấy trực tiếp từ bảng bids.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentBids.length === 0 ? (
                  <EmptyState
                    icon={Gavel}
                    title="Bạn chưa đặt bid nào"
                    description="Các phiên đã tham gia, đang thắng, đã thắng hoặc đã thua sẽ được hiển thị tại đây."
                    action={<Button asChild><Link href="/auctions">Tìm phiên đấu giá</Link></Button>}
                  />
                ) : (
                  <div className="space-y-3">
                    {recentBids.map((bid) => (
                      <div
                        key={bid.id}
                        className="flex flex-col gap-3 rounded-2xl border p-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 gap-3">
                          <AuctionThumb src={bid.auctionImageUrl} title={bid.auctionTitle} icon={Gavel} />
                          <div className="min-w-0">
                            <Link
                              href={`/auctions/${bid.auctionId}`}
                              className="font-semibold hover:text-blue-600 hover:underline"
                            >
                              {bid.auctionTitle}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge className={getBidStatusClassName(bid.status)}>
                                {BID_STATUS_LABELS[bid.status]}
                              </Badge>
                              <Badge className={getAuctionStatusClassName(bid.auctionStatus)}>
                                {AUCTION_STATUS_LABELS[bid.auctionStatus]}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(bid.createdAt)}
                              {bid.isAutoBid ? " · Auto-bid" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-muted-foreground">Giá đã đặt</p>
                          <p className="font-bold">{formatCurrency(bid.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Hiện tại: {formatCurrency(bid.auctionCurrentPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Sản phẩm của tôi</CardTitle>
                <CardDescription>
                  Danh sách phiên đấu giá do bạn tạo, kèm trạng thái và hành động nhanh.
                </CardDescription>
                <CardAction>
                  <Button asChild size="sm">
                    <Link href="/auctions/new">Tạo phiên</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {myAuctions.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Chưa có sản phẩm"
                    description="Bắt đầu tạo phiên đấu giá đầu tiên để sản phẩm xuất hiện trong trung tâm tài khoản."
                    action={<Button asChild><Link href="/auctions/new">Tạo phiên đấu giá</Link></Button>}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {myAuctions.map((auction) => (
                      <div key={auction.id} className="rounded-2xl border p-3 transition hover:shadow-sm">
                        <div className="flex gap-3">
                          <AuctionThumb src={auction.imageUrl} title={auction.title} />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/auctions/${auction.id}`}
                              className="font-semibold hover:text-blue-600 hover:underline"
                            >
                              {auction.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className={getAuctionStatusClassName(auction.status)}>
                                {AUCTION_STATUS_LABELS[auction.status]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {auction.bidCount} bid · {auction.watchCount} theo dõi
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-bold">
                              {formatCurrency(auction.currentPrice)}
                            </p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/auctions/${auction.id}`}>
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Xem
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlaceholderAction("Chỉnh sửa phiên chưa có UI/API")}
                          >
                            Chỉnh sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlaceholderAction("Đăng lại phiên chưa có API")}
                          >
                            Đăng lại
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watchlist" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Watchlist / Yêu thích</CardTitle>
                <CardDescription>
                  Các phiên đang theo dõi, giá hiện tại và thời gian còn lại.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {watchlistItems.length === 0 ? (
                  <EmptyState
                    icon={Heart}
                    title="Watchlist đang trống"
                    description="Theo dõi phiên đấu giá bạn quan tâm để quay lại nhanh và nhận thông báo."
                    action={<Button asChild><Link href="/auctions">Khám phá đấu giá</Link></Button>}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {watchlistItems.map((item) => (
                      <div key={item.id} className="rounded-2xl border p-3 transition hover:bg-muted/30">
                        <div className="flex gap-3">
                          <AuctionThumb src={item.auction.imageUrl} title={item.auction.title} icon={Heart} />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/auctions/${item.auction.id}`}
                              className="font-semibold hover:text-blue-600 hover:underline"
                            >
                              {item.auction.title}
                            </Link>
                            <p className="mt-1 text-sm font-bold">
                              {formatCurrency(item.auction.currentPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.auction.bidCount} bid · {formatRemainingTime(item.auction.endsAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/auctions/${item.auction.id}`}>Xem chi tiết</Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlaceholderAction("Bỏ theo dõi chưa có server action")}
                          >
                            Bỏ theo dõi
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Thông báo</CardTitle>
                <CardDescription>
                  Phân loại thông báo đấu giá, hệ thống và giao dịch.
                </CardDescription>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllNotificationsRead}
                    disabled={notifications.length === 0}
                  >
                    Đánh dấu tất cả là đã đọc
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="Không có thông báo"
                    description="Thông báo về bid, phiên sắp kết thúc và hệ thống sẽ xuất hiện tại đây."
                  />
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`rounded-2xl border p-4 ${
                          notification.readAt ? "bg-background" : "bg-blue-50/60 dark:bg-blue-950/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                                {NOTIFICATION_TYPE_LABELS[notification.type]}
                              </Badge>
                              {!notification.readAt ? (
                                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  Chưa đọc
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-2 font-semibold">{notification.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatDateTime(notification.createdAt)}
                            </p>
                          </div>
                          {notification.auctionId ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/auctions/${notification.auctionId}`}>Xem</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt thông báo</CardTitle>
                  <CardDescription>
                    Tùy chọn được lưu trực tiếp xuống bảng user_preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    title="Nhận email thông báo"
                    description="Cập nhật quan trọng về tài khoản và giao dịch"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                  <ToggleRow
                    title="Thông báo đấu giá"
                    description="Bid mới, bị vượt giá, phiên sắp kết thúc"
                    checked={bidNotifications}
                    onChange={setBidNotifications}
                  />
                  <ToggleRow
                    title="Email marketing"
                    description="Gợi ý phiên nổi bật và tin tức AutoBid.vn"
                    checked={marketingNotifications}
                    onChange={setMarketingNotifications}
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveNotificationSettings}
                    disabled={isPending}
                  >
                    Lưu cài đặt
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900/60">
                <CardHeader>
                  <CardTitle className="text-red-700 dark:text-red-300">
                    Danger zone
                  </CardTitle>
                  <CardDescription>
                    Các thao tác nhạy cảm cần xác nhận và backend riêng.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    Xóa tài khoản sẽ vô hiệu hóa hồ sơ bằng cơ chế soft delete.
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isPending}
                  >
                    Xóa tài khoản
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col gap-3 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Loading state mẫu cho các khu vực sẽ fetch dữ liệu async phía client:
              </span>
              <div className="w-full max-w-xs">
                <LoadingPreview />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewList<T>({
  title,
  items,
  emptyIcon,
  emptyText,
  render,
}: {
  title: string;
  items: T[];
  emptyIcon: React.ElementType;
  emptyText: string;
  render: (item: T) => React.ReactNode;
}) {
  const EmptyIcon = emptyIcon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <EmptyIcon className="mx-auto mb-2 h-5 w-5" />
            {emptyText}
          </div>
        ) : (
          items.map(render)
        )}
      </CardContent>
    </Card>
  );
}

function AuctionMiniRow({
  href,
  imageUrl,
  title,
  subtitle,
}: {
  href: string;
  imageUrl: string | null;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-xl border p-3 transition hover:bg-muted/40"
    >
      <AuctionThumb src={imageUrl} title={title} />
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

function SecurityRow({
  icon: Icon,
  title,
  description,
  status,
  verified,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  status: string;
  verified: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-full bg-muted p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Badge
        className={
          verified
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        }
      >
        {status}
      </Badge>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-muted"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}