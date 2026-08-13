export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function diaVencimentoEfetivo(diaVencimento: number, year: number, month: number): number {
  return Math.min(diaVencimento, lastDayOfMonth(year, month));
}

export function competenciaStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export type StatusCobranca = "pago" | "pendente" | "atrasado";

export function classificarCobranca({
  hoje,
  diaVencimento,
  ano,
  mes,
  pago,
}: {
  hoje: { year: number; month: number; day: number };
  diaVencimento: number | null;
  ano: number;
  mes: number;
  pago: boolean;
}): { status: StatusCobranca; diasAtraso: number } {
  if (pago) return { status: "pago", diasAtraso: 0 };
  if (diaVencimento == null) return { status: "pendente", diasAtraso: 0 };

  const diaEfetivo = diaVencimentoEfetivo(diaVencimento, ano, mes);
  const hojeUtc = Date.UTC(hoje.year, hoje.month - 1, hoje.day);
  const vencimentoUtc = Date.UTC(ano, mes - 1, diaEfetivo);
  const diasAtraso = Math.round((hojeUtc - vencimentoUtc) / 86_400_000);

  if (diasAtraso > 0) return { status: "atrasado", diasAtraso };
  return { status: "pendente", diasAtraso: 0 };
}
