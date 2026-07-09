import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// リクエストのAuthorizationヘッダーからユーザーのアクセストークンを取り出し、
// そのユーザーとしてSupabaseにアクセスするクライアントを作る（RLSがauth.uid()で効く）。
export function createUserSupabase(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
  );

  return { client, token };
}

export async function getRequestUser(req: NextRequest) {
  const { client, token } = createUserSupabase(req);
  if (!token) return { client, user: null };
  const { data } = await client.auth.getUser();
  return { client, user: data.user ?? null };
}
