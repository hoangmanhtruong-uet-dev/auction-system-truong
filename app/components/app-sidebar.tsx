"use client";

import * as React from "react";
import { Book, Boxes, Hammer, Home, Image, List, User } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu } from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex items-center gap-3 px-3 py-4">
            <div className="relative">
              <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/20">
                A
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-sidebar-background">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-sidebar-foreground tracking-tight">AutoBid.vn</span>
              <span className="text-xs text-sidebar-foreground/60 font-medium">Luxury Auction</span>
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={secondaryNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-3">
          <div className="h-px bg-sidebar-border/50 mb-2" />
          <p className="text-[10px] text-sidebar-foreground/40 text-center">AutoBid.vn v1.0.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

const navItems = [
  {
    title: "Trang chủ",
    url: "/",
    icon: Home,
  },
  {
    title: "Phiên đấu giá",
    url: "/auctions",
    icon: List,
  },
  {
    title: "Đăng bán",
    url: "/auctions/new",
    icon: Hammer,
  },
  {
    title: "Kho của tôi",
    url: "/inventory",
    icon: Boxes,
  },
  {
    title: "Sản phẩm của tôi",
    url: "/products",
    icon: Image,
  },
  {
    title: "Hồ sơ",
    url: "/profile",
    icon: User,
  },
];

const secondaryNavItems = [
  {
    title: "Hỗ trợ",
    url: "/help",
    icon: Book,
  },
];
