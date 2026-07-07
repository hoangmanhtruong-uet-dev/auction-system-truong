import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-primary text-primary-foreground",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-red-600 text-white",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
