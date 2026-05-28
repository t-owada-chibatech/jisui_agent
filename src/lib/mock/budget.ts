import { BudgetRecord, MonthlyBudget, WeeklyBudget } from "@/types";

const today = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const mockBudgetRecords: BudgetRecord[] = [
  {
    id: "b1",
    purchasedAt: fmt(addDays(today, -14)),
    storeName: "スーパーマルエツ",
    category: "食材",
    amount: 1850,
    memo: "週の食材まとめ買い",
    createdAt: fmt(addDays(today, -14)),
  },
  {
    id: "b2",
    purchasedAt: fmt(addDays(today, -10)),
    storeName: "業務スーパー",
    category: "食材",
    amount: 2300,
    memo: "冷凍食品・調味料",
    createdAt: fmt(addDays(today, -10)),
  },
  {
    id: "b3",
    purchasedAt: fmt(addDays(today, -7)),
    storeName: "コンビニ",
    category: "外食",
    amount: 650,
    memo: "夜食",
    createdAt: fmt(addDays(today, -7)),
  },
  {
    id: "b4",
    purchasedAt: fmt(addDays(today, -5)),
    storeName: "スーパーマルエツ",
    category: "食材",
    amount: 1200,
    memo: "",
    createdAt: fmt(addDays(today, -5)),
  },
  {
    id: "b5",
    purchasedAt: fmt(addDays(today, -3)),
    storeName: "ドラッグストア",
    category: "調味料",
    amount: 450,
    memo: "醤油・みりん補充",
    createdAt: fmt(addDays(today, -3)),
  },
  {
    id: "b6",
    purchasedAt: fmt(addDays(today, -1)),
    storeName: "スーパーマルエツ",
    category: "食材",
    amount: 980,
    memo: "",
    createdAt: fmt(addDays(today, -1)),
  },
];

export const mockMonthlyBudget: MonthlyBudget = {
  id: "mb1",
  yearMonth: today.toISOString().slice(0, 7),
  budget: 20000,
};

// 今週の月曜日を計算
const getMonday = (d: Date) => {
  const r = new Date(d);
  const day = r.getDay();
  const diff = r.getDate() - day + (day === 0 ? -6 : 1);
  r.setDate(diff);
  return r;
};

export const mockWeeklyBudget: WeeklyBudget = {
  id: "wb1",
  weekStart: fmt(getMonday(today)),
  budget: 5000,
};
