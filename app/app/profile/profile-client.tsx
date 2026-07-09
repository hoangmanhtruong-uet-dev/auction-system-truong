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
  Gavel,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  User,
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime, formatRemainingTime } from "@/lib/utils";
import { logout } from "@/src/actions/auth";
import {
  deleteAccount,
  logoutAllDevices,
  markAllNotificationsRead,
  updateAvatar,
  updateNotifications,
  updateProfile,
} from "@/src/actions/profile";
import { sendEmailVerification } from "@/src/actions/profile-email-verification";
import type { SafeUser } from "@/src/lib/auth";
import { toast } from "sonner";

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Người dùng",
  SELLER: "Người bán",
  SUPPORT: "Hỗ trợ",
  MODERATOR: "Điều phối viên",
  FINANCE: "Tài chính",
  ADMIN: "Quản trị viên",
  SUPER_ADMIN: "Quản trị tối cao",
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
        className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10 sm:h-16 sm:w-16"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 text-amber-400 ring-1 ring-amber-500/20 sm:h-16 sm:w-16">
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
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
        <Icon className="h-6 w-6 text-neutral-500" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function LoadingPreview() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full bg-white/5" />
      <Skeleton className="h-14 w-full bg-white/5" />
      <Skeleton className="h-14 w-3/4 bg-white/5" />
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
  const Icon = emptyIcon;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Icon className="h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-500">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-3">{items.map(render)}</div>
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
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
    >
      <AuctionThumb src={imageUrl} title={title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="truncate text-xs text-neutral-400">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
    </Link>
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

  function handleSendEmailVerification() {
    startTransition(async () => {
      const result = await sendEmailVerification();
      if (result.success) {
        toast.success("Đã gửi email xác minh", {
          description: result.data.message,
        });
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
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Account Center
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Hồ sơ của tôi
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400 sm:text-base">
              Quản lý thông tin cá nhân, bảo mật, hoạt động đấu giá, sản phẩm,
              watchlist và thông báo trong một trung tâm tài khoản thống nhất.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link href="/auctions">
                Khám phá đấu giá
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500" asChild>
              <Link href="/auctions/new">
                <Package className="mr-2 h-4 w-4" />
                Tạo phiên mới
              </Link>
            </Button>
          </div>
        </div>

        {/* Profile Hero Card */}
        <Card className="relative mb-6 overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-orange-900/10" />
          <CardContent className="relative pt-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative">
                  <Avatar className="h-28 w-28 border-4 border-white/10 bg-white/5 shadow-xl">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-2xl font-bold text-white">
                      {getInitials(user.fullName) || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-neutral-800 text-white shadow-lg ring-1 ring-white/20 transition hover:scale-105 hover:bg-neutral-700" aria-label="Đổi ảnh đại diện">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isPending}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Ảnh phải nhỏ hơn 2MB");
                          if (e.target) e.target.value = "";
                          return;
                        }
                        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
                        if (!allowedTypes.includes(file.type)) {
                          toast.error("Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP");
                          if (e.target) e.target.value = "";
                          return;
                        }
                        try {
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            const dataUrl = event.target?.result as string;
                            if (dataUrl && dataUrl.length < 200000) {
                              const result = await updateAvatar(dataUrl);
                              if (result.success) {
                                toast.success("Đã cập nhật ảnh đại diện");
                                router.refresh();
                              } else {
                                toast.error(result.error);
                              }
                            } else {
                              toast.error("Ảnh quá lớn để lưu trực tiếp, vui lòng dùng ảnh nhỏ hơn");
                            }
                          };
                          reader.readAsDataURL(file);
                        } catch {
                          toast.error("Lỗi khi xử lý ảnh");
                        } finally {
                          if (e.target) e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {user.fullName}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                      {ROLE_LABELS[user.role]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        user.emailVerified
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {user.emailVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
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
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-lg font-bold text-white">{stats.bidsPlaced}</p>
                      <p className="text-xs text-neutral-400">Bid đã đặt</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-lg font-bold text-white">{stats.auctionsCreated}</p>
                      <p className="text-xs text-neutral-400">Phiên đã tạo</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-lg font-bold text-white">{stats.trustScore}/100</p>
                      <p className="text-xs text-neutral-400">Uy tín</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:pb-1">
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => {
                    document
                      .querySelector('[data-value="personal"]')
                      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Chỉnh sửa hồ sơ
                </Button>
                <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
                  <Link href="/change-password">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Đổi mật khẩu
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
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

        {/* Stat Cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Phiên đã tạo",
              value: stats.auctionsCreated,
              icon: Gavel,
              accent: "from-amber-500/20 to-orange-600/10 text-amber-400",
              hint: `${stats.activeSelling} đang diễn ra`,
            },
            {
              label: "Tổng lượt bid",
              value: stats.bidsPlaced,
              icon: TrendingUp,
              accent: "from-emerald-500/20 to-green-600/10 text-emerald-400",
              hint: formatCurrency(stats.totalBidValue),
            },
            {
              label: "Phiên đang dẫn đầu",
              value: stats.auctionsWinning,
              icon: Trophy,
              accent: "from-amber-500/20 to-yellow-600/10 text-yellow-400",
              hint: `${stats.auctionsWon} phiên đã thắng`,
            },
            {
              label: "Watchlist",
              value: stats.watchlistCount,
              icon: Heart,
              accent: "from-rose-500/20 to-pink-600/10 text-rose-400",
              hint: `${stats.unreadNotifications} thông báo chưa đọc`,
            },
          ].map((item) => (
            <Card
              key={item.label}
              className="border-white/10 bg-white/5 backdrop-blur-sm transition hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-white/5"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-400">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-neutral-500">{item.hint}</p>
                  </div>
                  <div className={`rounded-2xl bg-gradient-to-br p-3 ${item.accent}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="gap-5">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto w-max justify-start rounded-2xl bg-white/5 p-1">
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
                  className="h-10 px-3 text-neutral-400 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300"
                >
                  <Icon className="h-4 w-4" />
                  <span>{String(label)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Hoạt động gần đây</CardTitle>
                  <CardDescription className="text-neutral-400">
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
                        <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500" asChild>
                          <Link href="/auctions">Khám phá phiên đấu giá</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {recentBids.slice(0, 4).map((bid) => (
                        <div key={bid.id} className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                            <Gavel className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 border-b border-white/10 pb-4 last:border-0">
                            <p className="font-medium text-white">
                              Đã đặt {formatCurrency(bid.amount)} cho{" "}
                              <Link
                                href={`/auctions/${bid.auctionId}`}
                                className="text-amber-400 hover:text-amber-300"
                              >
                                {bid.auctionTitle}
                              </Link>
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {formatDateTime(bid.createdAt)}
                              {bid.isAutoBid ? " · Auto-bid" : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                      {auditLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 border-b border-white/10 pb-4 last:border-0">
                            <p className="font-medium text-white">
                              {log.action.replaceAll("_", " ").toLowerCase()}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
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
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Độ hoàn thiện hồ sơ</CardTitle>
                    <CardDescription className="text-neutral-400">
                      Hoàn thiện thêm thông tin để tăng độ tin cậy khi giao dịch.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-white">{completedItems}/5 mục</span>
                        <span className="text-neutral-500">
                          {Math.round((completedItems / 5) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                          style={{ width: `${(completedItems / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {completionItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-sm">
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-neutral-600" />
                          )}
                          <span className={item.done ? "text-white" : "text-neutral-500"}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Mẹo sử dụng AutoBid</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-neutral-400">
                    <p>• Theo dõi sản phẩm để nhận thông báo khi phiên sắp kết thúc.</p>
                    <p>• Đặt bid sớm giúp hệ thống ghi nhận hoạt động và tăng uy tín.</p>
                    <p>• Người bán nên thêm hình ảnh rõ ràng và mô tả chi tiết.</p>
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
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-white">{item.title}</p>
                      {!item.readAt ? (
                        <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-400">
                      {item.message}
                    </p>
                  </div>
                )}
              />
            </div>
          </TabsContent>

          {/* Personal Tab */}
          <TabsContent value="personal" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Thông tin cá nhân</CardTitle>
                <CardDescription className="text-neutral-400">
                  Thông tin cá nhân được lưu trực tiếp xuống bảng profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName" className="text-neutral-300">Họ và tên</Label>
                    <Input
                      id="fullName"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={isPending}
                      className="border-white/10 bg-black/20 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                      aria-invalid={Boolean(fieldErrors.fullName?.length)}
                    />
                    {fieldErrors.fullName?.[0] ? (
                      <p className="text-xs text-red-400">{fieldErrors.fullName[0]}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-neutral-300">Email</Label>
                    <Input id="email" type="email" value={user.email} disabled className="border-white/10 bg-black/20 text-neutral-500" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-neutral-300">Số điện thoại</Label>
                    <Input
                      id="phone"
                      placeholder="+84 912 345 678"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={isPending}
                      className="border-white/10 bg-black/20 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                      aria-invalid={Boolean(fieldErrors.phone?.length)}
                    />
                    {fieldErrors.phone?.[0] ? (
                      <p className="text-xs text-red-400">{fieldErrors.phone[0]}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role" className="text-neutral-300">Vai trò</Label>
                    <Input id="role" value={ROLE_LABELS[user.role]} disabled className="border-white/10 bg-black/20 text-neutral-500" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city" className="text-neutral-300">Tỉnh / thành phố</Label>
                    <Input
                      id="city"
                      placeholder="Hà Nội"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className="border-white/10 bg-black/20 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address" className="text-neutral-300">Địa chỉ</Label>
                    <Input
                      id="address"
                      placeholder="Quận Cầu Giấy, Hà Nội"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="border-white/10 bg-black/20 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bio" className="text-neutral-300">Giới thiệu ngắn</Label>
                  <textarea
                    id="bio"
                    placeholder="Chia sẻ ngắn về kinh nghiệm mua/bán đấu giá của bạn..."
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="min-h-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-neutral-600 shadow-xs outline-none transition focus:border-amber-500/50 focus:ring-[3px] focus:ring-amber-500/20"
                  />
                </div>

                {fieldErrors.error ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {fieldErrors.error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500"
                    onClick={handleSave}
                    disabled={isPending || !hasChanges}
                  >
                    {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                  {!user.emailVerified ? (
                    <Button
                      variant="outline"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={handleSendEmailVerification}
                      disabled={isPending}
                    >
                      {isPending ? "Đang gửi..." : "Xác minh email"}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Bảo mật</CardTitle>
                <CardDescription className="text-neutral-400">
                  Quản lý mật khẩu, phiên đăng nhập và bảo vệ tài khoản.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium text-white">Đổi mật khẩu</p>
                      <p className="text-sm text-neutral-500">Cập nhật mật khẩu định kỳ để tăng bảo mật</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
                    <Link href="/change-password">Đổi</Link>
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium text-white">Đăng xuất tất cả thiết bị</p>
                      <p className="text-sm text-neutral-500">Thu hồi tất cả phiên đăng nhập hiện tại</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    onClick={() => startTransition(async () => { const r = await logoutAllDevices(); if (r.success) { toast.success("Đã đăng xuất tất cả thiết bị"); router.refresh(); } else { toast.error(r.error); } })}
                    disabled={isPending}
                  >
                    Đăng xuất
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="font-medium text-white">Xóa tài khoản</p>
                      <p className="text-sm text-neutral-500">Vô hiệu hóa tài khoản vĩnh viễn</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    onClick={handleDeleteAccount}
                    disabled={isPending}
                  >
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Hoạt động đấu giá của tôi</CardTitle>
                <CardDescription className="text-neutral-400">
                  Các phiên đấu giá bạn đã tạo và tham gia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myAuctions.length === 0 ? (
                  <EmptyState
                    icon={Gavel}
                    title="Chưa tạo phiên đấu giá nào"
                    description="Bạn có thể tạo phiên đầu tiên hoặc khám phá các phiên đang diễn ra."
                    action={
                      <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500" asChild>
                        <Link href="/auctions/new">Tạo phiên mới</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {myAuctions.map((auction) => (
                      <Link
                        key={auction.id}
                        href={`/auctions/${auction.id}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                      >
                        <AuctionThumb src={auction.imageUrl} title={auction.title} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{auction.title}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="text-xs text-neutral-500">
                              {formatCurrency(auction.currentPrice)}
                            </span>
                            <span className="text-xs text-neutral-600">·</span>
                            <span className="text-xs text-neutral-500">
                              {auction.bidCount} bid
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            auction.status === "ACTIVE"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : auction.status === "PENDING"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : auction.status === "COMPLETED"
                              ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                              : "border-red-500/20 bg-red-500/10 text-red-400"
                          }`}
                        >
                          {AUCTION_STATUS_LABELS[auction.status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Sản phẩm của tôi</CardTitle>
                <CardDescription className="text-neutral-400">
                  Quản lý sản phẩm đã đăng bán và tạo sản phẩm mới.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myAuctions.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Chưa có sản phẩm nào"
                    description="Đăng bán sản phẩm đầu tiên để bắt đầu hành trình đấu giá."
                    action={
                      <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500" asChild>
                        <Link href="/auctions/new">Đăng sản phẩm</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {myAuctions.map((auction) => (
                      <Link
                        key={auction.id}
                        href={`/auctions/${auction.id}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                      >
                        <div className="flex items-start gap-3">
                          <AuctionThumb src={auction.imageUrl} title={auction.title} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white truncate">{auction.title}</p>
                            <p className="mt-1 text-sm text-amber-400 font-semibold">
                              {formatCurrency(auction.currentPrice)}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <span className="text-xs text-neutral-500">
                                {auction.bidCount} bid
                              </span>
                              <span className="text-xs text-neutral-600">·</span>
                              <span className="text-xs text-neutral-500">
                                Xem: {auction.watchCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watchlist Tab */}
          <TabsContent value="watchlist" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Watchlist</CardTitle>
                <CardDescription className="text-neutral-400">
                  Các phiên đấu giá bạn đang theo dõi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {watchlistItems.length === 0 ? (
                  <EmptyState
                    icon={Heart}
                    title="Watchlist đang trống"
                    description="Theo dõi phiên đấu giá yêu thích để không bỏ lỡ cơ hội."
                    action={
                      <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500" asChild>
                        <Link href="/auctions">Khám phá phiên đấu giá</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {watchlistItems.map((item) => (
                      <AuctionMiniRow
                        key={item.id}
                        href={`/auctions/${item.auction.id}`}
                        imageUrl={item.auction.imageUrl}
                        title={item.auction.title}
                        subtitle={`${formatCurrency(item.auction.currentPrice)} · ${formatRemainingTime(item.auction.endsAt)}`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Thông báo</CardTitle>
                    <CardDescription className="text-neutral-400">
                      Thông báo đấu giá, bid và hệ thống.
                    </CardDescription>
                  </div>
                  {notifications.some((n) => !n.readAt) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={handleMarkAllNotificationsRead}
                      disabled={isPending}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Đánh dấu đã đọc
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="Không có thông báo"
                    description="Bạn sẽ nhận thông báo khi có hoạt động liên quan đến tài khoản."
                  />
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl border p-3 transition ${
                          n.readAt
                            ? "border-white/5 bg-white/[0.02]"
                            : "border-amber-500/20 bg-amber-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium ${n.readAt ? "text-neutral-300" : "text-white"}`}>
                            {n.title}
                          </p>
                          {!n.readAt ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                          {n.message}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
                          <span>{formatDateTime(n.createdAt)}</span>
                          {n.auctionTitle ? (
                            <>
                              <span>·</span>
                              <Link
                                href={`/auctions/${n.auctionId}`}
                                className="text-amber-400 hover:text-amber-300"
                              >
                                {n.auctionTitle}
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Cài đặt thông báo</CardTitle>
                <CardDescription className="text-neutral-400">
                  Quản lý email thông báo từ hệ thống AutoBid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    id: "emailNotifications",
                    label: "Thông báo qua email",
                    desc: "Nhận thông báo qua email khi có hoạt động quan trọng",
                    checked: emailNotifications,
                    setter: setEmailNotifications,
                  },
                  {
                    id: "bidNotifications",
                    label: "Thông báo bid",
                    desc: "Nhận thông báo khi có bid mới hoặc bị outbid",
                    checked: bidNotifications,
                    setter: setBidNotifications,
                  },
                  {
                    id: "marketingNotifications",
                    label: "Email tiếp thị",
                    desc: "Nhận thông tin về tính năng mới và ưu đãi",
                    checked: marketingNotifications,
                    setter: setMarketingNotifications,
                  },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500">{item.desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={item.checked}
                      onClick={() => item.setter(!item.checked)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        item.checked ? "bg-amber-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          item.checked ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500"
                  onClick={handleSaveNotificationSettings}
                  disabled={isPending}
                >
                  {isPending ? "Đang lưu..." : "Lưu cài đặt"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
