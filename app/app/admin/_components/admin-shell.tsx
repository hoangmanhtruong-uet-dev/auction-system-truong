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
    <aside className="flex h-full flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="font-semibold leading-none">Auction Admin</p>
          <p className="mt-1 text-xs text-muted-foreground">MVP operations</p>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
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
    <div className="min-h-[calc(100dvh-3.5rem)] bg-muted/30">
      <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] lg:block">
          <AdminSidebar pathname={pathname} />
        </div>
        <div className="min-w-0">
        <header className="sticky top-14 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Mở menu admin">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
                <SheetHeader className="sr-only">
                  <SheetTitle>Admin navigation</SheetTitle>
                </SheetHeader>
                <AdminSidebar pathname={pathname} />
              </SheetContent>
            </Sheet>

            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 max-w-md pl-9" placeholder="Tìm auction, user, bid..." />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Button asChild size="sm">
                <Link href="/auctions/new">
                  <Plus className="size-4" />
                  Quick action
                </Link>
              </Button>
              <div className="hidden text-right sm:block">
                <p className="max-w-44 truncate text-sm font-medium">{user.fullName}</p>
                <p className="max-w-44 truncate text-xs text-muted-foreground">{user.email}</p>
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
