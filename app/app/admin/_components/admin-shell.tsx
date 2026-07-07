"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileClock,
  Gavel,
  Home,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/src/lib/auth";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/auctions", label: "Auctions", icon: Gavel },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/bids", label: "Bids", icon: WalletCards },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="font-semibold leading-none text-white">Auction Admin</p>
          <p className="mt-1 text-xs text-neutral-500">MVP operations</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {adminNav.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white",
                active && "bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10 hover:bg-amber-500/15 hover:text-amber-200"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-neutral-600">
        Manual bid vẫn là luồng chính. Auto-bid chưa được bật trong admin.
      </div>
    </aside>
  );
}

export function AdminShell({
  user,
  children,
}: {
  user: SafeUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-neutral-950">
      <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] lg:block">
          <AdminSidebar pathname={pathname} />
        </div>
        <div className="min-w-0">
        <header className="sticky top-14 z-20 border-b border-white/10 bg-neutral-950/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10 lg:hidden" aria-label="Mở menu admin">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-0 bg-neutral-950 p-0 backdrop-blur-xl" showCloseButton={false}>
                <SheetHeader className="sr-only">
                  <SheetTitle>Admin navigation</SheetTitle>
                </SheetHeader>
                <AdminSidebar pathname={pathname} />
              </SheetContent>
            </Sheet>

            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
              <Input className="h-9 max-w-md border-white/10 bg-black/20 pl-9 text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:ring-amber-500/20" placeholder="Tìm auction, user, bid..." />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Button asChild size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-500">
                <Link href="/auctions/new">
                  <Plus className="size-4" />
                  Quick action
                </Link>
              </Button>
              <div className="hidden text-right sm:block">
                <p className="max-w-44 truncate text-sm font-medium text-white">{user.fullName}</p>
                <p className="max-w-44 truncate text-xs text-neutral-500">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}