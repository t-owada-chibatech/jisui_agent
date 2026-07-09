import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequestUser } from "@/lib/auth/serverSupabase";
import { CasualRecipeDifficulty } from "@/types";

const VALID_DIFFICULTIES: CasualRecipeDifficulty[] = ["easy", "normal", "hard"];

interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  estimated_cost: number | null;
  cooking_time_minutes: number | null;
  difficulty: CasualRecipeDifficulty;
  tags: string[];
}

function buildExtractPrompt(assistantMessage: string): string {
  return `以下のAIチャット内容から、保存できるレシピ情報をJSON形式で抽出してください。

出力はJSONのみ。
説明文は不要です。

抽出項目：
- title
- description
- ingredients
- steps
- estimated_cost
- cooking_time_minutes
- difficulty
- tags

ルール：
- 大学生らしい適当なレシピとして保存する
- ingredients は文字列配列
- steps は文字列配列
- estimated_cost は円の数値
- cooking_time_minutes は分の数値
- difficulty は easy / normal / hard のいずれか
- tags には「節約」「時短」「ズボラ」「レンジ」「一人暮らし」などを必要に応じて入れる
- 不明な値は自然に推定する
- 危険な調理内容は含めない
- JSON以外は出力しない

チャット内容：
"""
${assistantMessage}
"""

出力形式：
{
  "title": string,
  "description": string,
  "ingredients": string[],
  "steps": string[],
  "estimated_cost": number,
  "cooking_time_minutes": number,
  "difficulty": "easy" | "normal" | "hard",
  "tags": string[]
}`;
}

function fallbackExtract(assistantMessage: string): ExtractedRecipe {
  const firstLine = assistantMessage.split("\n").find((l) => l.trim().length > 0) ?? "適当レシピ";
  return {
    title: firstLine.replace(/^[「『]|[」』]$/g, "").slice(0, 40),
    description: assistantMessage.slice(0, 200),
    ingredients: [],
    steps: [],
    estimated_cost: null,
    cooking_time_minutes: null,
    difficulty: "easy",
    tags: ["大学生の適当レシピ"],
  };
}

async function extractWithGemini(assistantMessage: string): Promise<ExtractedRecipe> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });
  const result = await model.generateContent(buildExtractPrompt(assistantMessage));
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("抽出結果からJSONを取得できませんでした");

  const raw = JSON.parse(jsonMatch[0]);
  return {
    title: String(raw.title ?? "適当レシピ").slice(0, 60),
    description: raw.description ? String(raw.description) : "",
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.map(String) : [],
    steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [],
    estimated_cost: raw.estimated_cost != null ? Number(raw.estimated_cost) : null,
    cooking_time_minutes: raw.cooking_time_minutes != null ? Number(raw.cooking_time_minutes) : null,
    difficulty: VALID_DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : "easy",
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { client: userSupabase, user } = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await req.json();
    const assistantMessage: string = body.assistantMessage;
    const sessionId: string | undefined = body.sessionId;

    if (!assistantMessage || !assistantMessage.trim()) {
      return NextResponse.json({ error: "保存する内容がありません" }, { status: 400 });
    }

    let extracted: ExtractedRecipe;
    if (process.env.GEMINI_API_KEY) {
      try {
        extracted = await extractWithGemini(assistantMessage);
      } catch (err) {
        console.error("[recipes/extract-casual] Gemini error", err);
        extracted = fallbackExtract(assistantMessage);
      }
    } else {
      extracted = fallbackExtract(assistantMessage);
    }

    const { data: saved, error: insertErr } = await userSupabase
      .from("casual_recipes")
      .insert({
        user_id: user.id,
        title: extracted.title,
        description: extracted.description || null,
        ingredients: extracted.ingredients,
        steps: extracted.steps,
        estimated_cost: extracted.estimated_cost,
        cooking_time_minutes: extracted.cooking_time_minutes,
        difficulty: extracted.difficulty,
        tags: extracted.tags,
        source_session_id: sessionId ?? null,
      })
      .select()
      .single();

    if (insertErr || !saved) {
      return NextResponse.json({ error: "レシピの保存に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ recipe: saved });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    console.error("[recipes/extract-casual]", messageText);
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
