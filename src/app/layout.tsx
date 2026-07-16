import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

const notoSans = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "自炊アシスタント",
  description: "食費を抑えながら自炊を継続するためのWebアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSans.className} bg-gray-50 min-h-screen`}>
        <Sidebar />
        <main className="md:ml-60 min-h-screen">
          <div className="max-w-5xl mx-auto px-4 py-6 pt-16 md:px-6 md:pt-6">
            <AuthGuard>{children}</AuthGuard>
          </div>
        </main>
      </body>
    </html>
  );
}
