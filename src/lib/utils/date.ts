export function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiresAt?: string): "expired" | "urgent" | "soon" | "ok" | "none" {
  const days = getDaysUntilExpiry(expiresAt);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 1) return "urgent";
  if (days <= 3) return "soon";
  return "ok";
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${parseInt(month)}月`;
}

export function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${formatDate(weekStart)} 〜 ${formatDate(end.toISOString().split("T")[0])}`;
}
