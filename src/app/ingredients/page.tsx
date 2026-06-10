"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExpiryBadge } from "@/components/ingredients/ExpiryBadge";
import { supabase } from "@/lib/supabase";
import { formatDate, getExpiryStatus } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { IngredientCategory } from "@/types";

const categoryColors: Record<IngredientCategory, string> = {
  野菜: "bg-green-100 text-green-700",
  肉: "bg-red-100 text-red-700",
  魚: "bg-blue-100 text-blue-700",
  乳製品: "bg-yellow-100 text-yellow-700",
  調味料: "bg-purple-100 text-purple-700",
  穀物: "bg-orange-100 text-orange-700",
  その他: "bg-gray-100 text-gray-600",
};

const statusOrder = { expired: 0, urgent: 1, soon: 2, ok: 3, none: 4 };

type Row = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
  purchased_at: string | null;
  expires_at: string | null;
  category: IngredientCategory;
  discarded_at: string | null;
};

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Row[]>([]);
  const [discarded, setDiscarded] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discarding, setDiscarding] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    const [activeResult, recentResult] = await Promise.all([
      supabase.from("ingredients").select("*").is("discarded_at", null).order("expires_at", { ascending: true, nullsFirst: false }),
      supabase.from("ingredients").select("*").not("discarded_at", "is", null).gte("discarded_at", threeDaysAgo).order("discarded_at", { ascending: false }),
    ]);

    // discarded_at カラムが未作成の場合はフォールバック
    if (activeResult.error?.message?.includes("discarded_at")) {
      const { data: all } = await supabase.from("ingredients").select("*").order("expires_at", { ascending: true, nullsFirst: false });
      setIngredients((all || []) as Row[]);
      setDiscarded([]);
    } else {
      setIngredients((activeResult.data || []) as Row[]);
      setDiscarded((recentResult.data || []) as Row[]);
    }

    setLoading(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.size === ingredients.length
        ? new Set()
        : new Set(ingredients.map((i) => i.id))
    );
  }

  async function handleDiscard() {
    if (selectedIds.size === 0 || discarding) return;
    setDiscarding(true);
    await supabase
      .from("ingredients")
      .update({ discarded_at: new Date().toISOString() })
      .in("id", [...selectedIds]);
    setSelectedIds(new Set());
    await loadData();
    setDiscarding(false);
  }

  const sorted = [...ingredients].sort(
    (a, b) =>
      statusOrder[getExpiryStatus(a.expires_at ?? undefined)] -
      statusOrder[getExpiryStatus(b.expires_at ?? undefined)]
  );

  const categoryCounts = ingredients.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">食材管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">{ingredients.length}件の食材</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              onClick={handleDiscard}
              disabled={discarding}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 size={14} />
              {discarding ? "削除中…" : `${selectedIds.size}件を廃棄`}
            </Button>
          )}
          <Link href="/ingredients/new">
            <Button><Plus size={16} />食材を追加</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(categoryColors).map(([cat, cls]) => {
          const count = categoryCounts[cat] ?? 0;
          if (count === 0) return null;
          return (
            <span key={cat} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
              {cat} {count}
            </span>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>
      ) : ingredients.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-gray-400 mb-4">まだ食材が登録されていません</p>
          <Link href="/ingredients/new">
            <Button><Plus size={16} />最初の食材を追加</Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === ingredients.length && ingredients.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-emerald-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">食材名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">数量</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">カテゴリ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">購入価格</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">購入日</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">賞味期限</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((ing) => (
                <tr
                  key={ing.id}
                  className={`hover:bg-gray-50 transition-colors ${selectedIds.has(ing.id) ? "bg-red-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ing.id)}
                      onChange={() => toggleSelect(ing.id)}
                      className="rounded border-gray-300 accent-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                  <td className="px-4 py-3 text-gray-600">{ing.quantity} {ing.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColors[ing.category]}`}>
                      {ing.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ing.price != null ? formatCurrency(ing.price) : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ing.purchased_at ?? undefined)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatDate(ing.expires_at ?? undefined)}</span>
                      <ExpiryBadge expiresAt={ing.expires_at ?? undefined} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ingredients/${ing.id}/edit`} className="text-xs text-emerald-600 hover:underline">
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {discarded.length > 0 && (
        <div>
          <button
            onClick={() => setShowDiscarded((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showDiscarded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            最近捨てた食材（{discarded.length}件・3日以内）
          </button>
          {showDiscarded && (
            <Card className="p-0 overflow-hidden mt-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {discarded.map((ing) => (
                    <tr key={ing.id} className="bg-gray-50">
                      <td className="px-4 py-2 text-gray-400 line-through">{ing.name}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{ing.quantity} {ing.unit}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {ing.discarded_at ? formatDate(ing.discarded_at) : ""}に廃棄
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
