"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gavel,
  Home,
  Package,
  Plus,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Watch,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const categories = [
  { name: "Đồng hồ", href: "/auctions?category=watches", icon: Watch, count: "24 tài sản", active: true },
  { name: "Siêu xe", href: "/auctions?category=cars", icon: Car, count: "16 tài sản", active: false },
  { name: "Bất động sản", href: "/auctions?category=real-estate", icon: Building2, count: "38 tài sản", active: false },
];

const upcomingAuctions = [
  {
    title: "Aston Martin DB11 V8",
    category: "SIÊU XE",
    date: "Mở đăng ký: 18/07",
    price: "10.8 Tỷ",
  },
  {
    title: "Biệt thự nghỉ dưỡng Đà Lạt",
    category: "BẤT ĐỘNG SẢN",
    date: "Đấu giá: 22/07",
    price: "10.32 Tỷ",
  },
  {
    title: "Patek Philippe Nautilus",
    category: "ĐỒNG HỒ",
    date: "Mở hồ sơ: 25/07",
    price: "102.4 Tỷ",
  },
];

const howItWorks = [
  {
    num: "1",
    title: "Đăng ký tài khoản",
    desc: "Xác thực thông tin cá nhân hoặc doanh nghiệp trước khi tham gia.",
  },
  {
    num: "2",
    title: "Đặt cọc",
    desc: "Nạp khoản bảo chứng theo từng phiên để giữ quyền đặt giá.",
  },
  {
    num: "3",
    title: "Đấu giá realtime",
    desc: "Theo dõi giá, nâng giá và nhận thông báo ngay trên phiên.",
  },
  {
    num: "4",
    title: "Nhận tài sản",
    desc: "Hoàn tất thanh toán, bàn giao hồ sơ và lịch nhận tài sản.",
  },
];

const partners = ["Vietcombank", "BIDV", "Techcombank", "VietinBank", "VARS", "VINACONTROL"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white pb-24 md:pb-12 font-sans selection:bg-amber-500/30 selection:text-white">
      {/* Mobile Top Search Bar */}
      <div className="p-4 md:hidden border-b border-white/5 bg-neutral-950">
        <form action="/auctions" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 pl-3">
          <Search className="size-4 text-neutral-400 shrink-0" />
          <input
            name="q"
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
            placeholder="Tìm đồng hồ, xe, bất động sản..."
          />
          <button type="submit" className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">
            Tìm kiếm
          </button>
        </form>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-10">
        {/* HERO BANNER CONTAINER */}
        <section className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#14120F] to-[#0D0D0E] p-6 md:p-10 shadow-2xl">
          {/* Ambient Glow background */}
          <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-medium text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Nền tảng đấu giá tài sản cao cấp
            </div>

            {/* Title & Description */}
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl leading-tight">
                Đấu giá tài sản cao cấp <br />
                <span className="text-amber-400">minh bạch và an toàn</span>
              </h1>
              <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
                Tìm, đặt cọc và đấu giá realtime các tài sản đã kiểm duyệt trên một nền tảng chuyên nghiệp.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                asChild
                className="rounded-xl bg-amber-500 px-6 py-5 text-sm font-bold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Link href="/auctions" className="flex items-center gap-2">
                  Tham gia đấu giá <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/10 bg-white/5 px-6 py-5 text-sm font-semibold text-white hover:bg-white/10 transition-all active:scale-95"
              >
                <Link href="/auctions/new">Đăng bán ngay</Link>
              </Button>
            </div>

            {/* HERO FEATURED ITEM CARD (Rolls Royce Phantom) */}
            <div className="mt-8 rounded-2xl border border-amber-500/20 bg-[#121115]/90 p-5 backdrop-blur-md shadow-xl">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-white">Rolls Royce Phantom</h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-red-950/80 border border-red-500/40 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
                      ĐĂNG BÁN
                    </span>
                    <span className="rounded-md bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                      1 Lượt đặt giá
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Building2 className="size-3.5 text-amber-400 shrink-0" />
                  <span>Hoàng Mạnh Trường</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[11px] font-medium text-neutral-500">GIÁ HIỆN TẠI</p>
                    <p className="text-lg md:text-xl font-extrabold text-white">10.000.000.000 đ</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-neutral-500">TRẠNG THÁI</p>
                    <p className="text-sm font-bold text-amber-400 mt-1">Đã kết thúc</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS STATS GRID */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Phiên đang chạy", value: "24", icon: Gavel },
            { label: "Tổng lượt bid", value: "1,847", icon: TrendingUp },
            { label: "Người bán uy tín", value: "156", icon: Building2 },
            { label: "Giá trị cao nhất", value: "25.5 Tỷ", icon: Sparkles },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/5 bg-[#121215] p-4 flex flex-col justify-between space-y-3 hover:border-amber-500/30 transition-colors"
            >
              <div className="w-fit rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <stat.icon className="size-4" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* CATEGORY SECTION ("Danh mục tài sản") */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Danh mục tài sản</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Đi thẳng tới nhóm tài sản bạn quan tâm</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-4 ${
                  cat.active
                    ? "border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent"
                    : "border-white/5 bg-[#121215] hover:border-white/20"
                }`}
              >
                <cat.icon className="size-6 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                  <p className="text-[11px] text-neutral-400 font-medium mt-0.5">{cat.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FEATURED AUCTIONS ("Phiên nổi bật") */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Phiên nổi bật</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Khám phá các tài sản đang thu hút lượt cho giá</p>
            </div>
            <Link href="/auctions" className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {/* Auction Item 1 */}
            <div className="rounded-2xl border border-white/5 bg-[#121215] p-5 hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="size-3" /> PHIÊN NỔI BẬT
                    </span>
                    <span className="rounded-md bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live: 02h 14m
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Rolex Submariner Date 2024</h3>
                  <p className="text-xs text-neutral-400 mt-1">Tình trạng New Fullset, thẻ bảo hành quốc tế 2024</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[11px] font-medium text-neutral-500">Giá hiện tại</p>
                    <p className="text-lg font-extrabold text-amber-400">320 Triệu</p>
                  </div>
                  <Button asChild size="sm" className="rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 px-5">
                    <Link href="/auctions/1">Đặt giá</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Auction Item 2 */}
            <div className="rounded-2xl border border-white/5 bg-[#121215] p-5 hover:border-white/10 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-400">
                    BẤT ĐỘNG SẢN
                  </span>
                  <span className="text-xs font-medium text-neutral-400">Còn 3 ngày</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Penthouse Vinhomes Central Park</h3>
                  <p className="text-xs text-neutral-400 mt-1">View toàn cảnh sông Sài Gòn, nội thất cao cấp</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[11px] font-medium text-neutral-500">Giá cao nhất hiện tại</p>
                    <p className="text-lg font-extrabold text-amber-400">25.5 Tỷ</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 px-5">
                    <Link href="/auctions/2">Chi tiết</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING AUCTIONS ("Sắp diễn ra") */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Sắp diễn ra</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Đăng ký nhắc lịch cho các tài sản trước khi mở phiên</p>
          </div>

          <div className="space-y-3">
            {upcomingAuctions.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/5 bg-[#121215] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-colors"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider text-amber-400">{item.category}</span>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-neutral-400">{item.date}</p>
                  <p className="text-base font-extrabold text-amber-400">{item.price}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 gap-2 shrink-0 self-start sm:self-center">
                  <Bell className="size-3.5" /> Nhắc tôi
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* WHY CHOOSE US ("Tại sao chọn AutoBid.vn?") */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Tại sao chọn <span className="text-amber-400">AutoBid.vn</span>?
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Nền tảng đấu giá hiện đại với kiểm duyệt tài sản, cập nhật realtime và thanh toán an toàn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: Shield,
                title: "Minh bạch",
                desc: "Mọi phiên đấu giá được ghi nhận và hiển thị công khai.",
                highlight: false,
              },
              {
                icon: Zap,
                title: "Cạnh tranh realtime",
                desc: "Giá và lượt đặt được cập nhật ngay trong phiên.",
                highlight: true,
              },
              {
                icon: Users,
                title: "Người bán đã duyệt",
                desc: "Hồ sơ người bán được kiểm tra trước khi mở phiên.",
                highlight: false,
              },
              {
                icon: CheckCircle2,
                title: "Thanh toán an toàn",
                desc: "Quy trình đặt cọc và thanh toán có bước đối soát.",
                highlight: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                  item.highlight
                    ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent"
                    : "border-white/5 bg-[#121215]"
                }`}
              >
                <div className="w-fit rounded-lg bg-amber-500/10 p-2.5 text-amber-400">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AUCTION PROCESS ("Quy trình đấu giá") */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Quy trình đấu giá</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Bốn bước ngắn giúp người mới hiểu rõ cách tham gia</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {howItWorks.map((step) => (
              <div key={step.num} className="rounded-2xl border border-white/5 bg-[#121215] p-5 space-y-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500 text-sm font-black text-black">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{step.title}</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PARTNERS ("BỐI TÁC VÀ ĐƠN VỊ KIỂM ĐỊNH") */}
        <section className="space-y-4 text-center py-4 border-t border-white/5 pt-8">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-neutral-300 uppercase">BỐI TÁC VÀ ĐƠN VỊ KIỂM ĐỊNH</h2>
            <p className="text-[11px] text-neutral-500 mt-1">Hệ sinh thái thanh toán, bảo trợ và kiểm định uy tín</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
            {partners.map((p) => (
              <div
                key={p}
                className={`rounded-xl border p-3 text-xs font-bold tracking-wide flex items-center justify-center ${
                  p === "VARS"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-white/5 bg-[#121215] text-neutral-400"
                }`}
              >
                {p}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-neutral-600 pt-4">
            AutoBid.vn v1.0 - Hệ thống đấu giá trực tuyến cao cấp
          </p>
        </section>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 bg-neutral-950/95 py-2 backdrop-blur-lg md:hidden">
        <Link href="/" className="flex flex-col items-center gap-1 text-amber-400">
          <Home className="size-5" />
          <span className="text-[10px] font-medium">Trang chủ</span>
        </Link>
        <Link href="/auctions" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white">
          <Gavel className="size-5" />
          <span className="text-[10px] font-medium">Phiên đấu</span>
        </Link>
        <Link href="/auctions/new" className="flex flex-col items-center justify-center -mt-5">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/30 active:scale-95">
            <Plus className="size-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-semibold text-amber-400 mt-0.5">Đăng bán</span>
        </Link>
        <Link href="/inventory" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white">
          <Package className="size-5" />
          <span className="text-[10px] font-medium">Kho tài sản</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white">
          <User className="size-5" />
          <span className="text-[10px] font-medium">Tài khoản</span>
        </Link>
      </nav>
    </div>
  );
}