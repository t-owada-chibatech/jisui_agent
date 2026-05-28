import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ReceiptDraft, ReceiptItemDraft, ReceiptItemCategory } from "@/types";

const genId = () => Math.random().toString(36).slice(2, 11);

const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

const GEMINI_PROMPT = `この画像は日本のスーパーマーケットやコンビニのレシートです。
画像内のすべての購入商品を解析し、以下のJSON形式のみで返してください（説明文やコードブロック記号は不要）。

{
  "storeName": "店名（不明はnull）",
  "purchasedAt": "YYYY-MM-DD形式（不明はnull）",
  "totalAmount": 合計金額（数値・不明はnull）,
  "items": [
    {
      "itemName": "レシートの商品名表記",
      "normalizedName": "一般的な食材名（例：コマツナ→小松菜、ぶたにく→豚肉）",
      "price": 価格（税込み優先・数値・不明はnull）,
      "quantity": 数量（数値・不明は1）,
      "unit": "個/g/ml/袋/本/パック/缶/箱/束 など",
      "category": "vegetable|meat|fish|egg_dairy|staple_food|seasoning|drink|snack|frozen_food|daily_goods|other",
      "isFood": true または false,
      "estimatedExpireDays": 賞味期限目安日数（野菜:5-7, 肉:3-4, 魚:2-3, 卵乳製品:14-30, 調味料:180-365, 冷凍:90-365）
    }
  ]
}

カテゴリ基準:
vegetable=野菜・果物・きのこ
meat=肉類・肉加工品
fish=魚・海産物・水産加工品
egg_dairy=卵・牛乳・乳製品・豆腐・納豆
staple_food=米・麺・パン・穀物
seasoning=調味料・スパイス・油・みそ・醤油
drink=飲料（アルコール含む）
snack=菓子・スナック・デザート
frozen_food=冷凍食品
daily_goods=日用品・洗剤・雑貨（isFood: false）
other=その他

JSONのみ返すこと。`;

// AI解析のコアロジック — Gemini以外にも差し替え可能
export async function analyzeReceiptImage(
  base64: string,
  mimeType: string
): Promise<ReceiptDraft> {
  if (!process.env.GEMINI_API_KEY) {
    return getMockReceipt();
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel(
    { model: "gemini-2.5-flash" },
    { apiVersion: "v1" }
  );

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      GEMINI_PROMPT,
    ]);
    const text = result.response.text();
    return parseGeminiResponse(text);
  } catch (err) {
    console.error("Gemini vision error:", err);
    return getMockReceipt();
  }
}

function parseGeminiResponse(text: string): ReceiptDraft {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return getMockReceipt();

  try {
    const raw = JSON.parse(jsonMatch[0]);
    const items: ReceiptItemDraft[] = (raw.items ?? []).map(
      (item: Record<string, unknown>, i: number) => ({
        id: String(i + 1),
        itemName: String(item.itemName ?? ""),
        normalizedName: item.normalizedName ? String(item.normalizedName) : undefined,
        price: item.price != null ? Number(item.price) : undefined,
        quantity: item.quantity != null ? Number(item.quantity) : 1,
        unit: item.unit ? String(item.unit) : "個",
        category: isValidCategory(item.category)
          ? (item.category as ReceiptItemCategory)
          : "other",
        isFood: Boolean(item.isFood),
        addToInventory: Boolean(item.isFood),
        estimatedExpireDays:
          item.estimatedExpireDays != null
            ? Number(item.estimatedExpireDays)
            : undefined,
      })
    );

    return {
      id: genId(),
      storeName: raw.storeName ? String(raw.storeName) : undefined,
      purchasedAt: raw.purchasedAt ? String(raw.purchasedAt) : undefined,
      totalAmount: raw.totalAmount != null ? Number(raw.totalAmount) : undefined,
      items,
    };
  } catch {
    return getMockReceipt();
  }
}

function isValidCategory(value: unknown): value is ReceiptItemCategory {
  const valid: ReceiptItemCategory[] = [
    "vegetable","meat","fish","egg_dairy","staple_food",
    "seasoning","drink","snack","frozen_food","daily_goods","other",
  ];
  return valid.includes(value as ReceiptItemCategory);
}

function getMockReceipt(): ReceiptDraft {
  return {
    id: genId(),
    storeName: "スーパーマルエツ",
    purchasedAt: new Date().toISOString().split("T")[0],
    totalAmount: 1286,
    items: [
      { id: "m1", itemName: "コマツナ", normalizedName: "小松菜", price: 98, quantity: 1, unit: "袋", category: "vegetable", isFood: true, addToInventory: true, estimatedExpireDays: 5 },
      { id: "m2", itemName: "ぶたこまぎれ", normalizedName: "豚こま切れ肉", price: 248, quantity: 1, unit: "パック", category: "meat", isFood: true, addToInventory: true, estimatedExpireDays: 3 },
      { id: "m3", itemName: "たまご M10", normalizedName: "卵", price: 198, quantity: 10, unit: "個", category: "egg_dairy", isFood: true, addToInventory: true, estimatedExpireDays: 21 },
      { id: "m4", itemName: "牛乳 900ml", normalizedName: "牛乳", price: 188, quantity: 900, unit: "ml", category: "egg_dairy", isFood: true, addToInventory: true, estimatedExpireDays: 14 },
      { id: "m5", itemName: "納豆 3P", normalizedName: "納豆", price: 138, quantity: 3, unit: "パック", category: "egg_dairy", isFood: true, addToInventory: true, estimatedExpireDays: 7 },
      { id: "m6", itemName: "もやし", normalizedName: "もやし", price: 29, quantity: 1, unit: "袋", category: "vegetable", isFood: true, addToInventory: true, estimatedExpireDays: 3 },
      { id: "m7", itemName: "食パン 6枚切", normalizedName: "食パン", price: 89, quantity: 6, unit: "枚", category: "staple_food", isFood: true, addToInventory: true, estimatedExpireDays: 5 },
      { id: "m8", itemName: "ソフトティッシュ 5P", normalizedName: "ティッシュ", price: 298, quantity: 5, unit: "箱", category: "daily_goods", isFood: false, addToInventory: false, estimatedExpireDays: undefined },
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "画像が必要です" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "ファイルサイズは5MB以内にしてください" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "JPG、PNG、WebP形式のみ対応しています" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const draft = await analyzeReceiptImage(base64, file.type);
    return NextResponse.json(draft);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "解析に失敗しました" }, { status: 500 });
  }
}
