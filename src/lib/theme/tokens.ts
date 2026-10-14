import { DashboardTheme } from "./ThemeContext";

export interface ThemeTokens {
  headingFont: string;
  pageHeaderColor: string;
  cardTitleColor: string;
  cardBg: string;
  cardBorder: string;
  cardRadius: string;
  cardShadow: string;
  radius: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  badgeRadius: string;
  sidebarActiveBg: string;
  sidebarActiveText: string;
  sidebarActiveIcon: string;
  pageBgColor: string;
  pageBgImage: string;
  pageBgSize: string;
}

export const themeTokens: Record<DashboardTheme, ThemeTokens> = {
  modern: {
    headingFont: "var(--font-modern)",
    pageHeaderColor: "#065F46",
    cardTitleColor: "#111827",
    cardBg: "#ffffff",
    cardBorder: "1px solid #E5E7EB",
    cardRadius: "1.125rem",
    cardShadow: "0 6px 18px -10px rgba(0,0,0,0.08)",
    radius: "0.625rem",
    buttonPrimaryBg: "#059669",
    buttonPrimaryText: "#ffffff",
    badgeRadius: "0.375rem",
    sidebarActiveBg: "#ECFDF5",
    sidebarActiveText: "#047857",
    sidebarActiveIcon: "#059669",
    pageBgColor: "#F9FAFB",
    pageBgImage: "none",
    pageBgSize: "auto",
  },
  pop: {
    headingFont: "var(--font-pop)",
    pageHeaderColor: "#7C3AED",
    cardTitleColor: "#1F2937",
    cardBg: "#ffffff",
    cardBorder: "2px solid #F3E8FF",
    cardRadius: "1.5rem",
    cardShadow: "0 10px 28px -10px rgba(139,92,246,0.22)",
    radius: "9999px",
    buttonPrimaryBg: "linear-gradient(90deg,#8B5CF6,#EC4899)",
    buttonPrimaryText: "#ffffff",
    badgeRadius: "9999px",
    sidebarActiveBg: "#F5F3FF",
    sidebarActiveText: "#7C3AED",
    sidebarActiveIcon: "#8B5CF6",
    pageBgColor: "#FDF4FF",
    pageBgImage: "linear-gradient(160deg,#FDF4FF 0%,#FFF1F2 35%,#FFF7ED 65%,#ECFEFF 100%)",
    pageBgSize: "auto",
  },
  cute: {
    headingFont: "var(--font-cute)",
    pageHeaderColor: "#C2703D",
    cardTitleColor: "#5C3317",
    cardBg: "#ffffff",
    cardBorder: "2px dashed #F0D9B8",
    cardRadius: "1.375rem",
    cardShadow: "0 6px 16px -10px rgba(0,0,0,0.05)",
    radius: "9999px",
    buttonPrimaryBg: "#E8673D",
    buttonPrimaryText: "#ffffff",
    badgeRadius: "9999px",
    sidebarActiveBg: "#FFF4E8",
    sidebarActiveText: "#C2703D",
    sidebarActiveIcon: "#E8673D",
    pageBgColor: "#FFFBF3",
    pageBgImage: "radial-gradient(#FDE8D7 1.5px, transparent 1.5px)",
    pageBgSize: "22px 22px",
  },
};
