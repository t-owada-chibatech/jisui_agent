export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function calcBudgetProgress(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, Math.round((spent / budget) * 100));
}
