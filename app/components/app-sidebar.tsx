"use client";

import * as React from "react";
import { Book, Hammer, Home, Image, List, User } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu } from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">AutoBid.vn</span>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={secondaryNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2">
          <p className="text-xs text-sidebar-foreground/60">AutoBid.vn v1.0.0</p>
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