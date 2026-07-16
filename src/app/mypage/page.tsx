"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Camera, Save, Smartphone, UserCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "@/lib/auth/useSession";
import { supabase } from "@/lib/supabase";
import { randomStoragePath } from "@/lib/utils/storage";

export default function MyPage() {
  const { user } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    // window.location.originはSSR時に取れないので、マウント後に設定する
    // （このアプリが動いているアドレスをそのままQRコードにする）
    setPageUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();
      setDisplayName((data?.display_name as string) ?? "");
      setAvatarUrl((data?.avatar_url as string) ?? "");
      setLoading(false);
    })();
  }, [user]);

  const handleAvatarSelect = (file: File | null) => {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setSaved(false);

    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const path = randomStoragePath(user.id, avatarFile);
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile);
      if (uploadErr) {
        setError("写真のアップロードに失敗しました: " + uploadErr.message);
        setSaving(false);
        return;
      }
      newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const trimmed = displayName.trim();
    const { error: err } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: trimmed, avatar_url: newAvatarUrl || null });

    if (err) {
      setError(err.message);
    } else {
      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setSaved(true);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">マイページ</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          適当レシピ集で「誰が投稿したか」表示されるユーザーネームを変更できます
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <Card className="max-w-md flex-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle size={16} className="text-gray-400" />
              <CardTitle>プロフィール</CardTitle>
            </div>
          </CardHeader>

          <div className="flex items-center gap-3 mb-4">
            <Avatar src={avatarPreview || avatarUrl} alt={displayName} size={56} />
            <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 cursor-pointer">
              <Camera size={13} />
              写真を変更
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

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

        <Card className="w-full md:w-44 flex-shrink-0 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Smartphone size={14} className="text-gray-400" />
            <CardTitle>スマホで開く</CardTitle>
          </div>
          {pageUrl ? (
            <div className="flex justify-center">
              <QRCodeSVG value={pageUrl} size={128} marginSize={2} />
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto bg-gray-50 rounded" />
          )}
          <p className="text-[10px] text-gray-400 mt-2 break-all">{pageUrl}</p>
        </Card>
      </div>
    </div>
  );
}
