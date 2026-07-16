"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Clock, Wallet, Trash2, BookMarked, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "@/lib/auth/useSession";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils/currency";
import { CasualRecipe, CasualRecipeDifficulty } from "@/types";

const DIFFICULTY_LABEL: Record<CasualRecipeDifficulty, string> = {
  easy: "かんたん",
  normal: "ふつう",
  hard: "がんばる",
};

function mapCasualRecipe(row: Record<string, unknown>): CasualRecipe {
  const profiles = row.profiles as
    | { display_name?: string; avatar_url?: string }
    | { display_name?: string; avatar_url?: string }[]
    | null
    | undefined;
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    ingredients: (row.ingredients as string[]) ?? [],
    steps: (row.steps as string[]) ?? [],
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : undefined,
    cookingTimeMinutes: row.cooking_time_minutes != null ? Number(row.cooking_time_minutes) : undefined,
    difficulty: (row.difficulty as CasualRecipeDifficulty) ?? "easy",
    vibe: (row.vibe as string) ?? "大学生の適当レシピ",
    tags: (row.tags as string[]) ?? [],
    photoUrl: (row.photo_url as string) ?? undefined,
    sourceSessionId: (row.source_session_id as string) ?? undefined,
    userId: (row.user_id as string) ?? undefined,
    authorName: profile?.display_name,
    authorAvatarUrl: profile?.avatar_url,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function MyRecipesPageInner() {
  const { user } = useSession();
  const [recipes, setRecipes] = useState<CasualRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadRecipes() {
    setLoading(true);
    // casual_recipesは全ユーザーに公開されている共有DBなので、全員分を投稿者名付きで表示する
    // ただし「適当レシピ集」はユーザー投稿のみを見せたいので、AI生成・楽天由来のものは除外する
    const { data } = await supabase
      .from("casual_recipes")
      .select("*, profiles(display_name, avatar_url)")
      .eq("source", "user_posted")
      .order("created_at", { ascending: false });
    setRecipes((data || []).map((r) => mapCasualRecipe(r as Record<string, unknown>)));
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadRecipes();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("casual_recipes").delete().eq("id", id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  };

  const filtered = recipes.filter((r) => {
    if (!keyword.trim()) return true;
    const q = keyword.trim().toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      r.ingredients.some((i) => i.toLowerCase().includes(q)) ||
      r.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">みんなの適当レシピ集</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          全員が共有した適当レシピの一覧です。食材から探したいときは<Link href="/recipes" className="text-emerald-600 hover:underline">レシピ提案</Link>も使えます
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="レシピ名・材料・タグで検索"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <BookMarked size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">
            {recipes.length === 0 ? "まだ保存したレシピがありません" : "条件に合うレシピが見つかりませんでした"}
          </p>
          <p className="text-xs text-gray-400">AIレシピ相談でチャットして「このレシピを保存」してみましょう</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((recipe) => {
            const isExpanded = expandedId === recipe.id;
            return (
              <Card key={recipe.id}>
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                >
                  {recipe.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.photoUrl}
                      alt={recipe.title}
                      className="w-16 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge variant="info">{DIFFICULTY_LABEL[recipe.difficulty]}</Badge>
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="default">{tag}</Badge>
                      ))}
                    </div>
                    <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors">{recipe.title}</h3>
                    {recipe.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{recipe.description}</p>
                    )}
                    {recipe.authorName && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Avatar src={recipe.authorAvatarUrl} alt={recipe.authorName} size={14} />
                        投稿者: {recipe.authorName}
                        {recipe.userId === user?.id && <span className="text-emerald-600">（あなた）</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {recipe.cookingTimeMinutes != null && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} /> {recipe.cookingTimeMinutes}分
                        </span>
                      )}
                      {recipe.estimatedCost != null && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Wallet size={12} /> {formatCurrency(recipe.estimatedCost)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-gray-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                    {recipe.userId === user?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(recipe.id);
                        }}
                        disabled={deletingId === recipe.id}
                        className="text-gray-300 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-sm">
                    {recipe.ingredients.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">材料</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {recipe.ingredients.map((ing, i) => (
                            <li key={i} className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200">
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {recipe.steps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">作り方</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                          {recipe.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyRecipesPage() {
  return <MyRecipesPageInner />;
}
