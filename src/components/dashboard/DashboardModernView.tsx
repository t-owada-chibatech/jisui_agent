import Link from "next/link";
import { AlertTriangle, ChefHat, ShoppingCart, ArrowRight, Flame } from "lucide-react";
import { formatCurrency, calcBudgetProgress } from "@/lib/utils/currency";
import { getExpiryLabel } from "./expiryLabel";
import { DashboardViewProps } from "./types";

const toneStyles = {
  danger: "text-red-700 bg-red-100",
  warning: "text-amber-800 bg-amber-100",
  ok: "text-emerald-700 bg-emerald-100",
};

function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <svg width="92" height="92" viewBox="0 0 100 100" className="flex-shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E6F4EF" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="800" fill="#111827" style={{ fontFamily: "var(--font-modern)" }}>
        {percent}%
      </text>
      <text x="50" y="63" textAnchor="middle" fontSize="9" fill="#9CA3AF">
        使用
      </text>
    </svg>
  );
}

export function DashboardModernView(props: DashboardViewProps) {
  const {
    displayName, dateLabel, recordDays,
    monthlySpent, monthlyBudget, weeklySpent, weeklyBudget, weekRangeLabel,
    expiringIngredients, recipesWithMatch, shoppingRows,
  } = props;

  const monthlyProgress = calcBudgetProgress(monthlySpent, monthlyBudget);
  const weeklyProgress = calcBudgetProgress(weeklySpent, weeklyBudget);

  return (
    <div className="space-y-6" style={{ fontFamily: "var(--font-modern)" }}>
      <div
        className="rounded-[20px] px-7 py-7 flex items-center justify-between gap-4 flex-wrap shadow-[0_14px_32px_-14px_rgba(4,120,87,0.4)]"
        style={{ background: "linear-gradient(135deg,#064E3B 0%,#047857 60%,#0D9488 100%)" }}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-white/65 text-xs font-bold tracking-wide">{dateLabel}</span>
          <h1 className="text-white text-2xl font-black tracking-tight">おかえりなさい、{displayName}さん</h1>
          <span className="text-white/80 text-sm">今週の食費はあと {formatCurrency(Math.max(0, weeklyBudget - weeklySpent))} 使えます</span>
        </div>
        <div className="flex items-center gap-2.5 bg-white/10 border border-white/25 rounded-2xl px-4 py-2.5">
          <Flame size={18} className="text-white" />
          <div className="flex flex-col leading-tight">
            <span className="text-white font-extrabold text-sm">今月 {recordDays}日 記録</span>
            <span className="text-white/60 text-[0.65rem]">継続中</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.08)] flex items-center gap-5">
          <Ring percent={monthlyProgress} color="#059669" />
          <div>
            <span className="text-xs font-bold text-gray-500 tracking-wide">今月の食費</span>
            <p className="mt-1 text-2xl font-extrabold text-gray-900">{formatCurrency(monthlySpent)}</p>
            <p className="mt-0.5 text-xs text-gray-400">予算 {formatCurrency(monthlyBudget)} ・ 残り <b className="text-emerald-700">{formatCurrency(Math.max(0, monthlyBudget - monthlySpent))}</b></p>
          </div>
        </div>
        <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.08)] flex items-center gap-5">
          <Ring percent={weeklyProgress} color="#0D9488" />
          <div>
            <span className="text-xs font-bold text-gray-500 tracking-wide">今週の食費</span>
            <p className="mt-1 text-2xl font-extrabold text-gray-900">{formatCurrency(weeklySpent)}</p>
            <p className="mt-0.5 text-xs text-gray-400">予算 {formatCurrency(weeklyBudget)} ・ {weekRangeLabel}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-[30px] h-[30px] rounded-[9px] bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-700" />
            </span>
            <span className="font-extrabold text-gray-900">賞味期限が近い食材</span>
          </div>
          <Link href="/ingredients" className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline">
            すべて見る <ArrowRight size={13} />
          </Link>
        </div>
        {expiringIngredients.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">期限が近い食材はありません</p>
        ) : (
          <div className="flex flex-col">
            {expiringIngredients.slice(0, 5).map((ing, idx) => {
              const { text, tone } = getExpiryLabel(ing.expiresAt);
              return (
                <div
                  key={ing.id}
                  className={`flex items-center justify-between py-2.5 ${idx < expiringIngredients.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <span className="text-sm font-semibold text-gray-900">
                    {ing.name} <span className="text-gray-400 font-normal text-xs">{ing.quantity}{ing.unit}</span>
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${toneStyles[tone]}`}>{text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-[30px] h-[30px] rounded-[9px] bg-emerald-100 flex items-center justify-center">
              <ChefHat size={16} className="text-emerald-700" />
            </span>
            <span className="font-extrabold text-gray-900">今日作れそうなレシピ</span>
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
          <div className="flex flex-col">
            {recipesWithMatch.map((recipe, idx) => {
              const matchPct = recipe.totalIngredientCount ? Math.round((recipe.matchedCount / recipe.totalIngredientCount) * 100) : 0;
              return (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block">
                  <div className={`flex items-center justify-between py-2.5 ${idx < recipesWithMatch.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{recipe.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{recipe.cookTimeMin}分 ・ {formatCurrency(recipe.estimatedCost)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${matchPct === 100 ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50"}`}>
                      食材 {recipe.matchedCount}/{recipe.totalIngredientCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-[30px] h-[30px] rounded-[9px] bg-blue-100 flex items-center justify-center">
              <ShoppingCart size={16} className="text-blue-700" />
            </span>
            <span className="font-extrabold text-gray-900">次に買うべき食材</span>
          </div>
          <Link href="/shopping" className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline">
            すべて見る <ArrowRight size={13} />
          </Link>
        </div>
        {shoppingRows.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">買い物リストは空です</p>
        ) : (
          <div className="flex flex-col">
            {shoppingRows.map((item, idx) => (
              <div key={item.id as string} className="flex items-center gap-3 py-2">
                <span className="w-[22px] h-[22px] rounded-full bg-gray-900 text-white text-[0.68rem] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                <span className="text-sm text-gray-900 font-medium flex-1">{item.ingredient_name as string}</span>
                {item.estimated_price != null && <span className="text-xs text-gray-400">{formatCurrency(Number(item.estimated_price))}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
