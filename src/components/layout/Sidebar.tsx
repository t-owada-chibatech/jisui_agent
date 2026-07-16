"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  Wallet,
  ScanLine,
  MessageCircle,
  BookMarked,
  UserCircle,
  LogIn,
  LogOut,
} from "lucide-react";
import { useSession } from "@/lib/auth/useSession";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/ingredients", label: "食材管理", icon: Package },
  { href: "/recipes", label: "レシピ提案", icon: ChefHat },
  { href: "/chat", label: "AIレシピ相談", icon: MessageCircle },
  { href: "/my-recipes", label: "適当レシピ集", icon: BookMarked },
  { href: "/shopping", label: "買い物リスト", icon: ShoppingCart },
  { href: "/budget", label: "家計簿", icon: Wallet },
  { href: "/receipt", label: "レシート取込", icon: ScanLine },
  { href: "/mypage", label: "マイページ", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex flex-col z-20">
      <div className="px-5 py-4 border-b border-gray-100">
        <Image
          src="/logo.svg"
          alt="Jisui Agent"
          width={190}
          height={45}
          priority
        />
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
      <div className="px-4 py-4 border-t border-gray-100 space-y-2">
        {!loading && (
          user ? (
            <div className="space-y-1.5">
              <Link href="/mypage" className="block text-xs text-gray-500 truncate px-1 hover:text-emerald-600">
                {user.email}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <LogOut size={16} className="text-gray-400" />
                ログアウト
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            >
              <LogIn size={16} />
              ログイン
            </Link>
          )
        )}
        <p className="text-xs text-gray-400 px-1">MVP v0.1</p>
      </div>
    </aside>
  );
}
