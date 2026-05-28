export type IngredientCategory =
  | "野菜"
  | "肉"
  | "魚"
  | "乳製品"
  | "調味料"
  | "穀物"
  | "その他";

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  purchasedAt?: string; // ISO date string
  expiresAt?: string;   // ISO date string
  category: IngredientCategory;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  isOptional: boolean;
}

export interface RecipeStep {
  id: string;
  recipeId: string;
  stepOrder: number;
  description: string;
}

export type RecipeGenre = "和食" | "洋食" | "中華" | "イタリアン" | "その他";

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  cookTimeMin: number;
  estimatedCost: number;
  genre: RecipeGenre;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  createdAt: string;
  // マッチした食材数（提案時に使用）
  matchedCount?: number;
  totalIngredientCount?: number;
}

export type BudgetCategory = "食材" | "外食" | "調味料" | "その他";

export interface BudgetRecord {
  id: string;
  purchasedAt: string;
  storeName?: string;
  category: BudgetCategory;
  amount: number;
  memo?: string;
  createdAt: string;
}

export interface MonthlyBudget {
  id: string;
  yearMonth: string; // "2026-05"
  budget: number;
}

export interface WeeklyBudget {
  id: string;
  weekStart: string; // ISO date (Monday)
  budget: number;
}

export interface ShoppingItem {
  id: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  priority: number;
  isPurchased: boolean;
  recipeId?: string;
  recipeTitle?: string;
  createdAt: string;
}

export interface DashboardStats {
  monthlySpent: number;
  monthlyBudget: number;
  weeklySpent: number;
  weeklyBudget: number;
  expiringIngredients: Ingredient[];
  suggestedRecipes: Recipe[];
  topShoppingItems: ShoppingItem[];
}
