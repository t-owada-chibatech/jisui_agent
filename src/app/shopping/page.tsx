"use client";
import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils/currency";
import { ShoppingItem } from "@/types";

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    loadItems();
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
    if (!newItemName.trim()) return;
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({ ingredient_name: newItemName.trim(), priority: 0 })
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

  const pending = items.filter((i) => !i.isPurchased);
  const purchased = items.filter((i) => i.isPurchased);
  const totalEstimated = pending.reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">買い物リスト</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            未購入 {pending.length}件 · 目安合計 {formatCurrency(totalEstimated)}
          </p>
        </div>
      </div>

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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-500" />
                <CardTitle>買い物リスト（{pending.length}件）</CardTitle>
              </div>
            </CardHeader>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-400 py-2 text-center">すべて購入済みです！</p>
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
        </>
      )}
    </div>
  );
}
