"use client";

import { Gavel, Shield, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminClient() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5" />
            Admin Dashboard
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Quản trị hệ thống
          </h1>
          <p className="mt-1 text-sm text-neutral-400 sm:mt-2">
            Trang quản trị dành cho ADMIN. Quản lý người dùng và theo dõi hệ thống.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <CardTitle className="text-base text-white">Tổng doanh thu</CardTitle>
              </div>
              <CardDescription className="text-xs text-neutral-500">Giá trị đấu giá đã hoàn tất</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Gavel className="h-5 w-5 text-amber-400" />
                </div>
                <CardTitle className="text-base text-white">Phiên đang diễn ra</CardTitle>
              </div>
              <CardDescription className="text-xs text-neutral-500">Auction ACTIVE trong hệ thống</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <CardTitle className="text-base text-white">Người dùng</CardTitle>
              </div>
              <CardDescription className="text-xs text-neutral-500">Tổng số người dùng hệ thống</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Gavel className="h-5 w-5 text-amber-400" />
                </div>
                <CardTitle className="text-base text-white">Đang hoạt động</CardTitle>
              </div>
              <CardDescription className="text-xs text-neutral-500">Tương tác gần đây</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition hover:shadow-xl hover:shadow-white/5">
            <CardHeader className="pb-3">
              <Gavel className="h-6 w-6 text-amber-400 mb-2" />
              <CardTitle className="text-base sm:text-lg text-white">Đấu giá</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-neutral-400">Quản lý các phiên đấu giá trong hệ thống.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" size="sm" asChild className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-amber-300">
                <Link href="/admin/auctions">Quản lý</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition hover:shadow-xl hover:shadow-white/5">
            <CardHeader className="pb-3">
              <Shield className="h-6 w-6 text-blue-400 mb-2" />
              <CardTitle className="text-base sm:text-lg text-white">Người dùng</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-neutral-400">Quản lý người dùng, vai trò và quyền hạn.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" size="sm" asChild className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-blue-300">
                <Link href="/admin/users">Quản lý</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Button variant="outline" asChild className="w-full sm:w-auto border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}