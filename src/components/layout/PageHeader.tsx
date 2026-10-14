"use client";
import { useDashboardTheme } from "@/lib/theme/ThemeContext";
import { themeTokens } from "@/lib/theme/tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { theme } = useDashboardTheme();
  const t = themeTokens[theme];
  return (
    <div>
      <h2
        className="text-xl font-bold"
        style={{ color: t.pageHeaderColor, fontFamily: t.headingFont }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
