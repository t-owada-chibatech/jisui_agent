import { UserCircle } from "lucide-react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

// 投稿者アイコン。画像が無い場合は汎用アイコンにフォールバックする
export function Avatar({ src, alt, size = 16, className }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <UserCircle size={size} className={`text-gray-300 flex-shrink-0 ${className ?? ""}`} />;
}
