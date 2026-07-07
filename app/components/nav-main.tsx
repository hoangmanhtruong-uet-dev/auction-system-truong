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

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu chính</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className={
                  isActive
                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-500/20 data-[active=true]:border-l-2 data-[active=true]:border-amber-500"
                    : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }
              >
                <Link href={item.url}>
                  {item.icon && (
                    <item.icon
                      className={
                        isActive
                          ? "text-amber-500"
                          : "text-sidebar-foreground/60 group-hover/text-sidebar-foreground"
                      }
                    />
                  )}
                  <span
                    className={
                      isActive ? "text-amber-500 font-medium" : "text-sidebar-foreground"
                    }
                  >
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}