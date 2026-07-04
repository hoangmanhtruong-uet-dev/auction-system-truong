"use client";

import { Gavel, Shield } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminClient() {
  return (
    <div className="container mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản trị hệ thống</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Trang quản trị dành cho ADMIN. Quản lý người dùng và theo dõi hệ thống.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
         <Card className="flex flex-col">
           <CardHeader className="pb-3">
             <Gavel className="h-6 w-6 text-purple-600 mb-2" />
             <CardTitle className="text-base sm:text-lg">Đấu giá</CardTitle>
             <CardDescription className="text-xs sm:text-sm">Quản lý các phiên đấu giá trong hệ thống.</CardDescription>
           </CardHeader>
           <CardContent className="mt-auto">
             <Button variant="outline" size="sm" asChild className="w-full">
               <Link href="/admin/auctions">Quản lý</Link>
             </Button>
           </CardContent>
         </Card>
         <Card className="flex flex-col">
           <CardHeader className="pb-3">
             <Shield className="h-6 w-6 text-blue-600 mb-2" />
             <CardTitle className="text-base sm:text-lg">Người dùng</CardTitle>
             <CardDescription className="text-xs sm:text-sm">Quản lý người dùng, vai trò và quyền hạn.</CardDescription>
           </CardHeader>
           <CardContent className="mt-auto">
             <Button variant="outline" size="sm" asChild className="w-full">
               <Link href="/admin/users">Quản lý</Link>
             </Button>
           </CardContent>
         </Card>
      </div>

      <div className="mt-6">
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}