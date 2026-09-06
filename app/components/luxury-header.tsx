"use client";

import * as React from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthStatusClient } from "./auth-status-client";

export function LuxuryHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-neutral-950/90 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 font-black text-black shadow-md shadow-amber-500/20">
              <span className="text-xl leading-none">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none tracking-tight text-white">
                AutoBid<span className="text-amber-400">.vn</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-amber-500/80">
                LUXURY AUCTION
              </span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-neutral-300 hover:bg-white/5 hover:text-white">
            <Link href="/auth/login">Đăng nhập</Link>
          </Button>
          <Button size="sm" asChild className="rounded-lg bg-amber-500 font-semibold text-black hover:bg-amber-400">
            <Link href="/auth/register">Đăng ký</Link>
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/90 px-4 backdrop-blur-md md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-neutral-400 hover:text-white md:hidden" />
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 font-black text-black shadow-md shadow-amber-500/20">
              <span className="text-xl leading-none">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none tracking-tight text-white">
                AutoBid<span className="text-amber-400">.vn</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-amber-500/80">
                LUXURY AUCTION
              </span>
            </div>
          </Link>
        </div>

        {/* Global Header Search Bar */}
        <form action="/auctions" className="hidden flex-1 max-w-md items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1 pl-3 text-white focus-within:border-amber-500/50 md:flex">
          <Search className="size-4 shrink-0 text-neutral-400" />
          <input
            name="q"
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
            placeholder="Tìm đồng hồ, xe, bất động sản..."
          />
          <button type="submit" className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400">
            Tìm kiếm
          </button>
        </form>

        <div className="flex items-center gap-3">
          <AuthStatusClient />
        </div>
      </div>
    </header>
  );
}
