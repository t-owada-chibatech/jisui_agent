"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/ingredients", label: "食材管理", icon: Package },
  { href: "/recipes", label: "レシピ提案", icon: ChefHat },
  { href: "/shopping", label: "買い物リスト", icon: ShoppingCart },
  { href: "/budget", label: "家計簿", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex flex-col z-20">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <div>
            <h1 className="text-sm font-bold text-gray-900">自炊アシスタント</h1>
            <p className="text-xs text-gray-400">食費を賢く節約</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} className={isActive ? "text-emerald-600" : "text-gray-400"} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">MVP v0.1</p>
      </div>
    </aside>
  );
}
