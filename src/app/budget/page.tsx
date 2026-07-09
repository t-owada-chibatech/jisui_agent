"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { formatCurrency, calcBudgetProgress } from "@/lib/utils/currency";
import { formatDate, formatYearMonth, getCurrentYearMonth, getWeekRange } from "@/lib/utils/date";
import { BudgetCategory } from "@/types";
import { clsx } from "clsx";

const categoryColors: Record<BudgetCategory, string> = {
  食材:   "bg-green-100 text-green-700",
  外食:   "bg-orange-100 text-orange-700",
  調味料: "bg-purple-100 text-purple-700",
  日用品: "bg-blue-100 text-blue-700",
  お菓子: "bg-pink-100 text-pink-700",
  その他: "bg-gray-100 text-gray-600",
};

type BudgetRecordRow = Record<string, unknown> & { purchased_at: string; amount: number; category: string };

export default function BudgetPage() {
  const currentYM = getCurrentYearMonth();
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<BudgetRecordRow[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(20000);
  const [weeklyBudget, setWeeklyBudget] = useState(5000);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBudget() {
    setLoading(true);
    const [{ data: records }, { data: monthlyBudgetRow }, { data: weeklyBudgetRow }] = await Promise.all([
      supabase.from("budget_records").select("*").order("purchased_at", { ascending: false }),
      supabase.from("monthly_budgets").select("*").eq("year_month", currentYM).maybeSingle(),
      supabase.from("weekly_budgets").select("*").order("week_start", { ascending: false }).limit(1).maybeSingle(),
    ]);

    setAllRecords((records || []) as BudgetRecordRow[]);
    setMonthlyBudget(monthlyBudgetRow?.budget ?? 20000);
    setWeeklyBudget(weeklyBudgetRow?.budget ?? 5000);
    setWeekStart(weeklyBudgetRow?.week_start ?? new Date().toISOString().split("T")[0]);
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>;
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const monthlyRecords = allRecords.filter((r) => r.purchased_at.startsWith(currentYM));
  const weeklyRecords = allRecords.filter((r) => r.purchased_at >= weekStart && r.purchased_at <= weekEndStr);

  const monthlySpent = monthlyRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const weeklySpent = weeklyRecords.reduce((sum, r) => sum + Number(r.amount), 0);

  const monthlyProgress = calcBudgetProgress(monthlySpent, Number(monthlyBudget));
  const weeklyProgress = calcBudgetProgress(weeklySpent, Number(weeklyBudget));

  const byCategory = monthlyRecords.reduce<Record<string, number>>((acc, r) => {
    const cat = r.category as string;
    acc[cat] = (acc[cat] ?? 0) + Number(r.amount);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">家計簿</h2>
          <p className="text-sm text-gray-500 mt-0.5">{formatYearMonth(currentYM)}</p>
        </div>
        <Link href="/budget/new">
          <Button><Plus size={16} />支出を追加</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>今月の支出</CardTitle></CardHeader>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{formatCurrency(monthlySpent)}</span>
              <span className="text-sm text-gray-400 mb-0.5">/ {formatCurrency(Number(monthlyBudget))}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={clsx("h-2 rounded-full", monthlyProgress >= 90 ? "bg-red-500" : monthlyProgress >= 70 ? "bg-yellow-500" : "bg-emerald-500")} style={{ width: `${monthlyProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500">残り {formatCurrency(Number(monthlyBudget) - monthlySpent)}</p>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>今週の支出</CardTitle></CardHeader>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{formatCurrency(weeklySpent)}</span>
              <span className="text-sm text-gray-400 mb-0.5">/ {formatCurrency(Number(weeklyBudget))}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={clsx("h-2 rounded-full", weeklyProgress >= 90 ? "bg-red-500" : weeklyProgress >= 70 ? "bg-yellow-500" : "bg-emerald-500")} style={{ width: `${weeklyProgress}%` }} />
            </div>
            <p className="text-xs text-gray-400 text-xs">{getWeekRange(weekStart)}</p>
          </div>
        </Card>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <Card>
          <CardHeader><CardTitle>カテゴリ別支出（今月）</CardTitle></CardHeader>
          <div className="space-y-3">
            {(Object.entries(byCategory) as [BudgetCategory, number][]).map(([cat, amount]) => {
              const pct = monthlySpent > 0 ? Math.round((amount / monthlySpent) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColors[cat] ?? "bg-gray-100 text-gray-600"}`}>{cat}</span>
                    <span className="font-medium">{formatCurrency(amount)} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {allRecords.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-gray-400 mb-4">まだ支出が記録されていません</p>
          <Link href="/budget/new"><Button><Plus size={16} />最初の支出を記録</Button></Link>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">支出履歴</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">日付</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">店名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">カテゴリ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">メモ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRecords.map((record) => (
                <tr key={record.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(record.purchased_at as string)}</td>
                  <td className="px-4 py-3 text-gray-800">{(record.store_name as string) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColors[record.category as BudgetCategory] ?? "bg-gray-100 text-gray-600"}`}>
                      {record.category as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{(record.memo as string) || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(record.amount))}</td>
                </tr>
              ))}
            </tbody>
            {monthlyRecords.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-600">今月の合計</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(monthlySpent)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </Card>
      )}
    </div>
  );
}
