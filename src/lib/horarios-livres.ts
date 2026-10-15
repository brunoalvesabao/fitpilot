import { spDateTimeToUtc, formatHourMinute } from "@/lib/datetime";

export type SlotLivre = {
  inicioISO: string;
  inicioLabel: string; // "HH:mm"
  fimLabel: string; // "HH:mm"
  minutos: number;
};

const HORA_INICIO_PADRAO = 6; // 06:00
const HORA_FIM_PADRAO = 21; // 21:00
const DURACAO_MINIMA_MIN = 30;

/**
 * Calcula os intervalos livres de um dia dentro do horário de trabalho
 * padrão (06:00–21:00), considerando os agendamentos já existentes.
 * Puro e determinístico de propósito (não depende da hora atual) para
 * poder ser calculado tanto no servidor quanto no cliente sem divergir.
 */
export function calcularSlotsLivres(
  dataKey: string, // "YYYY-MM-DD"
  sessoes: { dataHora: string; duracaoMin: number }[],
): SlotLivre[] {
  const [year, month, day] = dataKey.split("-").map(Number);
  const inicioJanela = spDateTimeToUtc(year, month, day, HORA_INICIO_PADRAO, 0).getTime();
  const fimJanela = spDateTimeToUtc(year, month, day, HORA_FIM_PADRAO, 0).getTime();

  if (inicioJanela >= fimJanela) return [];

  const ocupados = sessoes
    .map((s) => {
      const inicio = new Date(s.dataHora).getTime();
      return { inicio, fim: inicio + s.duracaoMin * 60_000 };
    })
    .sort((a, b) => a.inicio - b.inicio);

  const livres: SlotLivre[] = [];
  let cursor = inicioJanela;

  function adicionarSeRelevante(inicioMs: number, fimMs: number) {
    const minutos = (fimMs - inicioMs) / 60_000;
    if (minutos < DURACAO_MINIMA_MIN) return;
    livres.push({
      inicioISO: new Date(inicioMs).toISOString(),
      inicioLabel: formatHourMinute(new Date(inicioMs)),
      fimLabel: formatHourMinute(new Date(fimMs)),
      minutos,
    });
  }

  for (const ocupado of ocupados) {
    if (ocupado.fim <= cursor || ocupado.inicio >= fimJanela) continue;
    if (ocupado.inicio > cursor) {
      adicionarSeRelevante(cursor, Math.min(ocupado.inicio, fimJanela));
    }
    cursor = Math.max(cursor, Math.min(ocupado.fim, fimJanela));
  }

  if (cursor < fimJanela) {
    adicionarSeRelevante(cursor, fimJanela);
  }

  return livres;
}
