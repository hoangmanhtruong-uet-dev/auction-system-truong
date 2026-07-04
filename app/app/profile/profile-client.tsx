"use client";

import { useState, useTransition } from "react";
import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout } from "@/src/actions/auth";
import { updateProfile } from "@/src/actions/profile";
import type { SafeUser } from "@/src/lib/auth";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
};

type ProfileStats = {
  auctionsCreated: number;
  bidsPlaced: number;
  auctionsWinning: number;
};

type ProfileClientProps = {
  user: SafeUser;
  stats: ProfileStats;
};

export function ProfileClient({ user, stats }: ProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
   const [fieldErrors, setFieldErrors] = useState<{
     fullName?: string[];
     phone?: string[];
     _errors?: string[];
     error?: string;
   }>({});

  async function handleLogout() {
    const result = await logout();
    if (result.success) {
      toast.success("Đã đăng xuất");
      router.push("/");
      router.refresh();
    } else {
      toast.error("Đăng xuất thất bại");
    }
  }

  function handleSave() {
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProfile({
        fullName,
        phone,
      });

      if (result.success) {
        toast.success("Đã cập nhật hồ sơ");
        setFullName(result.data.fullName);
        setPhone(result.data.phone ?? "");
        router.refresh();
        return;
      }

      setFieldErrors({ error: result.error });
      toast.error(result.error);
    });
  }

  const hasChanges = fullName !== user.fullName || phone !== (user.phone ?? "");

  return (
    <div className="container mx-auto max-w-3xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Hồ sơ của tôi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Quản lý thông tin tài khoản và cập nhật hồ sơ.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              Thông tin cá nhân
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cập nhật thông tin cơ bản của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3 border-b pb-3 sm:items-center sm:gap-4 sm:pb-4">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 sm:h-16 sm:w-16">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground sm:h-8 sm:w-8" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold sm:text-base">
                  {fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  {ROLE_LABELS[user.role] ?? user.role} &middot; Tham gia{" "}
                  {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-xs sm:text-sm">
                  Họ và tên
                </Label>
                <Input
                  id="fullName"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldErrors.fullName?.length)}
                  className="h-9 text-sm sm:h-10"
                />
                {fieldErrors.fullName?.[0] ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.fullName[0]}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-xs sm:text-sm">
                  Vai trò
                </Label>
                <Input
                  id="role"
                  defaultValue={ROLE_LABELS[user.role] ?? user.role}
                  disabled
                  className="h-9 text-sm sm:h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  defaultValue={user.email}
                  disabled
                  className="h-9 text-sm sm:h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  placeholder="+84 912 345 678"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldErrors.phone?.length)}
                  className="h-9 text-sm sm:h-10"
                />
                {fieldErrors.phone?.[0] ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.phone[0]}
                  </p>
                ) : null}
              </div>
            </div>

            {user.avatarUrl ? (
              <div className="grid gap-2">
                <Label htmlFor="avatarUrl" className="text-xs sm:text-sm">
                  Avatar URL
                </Label>
                <Input
                  id="avatarUrl"
                  defaultValue={user.avatarUrl}
                  disabled
                  className="h-9 text-sm sm:h-10"
                />
              </div>
            ) : null}

             {fieldErrors.error ? (
               <p className="text-sm text-destructive">{fieldErrors.error}</p>
             ) : null}
             {fieldErrors._errors?.[0] ? (
               <p className="text-sm text-destructive">
                 {fieldErrors._errors[0]}
               </p>
             ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/">Về trang chủ</Link>
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !hasChanges}
                className="w-full sm:w-auto"
              >
                {isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Đăng xuất
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Thống kê</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center sm:gap-4">
              <div>
                <p className="text-xl font-bold text-blue-600 sm:text-2xl">
                  {stats.auctionsCreated}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Phiên đã tạo
                </p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600 sm:text-2xl">
                  {stats.bidsPlaced}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Bid đã đặt
                </p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-600 sm:text-2xl">
                  {stats.auctionsWinning}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Phiên đang thắng
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}