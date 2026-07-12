import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AISuggestedIngredient } from "@/types";
import { withGeminiRetry } from "@/lib/geminiRetry";

export interface SuggestInput {
  ingredients: { name: string; quantity: number; unit: string; expiresAt?: string }[];
  remainingBudget: number;
  recentPurchases: string[];
  dislikedIngredients: string[];
  preferredGenres: string[];
}

// AI提案のコアロジック。後からGemini以外にも差し替え可能。
export async function suggestAdditionalIngredients(
  input: SuggestInput
): Promise<AISuggestedIngredient[]> {
  if (process.env.GEMINI_API_KEY) {
    return suggestWithGemini(input);
  }
  return suggestWithMock(input);
}

async function suggestWithGemini(input: SuggestInput): Promise<AISuggestedIngredient[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

  const ingredientList = input.ingredients
    .map((i) => `- ${i.name}（${i.quantity}${i.unit}${i.expiresAt ? `、期限:${i.expiresAt}` : ""}）`)
    .join("\n");

  const prompt = `あなたは一人暮らしの大学生向け食費節約アドバイザーです。
以下の情報をもとに「今買い足すとよい食材」を5つ提案してください。

【現在の食材在庫】
${ingredientList || "なし"}

【今月の残り予算】
${input.remainingBudget}円

【最近購入した食材】
${input.recentPurchases.length ? input.recentPurchases.join("、") : "なし"}

【苦手な食材】
${input.dislikedIngredients.length ? input.dislikedIngredients.join("、") : "なし"}

【好みのジャンル】
${input.preferredGenres.length ? input.preferredGenres.join("、") : "指定なし"}

【提案のルール】
- 1個あたり500円以内の安い食材を優先
- 今ある食材と組み合わせて使える食材を選ぶ
- 賞味期限が長いか、消費しやすいものを選ぶ
- 大学生が使いやすい汎用性の高い食材

以下のJSON配列形式で回答してください（5件）:
[
  {
    "id": "1",
    "name": "食材名",
    "estimatedPrice": 目安価格（円）,
    "priority": "high|medium|low",
    "reason": "提案理由（1〜2文）",
    "recipesCanMake": ["作れる料理1", "作れる料理2"],
    "compatibleWith": ["相性の良い既存食材1", "相性の良い既存食材2"],
    "savingReason": "節約につながる理由（1文）"
  }
]
JSONのみ返すこと（説明文・コードブロック記号不要）`;

  try {
    const text = await withGeminiRetry("shopping/suggest", async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return suggestWithMock(input);
    const parsed = JSON.parse(jsonMatch[0]) as AISuggestedIngredient[];
    return parsed.map((item, i) => ({ ...item, id: item.id ?? String(i + 1) }));
  } catch {
    return suggestWithMock(input);
  }
}

function suggestWithMock(_input: SuggestInput): AISuggestedIngredient[] {
  return [
    {
      id: "mock-1",
      name: "もやし",
      estimatedPrice: 30,
      priority: "high",
      reason: "1袋30円前後と最も安い野菜。炒め物・スープ・ラーメンのトッピングなど幅広く使えます。",
      recipesCanMake: ["もやし炒め", "野菜スープ", "豚もやし炒め"],
      compatibleWith: ["鶏むね肉", "豆腐", "卵"],
      savingReason: "コスパ最強食材。1袋で2〜3食分の野菜をまかなえます。",
    },
    {
      id: "mock-2",
      name: "キャベツ",
      estimatedPrice: 150,
      priority: "high",
      reason: "1玉150円前後で1週間以上保存可能。炒め・スープ・サラダと何にでも使えます。",
      recipesCanMake: ["野菜炒め", "コールスロー", "回鍋肉"],
      compatibleWith: ["鶏むね肉", "玉ねぎ", "卵"],
      savingReason: "1玉買えば1週間分の野菜をカバーでき、食費を大幅に抑えられます。",
    },
    {
      id: "mock-3",
      name: "豚こま切れ肉",
      estimatedPrice: 250,
      priority: "medium",
      reason: "鶏肉より安価で、炒め物・丼・汁物など何にでも合う万能食材です。",
      recipesCanMake: ["豚こまと野菜の炒め", "豚丼", "豚汁"],
      compatibleWith: ["玉ねぎ", "にんじん", "じゃがいも"],
      savingReason: "100g100円前後と安く、少量でも満足感のある料理が作れます。",
    },
    {
      id: "mock-4",
      name: "ツナ缶",
      estimatedPrice: 100,
      priority: "medium",
      reason: "常温で長期保存でき、缶を開けるだけで使えるため調理が超簡単です。",
      recipesCanMake: ["ツナ卵丼", "ツナサラダ", "ツナパスタ"],
      compatibleWith: ["卵", "玉ねぎ", "白米"],
      savingReason: "保存食として買い置きしておけば、食材が少ない日の節約メニューになります。",
    },
    {
      id: "mock-5",
      name: "冷凍うどん",
      estimatedPrice: 100,
      priority: "low",
      reason: "冷凍で長期保存でき、電子レンジ3分で食べられる最速の主食です。",
      recipesCanMake: ["卵うどん", "肉うどん", "焼きうどん"],
      compatibleWith: ["卵", "鶏むね肉", "ほうれん草"],
      savingReason: "1食50円以下で炭水化物を補えます。白米がないときの代替にも最適。",
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const input: SuggestInput = await req.json();
    const suggestions = await suggestAdditionalIngredients(input);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "提案の生成に失敗しました" }, { status: 500 });
  }
}
