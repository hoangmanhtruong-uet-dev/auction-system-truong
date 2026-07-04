"use client";

import { HelpCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Trung tâm hỗ trợ</h1>
        <p className="text-muted-foreground mt-2">
          Câu hỏi thường gặp và hướng dẫn sử dụng nền tảng đấu giá.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Hướng dẫn tham gia đấu giá
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">1. Đăng ký tài khoản</h3>
              <p className="text-sm text-muted-foreground">
                Tạo tài khoản với email và mật khẩu để tham gia đấu giá.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">2. Thanh toán khi thắng đấu</h3>
              <p className="text-sm text-muted-foreground">
                Thanh toán khi thắng đấu giá (chức năng pending).
              </p>
            </div>
            <div>
              <h3 className="font-semibold">3. Đặt giá thầu</h3>
              <p className="text-sm text-muted-foreground">
                Đặt giá thầu cao hơn giá hiện tại để tham gia phiên đấu giá.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-green-600" />
              Quy định và bảo mật
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Giao dịch an toàn</h3>
              <p className="text-sm text-muted-foreground">
                AutoBid.vn áp dụng quy trình bảo vệ người mua và người bán.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Chính sách hoàn tiền</h3>
              <p className="text-sm text-muted-foreground">
                Hoàn tiền trong trường hợp sản phẩm không đúng mô tả (chức năng pending).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}