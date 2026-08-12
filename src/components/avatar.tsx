import { initials, avatarColor } from "@/lib/format";

const sizeClasses = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-xl",
} as const;

export function Avatar({
  nome,
  fotoUrl,
  size = "md",
}: {
  nome: string;
  fotoUrl?: string | null;
  size?: keyof typeof sizeClasses;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${sizeClasses[size]}`}
      />
    );
  }

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
