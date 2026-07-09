"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, ShoppingCart, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/auth/useSession";
import { formatCurrency } from "@/lib/utils/currency";
import { getCurrentYearMonth } from "@/lib/utils/date";
import { ShoppingItem, AISuggestedIngredient, SuggestionPriority } from "@/types";

const PRIORITY_LABEL: Record<SuggestionPriority, string> = {
  high: "優先度：高",
  medium: "優先度：中",
  low: "優先度：低",
};
const PRIORITY_COLOR: Record<SuggestionPriority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

export default function ShoppingPage() {
  const { user } = useSession();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestedIngredient[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
    loadAiSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from("shopping_items")
      .select("*, recipes(title)")
      .order("priority", { ascending: false });

    setItems(
      (data || []).map((row): ShoppingItem => ({
        id: row.id as string,
        ingredientName: row.ingredient_name as string,
        quantity: row.quantity != null ? Number(row.quantity) : undefined,
        unit: (row.unit as string) ?? undefined,
        estimatedPrice: row.estimated_price != null ? Number(row.estimated_price) : undefined,
        priority: row.priority as number,
        isPurchased: row.is_purchased as boolean,
        recipeId: (row.recipe_id as string) ?? undefined,
        recipeTitle: (row as Record<string, unknown>).recipes
          ? ((row as Record<string, unknown>).recipes as Record<string, unknown>)?.title as string
          : undefined,
        createdAt: row.created_at as string,
      }))
    );
    setLoading(false);
  }

  const loadAiSuggestions = useCallback(async () => {
    setAiLoading(true);
    try {
      const yearMonth = getCurrentYearMonth();

      const [{ data: ingredients }, { data: budgetRecords }, { data: monthlyBudgets }] =
        await Promise.all([
          supabase.from("ingredients").select("name, quantity, unit, expires_at"),
          supabase.from("budget_records").select("amount").eq("category", "食材").gte("purchased_at", `${yearMonth}-01`),
          supabase.from("monthly_budgets").select("budget").eq("year_month", yearMonth).maybeSingle(),
        ]);

      const totalSpent = (budgetRecords || []).reduce((s, r) => s + Number(r.amount), 0);
      const monthlyBudget = monthlyBudgets?.budget ?? 20000;
      const remainingBudget = Math.max(0, monthlyBudget - totalSpent);

      const recentPurchases = (ingredients || []).map((i) => i.name as string);

      const res = await fetch("/api/shopping/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: (ingredients || []).map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            expiresAt: i.expires_at ?? undefined,
          })),
          remainingBudget,
          recentPurchases,
          dislikedIngredients: [],
          preferredGenres: [],
        }),
      });
      const json = await res.json();
      setAiSuggestions(json.suggestions ?? []);
    } catch {
      // サイレントフォールバック
    } finally {
      setAiLoading(false);
    }
  }, []);

  async function toggle(id: string, current: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isPurchased: !current } : i)));
    const { error } = await supabase
      .from("shopping_items")
      .update({ is_purchased: !current })
      .eq("id", id);
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isPurchased: current } : i)));
    }
  }

  async function addItem() {
    if (!newItemName.trim() || !user) return;
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({ ingredient_name: newItemName.trim(), priority: 0, user_id: user.id })
      .select()
      .single();
    if (data && !error) {
      setItems((prev) => [
        ...prev,
        {
          id: data.id as string,
          ingredientName: data.ingredient_name as string,
          priority: data.priority as number,
          isPurchased: data.is_purchased as boolean,
          createdAt: data.created_at as string,
        },
      ]);
      setNewItemName("");
    }
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("shopping_items").delete().eq("id", id);
  }

  async function addAiSuggestionToList(suggestion: AISuggestedIngredient) {
    if (!user) return;
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({
        ingredient_name: suggestion.name,
        estimated_price: suggestion.estimatedPrice,
        priority: suggestion.priority === "high" ? 2 : suggestion.priority === "medium" ? 1 : 0,
        user_id: user.id,
      })
      .select()
      .single();
    if (data && !error) {
      setItems((prev) => [
        ...prev,
        {
          id: data.id as string,
          ingredientName: data.ingredient_name as string,
          estimatedPrice: data.estimated_price != null ? Number(data.estimated_price) : undefined,
          priority: data.priority as number,
          isPurchased: data.is_purchased as boolean,
          createdAt: data.created_at as string,
        },
      ]);
      setAddedIds((prev) => new Set(prev).add(suggestion.id));
    }
  }

  const pending = items.filter((i) => !i.isPurchased);
  const purchased = items.filter((i) => i.isPurchased);
  const totalEstimated = pending.reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">買い物</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            未購入 {pending.length}件 · 目安合計 {formatCurrency(totalEstimated)}
          </p>
        </div>
      </div>

      {/* 手動追加フォーム */}
      <Card>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="食材を追加（Enterで確定）"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button onClick={addItem} size="sm">
            <Plus size={15} />追加
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>
      ) : (
        <>
          {/* セクション1：買い物リスト */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-500" />
                <CardTitle>買い物リスト（{pending.length}件）</CardTitle>
              </div>
            </CardHeader>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-400 py-2 text-center">リストは空です</p>
            ) : (
              <div className="space-y-1">
                {pending.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 group">
                    <button
                      onClick={() => toggle(item.id, item.isPurchased)}
                      className="w-5 h-5 rounded border-2 border-gray-300 hover:border-emerald-500 transition-colors flex-shrink-0"
                    />
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.ingredientName}</p>
                      {item.recipeTitle && <p className="text-xs text-gray-400">{item.recipeTitle}用</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.quantity && <span className="text-xs text-gray-500">{item.quantity}{item.unit}</span>}
                      {item.estimatedPrice && <span className="text-xs font-medium text-gray-600">{formatCurrency(item.estimatedPrice)}</span>}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pending.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">目安合計</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(totalEstimated)}</span>
              </div>
            )}
          </Card>

          {purchased.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" />
                  <CardTitle>購入済み（{purchased.length}件）</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-1">
                {purchased.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-2 rounded-lg">
                    <button
                      onClick={() => toggle(item.id, item.isPurchased)}
                      className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center flex-shrink-0"
                    >
                      <Check size={11} className="text-white" />
                    </button>
                    <span className="text-sm text-gray-400 line-through">{item.ingredientName}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* セクション2：AIおすすめ食材 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-base font-bold text-gray-900">AIおすすめ食材</h3>
              </div>
              <button
                onClick={loadAiSuggestions}
                disabled={aiLoading}
                className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-40 font-medium"
              >
                {aiLoading ? "提案中…" : "再提案"}
              </button>
            </div>

            {aiLoading ? (
              <div className="text-center py-10 text-gray-400 text-sm">AIが食材を提案中…</div>
            ) : aiSuggestions.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">提案を取得できませんでした</div>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((s) => (
                  <Card key={s.id}>
                    <div className="space-y-2">
                      {/* ヘッダー行 */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{s.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[s.priority]}`}>
                            {PRIORITY_LABEL[s.priority]}
                          </span>
                          <span className="text-xs text-gray-500">目安 {formatCurrency(s.estimatedPrice)}</span>
                        </div>
                        {addedIds.has(s.id) ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 flex-shrink-0">
                            <Check size={12} />追加済み
                          </span>
                        ) : (
                          <button
                            onClick={() => addAiSuggestionToList(s)}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg font-medium flex-shrink-0 transition-colors"
                          >
                            + リストに追加
                          </button>
                        )}
                      </div>

                      {/* 提案理由 */}
                      <p className="text-xs text-gray-600">{s.reason}</p>

                      {/* 詳細トグル */}
                      <button
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                      >
                        {expandedId === s.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expandedId === s.id ? "詳細を閉じる" : "詳細を見る"}
                      </button>

                      {expandedId === s.id && (
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">作れる料理</p>
                            <div className="flex flex-wrap gap-1">
                              {s.recipesCanMake.map((r) => (
                                <span key={r} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">既存食材との相性</p>
                            <div className="flex flex-wrap gap-1">
                              {s.compatibleWith.map((c) => (
                                <span key={c} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{c}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">節約ポイント</p>
                            <p className="text-xs text-gray-600">{s.savingReason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
