"use client";
import { useEffect, useState } from "react";
import { UserCircle, Save } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/auth/useSession";
import { supabase } from "@/lib/supabase";

export default function MyPage() {
  const { user } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      setDisplayName((data?.display_name as string) ?? "");
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setSaved(false);

    const trimmed = displayName.trim();
    const { error: err } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: trimmed });

    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h2 className="text-xl font-bold text-gray-900">マイページ</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          適当レシピ集で「誰が投稿したか」表示されるユーザーネームを変更できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCircle size={16} className="text-gray-400" />
            <CardTitle>プロフィール</CardTitle>
          </div>
        </CardHeader>

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス</label>
          <p className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            {user?.email}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ユーザーネーム</label>
            <input
              type="text"
              required
              maxLength={20}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              placeholder="例: たろう"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {saved && <p className="text-xs text-emerald-600">保存しました</p>}

          <Button type="submit" disabled={loading || saving}>
            <Save size={15} />
            {saving ? "保存中…" : "保存する"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
