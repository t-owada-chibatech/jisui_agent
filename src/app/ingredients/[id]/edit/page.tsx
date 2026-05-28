import { supabase } from "@/lib/supabase";
import { IngredientForm } from "@/components/ingredients/IngredientForm";
import { notFound } from "next/navigation";
import { Ingredient, IngredientCategory } from "@/types";

export const dynamic = "force-dynamic";

export default async function EditIngredientPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();

  const ingredient: Ingredient = {
    id: data.id as string,
    name: data.name as string,
    quantity: Number(data.quantity),
    unit: data.unit as string,
    price: data.price != null ? Number(data.price) : undefined,
    purchasedAt: (data.purchased_at as string) ?? undefined,
    expiresAt: (data.expires_at as string) ?? undefined,
    category: data.category as IngredientCategory,
    createdAt: data.created_at as string,
  };

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
