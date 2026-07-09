import Link from "next/link";
import { ArrowRight, Boxes, LockKeyhole, ShieldCheck } from "lucide-react";
import type { SafeUser } from "@/src/lib/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SellerAccessGate({ user }: { user: SafeUser | null }) {
  const isLoggedIn = Boolean(user);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-zinc-950 to-neutral-950 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card className="overflow-hidden border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div className="flex flex-col justify-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                <LockKeyhole className="h-7 w-7" />
              </div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                Khu vực dành cho seller
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Đăng bán tài sản trên AutoBid.vn
              </h1>
              <p className="mt-4 max-w-2xl text-neutral-400">
                Trang đăng bán chỉ mở cho tài khoản người bán hoặc quản trị viên. Vui lòng đăng nhập bằng tài khoản seller để tiếp tục tạo phiên đấu giá.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {!isLoggedIn ? (
                  <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400">
                    <Link href="/auth/login?redirect=/auctions/new">
                      Đăng nhập để tiếp tục
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400">
                    <Link href="/profile">Kiểm tra vai trò tài khoản</Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline" className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
                  <Link href={isLoggedIn ? "/profile" : "/auth/login?redirect=/inventory"}>
                    <Boxes className="h-4 w-4" />
                    {isLoggedIn ? "Kiểm tra quyền seller" : "Đăng nhập vào Kho của tôi"}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                ["Tài khoản seller", "Đảm bảo người đăng bán có hồ sơ và quyền quản lý tài sản."],
                ["Kiểm định tài sản", "Lưu ảnh, giấy tờ, chứng nhận và lịch sử trước khi lên sàn."],
                ["Theo dõi vòng đời", "Quản lý tài sản từ nháp, chờ duyệt, đang đấu giá đến đã bán."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-sm text-neutral-400">{description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
