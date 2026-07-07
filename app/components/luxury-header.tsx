"use client";

import * as React from "react";
import { Menu, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AuthStatusClient } from "./auth-status-client";

export function LuxuryHeader() {
  const pathname = usePathname();
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  const isAuthPage = pathname.startsWith("/auth");
  const isHomepage = pathname === "/";
  const isDashboardPage = pathname.startsWith("/auctions") || pathname.startsWith("/products") || pathname.startsWith("/profile") || pathname.startsWith("/admin");

  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold shadow-lg shadow-amber-500/20">
              A
            </div>
            <span className="text-lg font-bold text-white tracking-tight">AutoBid.vn</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white">
            <Link href="/auth/login">Đăng nhập</Link>
          </Button>
          <Button size="sm" asChild className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20">
            <Link href="/auth/register">Đăng ký</Link>
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="-ml-1" />
        {!isHomepage && (
          <div className={`relative max-w-xs transition-all duration-300 ${isSearchFocused ? "w-48" : "w-0 opacity-0"}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              className="h-9 pl-9 bg-white/5 border-white/10 text-sm focus:border-amber-500/50 focus:ring-amber-500/20"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {isDashboardPage && (
          <>
            <Button variant="outline" size="sm" asChild className="hidden md:flex h-9 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-sm">
              <Link href="/auctions/new">
                <Plus className="mr-2 size-4" />
                Tạo phiên
              </Link>
            </Button>
            <div className="h-8 w-px bg-white/10 mx-1 hidden md:block" />
          </>
        )}
        <AuthStatusClient />
      </div>
    </header>
  );
}