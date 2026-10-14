"use client";
import { clsx } from "clsx";
import { useDashboardTheme } from "@/lib/theme/ThemeContext";
import { themeTokens } from "@/lib/theme/tokens";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  const { theme } = useDashboardTheme();
  const t = themeTokens[theme];
  return (
    <span
      className={clsx("inline-flex items-center px-2 py-0.5 text-xs font-medium", variantStyles[variant], className)}
      style={{ borderRadius: t.badgeRadius }}
    >
      {children}
    </span>
  );
}
