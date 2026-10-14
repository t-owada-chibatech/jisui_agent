import Link from "next/link";
import { AlertTriangle, ChefHat, ShoppingCart, ArrowRight, Flame, TrendingUp } from "lucide-react";
import { formatCurrency, calcBudgetProgress } from "@/lib/utils/currency";
import { getExpiryLabel } from "./expiryLabel";
import { DashboardViewProps } from "./types";

const toneStyles = {
  danger: "text-white bg-[#E24C3C]",
  warning: "text-[#8A6D1E] bg-[#F5E3A3]",
  ok: "text-[#1F8A5B] bg-[#D7F0E3]",
};

export function DashboardCuteView(props: DashboardViewProps) {
  const {
    displayName, dateLabel, recordDays,
    monthlySpent, monthlyBudget, weeklySpent, weeklyBudget, weekRangeLabel,
    expiringIngredients, recipesWithMatch, shoppingRows,
  } = props;

  const monthlyProgress = calcBudgetProgress(monthlySpent, monthlyBudget);
  const weeklyProgress = calcBudgetProgress(weeklySpent, weeklyBudget);

  return (
    <div className="space-y-6">
      <div className="relative rounded-[28px] px-7 py-7 bg-[#FFE8D6] border-[3px] border-dashed border-[#F3A572] overflow-hidden flex items-center justify-between gap-4 flex-wrap">
        <div className="absolute -right-6 -top-8 w-32 h-32 rounded-full bg-[#B7E8D3] opacity-50" />
        <div className="relative flex flex-col gap-1">
          <span className="text-[#C2703D] text-xs font-bold">{dateLabel}</span>
          <h1 className="text-[#7A3B1E] text-[2rem] leading-tight" style={{ fontFamily: "var(--font-cute)" }}>おかえり、{displayName}さん！</h1>
          <span className="text-[#A9643A] text-sm font-medium">今週もあと{formatCurrency(Math.max(0, weeklyBudget - weeklySpent))}、一緒にがんばろう〜</span>
        </div>
        <div className="relative flex items-center gap-2 bg-white border-2 border-dashed border-[#F3A572] rounded-full px-4 py-2.5">
          <Flame size={19} className="text-[#E8673D]" />
          <span className="text-[#C2703D] text-[1.1rem]" style={{ fontFamily: "var(--font-cute)" }}>今月{recordDays}日 記録中</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-[22px] p-6 bg-[#FFF4E8] border-2 border-dashed border-[#F3C089]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={17} className="text-[#C2703D]" />
            <span style={{ fontFamily: "var(--font-cute)" }} className="text-base text-[#8A4A22]">今月の食費</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[1.8rem] font-bold text-[#5C3317]">{formatCurrency(monthlySpent)}</span>
            <span className="text-sm text-[#C2956D]">/ {formatCurrency(monthlyBudget)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#FBE3C7] border border-[#F3C089] overflow-hidden">
            <div className="h-full rounded-full bg-[#F3A572]" style={{ width: `${monthlyProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-[#A9643A]" style={{ fontFamily: "var(--font-cute)" }}>残り{formatCurrency(Math.max(0, monthlyBudget - monthlySpent))}だよ！</p>
        </div>
        <div className="rounded-[22px] p-6 bg-[#EAF7F0] border-2 border-dashed border-[#8FD4B2]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={17} className="text-[#1F8A5B]" />
            <span style={{ fontFamily: "var(--font-cute)" }} className="text-base text-[#1F8A5B]">今週の食費</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[1.8rem] font-bold text-[#15603E]">{formatCurrency(weeklySpent)}</span>
            <span className="text-sm text-[#6FB592]">/ {formatCurrency(weeklyBudget)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#D7F0E3] border border-[#8FD4B2] overflow-hidden">
            <div className="h-full rounded-full bg-[#4FB583]" style={{ width: `${weeklyProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-[#1F8A5B]" style={{ fontFamily: "var(--font-cute)" }}>{weekRangeLabel}</p>
        </div>
      </div>

      <div className="rounded-[22px] p-6 bg-[#FFF0ED] border-2 border-dashed border-[#F0A99B]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={19} className="text-[#D0583F]" />
            <span style={{ fontFamily: "var(--font-cute)" }} className="text-lg text-[#8A3A28]">賞味期限が近い食材</span>
          </div>
          <Link href="/ingredients" className="text-xs font-bold text-[#D0583F] flex items-center gap-1 hover:underline">
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
                <div key={ing.id} className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-white border border-dashed border-[#F0A99B]">
                  <span className="text-sm font-bold text-[#5C2A1E]">
                    {ing.name} <span className="text-[#C98E7F] font-medium text-xs">{ing.quantity}{ing.unit}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-cute)" }} className={`text-sm font-bold px-3 py-1 rounded-full ${toneStyles[tone]}`}>{text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[22px] p-6 bg-[#EAF7F0] border-2 border-dashed border-[#8FD4B2]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <ChefHat size={19} className="text-[#1F8A5B]" />
            <span style={{ fontFamily: "var(--font-cute)" }} className="text-lg text-[#1F8A5B]">今日作れそうなレシピ</span>
          </div>
          <Link href="/recipes" className="text-xs font-bold text-[#1F8A5B] flex items-center gap-1 hover:underline">
            AI提案を見る <ArrowRight size={13} />
          </Link>
        </div>
        {recipesWithMatch.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            まだレシピがありません。<Link href="/recipes" className="text-[#1F8A5B] underline">AIに提案してもらいましょう</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recipesWithMatch.map((recipe) => {
              const matchPct = recipe.totalIngredientCount ? Math.round((recipe.matchedCount / recipe.totalIngredientCount) * 100) : 0;
              return (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block">
                  <div className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-white border border-dashed border-[#8FD4B2]">
                    <div>
                      <p className="text-sm font-bold text-[#1E4A36]">{recipe.title}</p>
                      <p className="text-xs text-[#7FAE96] mt-0.5">{recipe.cookTimeMin}分 ・ {formatCurrency(recipe.estimatedCost)}</p>
                    </div>
                    <span style={{ fontFamily: "var(--font-cute)" }} className={`text-sm font-bold text-white px-3 py-1 rounded-full ${matchPct === 100 ? "bg-[#4FB583]" : "bg-[#5B9BD5]"}`}>
                      {matchPct === 100 ? "ぴったり！" : `${recipe.matchedCount}/${recipe.totalIngredientCount} こ`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[22px] p-6 bg-[#F0EEFC] border-2 border-dashed border-[#B6A9EC]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <ShoppingCart size={19} className="text-[#6C56C7]" />
            <span style={{ fontFamily: "var(--font-cute)" }} className="text-lg text-[#564099]">次に買うべき食材</span>
          </div>
          <Link href="/shopping" className="text-xs font-bold text-[#6C56C7] flex items-center gap-1 hover:underline">
            すべて見る <ArrowRight size={13} />
          </Link>
        </div>
        {shoppingRows.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">買い物リストは空です</p>
        ) : (
          <div className="flex gap-2.5 flex-wrap">
            {shoppingRows.map((item, idx) => (
              <span key={item.id as string} style={{ fontFamily: "var(--font-cute)" }} className="flex items-center gap-2 bg-white border border-dashed border-[#B6A9EC] rounded-full px-3.5 py-2 text-base text-[#564099]">
                <span className="w-[19px] h-[19px] rounded-full bg-[#6C56C7] text-white flex items-center justify-center text-[0.65rem]" style={{ fontFamily: "var(--font-modern)" }}>{idx + 1}</span>
                {item.ingredient_name as string}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
