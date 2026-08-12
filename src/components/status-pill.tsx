import type { StatusAluno } from "@/types/database";

type PillColor = "green" | "amber" | "red" | "gray" | "blue";

const colorClasses: Record<PillColor, string> = {
  green: "bg-primary/15 text-primary",
  amber: "bg-amber/15 text-amber",
  red: "bg-red/15 text-red",
  gray: "bg-white/10 text-fg-muted",
  blue: "bg-blue/15 text-blue",
};

const statusConfig: Record<StatusAluno, { label: string; color: PillColor }> = {
  ativo: { label: "Ativo", color: "green" },
  vencendo: { label: "Vencendo", color: "amber" },
  inadimplente: { label: "Atrasado", color: "red" },
  pausa: { label: "Em pausa", color: "gray" },
  ex_aluno: { label: "Ex-aluno", color: "gray" },
  lead: { label: "Lead", color: "blue" },
};

export function Pill({
  color,
  children,
}: {
  color: PillColor;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${colorClasses[color]}`}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: StatusAluno }) {
  const config = statusConfig[status];
  return <Pill color={config.color}>{config.label}</Pill>;
}
