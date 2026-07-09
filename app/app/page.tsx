"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  Banknote,
  Bell,
  Building2,
  Car,
  Clock,
  Gem,
  Gavel,
  Landmark,
  Paintbrush,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Watch,
  Zap,
} from "lucide-react";

import { FeaturedAuctions } from "@/components/featured-auctions";
import { Button } from "@/components/ui/button";

const categories = [
  { name: "Bất động sản", href: "/auctions?category=real-estate", icon: Building2, count: "38 tài sản" },
  { name: "Siêu xe", href: "/auctions?category=cars", icon: Car, count: "16 tài sản" },
  { name: "Đồng hồ", href: "/auctions?category=watches", icon: Watch, count: "24 tài sản" },
  { name: "Trang sức", href: "/auctions?category=jewelry", icon: Gem, count: "31 tài sản" },
  { name: "Nghệ thuật", href: "/auctions?category=art", icon: Paintbrush, count: "19 tài sản" },
  { name: "Đồ cổ", href: "/auctions?category=antiques", icon: Landmark, count: "12 tài sản" },
];

const upcomingAuctions = [
  {
    title: "Aston Martin DB11 V8",
    category: "Siêu xe",
    date: "Mở đăng ký 18/07",
    price: "Từ 8.2 Tỷ",
    image: "https://picsum.photos/seed/autobid-aston-martin/900/620",
  },
  {
    title: "Biệt thự nghỉ dưỡng Đà Lạt",
    category: "Bất động sản",
    date: "Đấu giá 22/07",
    price: "Từ 32 Tỷ",
    image: "https://picsum.photos/seed/autobid-villa-dalat/900/620",
  },
  {
    title: "Patek Philippe Nautilus",
    category: "Đồng hồ",
    date: "Mở hồ sơ 25/07",
    price: "Từ 2.4 Tỷ",
    image: "https://picsum.photos/seed/autobid-patek-watch/900/620",
  },
];

const howItWorks = [
  { title: "Đăng ký tài khoản", desc: "Xác thực thông tin cá nhân hoặc doanh nghiệp trước khi tham gia." },
  { title: "Đặt cọc", desc: "Nạp khoản bảo chứng theo từng phiên để giữ quyền đặt giá." },
  { title: "Đấu giá realtime", desc: "Theo dõi giá, nâng giá và nhận cập nhật ngay trên phiên." },
  { title: "Nhận tài sản", desc: "Hoàn tất thanh toán, bàn giao hồ sơ và lịch nhận tài sản." },
];

const partners = ["Vietcombank", "BIDV", "Techcombank", "VietinBank", "VARS", "VINACONTROL"];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0">
          <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-[120px]" />
          <div className="absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/5 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-amber-600/5 blur-[80px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.03)_0%,transparent_60%)]" />
        </div>

        <div className="container relative mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
                <Sparkles className="h-4 w-4" />
                Nền tảng đấu giá tài sản cao cấp
              </div>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Đấu giá tài sản cao cấp minh bạch và an toàn
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-neutral-400 sm:text-xl">
                Tìm, đặt cọc và đấu giá realtime các tài sản đã kiểm duyệt trên một nền tảng chuyên nghiệp.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-base font-semibold text-black shadow-lg shadow-amber-500/20 transition-all duration-300 hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/30 active:scale-[0.98]"
                >
                  <Link href="/auctions">
                    Tham gia đấu giá
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="rounded-xl border-white/10 bg-white/5 px-8 py-6 text-base text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 active:scale-[0.98]"
                >
                  <Link href="/auctions/new">Đăng bán ngay</Link>
                </Button>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-[0.92fr_1fr] gap-4">
              <div className="space-y-4 pt-10">
                <AuctionSignal title="Rolex Submariner 2024" label="Phiên nổi bật" value="320 Triệu" icon={Gavel} />
                <AuctionSignal title="Tranh phong cảnh Tây Bắc" label="Sắp kết thúc" value="45 Triệu" icon={Clock} />
              </div>
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://picsum.photos/seed/autobid-luxury-auction/900/1100"
                    alt="Không gian đấu giá tài sản cao cấp"
                    className="h-[360px] w-full object-cover"
                  />
                  <div className="p-5">
                    <p className="text-sm text-neutral-400">Giá cao nhất hiện tại</p>
                    <p className="mt-1 text-xl font-semibold text-white">Penthouse Vinhomes Central Park</p>
                    <p className="mt-3 text-3xl font-bold text-amber-400">25.5 Tỷ</p>
                  </div>
                </div>
                <AuctionSignal title="127 lượt đặt giá" label="Thanh khoản phiên" value="+18%" icon={TrendingUp} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/86 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <form action="/auctions" className="grid gap-3 md:grid-cols-[1fr_180px_150px_auto]">
            <label className="sr-only" htmlFor="home-search">
              Tìm kiếm tài sản
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus-within:border-amber-500/50">
              <Search className="h-5 w-5 text-neutral-500" />
              <input
                id="home-search"
                name="q"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
                placeholder="Tìm đồng hồ, xe, bất động sản..."
              />
            </div>
            <select
              name="category"
              aria-label="Danh mục"
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
              defaultValue=""
            >
              <option value="">Mọi danh mục</option>
              <option value="watches">Đồng hồ</option>
              <option value="cars">Xe</option>
              <option value="real-estate">Bất động sản</option>
              <option value="art">Nghệ thuật</option>
            </select>
            <select
              name="price"
              aria-label="Khoảng giá"
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
              defaultValue=""
            >
              <option value="">Mọi mức giá</option>
              <option value="under-500m">Dưới 500 Triệu</option>
              <option value="500m-5b">500 Triệu - 5 Tỷ</option>
              <option value="over-5b">Trên 5 Tỷ</option>
            </select>
            <Button className="rounded-xl bg-amber-500 px-6 py-6 font-semibold text-black hover:bg-amber-400 active:scale-[0.98]">
              Tìm kiếm
            </Button>
          </form>
        </div>
      </section>

      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {[
              { label: "Phiên đang chạy", value: "24", icon: Gavel },
              { label: "Tổng lượt bid", value: "1,847", icon: TrendingUp },
              { label: "Người bán", value: "156", icon: Users },
              { label: "Giá trị cao nhất", value: "25.5 Tỷ", icon: Award },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-5 transition-all duration-300 hover:border-white/10 hover:from-white/[0.06] hover:to-white/[0.02]"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="mb-3 w-fit rounded-lg bg-amber-500/10 p-2 text-amber-400">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-white lg:text-3xl">{stat.value}</p>
                  <p className="text-sm text-neutral-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="mb-3 text-3xl font-bold text-white lg:text-4xl">Danh mục tài sản</h2>
            <p className="text-neutral-400">Đi thẳng tới nhóm tài sản bạn quan tâm, từ nhà đất tới đồng hồ hiếm.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:bg-amber-500/[0.06]"
              >
                <category.icon className="mb-5 h-7 w-7 text-amber-400" />
                <h3 className="font-semibold text-white group-hover:text-amber-300">{category.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{category.count}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="mb-3 text-3xl font-bold text-white lg:text-4xl">Sắp diễn ra</h2>
            <p className="text-neutral-400">Đăng ký nhắc lịch cho các tài sản lớn trước khi phiên chính thức mở.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <UpcomingCard auction={upcomingAuctions[0]} featured />
            <div className="grid gap-5">
              {upcomingAuctions.slice(1).map((auction) => (
                <UpcomingCard key={auction.title} auction={auction} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
              Tại sao chọn <span className="text-amber-400">AutoBid.vn</span>?
            </h2>
            <p className="text-lg text-neutral-400">
              Nền tảng đấu giá hiện đại với kiểm duyệt tài sản, cập nhật realtime và thanh toán an toàn.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {[
              { icon: Shield, title: "Minh bạch", desc: "Mọi phiên đấu giá được ghi nhận và hiển thị công khai.", tone: "bg-amber-500/10 text-amber-400" },
              { icon: Zap, title: "Cạnh tranh realtime", desc: "Giá và lượt đặt được cập nhật ngay trong phiên.", tone: "bg-amber-500/10 text-amber-400" },
              { icon: Users, title: "Người bán đã duyệt", desc: "Hồ sơ người bán được kiểm tra trước khi mở phiên.", tone: "bg-amber-500/10 text-amber-400" },
              { icon: Banknote, title: "Thanh toán an toàn", desc: "Quy trình đặt cọc và thanh toán có bước đối soát.", tone: "bg-amber-500/10 text-amber-400" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 transition-all duration-300 hover:border-amber-500/20"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className={`mb-4 w-fit rounded-lg p-3 ${feature.tone}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">Quy trình đấu giá</h2>
              <p className="text-neutral-400">
                Bốn bước ngắn giúp người mới hiểu rõ cách tham gia trước khi đặt giá.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {howItWorks.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-black">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-white lg:text-4xl">Phiên đấu giá nổi bật</h2>
              <p className="text-neutral-400">Khám phá các phiên đấu giá hấp dẫn nhất hiện tại</p>
            </div>
            <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10">
              <Link href="/auctions">
                Xem tất cả
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <FeaturedAuctions />
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="container mx-auto px-4 py-14">
          <div className="mb-8 max-w-xl">
            <h2 className="mb-3 text-2xl font-bold text-white lg:text-3xl">Đối tác và đơn vị kiểm định</h2>
            <p className="text-neutral-400">
              Hệ sinh thái thanh toán, bảo trợ và kiểm định giúp mỗi phiên đấu giá đáng tin cậy hơn.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {partners.map((partner) => (
              <div
                key={partner}
                className="flex h-20 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] px-4 text-center font-semibold tracking-wide text-neutral-300"
              >
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AuctionSignal({
  title,
  label,
  value,
  icon: Icon,
}: {
  title: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-neutral-400">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-2xl font-bold text-amber-400">{value}</p>
    </div>
  );
}

function UpcomingCard({
  auction,
  featured = false,
}: {
  auction: (typeof upcomingAuctions)[number];
  featured?: boolean;
}) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] ${featured ? "lg:min-h-[440px]" : ""}`}>
      <div className={featured ? "grid h-full lg:grid-cols-[1.1fr_0.9fr]" : "grid sm:grid-cols-[0.82fr_1fr]"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={auction.image}
          alt={auction.title}
          className={`w-full object-cover ${featured ? "h-64 lg:h-full" : "h-48 sm:h-full"}`}
        />
        <div className="flex flex-col justify-between p-6">
          <div>
            <p className="mb-3 text-sm font-medium text-amber-400">{auction.category}</p>
            <h3 className={featured ? "text-2xl font-bold text-white lg:text-3xl" : "text-xl font-bold text-white"}>
              {auction.title}
            </h3>
            <p className="mt-3 text-neutral-400">{auction.date}</p>
            <p className="mt-4 text-2xl font-bold text-amber-400">{auction.price}</p>
          </div>
          <Button className="mt-6 w-fit rounded-xl bg-white px-5 font-semibold text-neutral-950 hover:bg-amber-100 active:scale-[0.98]">
            <Bell className="mr-2 h-4 w-4" />
            Nhắc tôi
          </Button>
        </div>
      </div>
    </article>
  );
}