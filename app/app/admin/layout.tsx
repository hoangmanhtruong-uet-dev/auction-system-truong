import { redirect } from "next/navigation";
import Link from "next/link";
import { UserRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/src/lib/auth";

import { AdminShell } from "./_components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl items-center px-4">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-xl font-semibold">Bạn không có quyền truy cập</h1>
            <p className="text-sm text-muted-foreground">
              Khu vực admin chỉ dành cho tài khoản có quyền ADMIN. Vui lòng liên hệ quản trị viên nếu đây là nhầm lẫn.
            </p>
            <Button asChild>
              <Link href="/">Về trang chủ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
