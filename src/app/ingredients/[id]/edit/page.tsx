"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IngredientForm } from "@/components/ingredients/IngredientForm";
import { Ingredient, IngredientCategory } from "@/types";

export default function EditIngredientPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);

  useEffect(() => {
    loadIngredient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadIngredient() {
    setLoading(true);
    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setIngredient({
        id: data.id as string,
        name: data.name as string,
        quantity: Number(data.quantity),
        unit: data.unit as string,
        price: data.price != null ? Number(data.price) : undefined,
        purchasedAt: (data.purchased_at as string) ?? undefined,
        expiresAt: (data.expires_at as string) ?? undefined,
        category: data.category as IngredientCategory,
        createdAt: data.created_at as string,
      });
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>;
  }

  if (!ingredient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">食材が見つかりませんでした</p>
        <Link href="/ingredients" className="text-sm text-emerald-600 hover:underline">食材管理に戻る</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">食材を編集</h2>
        <p className="text-sm text-gray-500 mt-0.5">{ingredient.name}</p>
      </div>
      <IngredientForm mode="edit" initialData={ingredient} />
    </div>
  );
}
