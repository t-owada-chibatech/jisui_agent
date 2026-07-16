"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSignupDone(false);

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else {
        router.push(redirectTo);
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: username.trim() } },
      });
      if (err) {
        setError(err.message);
      } else {
        setSignupDone(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 -m-6">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-5">
          <h1 className="text-lg font-bold text-gray-900">自炊支援アシスタント</h1>
          <p className="text-xs text-gray-500 mt-1">
            {mode === "login" ? "ログインして続ける" : "新規登録して始める"}
          </p>
        </div>

        <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); setSignupDone(false); }}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              mode === "login" ? "bg-white shadow-sm text-emerald-700" : "text-gray-500"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); setSignupDone(false); }}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              mode === "signup" ? "bg-white shadow-sm text-emerald-700" : "text-gray-500"
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ユーザーネーム</label>
              <input
                type="text"
                required
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="例: たろう"
              />
              <p className="text-[11px] text-gray-400 mt-1">適当レシピ集で「誰が投稿したか」の表示に使われます</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">パスワード</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="6文字以上"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {signupDone && (
            <p className="text-xs text-emerald-600">
              登録しました。確認メールが届く場合はリンクを開いてからログインしてください。
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {mode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
            {loading ? "処理中…" : mode === "login" ? "ログイン" : "登録する"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
