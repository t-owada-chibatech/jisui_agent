import type { Metadata } from "next";
import { Noto_Sans_JP, M_PLUS_Rounded_1c, Zen_Kaku_Gothic_New, Yomogi } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { ThemeBackground } from "@/components/layout/ThemeBackground";

const notoSans = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"] });
const mPlusRounded = M_PLUS_Rounded_1c({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-pop" });
const zenKaku = Zen_Kaku_Gothic_New({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-modern" });
const yomogi = Yomogi({ subsets: ["latin"], weight: ["400"], variable: "--font-cute" });

export const metadata: Metadata = {
  title: "自炊アシスタント",
  description: "食費を抑えながら自炊を継続するためのWebアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body
        className={`${notoSans.className} ${mPlusRounded.variable} ${zenKaku.variable} ${yomogi.variable} bg-gray-50 min-h-screen`}
      >
        <ThemeProvider>
          <Sidebar />
          <ThemeBackground>
            <main className="md:ml-60 min-h-screen">
              <div className="max-w-5xl mx-auto px-4 py-6 pt-16 md:px-6 md:pt-6">
                <AuthGuard>{children}</AuthGuard>
              </div>
            </main>
          </ThemeBackground>
        </ThemeProvider>
      </body>
    </html>
  );
}
