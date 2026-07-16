import { GoogleGenerativeAI, EmbedContentRequest } from "@google/generative-ai";
import { SupabaseClient } from "@supabase/supabase-js";
import { withGeminiRetry } from "@/lib/geminiRetry";
import { normalizeRecipeDraft } from "@/components/recipes/RecipeTemplateCard";
import { CasualRecipe, CasualRecipeSource, RecipeDraft } from "@/types";

const EMBEDDING_MODEL = "gemini-embedding-001";
// pgvectorのhnswインデックスに収まりやすく、精度と速度のバランスも良い次元数
export const EMBEDDING_DIMENSIONS = 768;
const GENERATION_MODEL = "gemini-2.5-flash";

// v0.24.1のSDK型定義にoutputDimensionalityが無いため拡張する（REST APIには存在するフィールド）
type EmbedContentRequestWithDimensions = EmbedContentRequest & { outputDimensionality?: number };

interface RecipeLikeInput {
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

// レシピの検索用テキストを作る（タイトル・説明・材料・手順・タグをまとめる）
export function buildRecipeSearchText(recipe: RecipeLikeInput): string {
  return [
    recipe.title,
    recipe.description ?? "",
    recipe.ingredients.join("、"),
    recipe.steps.join(" "),
    recipe.tags.join("、"),
  ]
    .filter(Boolean)
    .join("\n");
}

// 検索用テキストからGemini embeddingを作る。GEMINI_API_KEY未設定や失敗時はnull（呼び出し側でキーワード検索にフォールバックする）
export async function createRecipeEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.GEMINI_API_KEY || !text.trim()) return null;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL }, { apiVersion: "v1" });

    const result = await withGeminiRetry("recipes/embedding", () =>
      model.embedContent({
        content: { role: "user", parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as EmbedContentRequestWithDimensions)
    );

    return result.embedding.values;
  } catch (err) {
    console.error("[recipes/rag] embedding作成に失敗しました", err);
    return null;
  }
}

// PostgRESTのembed(`profiles(display_name, avatar_url)`)とRPCのフラットな`author_name`/`author_avatar_url`列の
// 両方から投稿者情報を取り出す
function extractAuthorInfo(row: Record<string, unknown>): { name?: string; avatarUrl?: string } {
  if (typeof row.author_name === "string" || typeof row.author_avatar_url === "string") {
    return {
      name: row.author_name as string | undefined,
      avatarUrl: row.author_avatar_url as string | undefined,
    };
  }
  const profiles = row.profiles as
    | { display_name?: string; avatar_url?: string }
    | { display_name?: string; avatar_url?: string }[]
    | null
    | undefined;
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return { name: profile?.display_name, avatarUrl: profile?.avatar_url };
}

function mapCasualRecipeRow(row: Record<string, unknown>): CasualRecipe {
  const author = extractAuthorInfo(row);
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    ingredients: (row.ingredients as string[]) ?? [],
    steps: (row.steps as string[]) ?? [],
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : undefined,
    cookingTimeMinutes: row.cooking_time_minutes != null ? Number(row.cooking_time_minutes) : undefined,
    difficulty: (row.difficulty as CasualRecipe["difficulty"]) ?? "easy",
    vibe: (row.vibe as string) ?? "大学生の適当レシピ",
    tags: (row.tags as string[]) ?? [],
    photoUrl: (row.photo_url as string) ?? undefined,
    source: (row.source as CasualRecipeSource) ?? "user_posted",
    usageCount: row.usage_count != null ? Number(row.usage_count) : undefined,
    similarity: row.similarity != null ? Number(row.similarity) : undefined,
    userId: (row.user_id as string) ?? undefined,
    authorName: author.name,
    authorAvatarUrl: author.avatarUrl,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string),
  };
}

// クエリ文字列に近いテキストをtitle/description/ingredients/tagsに含む行を探す（embeddingが使えない場合のフォールバック）
async function keywordSearchCasualRecipes(
  supabase: SupabaseClient,
  keywords: string[],
  matchCount: number
): Promise<CasualRecipe[]> {
  if (keywords.length === 0) return [];

  const orFilter = keywords
    .flatMap((kw) => [`title.ilike.%${kw}%`, `description.ilike.%${kw}%`])
    .join(",");

  const { data, error } = await supabase
    .from("casual_recipes")
    .select("*, profiles(display_name, avatar_url)")
    .or(orFilter)
    .order("usage_count", { ascending: false })
    .limit(matchCount);

  if (error) {
    console.error("[recipes/rag] キーワード検索エラー", error);
    return [];
  }

  return (data ?? []).map((row) => mapCasualRecipeRow(row as Record<string, unknown>));
}

// ユーザー入力・手持ち食材から似たレシピをcasual_recipesから検索する。
// embeddingが作れる場合はベクトル類似検索、作れない場合はキーワード検索にフォールバックする。
export async function searchSimilarRecipes(
  supabase: SupabaseClient,
  query: string,
  options: { matchCount?: number; minSimilarity?: number; keywords?: string[] } = {}
): Promise<CasualRecipe[]> {
  const { matchCount = 5, minSimilarity = 0.55, keywords = [] } = options;

  const embedding = await createRecipeEmbedding(query);
  if (embedding) {
    const { data, error } = await supabase.rpc("match_casual_recipes", {
      query_embedding: embedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
    });
    if (error) {
      console.error("[recipes/rag] match_casual_recipes RPCエラー", error);
    } else if (data) {
      return (data as Record<string, unknown>[]).map(mapCasualRecipeRow);
    }
  }

  return keywordSearchCasualRecipes(supabase, keywords, matchCount);
}

// 類似レシピが足りない分だけ、AIに新規レシピを生成してもらう（参考レシピがあればRAGの参考情報として渡す）
export async function generateRecipeIfNeeded(
  query: string,
  contextRecipes: CasualRecipe[],
  count: number
): Promise<RecipeDraft[]> {
  if (count <= 0) return [];
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEYが設定されていません");
  }

  const referenceText = contextRecipes.length
    ? contextRecipes
        .map(
          (r, i) =>
            `${i + 1}. 「${r.title}」${r.description ? `（${r.description}）` : ""}\n   材料: ${r.ingredients.join("、")}\n   手順: ${r.steps.join(" → ")}`
        )
        .join("\n")
    : "（参考にできる過去レシピはまだありません）";

  const prompt = `あなたは一人暮らしの大学生向け料理アドバイザーです。以下の条件を満たす、初心者でも絶対に失敗しない超簡単なレシピを${count}個提案してください。

【条件】
${query}

【参考：過去に蓄積された似たレシピ（雰囲気・食材の参考程度に。丸写しはしないこと）】
${referenceText}

【絶対に守るルール】
- 調理手順は5ステップ以内
- 包丁をほぼ使わなくてよいか、切り方が超簡単なもの
- フライパンか鍋1つで完結するもの（洗い物を減らす）
- 特別な調理技術・知識が不要（炒める・茹でる・混ぜるだけ）
- 食費を抑えられるシンプルな料理

以下のJSON配列形式のみで回答してください（説明文・コードブロック記号は不要）。必ず${count}個返してください:
[
  {
    "title": "レシピ名",
    "description": "一言説明（「〇〇を炒めるだけ！」など簡単さが伝わる表現で）",
    "ingredients": ["食材名 分量（例: 鶏むね肉 200g、卵 2個、塩 少々）"],
    "steps": ["手順の説明（初心者でもわかる具体的な表現で）"],
    "estimated_cost": 目安費用（円、数値）,
    "cooking_time_minutes": 調理時間（分、数値）,
    "difficulty": "easy",
    "tags": ["タグ", "タグ"]
  }
]`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GENERATION_MODEL }, { apiVersion: "v1" });

  const maxParseAttempts = 2;
  for (let attempt = 1; attempt <= maxParseAttempts; attempt++) {
    const text = await withGeminiRetry("recipes/suggest-generate", async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[recipes/rag] JSON not found in response (attempt ${attempt}/${maxParseAttempts})`);
      continue;
    }
    try {
      const raw = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(raw)) continue;
      const drafts = raw.map(normalizeRecipeDraft).filter((d): d is RecipeDraft => d !== null);
      if (drafts.length > 0) return drafts;
    } catch (parseErr) {
      console.error(`[recipes/rag] JSON parse error (attempt ${attempt}/${maxParseAttempts})`, parseErr);
    }
  }

  throw new Error("レシピの生成に失敗しました");
}

// AI生成レシピをcasual_recipesに保存し、次回以降の検索対象にする
export async function saveGeneratedRecipe(
  supabase: SupabaseClient,
  recipe: RecipeDraft,
  userId: string,
  source: CasualRecipeSource = "ai_generated"
): Promise<CasualRecipe | null> {
  const searchText = buildRecipeSearchText(recipe);
  const embedding = await createRecipeEmbedding(searchText);

  const { data, error } = await supabase
    .from("casual_recipes")
    .insert({
      user_id: userId,
      title: recipe.title,
      description: recipe.description || null,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      estimated_cost: recipe.estimatedCost ?? null,
      cooking_time_minutes: recipe.cookingTimeMinutes ?? null,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      source,
      search_text: searchText,
      embedding,
      usage_count: 1,
      last_used_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[recipes/rag] casual_recipes insert error", error);
    return null;
  }

  return mapCasualRecipeRow(data as Record<string, unknown>);
}

// 検索でヒットして再利用されたレシピの利用回数を記録する（共有DBのため他ユーザーのレシピもあり得る）
export async function markRecipesUsed(supabase: SupabaseClient, recipeIds: string[]): Promise<void> {
  await Promise.all(
    recipeIds.map((id) =>
      supabase.rpc("increment_casual_recipe_usage", { target_id: id }).then(({ error }) => {
        if (error) console.error("[recipes/rag] usage count更新エラー", error);
      })
    )
  );
}
