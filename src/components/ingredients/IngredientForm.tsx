"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { Ingredient, IngredientCategory } from "@/types";

const categories: IngredientCategory[] = ["野菜", "肉", "魚", "乳製品", "調味料", "穀物", "お菓子", "その他"];
const units = ["g", "kg", "ml", "L", "個", "本", "枚", "袋", "丁", "束", "缶", "杯"];

interface IngredientFormProps {
  initialData?: Partial<Ingredient>;
  mode: "create" | "edit";
}

export function IngredientForm({ initialData, mode }: IngredientFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    quantity: initialData?.quantity?.toString() ?? "",
    unit: initialData?.unit ?? "g",
    price: initialData?.price?.toString() ?? "",
    purchasedAt: initialData?.purchasedAt ?? "",
    expiresAt: initialData?.expiresAt ?? "",
    category: initialData?.category ?? ("野菜" as IngredientCategory),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      quantity: Number(form.quantity),
      unit: form.unit,
      price: form.price ? Number(form.price) : null,
      purchased_at: form.purchasedAt || null,
      expires_at: form.expiresAt || null,
      category: form.category,
    };

    let supabaseError = null;

    if (mode === "create") {
      const { error: err } = await supabase.from("ingredients").insert(payload);
      supabaseError = err;
    } else {
      const { error: err } = await supabase
        .from("ingredients")
        .update(payload)
        .eq("id", initialData!.id!);
      supabaseError = err;
    }

    setSaving(false);

    if (supabaseError) {
      setError("保存に失敗しました: " + supabaseError.message);
      return;
    }

    router.push("/ingredients");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">食材名 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="例: 鶏むね肉"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数量 *</label>
            <input
              name="quantity"
              type="number"
              min="0"
              step="0.1"
              value={form.quantity}
              onChange={handleChange}
              required
              placeholder="300"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">単位 *</label>
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {units.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">購入価格（円）</label>
            <input
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              placeholder="250"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">購入日</label>
            <input
              name="purchasedAt"
              type="date"
              value={form.purchasedAt}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">賞味期限</label>
            <input
              name="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : mode === "create" ? "追加する" : "保存する"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            キャンセル
          </Button>
        </div>
      </Card>
    </form>
  );
}
