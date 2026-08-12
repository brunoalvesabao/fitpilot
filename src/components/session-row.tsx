import { Check, X } from "lucide-react";
import { formatHourMinute } from "@/lib/datetime";
import type { StatusAgendamento } from "@/types/database";

export const statusBarColor: Record<StatusAgendamento, string> = {
  agendado: "bg-white/20",
  realizada: "bg-primary",
  falta: "bg-red",
  cancelado_com_aviso: "bg-blue",
};

export function SessionRow({
  dataHora,
  status,
  alunoNome,
  planoResumo,
  onClick,
  onCheck,
  onFalta,
}: {
  dataHora: string;
  status: StatusAgendamento;
  alunoNome: string;
  planoResumo: string;
  onClick?: () => void;
  onCheck?: () => void;
  onFalta?: () => void;
}) {
  const realizada = status === "realizada";
  const marcouFalta = status === "falta";
  const marcouCancelado = status === "cancelado_com_aviso";

  return (
    <div
      className={`flex min-h-touch w-full items-center gap-3 border-b border-border ${
        realizada ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
      >
        <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-fg-muted">
          {formatHourMinute(new Date(dataHora))}
        </span>
        <span
          className={`h-10 w-1 shrink-0 rounded-full ${statusBarColor[status]}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{alunoNome}</p>
          <p className="truncate text-sm text-fg-muted">{planoResumo}</p>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-2 pr-4">
        <button
          type="button"
          onClick={onCheck}
          aria-label={realizada ? "Desfazer check-in" : "Marcar como realizada"}
          aria-pressed={realizada}
          className={`flex size-9 items-center justify-center rounded-full border ${
            realizada
              ? "border-primary bg-primary text-bg"
              : "border-border text-primary"
          }`}
        >
          <Check className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onFalta}
          aria-label={
            marcouFalta || marcouCancelado ? "Desfazer" : "Registrar falta ou cancelamento"
          }
          aria-pressed={marcouFalta || marcouCancelado}
          className={`flex size-9 items-center justify-center rounded-full border ${
            marcouFalta
              ? "border-red bg-red text-white"
              : marcouCancelado
                ? "border-blue bg-blue text-white"
                : "border-border text-fg-muted"
          }`}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
