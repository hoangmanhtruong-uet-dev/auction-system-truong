"use client";

import { useEffect, useState } from "react";
import { User, LogIn, LogOut, UserPlus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/src/actions/auth";
import { toast } from "sonner";
type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

/**
 * Client-side hint — only show admin nav link for ADMIN/SUPER_ADMIN.
 * Server-side guard in admin/layout.tsx enforces this via DB.
 */
function canOpenAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function AuthStatusClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleLogout() {
    const result = await logout();
    if (result.success) {
      toast.success("Đã đăng xuất");
      setUser(null);
      router.push("/");
      router.refresh();
    } else {
      toast.error("Đăng xuất thất bại");
    }
  }

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/auth/login">
            <LogIn className="mr-1 h-4 w-4" />
            Đăng nhập
          </Link>
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href="/auth/register">
            <UserPlus className="mr-1 h-4 w-4" />
            Đăng ký
          </Link>
        </Button>
      </div>
    );
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Hồ sơ
          </Link>
        </DropdownMenuItem>
        {canOpenAdmin(user.role) && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Settings className="mr-2 h-4 w-4" />
              Quản trị
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
