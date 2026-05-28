"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { BudgetCategory } from "@/types";

const categories: BudgetCategory[] = ["食材", "外食", "調味料", "その他"];

export default function NewBudgetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    purchasedAt: new Date().toISOString().split("T")[0],
    storeName: "",
    category: "食材" as BudgetCategory,
    amount: "",
    memo: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("budget_records").insert({
      purchased_at: form.purchasedAt,
      store_name: form.storeName || null,
      category: form.category,
      amount: Number(form.amount),
      memo: form.memo || null,
    });

    setSaving(false);

    if (err) {
      setError("保存に失敗しました: " + err.message);
      return;
    }

    router.push("/budget");
    router.refresh();
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">支出を追加</h2>
        <p className="text-sm text-gray-500 mt-0.5">食費の支出を記録します</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付 *</label>
            <input name="purchasedAt" type="date" value={form.purchasedAt} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">店名</label>
            <input name="storeName" value={form.storeName} onChange={handleChange} placeholder="例: スーパーマルエツ" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額（円） *</label>
              <input name="amount" type="number" min="1" value={form.amount} onChange={handleChange} required placeholder="1500" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea name="memo" value={form.memo} onChange={handleChange} rows={2} placeholder="例: 週のまとめ買い" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "保存中…" : "記録する"}</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>キャンセル</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
