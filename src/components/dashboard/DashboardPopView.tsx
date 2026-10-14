import Link from "next/link";
import { AlertTriangle, ChefHat, ShoppingCart, ArrowRight, Flame, TrendingUp } from "lucide-react";
import { formatCurrency, calcBudgetProgress } from "@/lib/utils/currency";
import { getExpiryLabel } from "./expiryLabel";
import { DashboardViewProps } from "./types";

const toneStyles = {
  danger: "text-white bg-red-500",
  warning: "text-amber-900 bg-amber-200",
  ok: "text-emerald-800 bg-emerald-200",
};

export function DashboardPopView(props: DashboardViewProps) {
  const {
    displayName, dateLabel, recordDays,
    monthlySpent, monthlyBudget, weeklySpent, weeklyBudget, weekRangeLabel,
    expiringIngredients, recipesWithMatch, shoppingRows,
  } = props;

  const monthlyProgress = calcBudgetProgress(monthlySpent, monthlyBudget);
  const weeklyProgress = calcBudgetProgress(weeklySpent, weeklyBudget);

  return (
    <div className="space-y-6">
      <div
        className="rounded-[28px] px-7 py-7 flex items-center justify-between gap-4 flex-wrap shadow-[0_18px_40px_-12px_rgba(168,85,247,0.45)]"
        style={{ background: "linear-gradient(120deg,#8B5CF6 0%,#EC4899 55%,#F59E0B 100%)" }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-white/85 text-xs font-bold tracking-wide">{dateLabel}</span>
          <h1 className="text-white text-[1.7rem] font-extrabold" style={{ fontFamily: "var(--font-pop)" }}>おかえり、{displayName}さん！</h1>
          <span className="text-white/90 text-sm font-medium">今週もあと {formatCurrency(Math.max(0, weeklyBudget - weeklySpent))} でやりくりしよう</span>
        </div>
        <div className="flex items-center gap-2 bg-white/25 rounded-full px-4 py-2.5 backdrop-blur-sm">
          <Flame size={20} className="text-white" />
          <span className="text-white font-extrabold text-sm" style={{ fontFamily: "var(--font-pop)" }}>今月{recordDays}日記録</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-3xl p-6 bg-white border-2 border-purple-100 shadow-[0_10px_28px_-10px_rgba(139,92,246,0.25)]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700">今月の食費</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="text-[1.9rem] font-extrabold text-gray-900" style={{ fontFamily: "var(--font-pop)" }}>{formatCurrency(monthlySpent)}</span>
            <span className="text-sm text-gray-400">/ {formatCurrency(monthlyBudget)}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-purple-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${monthlyProgress}%`, background: "linear-gradient(90deg,#A855F7,#EC4899)" }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">残り <b className="text-violet-700">{formatCurrency(Math.max(0, monthlyBudget - monthlySpent))}</b></p>
        </div>
        <div className="rounded-3xl p-6 bg-white border-2 border-pink-100 shadow-[0_10px_28px_-10px_rgba(236,72,153,0.25)]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-pink-600" />
            <span className="text-xs font-bold text-pink-700">今週の食費</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="text-[1.9rem] font-extrabold text-gray-900" style={{ fontFamily: "var(--font-pop)" }}>{formatCurrency(weeklySpent)}</span>
            <span className="text-sm text-gray-400">/ {formatCurrency(weeklyBudget)}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-pink-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${weeklyProgress}%`, background: "linear-gradient(90deg,#F472B6,#F59E0B)" }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">{weekRangeLabel}</p>
        </div>
      </div>

      <div className="rounded-3xl p-6 bg-white border-2 border-amber-100 shadow-[0_10px_28px_-10px_rgba(245,158,11,0.22)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={19} className="text-amber-600" />
            <span className="font-extrabold text-gray-900" style={{ fontFamily: "var(--font-pop)" }}>賞味期限が近い食材</span>
          </div>
          <Link href="/ingredients" className="text-xs font-bold text-violet-700 flex items-center gap-1 hover:underline">
            すべて見る <ArrowRight size={13} />
          </Link>
        </div>
        {expiringIngredients.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">期限が近い食材はありません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {expiringIngredients.slice(0, 5).map((ing) => {
              const { text, tone } = getExpiryLabel(ing.expiresAt);
              return (
                <div key={ing.id} className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-gray-50">
                  <span className="text-sm font-bold text-gray-900">
                    {ing.name} <span className="text-gray-400 font-medium text-xs">{ing.quantity}{ing.unit}</span>
                  </span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${toneStyles[tone]}`}>{text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl p-6 bg-white border-2 border-emerald-100 shadow-[0_10px_28px_-10px_rgba(16,185,129,0.22)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <ChefHat size={19} className="text-emerald-600" />
            <span className="font-extrabold text-gray-900" style={{ fontFamily: "var(--font-pop)" }}>今日作れそうなレシピ</span>
          </div>
          <Link href="/recipes" className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline">
            AI提案を見る <ArrowRight size={13} />
          </Link>
        </div>
        {recipesWithMatch.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            まだレシピがありません。<Link href="/recipes" className="text-emerald-700 underline">AIに提案してもらいましょう</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recipesWithMatch.map((recipe) => {
              const matchPct = recipe.totalIngredientCount ? Math.round((recipe.matchedCount / recipe.totalIngredientCount) * 100) : 0;
              return (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block">
                  <div className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{recipe.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{recipe.cookTimeMin}分 ・ {formatCurrency(recipe.estimatedCost)}</p>
                    </div>
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${matchPct === 100 ? "text-emerald-800 bg-emerald-200" : "text-blue-800 bg-blue-200"}`}>
                      食材 {recipe.matchedCount}/{recipe.totalIngredientCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl p-6 bg-white border-2 border-sky-100 shadow-[0_10px_28px_-10px_rgba(14,165,233,0.22)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <ShoppingCart size={19} className="text-sky-600" />
            <span className="font-extrabold text-gray-900" style={{ fontFamily: "var(--font-pop)" }}>次に買うべき食材</span>
          </div>
          <Link href="/shopping" className="text-xs font-bold text-sky-700 flex items-center gap-1 hover:underline">
            すべて見る <ArrowRight size={13} />
          </Link>
        </div>
        {shoppingRows.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">買い物リストは空です</p>
        ) : (
          <div className="flex gap-2.5 flex-wrap">
            {shoppingRows.map((item, idx) => (
              <span key={item.id as string} className="flex items-center gap-2 bg-sky-50 rounded-full px-3.5 py-2 text-sm font-bold text-sky-800">
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[0.7rem]">{idx + 1}</span>
                {item.ingredient_name as string}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
