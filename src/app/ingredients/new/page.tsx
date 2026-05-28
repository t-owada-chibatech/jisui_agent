import { IngredientForm } from "@/components/ingredients/IngredientForm";

export default function NewIngredientPage() {
  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">食材を追加</h2>
        <p className="text-sm text-gray-500 mt-0.5">新しい食材を登録します</p>
      </div>
      <IngredientForm mode="create" />
    </div>
  );
}
