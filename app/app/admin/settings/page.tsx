import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const settings = [
  {
    title: "Manual bid",
    state: "Đang bật",
    description: "Luồng đặt giá thủ công là luồng chính của MVP và không bị thay đổi bởi admin dashboard.",
  },
  {
    title: "Auto-bid",
    state: "Chưa bật",
    description: "Admin chỉ hiển thị badge Auto-bid cũ nếu DB có isAutoBid, không cho tạo auto-bid mới.",
  },
  {
    title: "Payment",
    state: "Thủ công",
    description: "Payment state dựa trên auction COMPLETED, winner và paidAt. Chưa tích hợp cổng thanh toán online.",
  },
  {
    title: "Audit log",
    state: "Đang ghi",
    description: "Các action quản trị nhạy cảm như cancel auction, mark paid, block user ghi vào audit_logs.",
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Cấu hình vận hành MVP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Trang này chỉ mô tả trạng thái vận hành hiện có. Chưa thêm form cấu hình vì backend chưa có settings schema/action riêng.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <CardTitle className="text-base">{item.title}</CardTitle>
              <Badge variant="outline" className="rounded-md">{item.state}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
