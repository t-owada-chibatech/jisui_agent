"use client";
import { useDashboardTheme } from "@/lib/theme/ThemeContext";
import { themeTokens } from "@/lib/theme/tokens";

export function ThemeBackground({ children }: { children: React.ReactNode }) {
  const { theme } = useDashboardTheme();
  const t = themeTokens[theme];
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: t.pageBgColor, backgroundImage: t.pageBgImage, backgroundSize: t.pageBgSize }}
    >
      {children}
    </div>
  );
}
