"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Image as ImageIcon, Clock, Calendar, Lock, Info, ChevronRight, X, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumberWithCommas } from "@/lib/utils";
import { createAuction } from "@/src/actions/auction";

// Category options with descriptions
const CATEGORY_OPTIONS = [
  { value: "Đồng hồ", label: "Đồng hồ", description: "Đồng hồ đeo tay, đồng hồ bỏ túi, đồng hồ cổ" },
  { value: "Điện thoại", label: "Điện thoại", description: "Điện thoại di động, smartphone, máy cũ" },
  { value: "Laptop", label: "Laptop", description: "Máy tính xách tay, ultrabook, gaming laptop" },
  { value: "Máy ảnh", label: "Máy ảnh", description: "Máy ảnh DSLR, mirrorless, ống kính" },
  { value: "Thời trang", label: "Thời trang", description: "Quần áo, giày dép, túi xách, phụ kiện" },
  { value: "Sưu tầm", label: "Sưu tầm", description: "Tem, tiền cổ, đồ sưu tầm, đồ hiếm" },
  { value: "Đồ cổ", label: "Đồ cổ", description: "Đồ cổ, đồ xưa, đồ antiques" },
  { value: "Đồ điện tử", label: "Đồ điện tử", description: "Máy móc, thiết bị điện tử" },
  { value: "Xe cộ", label: "Xe cộ", description: "Xe máy, ô tô, xe đạp" },
  { value: "Khác", label: "Khác", description: "Các món đồ không thuộc danh mục trên" },
];

// Condition options with descriptions
const CONDITION_OPTIONS = [
  { value: "Mới", label: "Mới", description: "Sản phẩm mới chưa qua sử dụng, còn tem nhãn" },
  { value: "Như mới", label: "Như mới", description: "Đã mở hộp nhưng không sử dụng, còn nguyên vẹn" },
  { value: "Đã sử dụng - tốt", label: "Đã sử dụng - tốt", description: "Đã qua sử dụng nhưng còn tốt, hoạt động ổn định" },
  { value: "Đã sử dụng - có dấu hiệu", label: "Đã sử dụng - có dấu hiệu", description: "Có vết xước nhẹ, trầy nhẹ do sử dụng" },
  { value: "Cần sửa chữa", label: "Cần sửa chữa", description: "Hỏng hóc nhẹ hoặc cần bảo dưỡng" },
];

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 15, label: "15 phút" },
  { value: 30, label: "30 phút" },
  { value: 60, label: "1 giờ" },
  { value: 360, label: "6 giờ" },
  { value: 1440, label: "1 ngày" },
  { value: 4320, label: "3 ngày" },
  { value: 10080, label: "7 ngày" },
];

export function NewAuctionClient() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [startPrice, setStartPrice] = useState<string>("");
  const [bidStep, setBidStep] = useState<string>("");
  const [duration, setDuration] = useState<string>("15");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form errors
  const [titleError, setTitleError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [startPriceError, setStartPriceError] = useState<string | null>(null);
  const [bidStepError, setBidStepError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Compute preview values
  const parsedStartPrice = Number(startPrice) || 0;
  const parsedBidStep = Number(bidStep) || 0;
  const parsedDuration = Number(duration) || 15;
  const estimatedEnd = new Date(Date.now() + parsedDuration * 60 * 1000);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(!!data.user);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Validate form fields
  const validateField = (name: string, value: string | number): string | null => {
    switch (name) {
      case "title":
        if (!value || (typeof value === "string" && value.trim().length < 5)) {
          return "Tên sản phẩm phải từ 5 ký tự trở lên";
        }
        if (typeof value === "string" && value.trim().length > 100) {
          return "Tên sản phẩm không được vượt quá 100 ký tự";
        }
        return null;

      case "category":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Vui lòng chọn danh mục";
        }
        return null;

      case "condition":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Vui lòng chọn tình trạng";
        }
        return null;

      case "description":
        if (!value || (typeof value === "string" && value.trim().length < 20)) {
          return "Mô tả chi tiết phải từ 20 ký tự trở lên";
        }
        if (typeof value === "string" && value.trim().length > 2000) {
          return "Mô tả không được vượt quá 2000 ký tự";
        }
        return null;

      case "startPrice":
        const startPriceNum = Number(value);
        if (!Number.isFinite(startPriceNum) || startPriceNum < 1000) {
          return "Giá khởi điểm tối thiểu là 1,000 VND";
        }
        if (!Number.isInteger(startPriceNum)) {
          return "Giá khởi điểm phải là số nguyên";
        }
        return null;

      case "bidStep":
        const bidStepNum = Number(value);
        if (!Number.isFinite(bidStepNum) || bidStepNum < 10000) {
          return "Bước giá tối thiểu là 10,000 VND";
        }
        if (!Number.isInteger(bidStepNum)) {
          return "Bước giá phải là số nguyên";
        }
        if (parsedStartPrice > 0 && bidStepNum > parsedStartPrice) {
          return "Bước giá không nên lớn hơn giá khởi điểm";
        }
        return null;

      case "duration":
        const durationNum = Number(value);
        if (!Number.isFinite(durationNum) || durationNum < 5) {
          return "Thời gian đấu giá tối thiểu là 5 phút";
        }
        if (durationNum > 10080) {
          return "Thời gian đấu giá tối đa là 7 ngày (10,080 phút)";
        }
        return null;

      default:
        return null;
    }
  };

  // Field change handlers with validation
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    setTitleError(validateField("title", value));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setCategoryError(validateField("category", e.target.value));
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCondition(e.target.value);
    setConditionError(validateField("condition", e.target.value));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDescription(value);
    setDescriptionError(validateField("description", value));
  };

  const handleStartPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setStartPrice(value);
    setStartPriceError(validateField("startPrice", value));
  };

  const handleBidStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setBidStep(value);
    setBidStepError(validateField("bidStep", value));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setDuration(value);
    setDurationError(validateField("duration", value));
  };

  const handleImageChange = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const addImageField = () => {
    if (imageUrls.length < 5) {
      setImageUrls([...imageUrls, ""]);
    }
  };

  const removeImageField = (index: number) => {
    if (imageUrls.length > 1) {
      const newUrls = [...imageUrls];
      newUrls.splice(index, 1);
      setImageUrls(newUrls);
    }
  };

  // Check if form is valid
  const isFormValid =
    !titleError &&
    !categoryError &&
    !conditionError &&
    !descriptionError &&
    !startPriceError &&
    !bidStepError &&
    !durationError &&
    title.trim().length >= 5 &&
    category.trim() !== "" &&
    condition.trim() !== "" &&
    description.trim().length >= 20 &&
    parsedStartPrice >= 1000 &&
    parsedBidStep >= 10000 &&
    parsedBidStep <= parsedStartPrice &&
    parsedDuration >= 5 &&
    parsedDuration <= 10080 &&
    imageUrls.length <= 5;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError("Vui lòng kiểm tra lại thông tin form");
      return;
    }

    if (!termsAccepted) {
      setError("Bạn cần đồng ý với các điều khoản trước khi tạo phiên đấu giá");
      return;
    }

    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);

    try {
      const imageList = imageUrls.filter((url) => url.trim() !== "");

      const result = await createAuction({
        title: title.trim(),
        category: category.trim(),
        condition: condition.trim(),
        description: description.trim(),
        startPrice: parsedStartPrice,
        bidStep: parsedBidStep,
        duration: parsedDuration,
        images: imageList,
        autoExtensionEnabled: true,
        maxExtensions: 3,
      });

      if (result.success) {
        setSuccessMessage("Tạo phiên đấu giá thành công! Chuyển hướng đến phiên đấu giá...");
        setTimeout(() => {
          router.push(`/auctions/${result.data.auctionId}`);
          router.refresh();
        }, 1500);
        return;
      }

      setError(result.error || "Có lỗi xảy ra khi tạo phiên đấu giá");
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to check if URL is valid image URL
  const isValidImageUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center">
        <Alert className="mx-auto max-w-md bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            Bạn cần đăng nhập để tạo phiên đấu giá.
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex justify-center gap-4">
          <Button asChild>
            <a href="/auth/login">Đăng nhập</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/auth/register">Đăng ký</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tạo phiên đấu giá mới</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                MVP
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
              Đăng sản phẩm của bạn và bắt đầu nhận giá thầu từ người mua.
            </p>
          </div>
          <Button variant="outline" asChild className="sm:hidden">
            <a href="/auctions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Danh sách đấu giá
            </a>
          </Button>
        </div>
      </div>

      {/* Main content - 2 columns on desktop */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column - Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Product Info Section */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Thông tin sản phẩm</CardTitle>
              <CardDescription>Nhập thông tin chi tiết về sản phẩm bạn muốn đấu giá.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Tên sản phẩm *</Label>
                  <span className="text-xs text-muted-foreground">{title.length}/100</span>
                </div>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="VD: Đồng hồ Rolex Submariner - Mới 99%"
                  maxLength={100}
                  className={`w-full ${titleError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {titleError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {titleError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Từ 5 đến 100 ký tự. Tốt nhất nên có thương hiệu + model + tình trạng.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Danh mục *</Label>
                  <div className="relative">
                    <select
                      id="category"
                      name="category"
                      value={category}
                      onChange={handleCategoryChange}
                      className={`h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                        categoryError ? "border-red-500 focus-visible:ring-red-500" : "border-input"
                      }`}
                    >
                      <option value="">Chọn danh mục</option>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-2.5 h-4 w-4 rotate-90 text-muted-foreground pointer-events-none" />
                  </div>
                  {categoryError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {categoryError}
                    </p>
                  )}
                  {category && (
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_OPTIONS.find((c) => c.value === category)?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Tình trạng *</Label>
                  <div className="relative">
                    <select
                      id="condition"
                      name="condition"
                      value={condition}
                      onChange={handleConditionChange}
                      className={`h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                        conditionError ? "border-red-500 focus-visible:ring-red-500" : "border-input"
                      }`}
                    >
                      <option value="">Chọn tình trạng</option>
                      {CONDITION_OPTIONS.map((cond) => (
                        <option key={cond.value} value={cond.value}>
                          {cond.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-2.5 h-4 w-4 rotate-90 text-muted-foreground pointer-events-none" />
                  </div>
                  {conditionError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {conditionError}
                    </p>
                  )}
                  {condition && (
                    <p className="text-xs text-muted-foreground">
                      {CONDITION_OPTIONS.find((c) => c.value === condition)?.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Mô tả chi tiết *</Label>
                  <span className="text-xs text-muted-foreground">{description.length}/2000</span>
                </div>
                <div className="relative">
                  <Textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder={`Ví dụ:\n- Nguồn gốc sản phẩm:\n- Tình trạng hiện tại:\n- Phụ kiện đi kèm:\n- Chính sách giao nhận:\n- Lưu ý cho người mua:`}
                    className={`min-h-32 resize-y ${descriptionError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    maxLength={2000}
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      Gợi ý: Viết chi tiết để thu hút người mua
                    </Badge>
                  </div>
                </div>
                {descriptionError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {descriptionError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Tối thiểu 20 ký tự. Mô tả chi tiết giúp tăng độ tin cậy và thu hút người mua.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Images Section */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Hình ảnh sản phẩm
              </CardTitle>
              <CardDescription>Tối đa 5 ảnh. Ảnh đầu tiên sẽ là thumbnail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="flex-1 relative">
                      <Input
                        id={`image-${index}`}
                        name="imageUrls"
                        value={url}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        type="url"
                        placeholder={`https://example.com/image${index + 1}.jpg`}
                        className="w-full"
                      />
                      {url && isValidImageUrl(url) && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                            <img src={url} alt={`Preview ${index}`} className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                          </div>
                        </div>
                      )}
                    </div>
                    {imageUrls.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeImageField(index)} className="h-9 w-9 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {imageUrls.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addImageField} className="w-full">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Thêm ảnh
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, index) =>
                  url && isValidImageUrl(url) ? (
                    <Badge key={index} variant="secondary" className="text-xs">
                      Ảnh {index + 1}
                    </Badge>
                  ) : null
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ URL ảnh từ JPEG, PNG, WebP. Ảnh đầu tiên sẽ làm thumbnail.
              </p>
            </CardContent>
          </Card>

          {/* Pricing Section */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-emerald-600">💰</span>
                Cài đặt giá
              </CardTitle>
              <CardDescription>Giá khởi điểm và bước giá tối thiểu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startPrice">Giá khởi điểm (VND) *</Label>
                  <div className="relative">
                    <Input
                      id="startPrice"
                      name="startPrice"
                      type="number"
                      value={startPrice}
                      onChange={handleStartPriceChange}
                      placeholder="1000000"
                      min={1000}
                      step={1000}
                      className={`pl-12 ${startPriceError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₫</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {parsedStartPrice > 0 ? formatCurrency(parsedStartPrice) : "Ví dụ: 1.000.000 VND"}
                  </p>
                  {startPriceError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {startPriceError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bidStep">Bước giá tối thiểu (VND) *</Label>
                  <div className="relative">
                    <Input
                      id="bidStep"
                      name="bidStep"
                      type="number"
                      value={bidStep}
                      onChange={handleBidStepChange}
                      placeholder="10000"
                      min={10000}
                      step={1000}
                      className={`pl-12 ${bidStepError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₫</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {parsedBidStep > 0 ? formatCurrency(parsedBidStep) : "Ví dụ: 10.000 VND"}
                  </p>
                  {bidStepError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {bidStepError}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duration Section */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Thời gian đấu giá
              </CardTitle>
              <CardDescription>Chọn thời gian cho phiên đấu giá của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDuration(String(opt.value));
                      setDurationError(validateField("duration", opt.value));
                    }}
                    className={`flex flex-col items-center justify-center rounded-md border px-3 py-2 text-sm transition-all ${
                      duration === String(opt.value)
                        ? "border-ring bg-ring/10 text-ring"
                        : "border-input hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Tùy chỉnh (phút)</Label>
                <div className="relative">
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={duration}
                    onChange={handleDurationChange}
                    min={5}
                    max={10080}
                    className="pl-12"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">min</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {parsedDuration > 0 && parsedDuration >= 5 && parsedDuration <= 10080
                    ? `Thời gian: ${Math.floor(parsedDuration / 60)}h ${parsedDuration % 60}p (${parsedDuration} phút)`
                    : "Tối thiểu 5 phút, tối đa 7 ngày (10,080 phút)"}
                </p>
              </div>

              <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20 flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Dự kiến kết thúc:</strong> {estimatedEnd.toLocaleString("vi-VN")}
                </div>
              </div>
              {durationError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {durationError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Terms and Submit */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1">
                  <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Tôi xác nhận thông tin sản phẩm là chính xác và đồng ý không chỉnh sửa sau khi có người đặt giá.
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Lưu ý: Sau khi phiên đấu giá có bid, bạn không nên thay đổi thông tin sản phẩm để đảm bảo tính minh bạch.
                  </p>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="flex-1"
                >
                  <a href="/auctions">
                    Hủy
                  </a>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    if (!isFormValid) {
                      setError("Vui lòng kiểm tra lại thông tin form");
                      return;
                    }
                    if (!termsAccepted) {
                      setError("Bạn cần đồng ý với các điều khoản trước khi tạo phiên đấu giá");
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                  disabled={!isFormValid || submitting || !termsAccepted}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? "Đang tạo..." : "Tạo phiên đấu giá"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6">
            <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <div className="bg-primary text-primary-foreground p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Preview Phiên Đấu Giá</h2>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-xs">
                    Dựng trước
                  </Badge>
                </div>
                <p className="text-xs text-primary-foreground/80 mt-1">
                  Sản phẩm của bạn sẽ hiển thị như này sau khi tạo.
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Image Preview */}
                <div className="aspect-square w-full rounded-lg bg-muted overflow-hidden flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                  {imageUrls[0] && isValidImageUrl(imageUrls[0]) ? (
                    <img src={imageUrls[0]} alt={title || "Sản phẩm"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">Ảnh preview sẽ hiển thị ở đây</p>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2">
                      {category && <Badge variant="outline" className="text-xs">{category}</Badge>}
                      {condition && <Badge variant="secondary" className="text-xs">{condition}</Badge>}
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2" title={title}>
                      {title || <span className="text-muted-foreground italic">Tên sản phẩm sẽ hiển thị ở đây...</span>}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-600">
                        {parsedStartPrice > 0 ? formatCurrency(parsedStartPrice) : "0 ₫"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({formatNumberWithCommas(parsedStartPrice)} VND)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Bước giá: <span className="font-medium text-foreground">{parsedBidStep > 0 ? formatCurrency(parsedBidStep) : "10.000 ₫"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Duration info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {parsedDuration >= 5 && parsedDuration <= 10080
                        ? `Kết thúc sau: ${Math.floor(parsedDuration / 60)}h ${parsedDuration % 60}p`
                        : "Thời gian chưa hợp lệ"}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-emerald-600">
                      Sẽ mở ngay khi tạo
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Status: ACTIVE
                    </Badge>
                  </div>

                  {/* Description preview */}
                  {description && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
                    </div>
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Số ảnh</div>
                      <div className="font-semibold">{imageUrls.filter((u) => u.trim()).length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Bước giá</div>
                      <div className="font-semibold">{parsedBidStep > 0 ? formatCurrency(parsedBidStep) : "-"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Thời gian</div>
                      <div className="font-semibold">{parsedDuration > 0 ? `${parsedDuration}p` : "-"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200/50 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Lưu ý:</strong> Sau khi phiên đấu giá có bid, bạn không nên thay đổi thông tin sản phẩm để đảm bảo tính minh bạch.
                    </p>
                  </div>
                </div>
              </div>

              <CardFooter className="justify-between border-t bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  Preview cập nhật realtime
                </div>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </CardFooter>
            </Card>

            {successMessage && (
              <Alert className="mt-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo phiên đấu giá</DialogTitle>
            <DialogDescription>
              Vui lòng kiểm tra lại thông tin trước khi đăng bán trên AutoBid.vn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Tên sản phẩm</span>
              <span className="font-medium text-right">{title}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Giá khởi điểm</span>
              <span className="font-medium">{formatCurrency(parsedStartPrice)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Bước giá</span>
              <span className="font-medium">{formatCurrency(parsedBidStep)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Thời gian đấu giá</span>
              <span className="font-medium">{parsedDuration} phút</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Số ảnh</span>
              <span className="font-medium">{imageUrls.filter((url) => url.trim()).length}</span>
            </div>
          </div>

          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Sau khi phiên đấu giá có bid, bạn không nên thay đổi thông tin sản phẩm.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Kiểm tra lại
            </Button>
            <Button onClick={confirmSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Đang tạo..." : "Xác nhận tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
