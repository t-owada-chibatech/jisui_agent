import { getDaysUntilExpiry, getExpiryStatus } from "@/lib/utils/date";

export type ExpiryTone = "danger" | "warning" | "ok";

export function getExpiryLabel(expiresAt?: string): { text: string; tone: ExpiryTone } {
  const status = getExpiryStatus(expiresAt);
  const days = getDaysUntilExpiry(expiresAt);

  switch (status) {
    case "expired":
      return { text: "期限切れ", tone: "danger" };
    case "urgent":
      return { text: days === 0 ? "本日期限" : "明日期限", tone: "danger" };
    case "soon":
      return { text: `あと${days}日`, tone: "warning" };
    default:
      return { text: `あと${days}日`, tone: "ok" };
  }
}
