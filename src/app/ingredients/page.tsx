import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExpiryBadge } from "@/components/ingredients/ExpiryBadge";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { getExpiryStatus } from "@/lib/utils/date";
import { IngredientCategory } from "@/types";

export const dynamic = "force-dynamic";

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

export default async function IngredientsPage() {
  const { data: rows, error } = await supabase
    .from("ingredients")
    .select("*")
    .order("expires_at", { ascending: true, nullsFirst: false });

  const ingredients = (rows || []).sort(
    (a, b) =>
      statusOrder[getExpiryStatus(a.expires_at as string | undefined)] -
      statusOrder[getExpiryStatus(b.expires_at as string | undefined)]
  );

  const categoryCounts = ingredients.reduce<Record<string, number>>((acc, i) => {
    acc[i.category as string] = (acc[i.category as string] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">食材管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">{ingredients.length}件の食材</p>
        </div>
        <Link href="/ingredients/new">
          <Button>
            <Plus size={16} />
            食材を追加
          </Button>
        </Link>
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

      {ingredients.length === 0 ? (
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
              {ingredients.map((ing) => (
                <tr key={ing.id as string} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{ing.name as string}</td>
                  <td className="px-4 py-3 text-gray-600">{ing.quantity as number} {ing.unit as string}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColors[ing.category as IngredientCategory]}`}>
                      {ing.category as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ing.price != null ? formatCurrency(Number(ing.price)) : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ing.purchased_at as string | undefined)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatDate(ing.expires_at as string | undefined)}</span>
                      <ExpiryBadge expiresAt={ing.expires_at as string | undefined} />
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
    </div>
  );
}
