"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavSecondary({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="mt-auto border-t border-white/5 pt-2">
      <SidebarGroupLabel className="text-neutral-500 text-xs uppercase tracking-wider">Khác</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} className={
                isActive
                  ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-l-2 border-amber-500"
                  : "hover:bg-sidebar-accent/50"
              }>
                <Link href={item.url}>
                  {item.icon && (
                    <item.icon className={
                      isActive
                        ? "text-amber-500"
                        : "text-sidebar-foreground/60"
                    } />
                  )}
                  <span className={
                    isActive ? "text-amber-500 font-medium" : ""
                  }>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}