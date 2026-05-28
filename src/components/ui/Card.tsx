import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("bg-white rounded-xl shadow-sm border border-gray-100 p-4", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={clsx("flex items-center justify-between mb-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={clsx("text-sm font-semibold text-gray-700", className)}>
      {children}
    </h3>
  );
}
