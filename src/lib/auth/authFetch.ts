"use client";
import { supabase } from "@/lib/supabase";

// ログイン中ユーザーのアクセストークンを Authorization ヘッダーに付けて fetch する。
// APIルート側はこのトークンでリクエスト単位のSupabaseクライアントを作り、RLSを効かせる。
export async function authFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}
