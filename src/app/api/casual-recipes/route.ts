import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverSupabase";
import { buildRecipeSearchText, createRecipeEmbedding } from "@/lib/recipes/rag";

// チャットのAIレシピ聞き取り機能から、確定したレシピを共有DB(casual_recipes)に保存する。
// GEMINI_API_KEYはサーバー側にしか無いため、embedding計算はここで行う。
export async function POST(req: NextRequest) {
  const { client: supabase, user } = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    ingredients,
    steps,
    estimatedCost,
    cookingTimeMinutes,
    difficulty,
    tags,
    sourceSessionId,
    photoUrl,
  } = body;

  if (!title || !Array.isArray(ingredients) || !Array.isArray(steps)) {
    return NextResponse.json({ error: "レシピの内容が不正です" }, { status: 400 });
  }

  const searchText = buildRecipeSearchText({
    title,
    description,
    ingredients,
    steps,
    tags: tags ?? [],
  });
  const embedding = await createRecipeEmbedding(searchText);

  const { data, error } = await supabase
    .from("casual_recipes")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      ingredients,
      steps,
      estimated_cost: estimatedCost ?? null,
      cooking_time_minutes: cookingTimeMinutes ?? null,
      difficulty: difficulty || "easy",
      tags: tags ?? [],
      source_session_id: sourceSessionId ?? null,
      photo_url: photoUrl ?? null,
      source: "user_posted",
      search_text: searchText,
      embedding,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ recipe: data });
}
