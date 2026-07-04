"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAuction } from "@/src/actions/auction";

export function NewAuctionClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const condition = String(formData.get("condition") ?? "").trim();
    const startPrice = String(formData.get("startPrice") ?? "");
    const bidStep = String(formData.get("bidStep") ?? "");
    const duration = String(formData.get("duration") ?? "");
    const imageUrls = formData
      .getAll("imageUrls")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const parsedStartPrice = Number(startPrice);
    const parsedBidStep = Number(bidStep);
    const parsedDuration = Number(duration);

    if (!title || title.length < 5) {
      setError("Tên sản phẩm phải từ 5 ký tự trở lên");
      setSubmitting(false);
      return;
    }

    if (!description || description.length < 20) {
      setError("Mô tả chi tiết phải từ 20 ký tự trở lên");
      setSubmitting(false);
      return;
    }

    if (!category) {
      setError("Vui lòng chọn danh mục sản phẩm");
      setSubmitting(false);
      return;
    }

    if (!condition) {
      setError("Vui lòng chọn tình trạng sản phẩm");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(parsedStartPrice) || parsedStartPrice < 1000) {
      setError("Giá khởi điểm tối thiểu là 1,000 VND");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(parsedBidStep) || parsedBidStep < 10000) {
      setError("Bước giá tối thiểu là 10,000 VND");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration < 5 || parsedDuration > 10080) {
      setError("Thời gian đấu giá phải từ 5 đến 10,080 phút");
      setSubmitting(false);
      return;
    }

    if (imageUrls.length > 5) {
      setError("Tối đa 5 hình ảnh");
      setSubmitting(false);
      return;
    }

    try {
      const result = await createAuction({
        title,
        description: `Danh mục: ${category}\nTình trạng: ${condition}\n\n${description}`,
        startPrice: parsedStartPrice,
        bidStep: parsedBidStep,
        duration: parsedDuration,
        images: imageUrls,
        autoExtensionEnabled: true,
        maxExtensions: 3,
      });

      if (result.success) {
        router.push(`/auctions/${result.data.auctionId}`);
        router.refresh();
        return;
      }

      setError(result.error);
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tạo phiên đấu giá mới</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
          Điền thông tin để tạo phiên đấu giá. Ảnh đầu tiên sẽ được dùng làm thumbnail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin phiên đấu giá</CardTitle>
          <CardDescription>Vui lòng điền đầy đủ thông tin để tạo phiên đấu giá hợp lệ.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Tên sản phẩm *</Label>
              <Input id="title" name="title" placeholder="VD: Đồng hồ Rolex Submariner" required minLength={5} maxLength={100} className="w-full" />
              <p className="text-xs text-muted-foreground">Từ 5 đến 100 ký tự</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Danh mục *</Label>
                <select
                  id="category"
                  name="category"
                  required
                  defaultValue=""
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="" disabled>
                    Chọn danh mục
                  </option>
                  <option value="Đồng hồ">Đồng hồ</option>
                  <option value="Trang sức">Trang sức</option>
                  <option value="Đồ cổ">Đồ cổ</option>
                  <option value="Điện tử">Điện tử</option>
                  <option value="Sưu tầm">Sưu tầm</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Tình trạng *</Label>
                <select
                  id="condition"
                  name="condition"
                  required
                  defaultValue=""
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="" disabled>
                    Chọn tình trạng
                  </option>
                  <option value="Mới">Mới</option>
                  <option value="Như mới">Như mới</option>
                  <option value="Đã qua sử dụng - tốt">Đã qua sử dụng - tốt</option>
                  <option value="Đã qua sử dụng - có dấu hiệu hao mòn">Đã qua sử dụng - có dấu hiệu hao mòn</option>
                  <option value="Cần phục chế/sửa chữa">Cần phục chế/sửa chữa</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả chi tiết *</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Mô tả nguồn gốc, phụ kiện đi kèm, chính sách giao nhận..."
                required
                minLength={20}
                className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y"
              />
              <p className="text-xs text-muted-foreground">Tối thiểu 20 ký tự</p>
            </div>

            <div className="space-y-2">
              <Label>Hình ảnh (URL, tối đa 5 ảnh)</Label>
              <div className="grid gap-2">
                {[1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="relative flex items-center gap-2">
                    <Input
                      id={`image${index}`}
                      name="imageUrls"
                      type="url"
                      placeholder={`https://example.com/image${index}.jpg`}
                      className="w-full"
                      defaultValue=""
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Có thể để trống. Nếu nhập nhiều ảnh, ảnh đầu tiên sẽ là thumbnail.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startPrice">Giá khởi điểm (VND) *</Label>
                <Input id="startPrice" name="startPrice" type="number" placeholder="1000000" required min={1000} step={1000} />
                <p className="text-xs text-muted-foreground">Tối thiểu 1,000 VND</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bidStep">Bước giá tối thiểu (VND) *</Label>
                <Input id="bidStep" name="bidStep" type="number" placeholder="10000" required min={10000} step={1000} />
                <p className="text-xs text-muted-foreground">Tối thiểu 10,000 VND</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Thời gian đấu giá (phút) *</Label>
              <Input id="duration" name="duration" type="number" placeholder="15" required min={5} max={10080} />
              <p className="text-xs text-muted-foreground">Tối thiểu 5 phút, tối đa 7 ngày (10080 phút)</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="mr-2 animate-spin">⟳</span>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Tạo phiên đấu giá
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/auctions">Hủy</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Lưu ý:</h3>
        <ul className="mt-2 list-disc pl-5 text-xs text-blue-600 dark:text-blue-400">
          <li>Auction sẽ có status ACTIVE ngay sau khi tạo và hiển thị ngay lập tức.</li>
          <li>Hình ảnh phải là URL hợp lệ, hỗ trợ JPEG, PNG, WebP.</li>
          <li>Giá khởi điểm và bước giá phải là số nguyên dương.</li>
        </ul>
      </div>
    </div>
  );
}