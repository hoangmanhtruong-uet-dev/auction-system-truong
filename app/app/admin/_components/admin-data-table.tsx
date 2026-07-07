import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminDataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}

export function TableEmptyState({
  title = "Chưa có dữ liệu",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function TableErrorState({
  message = "Không thể tải dữ liệu",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <p className="font-medium text-destructive">{message}</p>
      <p className="text-sm text-muted-foreground">Vui lòng tải lại trang hoặc kiểm tra kết nối cơ sở dữ liệu.</p>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(120px, 1fr))` }}>
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton key={column} className="h-8 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}
