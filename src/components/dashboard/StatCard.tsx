import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "accent";
}

export function StatCard({ title, value, icon, trend, variant = "default" }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend.value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-success";
    if (trend.value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const borderColors = {
    default: "border-l-border",
    primary: "border-l-primary",
    success: "border-l-success",
    warning: "border-l-warning",
    accent: "border-l-accent",
  };

  const iconBgColors = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    accent: "bg-accent/10 text-accent",
  };

  return (
    <div className={cn(
      "bg-card rounded-xl p-5 shadow-soft border border-border/50 border-l-4 transition-all duration-300 hover:shadow-card animate-fade-in",
      borderColors[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconBgColors[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
