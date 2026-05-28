import { Badge } from "@/components/ui/Badge";
import { getDaysUntilExpiry, getExpiryStatus } from "@/lib/utils/date";

interface ExpiryBadgeProps {
  expiresAt?: string;
}

export function ExpiryBadge({ expiresAt }: ExpiryBadgeProps) {
  const status = getExpiryStatus(expiresAt);
  const days = getDaysUntilExpiry(expiresAt);

  if (status === "none") return null;

  const labels: Record<string, { text: string; variant: "danger" | "warning" | "success" | "default" }> = {
    expired: { text: "期限切れ", variant: "danger" },
    urgent: { text: days === 0 ? "本日期限" : "明日期限", variant: "danger" },
    soon: { text: `あと${days}日`, variant: "warning" },
    ok: { text: `あと${days}日`, variant: "success" },
  };

  const { text, variant } = labels[status];
  return <Badge variant={variant}>{text}</Badge>;
}
