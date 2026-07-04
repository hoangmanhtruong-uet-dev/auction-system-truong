"use client";

import { Package } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sản phẩm của tôi</h1>
        <Button asChild>
          <Link href="/auctions/new">Đăng bán</Link>
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Bạn chưa có sản phẩm nào đang rao bán.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/auctions/new">Đăng sản phẩm đầu tiên</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
