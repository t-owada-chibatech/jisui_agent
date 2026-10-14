import { Ingredient } from "@/types";

export interface RecipeMatch {
  id: string;
  title: string;
  cookTimeMin: number;
  estimatedCost: number;
  matchedCount: number;
  totalIngredientCount: number;
}

export interface DashboardViewProps {
  displayName: string;
  dateLabel: string;
  recordDays: number;
  monthlySpent: number;
  monthlyBudget: number;
  weeklySpent: number;
  weeklyBudget: number;
  weekRangeLabel: string;
  expiringIngredients: Ingredient[];
  recipesWithMatch: RecipeMatch[];
  shoppingRows: Record<string, unknown>[];
}
