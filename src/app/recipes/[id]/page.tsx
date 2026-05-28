import Link from "next/link";
import { ArrowLeft, Clock, Wallet, Users, CheckCircle, Circle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils/currency";
import { notFound } from "next/navigation";
import { RecipeGenre } from "@/types";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const [{ data: recipeRow }, { data: ingredientRows }] = await Promise.all([
    supabase
      .from("recipes")
      .select("*, recipe_ingredients(*), recipe_steps(*)")
      .eq("id", params.id)
      .single(),
    supabase.from("ingredients").select("name"),
  ]);

  if (!recipeRow) notFound();

  const ownedIngredients = new Set((ingredientRows || []).map((i) => i.name as string));

  const ingredients = ((recipeRow.recipe_ingredients as Array<Record<string, unknown>>) || []);
  const steps = ((recipeRow.recipe_steps as Array<Record<string, unknown>>) || [])
    .sort((a, b) => (a.step_order as number) - (b.step_order as number));

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/recipes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} />
        レシピ一覧に戻る
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="info">{recipeRow.genre as RecipeGenre}</Badge>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{recipeRow.title as string}</h2>
        {recipeRow.description && <p className="text-gray-500 mt-1">{recipeRow.description as string}</p>}
        <div className="flex items-center gap-6 mt-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock size={15} className="text-gray-400" />{recipeRow.cook_time_min as number}分
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Wallet size={15} className="text-gray-400" />目安 {formatCurrency(Number(recipeRow.estimated_cost))}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users size={15} className="text-gray-400" />{recipeRow.servings as number}人分
          </span>
        </div>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">材料</h3>
        <div className="space-y-2">
          {ingredients.map((ing) => {
            const owned = ownedIngredients.has(ing.ingredient_name as string);
            return (
              <div key={ing.id as string} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  {owned ? <CheckCircle size={15} className="text-emerald-500" /> : <Circle size={15} className="text-gray-300" />}
                  <span className={`text-sm ${owned ? "text-gray-800" : "text-gray-400"}`}>
                    {ing.ingredient_name as string}
                    {(ing.is_optional as boolean) && <span className="text-xs text-gray-400 ml-1">（任意）</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {ing.quantity != null && <span className="text-sm text-gray-500">{ing.quantity as number} {ing.unit as string}</span>}
                  {!owned && !ing.is_optional && <Badge variant="warning">要購入</Badge>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">✓ = 冷蔵庫にある食材　○ = 購入が必要な食材</p>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">作り方</h3>
        <ol className="space-y-4">
          {steps.map((step) => (
            <li key={step.id as string} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step.step_order as number}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{step.description as string}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex justify-end">
        <Link href="/shopping" className="text-sm text-emerald-600 hover:underline">
          不足食材を買い物リストに追加 →
        </Link>
      </div>
    </div>
  );
}
