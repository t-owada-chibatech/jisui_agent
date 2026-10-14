"use client";
import { clsx } from "clsx";
import { useDashboardTheme } from "@/lib/theme/ThemeContext";
import { themeTokens } from "@/lib/theme/tokens";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  const { theme } = useDashboardTheme();
  const t = themeTokens[theme];
  return (
    <div
      className={clsx("p-4", className)}
      style={{ background: t.cardBg, border: t.cardBorder, borderRadius: t.cardRadius, boxShadow: t.cardShadow }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={clsx("flex items-center justify-between mb-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  const { theme } = useDashboardTheme();
  const t = themeTokens[theme];
  return (
    <h3
      className={clsx("text-sm font-semibold", className)}
      style={{ color: t.cardTitleColor, fontFamily: t.headingFont }}
    >
      {children}
    </h3>
  );
}
