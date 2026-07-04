import Link from "next/link";
import { ArrowRight, Clock, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeaturedAuctions } from "@/components/featured-auctions";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-12">
        <div className="space-y-4 max-w-lg">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Đấu giá hàng hóa tự động, minh bạch và an toàn
          </h1>
          <p className="text-lg text-muted-foreground">
            AutoBid.vn là nền tảng đấu giá hàng hóa hàng đầu tại Việt Nam với công nghệ tự động, giúp bạn mua bán dễ dàng và hiệu quả.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/auctions">
                Tham gia ngay
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auctions/new">Đăng bán</Link>
            </Button>
          </div>
        </div>
        <div className="mt-8 md:mt-0">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
            <h2 className="text-3xl font-bold mb-2">10,000+</h2>
            <p className="text-lg opacity-90">Phiên đấu giá đang hoạt động</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Thời gian ngắn</CardTitle>
            <CardDescription>Phiên đấu giá từ 5-15 phút</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg w-fit">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Giá tốt nhất</CardTitle>
            <CardDescription>Cạnh tranh và minh bạch</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg w-fit">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Cạnh tranh cao</CardTitle>
            <CardDescription>Đấu giá theo thời gian thực</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Phiên đấu giá nổi bật</h2>
        <FeaturedAuctions />
      </div>
    </div>
  );
}