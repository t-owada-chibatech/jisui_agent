"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoginPage && !loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoginPage, loading, user, pathname, router]);

  // /login はログイン前でも表示できないと詰むので、ゲートの対象外にする
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>;
  }

  return <>{children}</>;
}
