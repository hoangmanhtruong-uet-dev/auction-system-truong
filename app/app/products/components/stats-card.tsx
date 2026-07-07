"use client";

import { HTMLAttributes } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductStatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ElementType;
}

export function ProductStatCard({ 
  title, 
  value, 
  subtitle, 
  trend = "neutral", 
  trendValue, 
  icon: Icon,
  className,
  ...props 
}: ProductStatCardProps) {
  return (
    <Card className={cn("overflow-hidden bg-white/5 border-white/10 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-amber-500/20 hover:shadow-2xl", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-400">{title}</CardTitle>
        <Icon className="h-4 w-4 text-amber-400/70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
        {trend && trend !== "neutral" && trendValue && (
          <div className={`flex items-center gap-1 text-xs mt-2 ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}