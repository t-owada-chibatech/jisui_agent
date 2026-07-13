import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverSupabase";
import {
  searchSimilarRecipes,
  generateRecipeIfNeeded,
  saveGeneratedRecipe,
  markRecipesUsed,
} from "@/lib/recipes/rag";

// 提案では常にこの件数を目指す。
// 似たレシピがこの件数に満たない分だけAIで新規生成する。
const TARGET_COUNT = 3;

export async function POST(req: NextRequest) {
  const { client: supabase, user } = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await req.json();
  const { ingredients, budget, maxCookTime, genre, dislikedIngredients } = body;

  if (!ingredients || ingredients.length === 0) {
    return NextResponse.json({ error: "食材が登録されていません" }, { status: 400 });
  }

  const ingredientNames: string[] = ingredients.map((i: { name: string }) => i.name);
  const ingredientList = ingredients
    .map((i: { name: string; quantity: number; unit: string; expiresAt?: string }) =>
      `- ${i.name}（${i.quantity}${i.unit}${i.expiresAt ? `、賞味期限: ${i.expiresAt}` : ""}）`
    )
    .join("\n");

  const constraints = [
    budget ? `予算: ${budget}円以内` : null,
    maxCookTime ? `調理時間: ${maxCookTime}分以内` : null,
    genre ? `ジャンル: ${genre}` : null,
    dislikedIngredients?.length ? `使いたくない食材: ${dislikedIngredients.join("、")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const queryText = `【現在持っている食材】\n${ingredientList}\n\n${constraints ? `【条件】\n${constraints}` : ""}`;

  try {
    // 1. まずcasual_recipes(共有DB)から類似レシピを検索する
    const similarRecipes = await searchSimilarRecipes(supabase, queryText, {
      matchCount: TARGET_COUNT * 2,
      keywords: ingredientNames,
    });

    const reused = similarRecipes.slice(0, TARGET_COUNT);
    const neededCount = TARGET_COUNT - reused.length;

    if (reused.length > 0) {
      // 再利用したレシピの利用実績を記録する（他ユーザーのレシピの場合もある）
      await markRecipesUsed(supabase, reused.map((r) => r.id));
    }

    let generated: Awaited<ReturnType<typeof saveGeneratedRecipe>>[] = [];
    if (neededCount > 0) {
      // 2. 似たレシピが足りない分だけAIで新規生成し、参考情報として類似レシピを渡す（RAG）
      const drafts = await generateRecipeIfNeeded(queryText, reused, neededCount);
      generated = await Promise.all(drafts.map((d) => saveGeneratedRecipe(supabase, d, user.id)));
    }

    const recipes = [
      ...reused.map((r) => ({ ...r, matchType: "reused" as const })),
      ...generated.filter((r) => r !== null).map((r) => ({ ...r, matchType: "generated" as const })),
    ];

    if (recipes.length === 0) {
      return NextResponse.json({ error: "レシピの提案に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({
      recipes,
      meta: { reusedCount: reused.length, generatedCount: recipes.length - reused.length },
    });
  } catch (err) {
    console.error("[recipes/suggest]", err);
    return NextResponse.json({ error: "APIエラーが発生しました" }, { status: 500 });
  }
}
