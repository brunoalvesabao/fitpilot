import { initials, avatarColor } from "@/lib/format";

const sizeClasses = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-xl",
} as const;

export function Avatar({
  nome,
  size = "md",
}: {
  nome: string;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: avatarColor(nome) }}
      aria-hidden
    >
      {initials(nome)}
    </div>
  );
}
