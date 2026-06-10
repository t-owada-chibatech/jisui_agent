import { NextRequest, NextResponse } from "next/server";
import { fetchRakutenRanking, inferCategoryIds, analyzeIngredientMatch } from "@/lib/rakutenRecipe";

const COST_MAP: Record<string, number> = {
  "100円以下": 100,
  "300円前後": 300,
  "500円前後": 500,
  "1000円前後": 1000,
  "1000円以上": 1500,
};

const TIME_MAP: Record<string, number> = {
  "5分以内": 5,
  "10分以内": 10,
  "15分以内": 15,
  "30分以内": 30,
  "1時間以内": 60,
  "1時間以上": 90,
};

function buildReason(score: number, matched: string[], missing: string[]): string {
  if (score >= 90) return `手持ち食材でほぼ作れます（${matched.slice(0, 3).join("・")}などを活用）`;
  if (score >= 70) return `${matched.slice(0, 2).join("・")}などを活用でき、あと${missing.length}種類で作れます`;
  if (missing.length <= 2) return `${missing.join("・")}を買い足すだけで作れます`;
  return "楽天レシピ人気ランキングから選びました";
}

type AnalyzedRecipe = {
  recipeId: string;
  recipeTitle: string;
  recipeUrl: string;
  foodImageUrl: string;
  recipeDescription: string;
  recipeMaterial: string[];
  recipeIndication: string;
  recipeCost: string;
  rank: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchScore: number;
  suggestionReason: string;
};

export async function POST(req: NextRequest) {
  const appId = process.env.RAKUTEN_APP_ID;

  const accessKey = process.env.RAKUTEN_ACCESS_KEY;

  if (!appId || !accessKey) {
    return NextResponse.json(
      { recipes: [], error: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が設定されていません", fallback: true },
      { status: 503 }
    );
  }

  const body = await req.json();
  const {
    ingredients = [],
    budget,
    maxCookTime,
  }: { ingredients: Array<{ name: string }>; budget?: number; maxCookTime?: number } = body;

  const ingredientNames = ingredients.map((i: { name: string }) => i.name);

  try {
    const categoryIds = inferCategoryIds(ingredientNames);

    const allRecipes = [];
    for (const id of categoryIds) {
      const recipes = await fetchRakutenRanking(appId, accessKey, id);
      allRecipes.push(...recipes);
      if (categoryIds.indexOf(id) < categoryIds.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const seen = new Set<number>();
    const unique = allRecipes.filter((r) => {
      if (seen.has(r.recipeId)) return false;
      seen.add(r.recipeId);
      return true;
    });

    const analyzed: AnalyzedRecipe[] = [];

    for (const recipe of unique) {
      if (budget) {
        const cost = COST_MAP[recipe.recipeCost] ?? 500;
        if (cost > budget) continue;
      }
      if (maxCookTime) {
        const time = TIME_MAP[recipe.recipeIndication] ?? 30;
        if (time > maxCookTime) continue;
      }

      const { matched, missing, score } = analyzeIngredientMatch(
        recipe.recipeMaterial,
        ingredientNames
      );

      analyzed.push({
        recipeId: String(recipe.recipeId),
        recipeTitle: recipe.recipeTitle,
        recipeUrl: recipe.recipeUrl,
        foodImageUrl: recipe.foodImageUrl,
        recipeDescription: recipe.recipeDescription,
        recipeMaterial: recipe.recipeMaterial,
        recipeIndication: recipe.recipeIndication,
        recipeCost: recipe.recipeCost,
        rank: recipe.rank,
        matchedIngredients: matched,
        missingIngredients: missing,
        matchScore: score,
        suggestionReason: buildReason(score, matched, missing),
      });
    }

    analyzed.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ recipes: analyzed.slice(0, 10), source: "rakuten" });
  } catch (err) {
    console.error("Rakuten API error:", err);
    return NextResponse.json(
      { recipes: [], error: "楽天レシピAPIの取得に失敗しました", fallback: true },
      { status: 500 }
    );
  }
}
