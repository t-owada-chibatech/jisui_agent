"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChefHat, Sparkles, Clock, Wallet, Filter, ExternalLink, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Ingredient,
  IngredientCategory,
  Recipe,
  RecipeGenre,
  RecipeIngredient,
  RecipeStep,
  RakutenRecipeSuggestion,
} from "@/types";

const genres: RecipeGenre[] = ["和食", "洋食", "中華", "イタリアン", "その他"];

function mapIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: Number(row.quantity),
    unit: row.unit as string,
    price: row.price != null ? Number(row.price) : undefined,
    purchasedAt: (row.purchased_at as string) ?? undefined,
    expiresAt: (row.expires_at as string) ?? undefined,
    category: row.category as IngredientCategory,
    createdAt: row.created_at as string,
  };
}

function mapRecipe(row: Record<string, unknown>): Recipe {
  const ings = ((row.recipe_ingredients as Array<Record<string, unknown>>) || []).map(
    (i): RecipeIngredient => ({
      id: i.id as string,
      recipeId: i.recipe_id as string,
      ingredientName: i.ingredient_name as string,
      quantity: i.quantity != null ? Number(i.quantity) : undefined,
      unit: (i.unit as string) ?? undefined,
      isOptional: i.is_optional as boolean,
    })
  );
  const steps = ((row.recipe_steps as Array<Record<string, unknown>>) || [])
    .sort((a, b) => (a.step_order as number) - (b.step_order as number))
    .map((s): RecipeStep => ({
      id: s.id as string,
      recipeId: s.recipe_id as string,
      stepOrder: s.step_order as number,
      description: s.description as string,
    }));
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    cookTimeMin: row.cook_time_min as number,
    estimatedCost: Number(row.estimated_cost),
    genre: row.genre as RecipeGenre,
    servings: row.servings as number,
    ingredients: ings,
    steps,
    createdAt: row.created_at as string,
  };
}

export default function RecipesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastAiCount, setLastAiCount] = useState(0);

  const [budget, setBudget] = useState("");
  const [maxCookTime, setMaxCookTime] = useState("");
  const [genre, setGenre] = useState("");
  const [disliked, setDisliked] = useState("");

  const [rakutenRecipes, setRakutenRecipes] = useState<RakutenRecipeSuggestion[]>([]);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenError, setRakutenError] = useState("");
  const [rakutenFetched, setRakutenFetched] = useState(false);
  const [addedShoppingIds, setAddedShoppingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: ings }, { data: recs }] = await Promise.all([
      supabase.from("ingredients").select("*"),
      supabase.from("recipes").select("*, recipe_ingredients(*), recipe_steps(*)").order("created_at", { ascending: false }),
    ]);
    setIngredients((ings || []).map((r) => mapIngredient(r as Record<string, unknown>)));
    setRecipes((recs || []).map((r) => mapRecipe(r as Record<string, unknown>)));
    setLoading(false);
  }

  const handleAISuggest = async () => {
    setAiLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          budget: budget ? parseInt(budget) : undefined,
          maxCookTime: maxCookTime ? parseInt(maxCookTime) : undefined,
          genre: genre || undefined,
          dislikedIngredients: disliked ? disliked.split(/[,、]/).map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newRecipes = (data.recipes as Array<Record<string, unknown>>).map(mapRecipe);
      setRecipes((prev) => [...newRecipes, ...prev]);
      setLastAiCount(newRecipes.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRakutenSearch = async () => {
    setRakutenLoading(true);
    setRakutenError("");
    setRakutenFetched(false);
    try {
      const res = await fetch("/api/recipes/rakuten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          budget: budget ? parseInt(budget) : undefined,
          maxCookTime: maxCookTime ? parseInt(maxCookTime) : undefined,
          dislikedIngredients: disliked ? disliked.split(/[,、]/).map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (data.fallback || !res.ok) throw new Error(data.error || "エラーが発生しました");
      setRakutenRecipes(data.recipes ?? []);
      setRakutenFetched(true);
    } catch (e: unknown) {
      setRakutenError(e instanceof Error ? e.message : "エラーが発生しました");
      setRakutenFetched(true);
    } finally {
      setRakutenLoading(false);
    }
  };

  const handleAddToShopping = async (recipeId: string, missingIngredients: string[]) => {
    if (missingIngredients.length === 0) return;
    await supabase.from("shopping_items").insert(
      missingIngredients.map((name) => ({
        ingredient_name: name,
        priority: 2,
        is_purchased: false,
      }))
    );
    setAddedShoppingIds((prev) => {
      const next = new Set(prev);
      next.add(recipeId);
      return next;
    });
  };

  const ingredientNames = new Set(ingredients.map((i) => i.name));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">レシピ提案</h2>
        <p className="text-sm text-gray-500 mt-0.5">登録済みの食材 {ingredients.length}種類から提案</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <CardTitle>条件指定</CardTitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">予算（円以内）</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">調理時間（分以内）</label>
            <input type="number" value={maxCookTime} onChange={(e) => setMaxCookTime(e.target.value)} placeholder="30" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ジャンル</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">指定なし</option>
              {genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">苦手な食材（カンマ区切り）</label>
            <input type="text" value={disliked} onChange={(e) => setDisliked(e.target.value)} placeholder="例: きのこ、ネギ" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleRakutenSearch}
            disabled={rakutenLoading || ingredients.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <ChefHat size={15} />
            {rakutenLoading ? "取得中…" : "楽天レシピで探す"}
          </Button>
          <Button onClick={handleAISuggest} disabled={aiLoading || ingredients.length === 0}>
            <Sparkles size={15} />
            {aiLoading ? "AIが考え中…" : "AIでレシピを提案"}
          </Button>
          {ingredients.length === 0 && (
            <p className="text-xs text-gray-400">先に食材を登録してください</p>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {rakutenError && <p className="mt-2 text-sm text-red-500">楽天: {rakutenError}</p>}
        {lastAiCount > 0 && !aiLoading && (
          <p className="mt-2 text-xs text-emerald-600">{lastAiCount}件のレシピを提案・保存しました</p>
        )}
      </Card>

      {/* 楽天レシピ候補セクション */}
      {(rakutenFetched || rakutenLoading) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">楽天レシピ候補</h3>
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">楽天レシピ</span>
          </div>

          {rakutenLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">楽天レシピを取得中…</div>
          )}

          {rakutenFetched && !rakutenLoading && rakutenRecipes.length === 0 && !rakutenError && (
            <Card className="py-8 text-center">
              <p className="text-gray-500 text-sm">条件に合う楽天レシピが見つかりませんでした</p>
            </Card>
          )}

          {rakutenFetched && !rakutenLoading && rakutenRecipes.length > 0 && (
            <div className="grid gap-3">
              {rakutenRecipes.map((recipe) => (
                <Card key={recipe.recipeId} className="hover:shadow-md transition-shadow">
                  <div className="flex gap-3">
                    {recipe.foodImageUrl && (
                      <div className="flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={recipe.foodImageUrl}
                          alt={recipe.recipeTitle}
                          width={80}
                          height={80}
                          className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge
                          variant={
                            recipe.matchScore >= 70
                              ? "success"
                              : recipe.matchScore >= 40
                              ? "info"
                              : "default"
                          }
                        >
                          食材マッチ {recipe.matchScore}%
                        </Badge>
                        {recipe.recipeIndication && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <Clock size={11} /> {recipe.recipeIndication}
                          </span>
                        )}
                        {recipe.recipeCost && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <Wallet size={11} /> {recipe.recipeCost}
                          </span>
                        )}
                      </div>
                      <a
                        href={recipe.recipeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-gray-900 hover:text-orange-600 transition-colors"
                      >
                        {recipe.recipeTitle}
                        <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
                      </a>
                      {recipe.recipeDescription && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{recipe.recipeDescription}</p>
                      )}
                      <p className="text-xs text-emerald-600 mt-1">{recipe.suggestionReason}</p>

                      {recipe.matchedIngredients.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {recipe.matchedIngredients.slice(0, 4).map((ing) => (
                            <span
                              key={ing}
                              className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200"
                            >
                              ✓ {ing}
                            </span>
                          ))}
                        </div>
                      )}

                      {recipe.missingIngredients.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {recipe.missingIngredients.slice(0, 3).map((ing) => (
                              <span
                                key={ing}
                                className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200"
                              >
                                + {ing}
                              </span>
                            ))}
                            {recipe.missingIngredients.length > 3 && (
                              <span className="text-xs text-gray-400 self-center">
                                他{recipe.missingIngredients.length - 3}種類
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleAddToShopping(recipe.recipeId, recipe.missingIngredients)
                            }
                            disabled={addedShoppingIds.has(recipe.recipeId)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ShoppingCart size={11} />
                            {addedShoppingIds.has(recipe.recipeId)
                              ? "買い物リストに追加済み"
                              : "不足食材を買い物リストに追加"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 既存のAI生成レシピ一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>
      ) : recipes.length === 0 ? (
        <Card className="py-12 text-center">
          <ChefHat size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">まだレシピがありません</p>
          <p className="text-xs text-gray-400">「AIでレシピを提案」ボタンを押してみましょう</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {recipes.map((recipe, idx) => {
            const required = recipe.ingredients.filter((i) => !i.isOptional);
            const matched = required.filter((i) => ingredientNames.has(i.ingredientName)).length;
            const matchPct = required.length ? Math.round((matched / required.length) * 100) : 0;
            const isNew = idx < lastAiCount;
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="info">{recipe.genre}</Badge>
                        <Badge variant={matchPct === 100 ? "success" : matchPct >= 70 ? "info" : "default"}>
                          食材マッチ {matchPct}%
                        </Badge>
                        {isNew && (
                          <Badge variant="warning">
                            <Sparkles size={10} className="mr-1" />AI提案
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
                      {recipe.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{recipe.description}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12} /> {recipe.cookTimeMin}分</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Wallet size={12} /> {formatCurrency(recipe.estimatedCost)}</span>
                        <span className="text-xs text-gray-400">{recipe.servings}人分</span>
                      </div>
                    </div>
                    <ChefHat size={32} className="text-gray-200 flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
