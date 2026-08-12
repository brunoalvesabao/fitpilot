import type { DiaSemana } from "@/types/database";

// Brazil has had no DST since 2019, so America/Sao_Paulo is a fixed UTC-3.
export const TIME_ZONE = "America/Sao_Paulo";
const SP_OFFSET_HOURS = 3;

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export type DateParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function spParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // "24" shows up as "24" not "00" from Intl with hour12:false in some engines; normalize.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function spWeekday(date: Date): DiaSemana {
  const { year, month, day } = spParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as DiaSemana;
}

export function spDayKey(date: Date): string {
  const { year, month, day } = spParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** UTC instant corresponding to SP-local midnight of `date`, plus `offsetDays`. */
export function startOfSpDay(date: Date, offsetDays = 0): Date {
  const { year, month, day } = spParts(date);
  return new Date(Date.UTC(year, month - 1, day + offsetDays, SP_OFFSET_HOURS, 0, 0, 0));
}

/** UTC instant corresponding to SP-local midnight of the 1st of `date`'s month, plus `monthOffset`. */
export function startOfSpMonth(date: Date, monthOffset = 0): Date {
  const { year, month } = spParts(date);
  return new Date(Date.UTC(year, month - 1 + monthOffset, 1, SP_OFFSET_HOURS, 0, 0, 0));
}

/** UTC instant for a given SP-local wall-clock date and time. */
export function spDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + SP_OFFSET_HOURS, minute, 0, 0));
}

/** Formats a plain "YYYY-MM-DD" value without any timezone conversion. */
export function formatIsoDatePtBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`;
}

export function formatDatePtBRExtenso(date: Date): string {
  const { day, month } = spParts(date);
  const weekday = spWeekday(date);
  return `${WEEKDAY_NAMES[weekday]}, ${day} de ${MONTH_NAMES[month - 1]}`;
}

export function formatHourMinute(date: Date): string {
  const { hour, minute } = spParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function greeting(date: Date): string {
  const { hour } = spParts(date);
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function firstName(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto;
}
