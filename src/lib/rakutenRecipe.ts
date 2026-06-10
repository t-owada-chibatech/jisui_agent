export interface RakutenRecipe {
  recipeId: number;
  recipeTitle: string;
  recipeUrl: string;
  foodImageUrl: string;
  mediumImageUrl: string;
  recipeDescription: string;
  recipeMaterial: string[];
  recipeIndication: string;
  recipeCost: string;
  rank: string;
}

interface RakutenCategoryListResult {
  large: Array<{ categoryId: string; categoryName: string; categoryUrl: string }>;
  medium: Array<{ categoryId: string; categoryName: string; parentCategoryId: string; categoryUrl: string }>;
  small: Array<{ categoryId: string; categoryName: string; parentCategoryId: string; categoryUrl: string }>;
}

interface RakutenCategoryListResponse {
  result: RakutenCategoryListResult;
}

interface RakutenRankingResponse {
  result: RakutenRecipe[];
}

const RAKUTEN_BASE = "https://openapi.rakuten.co.jp/recipems/api/Recipe";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jisui-agent-smea.vercel.app";

function buildHeaders() {
  return {
    Referer: SITE_URL,
    Origin: new URL(SITE_URL).origin,
  };
}

export async function fetchRakutenCategories(appId: string, accessKey: string): Promise<RakutenCategoryListResult> {
  const url = `${RAKUTEN_BASE}/CategoryList/20170426?applicationId=${appId}&accessKey=${accessKey}&formatVersion=2`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`Rakuten CategoryList API error: ${res.status}`);
  const data: RakutenCategoryListResponse = await res.json();
  return data.result;
}

export async function fetchRakutenRanking(appId: string, accessKey: string, categoryId: string): Promise<RakutenRecipe[]> {
  const url = `${RAKUTEN_BASE}/CategoryRanking/20170426?applicationId=${appId}&accessKey=${accessKey}&categoryId=${categoryId}&formatVersion=2`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Rakuten CategoryRanking API error: ${res.status} - ${body}`);
  }
  const data: RakutenRankingResponse = await res.json();
  return data.result ?? [];
}

// 食材名から楽天レシピの関連カテゴリIDを推定（最大3件）
export function inferCategoryIds(ingredientNames: string[]): string[] {
  const joined = ingredientNames.join(" ");
  const ids: string[] = [];

  if (/鶏|豚|牛|ひき肉|レバー|チキン|ポーク/.test(joined)) ids.push("11");
  if (/魚|鮭|サバ|さば|アジ|マグロ|ツナ|えび|エビ|貝|イカ|タコ/.test(joined)) ids.push("12");
  if (/卵|たまご|玉子/.test(joined)) ids.push("13");
  if (/キャベツ|にんじん|玉ねぎ|もやし|ほうれん草|小松菜|ブロッコリー|トマト|なす|じゃがいも|大根|白菜|ニラ|ネギ/.test(joined)) ids.push("14");
  if (/米|ご飯|ごはん|白米/.test(joined)) ids.push("15");
  if (/うどん|そば|パスタ|ラーメン|そうめん|スパゲッティ/.test(joined)) ids.push("17");
  if (/豆腐|おから|納豆|豆乳/.test(joined)) ids.push("19");

  if (ids.length === 0) ids.push("10");
  return ids.slice(0, 3);
}

// 一般的な調味料は「不足食材」としてカウントしない
const SEASONING_RE = /^(塩|砂糖|醤油|しょうゆ|味噌|みそ|酒|みりん|油|酢|こしょう|胡椒|だし|コンソメ|ケチャップ|マヨネーズ|ソース|片栗粉|小麦粉|バター|オリーブ|ラード|サラダ油)/;

export function analyzeIngredientMatch(
  recipeMaterial: string[],
  ownedIngredients: string[]
): { matched: string[]; missing: string[]; score: number } {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const material of recipeMaterial) {
    const name = material.split(/[\s　（(]/)[0].trim();
    if (!name || name.length < 2) continue;

    const isOwned = ownedIngredients.some(
      (owned) => name.includes(owned) || owned.includes(name)
    );

    if (isOwned) {
      matched.push(name);
    } else if (!SEASONING_RE.test(name)) {
      missing.push(name);
    }
  }

  const total = matched.length + missing.length;
  const score = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  return { matched, missing, score };
}
