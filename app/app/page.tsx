"use client";

import Link from "next/link";
import { ArrowRight, Gavel, Shield, Clock, Zap, TrendingUp, Sparkles, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedAuctions } from "@/components/featured-auctions";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
          <div className="absolute -top-20 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[80px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.03)_0%,transparent_60%)]" />
        </div>
        <div className="container relative mx-auto px-4 py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Nền tảng đấu giá hàng đầu Việt Nam
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                Đấu giá{" "}
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                  tài sản cao cấp
                </span>
                <br />
                minh bạch và an toàn
              </h1>
              <p className="text-lg sm:text-xl text-neutral-400 leading-relaxed max-w-lg">
                AutoBid.vn kết nối người mua và người bán trong môi trường đấu giá chuyên nghiệp, minh bạch, với công nghệ hiện đại.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300">
                  <Link href="/auctions">
                    Tham gia đấu giá
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-base rounded-xl backdrop-blur-sm transition-all duration-300">
                  <Link href="/auctions/new">Đăng bán ngay</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex flex-col gap-4 items-end">
              <div className="w-full max-w-sm p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Gavel className="w-5 h-5" />
                  </div>
                  <span className="text-neutral-400 text-sm">Phiên nổi bật</span>
                </div>
                <p className="text-white font-semibold text-lg">Rolex Submariner 2024</p>
                <p className="text-2xl font-bold text-amber-400 mt-2">₫320,000,000</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-neutral-500">
                  <Clock className="w-4 h-4" />
                  <span>Còn 2 ngày 14 giờ</span>
                </div>
              </div>
              <div className="w-full max-w-sm p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl shadow-2xl -mr-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-neutral-400 text-sm">Giá cao nhất</span>
                </div>
                <p className="text-white font-semibold text-lg">Penthouse Vinhomes Central Park</p>
                <p className="text-2xl font-bold text-emerald-400 mt-2">₫25,500,000,000</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-neutral-500">
                  <Users className="w-4 h-4" />
                  <span>127 lượt đặt giá</span>
                </div>
              </div>
              <div className="w-full max-w-sm p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-amber-400 text-sm">Sắp kết thúc</span>
                </div>
                <p className="text-white font-semibold text-lg">Tranh &ldquo;Phong cảnh Tây Bắc&rdquo;</p>
                <p className="text-2xl font-bold text-amber-400 mt-2">₫45,000,000</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                  <Zap className="w-4 h-4" />
                  <span>Kết thúc trong 3 giờ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: "Phiên đang chạy", value: "24", icon: Gavel },
              { label: "Tổng lượt bid", value: "1,847", icon: TrendingUp },
              { label: "Người bán", value: "156", icon: Users },
              { label: "Giá trị cao nhất", value: "₫25.5B", icon: Award },
            ].map((stat) => (
              <div key={stat.label} className="group relative p-5 rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:from-white/[0.06] hover:to-white/[0.02] hover:border-white/10 transition-all duration-300">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit mb-3">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-neutral-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative border-b border-white/5">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Tại sao chọn{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                AutoBid.vn
              </span>
              ?
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Nền tảng đấu giá hiện đại với công nghệ tiên tiến, mang đến trải nghiệm mua bán an toàn và hiệu quả.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { icon: Shield, title: "Minh bạch", desc: "Mọi phiên đấu giá đều được ghi nhận và hiển thị công khai, đảm bảo tính minh bạch tuyệt đối.", iconColor: "bg-emerald-500/10 text-emerald-400" },
              { icon: Zap, title: "Cạnh tranh realtime", desc: "Hệ thống cập nhật giá theo thời gian thực, giúp bạn không bỏ lỡ bất kỳ cơ hội nào.", iconColor: "bg-amber-500/10 text-amber-400" },
              { icon: Users, title: "Quản lý người bán", desc: "Công cụ quản lý sản phẩm và phiên đấu giá chuyên nghiệp dành cho người bán.", iconColor: "bg-blue-500/10 text-blue-400" },
              { icon: Award, title: "Thanh toán an toàn", desc: "Quy trình thanh toán thủ công được kiểm duyệt, đảm bảo an toàn cho cả hai bên.", iconColor: "bg-purple-500/10 text-purple-400" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:border-amber-500/20 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className={`p-3 rounded-lg w-fit mb-4 ${feature.iconColor}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED AUCTIONS */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Phiên đấu giá nổi bật
              </h2>
              <p className="text-neutral-400">
                Khám phá các phiên đấu giá hấp dẫn nhất hiện tại
              </p>
            </div>
            <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl">
              <Link href="/auctions">
                Xem tất cả
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <FeaturedAuctions />
        </div>
      </section>
    </div>
  );
}