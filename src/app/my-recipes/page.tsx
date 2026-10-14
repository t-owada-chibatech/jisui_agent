"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Clock, Wallet, Trash2, BookMarked, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/layout/PageHeader";
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

function RecipeTile({ recipe, isMine, onOpen }: { recipe: CasualRecipe; isMine: boolean; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 text-left"
    >
      {recipe.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.photoUrl}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 text-center">
          <BookMarked size={22} className="text-emerald-300" />
          <span className="text-[11px] text-emerald-700 font-medium line-clamp-2">{recipe.title}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center">
        <span className="text-white text-xs font-semibold px-2 text-center line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {recipe.title}
        </span>
      </div>
      {isMine && (
        <span className="absolute top-1.5 right-1.5 text-[10px] bg-white/90 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
          あなた
        </span>
      )}
    </button>
  );
}

function RecipePostModal({
  recipe,
  isMine,
  deleting,
  onClose,
  onDelete,
}: {
  recipe: CasualRecipe;
  isMine: boolean;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col md:flex-row shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full md:w-1/2 aspect-square bg-gray-100 flex-shrink-0">
          {recipe.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.photoUrl} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-teal-50">
              <BookMarked size={40} className="text-emerald-200" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar src={recipe.authorAvatarUrl} alt={recipe.authorName ?? "?"} size={28} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {recipe.authorName ?? "名無しさん"}
                  {isMine && <span className="text-emerald-600 font-normal"> （あなた）</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isMine && (
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="text-gray-300 hover:text-red-500 disabled:opacity-50"
                  aria-label="削除"
                >
                  <Trash2 size={17} />
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="閉じる">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 text-sm">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <Badge variant="info">{DIFFICULTY_LABEL[recipe.difficulty]}</Badge>
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
              </div>
              <h3 className="font-bold text-lg text-gray-900">{recipe.title}</h3>
              {recipe.description && <p className="text-gray-600 mt-1">{recipe.description}</p>}
            </div>

            <div className="flex items-center gap-4">
              {recipe.cookingTimeMinutes != null && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={13} /> {recipe.cookingTimeMinutes}分
                </span>
              )}
              {recipe.estimatedCost != null && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Wallet size={13} /> {formatCurrency(recipe.estimatedCost)}
                </span>
              )}
            </div>

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
        </div>
      </div>
    </div>
  );
}

function MyRecipesPageInner() {
  const { user } = useSession();
  const [recipes, setRecipes] = useState<CasualRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    setSelectedId(null);
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

  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="みんなの適当レシピ集"
        subtitle={<>全員が共有した適当レシピの一覧です。食材から探したいときは<Link href="/recipes" className="text-emerald-600 hover:underline">レシピ提案</Link>も使えます</>}
      />

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
        <div className="py-12 text-center">
          <BookMarked size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">
            {recipes.length === 0 ? "まだ保存したレシピがありません" : "条件に合うレシピが見つかりませんでした"}
          </p>
          <p className="text-xs text-gray-400">AIレシピ相談でチャットして「このレシピを保存」してみましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {filtered.map((recipe) => (
            <RecipeTile
              key={recipe.id}
              recipe={recipe}
              isMine={recipe.userId === user?.id}
              onOpen={() => setSelectedId(recipe.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <RecipePostModal
          recipe={selected}
          isMine={selected.userId === user?.id}
          deleting={deletingId === selected.id}
          onClose={() => setSelectedId(null)}
          onDelete={() => handleDelete(selected.id)}
        />
      )}
    </div>
  );
}

export default function MyRecipesPage() {
  return <MyRecipesPageInner />;
}
