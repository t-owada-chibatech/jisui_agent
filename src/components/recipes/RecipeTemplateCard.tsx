import { Clock, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { RecipeDraft, CasualRecipeDifficulty } from "@/types";

const DIFFICULTY_LABEL: Record<CasualRecipeDifficulty, string> = {
  easy: "かんたん",
  normal: "ふつう",
  hard: "がんばる",
};

// AIが聞き取ったレシピJSON・保存済みレシピの両方で使う共通テンプレート表示
export function RecipeTemplateCard({ recipe, photoUrl }: { recipe: RecipeDraft; photoUrl?: string }) {
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

// AIの返信テキストから RecipeDraft のJSONを取り出す。失敗したら null。
export function parseRecipeDraft(content: string): RecipeDraft | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const raw = JSON.parse(match[0]);
    if (!raw || typeof raw.title !== "string") return null;

    const difficulty: CasualRecipeDifficulty =
      raw.difficulty === "normal" || raw.difficulty === "hard" ? raw.difficulty : "easy";

    return {
      title: raw.title,
      description: typeof raw.description === "string" ? raw.description : undefined,
      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.map(String) : [],
      steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [],
      estimatedCost: raw.estimated_cost != null ? Number(raw.estimated_cost) : undefined,
      cookingTimeMinutes: raw.cooking_time_minutes != null ? Number(raw.cooking_time_minutes) : undefined,
      difficulty,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    };
  } catch {
    return null;
  }
}
