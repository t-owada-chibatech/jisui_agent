import { Clock, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency } from "@/lib/utils/currency";
import { RecipeDraft, CasualRecipeDifficulty } from "@/types";

const DIFFICULTY_LABEL: Record<CasualRecipeDifficulty, string> = {
  easy: "かんたん",
  normal: "ふつう",
  hard: "がんばる",
};

// AIが聞き取ったレシピJSON・保存済みレシピの両方で使う共通テンプレート表示
export function RecipeTemplateCard({
  recipe,
  photoUrl,
  authorName,
  authorAvatarUrl,
}: {
  recipe: RecipeDraft;
  photoUrl?: string;
  authorName?: string;
  authorAvatarUrl?: string;
}) {
  return (
    <div className="space-y-3">
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={recipe.title}
          className="w-full max-h-56 object-cover rounded-lg bg-gray-100"
        />
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="info">{DIFFICULTY_LABEL[recipe.difficulty]}</Badge>
        {recipe.tags.map((tag) => (
          <Badge key={tag} variant="default">{tag}</Badge>
        ))}
      </div>

      <div>
        <h3 className="font-bold text-gray-900 text-base">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-sm text-gray-600 mt-0.5">{recipe.description}</p>
        )}
        {authorName && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <Avatar src={authorAvatarUrl} alt={authorName} size={14} />
            投稿者: {authorName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {recipe.cookingTimeMinutes != null && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} /> {recipe.cookingTimeMinutes}分
          </span>
        )}
        {recipe.estimatedCost != null && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Wallet size={12} /> {formatCurrency(recipe.estimatedCost)}
          </span>
        )}
      </div>

      {recipe.ingredients.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">材料</p>
          <ul className="flex flex-wrap gap-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200">
                {ing}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.steps.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">作り方</p>
          <ol className="list-decimal list-inside space-y-0.5 text-sm text-gray-700">
            {recipe.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// AIが返したレシピらしきオブジェクト（キーがスネークケースの場合もある）を
// RecipeDraft の形に正規化する。titleが無ければ null。
export function normalizeRecipeDraft(raw: unknown): RecipeDraft | null {
  if (!raw || typeof raw !== "object" || typeof (raw as Record<string, unknown>).title !== "string") {
    return null;
  }
  const r = raw as Record<string, unknown>;

  const difficulty: CasualRecipeDifficulty =
    r.difficulty === "normal" || r.difficulty === "hard" ? r.difficulty : "easy";

  return {
    title: r.title as string,
    description: typeof r.description === "string" ? r.description : undefined,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
    steps: Array.isArray(r.steps) ? r.steps.map(String) : [],
    estimatedCost: (r.estimated_cost ?? r.estimatedCost) != null ? Number(r.estimated_cost ?? r.estimatedCost) : undefined,
    cookingTimeMinutes:
      (r.cooking_time_minutes ?? r.cookingTimeMinutes) != null
        ? Number(r.cooking_time_minutes ?? r.cookingTimeMinutes)
        : undefined,
    difficulty,
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
  };
}

// AIの返信テキストから RecipeDraft のJSONを取り出す。失敗したら null。
export function parseRecipeDraft(content: string): RecipeDraft | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return normalizeRecipeDraft(JSON.parse(match[0]));
  } catch {
    return null;
  }
}
