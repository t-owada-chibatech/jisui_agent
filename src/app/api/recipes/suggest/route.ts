import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredients, budget, maxCookTime, genre, dislikedIngredients } = body;

  if (!ingredients || ingredients.length === 0) {
    return NextResponse.json({ error: "食材が登録されていません" }, { status: 400 });
  }

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
  ].filter(Boolean).join("\n");

  const prompt = `あなたは料理の専門家です。以下の食材を使って作れるレシピを3つ提案してください。

【現在持っている食材】
${ingredientList}

${constraints ? `【条件】\n${constraints}` : ""}

以下のJSON形式で回答してください。必ず配列形式で3つのレシピを返してください:
[
  {
    "title": "レシピ名",
    "description": "一言説明",
    "cookTimeMin": 調理時間（分）,
    "estimatedCost": 目安費用（円）,
    "genre": "和食|洋食|中華|イタリアン|その他",
    "servings": 人数,
    "ingredients": [
      { "ingredientName": "食材名", "quantity": 数量, "unit": "単位", "isOptional": false }
    ],
    "steps": [
      { "stepOrder": 1, "description": "手順の説明" }
    ]
  }
]

注意:
- 持っている食材をできるだけ活用すること
- 賞味期限が近い食材を優先すること
- 不足している食材は最小限にすること
- JSONのみ返すこと（説明文不要）`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "レシピの生成に失敗しました" }, { status: 500 });
    }

    const generatedRecipes = JSON.parse(jsonMatch[0]);
    const savedRecipes = [];

    for (const recipe of generatedRecipes) {
      // recipes テーブルに保存
      const { data: savedRecipe, error: recipeErr } = await supabase
        .from("recipes")
        .insert({
          title: recipe.title,
          description: recipe.description || null,
          cook_time_min: recipe.cookTimeMin,
          estimated_cost: recipe.estimatedCost,
          genre: recipe.genre,
          servings: recipe.servings,
        })
        .select()
        .single();

      if (recipeErr || !savedRecipe) continue;

      // recipe_ingredients に保存
      if (recipe.ingredients?.length > 0) {
        await supabase.from("recipe_ingredients").insert(
          recipe.ingredients.map((ing: Record<string, unknown>) => ({
            recipe_id: savedRecipe.id,
            ingredient_name: ing.ingredientName,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            is_optional: ing.isOptional ?? false,
          }))
        );
      }

      // recipe_steps に保存
      if (recipe.steps?.length > 0) {
        await supabase.from("recipe_steps").insert(
          recipe.steps.map((step: Record<string, unknown>) => ({
            recipe_id: savedRecipe.id,
            step_order: step.stepOrder,
            description: step.description,
          }))
        );
      }

      savedRecipes.push(savedRecipe.id);
    }

    // 保存したレシピを関連データと一緒に取得
    const { data: recipes } = await supabase
      .from("recipes")
      .select("*, recipe_ingredients(*), recipe_steps(*)")
      .in("id", savedRecipes);

    return NextResponse.json({ recipes: recipes || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "APIエラーが発生しました" }, { status: 500 });
  }
}
