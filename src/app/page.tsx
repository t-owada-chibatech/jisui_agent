"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/auth/useSession";
import { getExpiryStatus, getCurrentYearMonth, getWeekRange } from "@/lib/utils/date";
import { Ingredient, IngredientCategory } from "@/types";
import { useDashboardTheme } from "@/lib/theme/ThemeContext";
import { DashboardPopView } from "@/components/dashboard/DashboardPopView";
import { DashboardModernView } from "@/components/dashboard/DashboardModernView";
import { DashboardCuteView } from "@/components/dashboard/DashboardCuteView";
import { RecipeMatch } from "@/components/dashboard/types";

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

export default function DashboardPage() {
  const { theme } = useDashboardTheme();
  const { user } = useSession();
  const currentYM = getCurrentYearMonth();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("ゲスト");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(20000);
  const [weeklyBudget, setWeeklyBudget] = useState(5000);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split("T")[0]);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [weeklySpent, setWeeklySpent] = useState(0);
  const [recordDays, setRecordDays] = useState(0);
  const [shoppingRows, setShoppingRows] = useState<Record<string, unknown>[]>([]);
  const [recipesWithMatch, setRecipesWithMatch] = useState<RecipeMatch[]>([]);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    const [
      { data: ingredientRows },
      { data: budgetRows },
      { data: monthlyBudgetRow },
      { data: weeklyBudgetRow },
      { data: shoppingData },
      { data: recipeRows },
      profileResult,
    ] = await Promise.all([
      supabase.from("ingredients").select("*").is("discarded_at", null).order("expires_at", { ascending: true, nullsFirst: false }),
      supabase.from("budget_records").select("*"),
      supabase.from("monthly_budgets").select("*").eq("year_month", currentYM).maybeSingle(),
      supabase.from("weekly_budgets").select("*").order("week_start", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("shopping_items").select("*").eq("is_purchased", false).order("priority", { ascending: false }).limit(5),
      user
        ? supabase
            .from("casual_recipes")
            .select("id, title, cooking_time_minutes, estimated_cost, ingredients")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
      user ? supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const mappedIngredients = (ingredientRows || []).map(mapIngredient);
    const mBudget = monthlyBudgetRow?.budget ?? 20000;
    const wBudget = weeklyBudgetRow?.budget ?? 5000;
    const wStart = weeklyBudgetRow?.week_start ?? new Date().toISOString().split("T")[0];

    const weekEnd = new Date(wStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const mSpent = (budgetRows || [])
      .filter((r) => (r.purchased_at as string).startsWith(currentYM))
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const wSpent = (budgetRows || [])
      .filter((r) => (r.purchased_at as string) >= wStart && (r.purchased_at as string) <= weekEndStr)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const daysThisMonth = new Set(
      (budgetRows || [])
        .filter((r) => (r.purchased_at as string).startsWith(currentYM))
        .map((r) => (r.purchased_at as string).split("T")[0])
    );

    const ingredientNames = new Set(mappedIngredients.map((i) => i.name));
    const matches: RecipeMatch[] = (recipeRows || [])
      .map((r) => {
        const ings = (r.ingredients as string[]) || [];
        const matched = ings.filter((name) => ingredientNames.has(name)).length;
        return {
          id: r.id as string,
          title: r.title as string,
          cookTimeMin: (r.cooking_time_minutes as number) ?? 0,
          estimatedCost: Number(r.estimated_cost ?? 0),
          matchedCount: matched,
          totalIngredientCount: ings.length,
        };
      })
      .sort((a, b) => {
        const aRatio = a.totalIngredientCount ? a.matchedCount / a.totalIngredientCount : 0;
        const bRatio = b.totalIngredientCount ? b.matchedCount / b.totalIngredientCount : 0;
        return bRatio - aRatio;
      })
      .slice(0, 3);

    setIngredients(mappedIngredients);
    setMonthlyBudget(mBudget);
    setWeeklyBudget(wBudget);
    setWeekStart(wStart);
    setMonthlySpent(mSpent);
    setWeeklySpent(wSpent);
    setRecordDays(daysThisMonth.size);
    setShoppingRows((shoppingData || []) as Record<string, unknown>[]);
    setRecipesWithMatch(matches);
    setDisplayName((profileResult?.data?.display_name as string) || "ゲスト");
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>;
  }

  const expiringIngredients = ingredients.filter((i) =>
    ["expired", "urgent", "soon"].includes(getExpiryStatus(i.expiresAt))
  );

  const dateLabel = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const viewProps = {
    displayName,
    dateLabel,
    recordDays,
    monthlySpent,
    monthlyBudget,
    weeklySpent,
    weeklyBudget,
    weekRangeLabel: getWeekRange(weekStart),
    expiringIngredients,
    recipesWithMatch,
    shoppingRows,
  };

  if (theme === "pop") return <DashboardPopView {...viewProps} />;
  if (theme === "cute") return <DashboardCuteView {...viewProps} />;
  return <DashboardModernView {...viewProps} />;
}
