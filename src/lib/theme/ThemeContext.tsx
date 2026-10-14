"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type DashboardTheme = "pop" | "modern" | "cute";

const STORAGE_KEY = "dashboard-theme";
const THEMES: DashboardTheme[] = ["pop", "modern", "cute"];

interface ThemeContextValue {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "modern",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<DashboardTheme>("modern");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.includes(saved as DashboardTheme)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- サーバーには無いlocalStorageの値をマウント後に反映するため
      setThemeState(saved as DashboardTheme);
    }
  }, []);

  function setTheme(next: DashboardTheme) {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme() {
  return useContext(ThemeContext);
}
