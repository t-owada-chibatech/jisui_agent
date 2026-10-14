import { IngredientForm } from "@/components/ingredients/IngredientForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default function NewIngredientPage() {
  return (
    <div className="space-y-5 max-w-xl">
      <PageHeader title="食材を追加" subtitle="新しい食材を登録します" />
      <IngredientForm mode="create" />
    </div>
  );
}
