import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequestUser } from "@/lib/auth/serverSupabase";

export async function POST(req: NextRequest) {
  const { client: supabase, user } = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // ビルド時に実行されないよう、関数内でクライアントを初期化
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

  const prompt = `あなたは一人暮らしの大学生向け料理アドバイザーです。以下の食材を使って作れる、初心者でも絶対に失敗しない超簡単なレシピを3つ提案してください。

【現在持っている食材】
${ingredientList}

${constraints ? `【条件】\n${constraints}` : ""}

【絶対に守るルール】
- 調理手順は5ステップ以内
- 包丁をほぼ使わなくてよいか、切り方が超簡単なもの
- フライパンか鍋1つで完結するもの（洗い物を減らす）
- 調理時間は20分以内を優先
- 特別な調理技術・知識が不要（炒める・茹でる・混ぜるだけ）
- 食費を抑えられるシンプルな料理

以下のJSON形式で回答してください。必ず配列形式で3つのレシピを返してください:
[
  {
    "title": "レシピ名",
    "description": "一言説明（「〇〇を炒めるだけ！」など簡単さが伝わる表現で）",
    "cookTimeMin": 調理時間（分）,
    "estimatedCost": 目安費用（円）,
    "genre": "和食|洋食|中華|イタリアン|その他",
    "servings": 人数,
    "ingredients": [
      { "ingredientName": "食材名", "quantity": 数量, "unit": "単位", "isOptional": false }
    ],
    "steps": [
      { "stepOrder": 1, "description": "手順の説明（初心者でもわかる具体的な表現で）" }
    ]
  }
]

注意:
- 持っている食材をできるだけ活用すること
- 賞味期限が近い食材を優先すること
- 不足している食材は最小限にすること
- JSONのみ返すこと（説明文・コードブロック記号不要）`;

  try {
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" },
      { apiVersion: "v1" }
    );
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "レシピの生成に失敗しました" }, { status: 500 });
    }

    const generatedRecipes = JSON.parse(jsonMatch[0]);
    const savedRecipes = [];

    for (const recipe of generatedRecipes) {
      const { data: savedRecipe, error: recipeErr } = await supabase
        .from("recipes")
        .insert({
          title: recipe.title,
          description: recipe.description || null,
          cook_time_min: recipe.cookTimeMin,
          estimated_cost: recipe.estimatedCost,
          genre: recipe.genre,
          servings: recipe.servings,
          user_id: user.id,
        })
        .select()
        .single();

      if (recipeErr || !savedRecipe) continue;

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
