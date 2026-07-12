export type IngredientCategory =
  | "野菜"
  | "肉"
  | "魚"
  | "乳製品"
  | "調味料"
  | "穀物"
  | "お菓子"
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

export type BudgetCategory = "食材" | "外食" | "調味料" | "日用品" | "お菓子" | "その他";

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

export type SuggestionPriority = "high" | "medium" | "low";

export interface AISuggestedIngredient {
  id: string;
  name: string;
  estimatedPrice: number;
  priority: SuggestionPriority;
  reason: string;
  recipesCanMake: string[];
  compatibleWith: string[];
  savingReason: string;
}

export type ReceiptItemCategory =
  | "vegetable"
  | "meat"
  | "fish"
  | "egg_dairy"
  | "staple_food"
  | "seasoning"
  | "drink"
  | "snack"
  | "frozen_food"
  | "daily_goods"
  | "other";

export interface ReceiptItemDraft {
  id: string;
  itemName: string;
  normalizedName?: string;
  price?: number;
  quantity?: number;
  unit?: string;
  category: ReceiptItemCategory;
  isFood: boolean;
  addToInventory: boolean;
  estimatedExpireDays?: number;
}

export interface ReceiptDraft {
  id: string;
  storeName?: string;
  purchasedAt?: string;
  totalAmount?: number;
  rawText?: string;
  items: ReceiptItemDraft[];
}

export interface RakutenRecipeSuggestion {
  recipeId: string;
  recipeTitle: string;
  recipeUrl: string;
  foodImageUrl: string;
  recipeDescription: string;
  recipeMaterial: string[];
  recipeIndication: string;
  recipeCost: string;
  rank: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchScore: number;
  suggestionReason: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type CasualRecipeDifficulty = "easy" | "normal" | "hard";

// AIのチャットが最後に出すJSON（保存前）と、DBに保存済みのレシピで共通する項目
export interface RecipeDraft {
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  estimatedCost?: number;
  cookingTimeMinutes?: number;
  difficulty: CasualRecipeDifficulty;
  tags: string[];
}

export interface CasualRecipe extends RecipeDraft {
  id: string;
  vibe: string;
  sourceSessionId?: string;
  createdAt: string;
  updatedAt: string;
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
