import { Check, X } from "lucide-react";
import { formatHourMinute } from "@/lib/datetime";
import type { StatusAgendamento } from "@/types/database";

const barColorByStatus: Record<StatusAgendamento, string> = {
  agendado: "bg-blue",
  realizada: "bg-primary",
  falta: "bg-red",
  cancelado_com_aviso: "bg-white/20",
};

export function SessionRow({
  dataHora,
  status,
  alunoNome,
  planoResumo,
  onClick,
}: {
  dataHora: string;
  status: StatusAgendamento;
  alunoNome: string;
  planoResumo: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-touch w-full items-center gap-3 border-b border-border px-4 py-3 text-left"
    >
      <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-fg-muted">
        {formatHourMinute(new Date(dataHora))}
      </span>
      <span className={`h-10 w-1 shrink-0 rounded-full ${barColorByStatus[status]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{alunoNome}</p>
        <p className="truncate text-sm text-fg-muted">{planoResumo}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="flex size-9 items-center justify-center rounded-full border border-border text-primary opacity-50"
          title="Em breve"
        >
          <Check className="size-4" aria-hidden />
        </span>
        <span
          className="flex size-9 items-center justify-center rounded-full border border-border text-fg-muted opacity-50"
          title="Em breve"
        >
          <X className="size-4" aria-hidden />
        </span>
      </div>
    </button>
  );
}
