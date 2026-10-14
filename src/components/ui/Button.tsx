"use client";
import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";
import { useDashboardTheme } from "@/lib/theme/ThemeContext";
import { themeTokens } from "@/lib/theme/tokens";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "text-white hover:brightness-110",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  danger: "bg-red-500 hover:bg-red-600 text-white",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useDashboardTheme();
  const t = themeTokens[theme];

  return (
    <button
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium transition-all",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        borderRadius: t.radius,
        ...(variant === "primary" ? { background: t.buttonPrimaryBg, color: t.buttonPrimaryText } : {}),
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
