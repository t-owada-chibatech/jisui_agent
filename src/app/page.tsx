import Link from "next/link";
import { AlertTriangle, TrendingUp, ChefHat, ShoppingCart, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ExpiryBadge } from "@/components/ingredients/ExpiryBadge";
import { SnackCharacterCard } from "@/components/SnackCharacterCard";
import { supabase } from "@/lib/supabase";
import { formatCurrency, calcBudgetProgress } from "@/lib/utils/currency";
import { getExpiryStatus, getCurrentYearMonth, formatYearMonth, getWeekRange } from "@/lib/utils/date";
import { Ingredient, IngredientCategory } from "@/types";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
  const currentYM = getCurrentYearMonth();

  const [
    { data: ingredientRows },
    { data: budgetRows },
    { data: monthlyBudgetRow },
    { data: weeklyBudgetRow },
    { data: shoppingRows },
    { data: recipeRows },
  ] = await Promise.all([
    supabase.from("ingredients").select("*").order("expires_at", { ascending: true, nullsFirst: false }),
    supabase.from("budget_records").select("*"),
    supabase.from("monthly_budgets").select("*").eq("year_month", currentYM).maybeSingle(),
    supabase.from("weekly_budgets").select("*").order("week_start", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("shopping_items").select("*").eq("is_purchased", false).order("priority", { ascending: false }).limit(5),
    supabase.from("recipes").select("*, recipe_ingredients(*)").order("created_at", { ascending: false }).limit(10),
  ]);

  const ingredients = (ingredientRows || []).map(mapIngredient);
  const monthlyBudget = monthlyBudgetRow?.budget ?? 20000;
  const weeklyBudget = weeklyBudgetRow?.budget ?? 5000;
  const weekStart = weeklyBudgetRow?.week_start ?? new Date().toISOString().split("T")[0];

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const monthlySpent = (budgetRows || [])
    .filter((r) => (r.purchased_at as string).startsWith(currentYM))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const snackSpent = (budgetRows || [])
    .filter((r) => (r.purchased_at as string).startsWith(currentYM) && r.category === "お菓子")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const weeklySpent = (budgetRows || [])
    .filter((r) => (r.purchased_at as string) >= weekStart && (r.purchased_at as string) <= weekEndStr)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const expiringIngredients = ingredients.filter((i) =>
    ["expired", "urgent", "soon"].includes(getExpiryStatus(i.expiresAt))
  );

  const ingredientNames = new Set(ingredients.map((i) => i.name));
  const recipesWithMatch = (recipeRows || []).map((r) => {
    const ings = (r.recipe_ingredients as Array<Record<string, unknown>>) || [];
    const required = ings.filter((i) => !i.is_optional);
    const matched = required.filter((i) => ingredientNames.has(i.ingredient_name as string)).length;
    return { id: r.id as string, title: r.title as string, cookTimeMin: r.cook_time_min as number, estimatedCost: Number(r.estimated_cost), matchedCount: matched, totalIngredientCount: required.length };
  }).sort((a, b) => {
    const aRatio = a.totalIngredientCount ? a.matchedCount / a.totalIngredientCount : 0;
    const bRatio = b.totalIngredientCount ? b.matchedCount / b.totalIngredientCount : 0;
    return bRatio - aRatio;
  }).slice(0, 3);

  const monthlyProgress = calcBudgetProgress(monthlySpent, monthlyBudget);
  const weeklyProgress = calcBudgetProgress(weeklySpent, weeklyBudget);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-sm text-gray-500 mt-0.5">{formatYearMonth(currentYM)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>今月の食費</CardTitle>
            <TrendingUp size={16} className="text-gray-400" />
          </CardHeader>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(monthlySpent)}</span>
              <span className="text-sm text-gray-400 mb-0.5">/ {formatCurrency(monthlyBudget)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={clsx("h-2 rounded-full transition-all", monthlyProgress >= 90 ? "bg-red-500" : monthlyProgress >= 70 ? "bg-yellow-500" : "bg-emerald-500")} style={{ width: `${monthlyProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500">残り <span className="font-semibold text-gray-700">{formatCurrency(monthlyBudget - monthlySpent)}</span></p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>今週の食費</CardTitle>
            <TrendingUp size={16} className="text-gray-400" />
          </CardHeader>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(weeklySpent)}</span>
              <span className="text-sm text-gray-400 mb-0.5">/ {formatCurrency(weeklyBudget)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={clsx("h-2 rounded-full transition-all", weeklyProgress >= 90 ? "bg-red-500" : weeklyProgress >= 70 ? "bg-yellow-500" : "bg-emerald-500")} style={{ width: `${weeklyProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500">{getWeekRange(weekStart)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <CardTitle>賞味期限が近い食材</CardTitle>
          </div>
          <Link href="/ingredients" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
            すべて見る <ArrowRight size={12} />
          </Link>
        </CardHeader>
        {expiringIngredients.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">期限が近い食材はありません</p>
        ) : (
          <div className="space-y-2">
            {expiringIngredients.slice(0, 5).map((ing) => (
              <div key={ing.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{ing.name}</span>
                  <span className="text-xs text-gray-400">{ing.quantity}{ing.unit}</span>
                </div>
                <ExpiryBadge expiresAt={ing.expiresAt} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChefHat size={16} className="text-emerald-500" />
            <CardTitle>今日作れそうなレシピ</CardTitle>
          </div>
          <Link href="/recipes" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
            AI提案を見る <ArrowRight size={12} />
          </Link>
        </CardHeader>
        {recipesWithMatch.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            まだレシピがありません。<Link href="/recipes" className="text-emerald-600 underline">AIに提案してもらいましょう</Link>
          </p>
        ) : (
          <div className="space-y-1">
            {recipesWithMatch.map((recipe) => {
              const matchPct = recipe.totalIngredientCount ? Math.round((recipe.matchedCount / recipe.totalIngredientCount) * 100) : 0;
              return (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{recipe.title}</p>
                      <p className="text-xs text-gray-400">{recipe.cookTimeMin}分 · {formatCurrency(recipe.estimatedCost)}</p>
                    </div>
                    <span className={clsx("text-xs px-2 py-0.5 rounded font-medium", matchPct === 100 ? "bg-green-100 text-green-700" : matchPct >= 70 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                      食材 {recipe.matchedCount}/{recipe.totalIngredientCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <SnackCharacterCard snackAmount={snackSpent} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-blue-500" />
            <CardTitle>次に買うべき食材</CardTitle>
          </div>
          <Link href="/shopping" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
            すべて見る <ArrowRight size={12} />
          </Link>
        </CardHeader>
        {(shoppingRows || []).length === 0 ? (
          <p className="text-sm text-gray-400 py-2">買い物リストは空です</p>
        ) : (
          <div className="space-y-1.5">
            {(shoppingRows || []).map((item, idx) => (
              <div key={item.id as string} className="flex items-center gap-3 py-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                <span className="text-sm text-gray-800 flex-1">{item.ingredient_name as string}</span>
                {item.estimated_price != null && <span className="text-xs text-gray-400">{formatCurrency(Number(item.estimated_price))}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
