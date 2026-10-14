"use client";
import { clsx } from "clsx";
import { useDashboardTheme, type DashboardTheme } from "@/lib/theme/ThemeContext";

const options: { value: DashboardTheme; label: string; swatch: string }[] = [
  { value: "pop", label: "ポップ", swatch: "linear-gradient(135deg,#8B5CF6,#EC4899,#F59E0B)" },
  { value: "modern", label: "モダン", swatch: "linear-gradient(135deg,#064E3B,#0D9488)" },
  { value: "cute", label: "ほっこり", swatch: "linear-gradient(135deg,#FFD7AD,#8FD4B2)" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useDashboardTheme();

  return (
    <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors",
            theme === opt.value ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: opt.swatch }}
          />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
