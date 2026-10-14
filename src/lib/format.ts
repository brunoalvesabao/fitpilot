import { TIME_ZONE } from "@/lib/datetime";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value == null) return "-";
  return currencyFormatter.format(value);
}

/** Formats a real timestamp (e.g. a timestamptz column) as a BR long date, in America/Sao_Paulo. */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: TIME_ZONE }).format(
    new Date(iso),
  );
}

export function maskPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.replace(/^(\d*)/, "($1");
  if (digits.length <= 6) {
    return digits.replace(/^(\d{2})(\d*)/, "($1) $2");
  }
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d*)/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function whatsappHref(telefone: string | null | undefined): string | null {
  const digits = telefone ? onlyDigits(telefone) : "";
  if (!digits) return null;
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

export function telHref(telefone: string | null | undefined): string | null {
  const digits = telefone ? onlyDigits(telefone) : "";
  if (!digits) return null;
  return `tel:${digits}`;
}

export function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function planoResumo(aluno: {
  valor_mensal: number | null;
  dia_vencimento: number | null;
  aulas_por_mes: number | null;
}): string {
  if (aluno.valor_mensal == null && aluno.dia_vencimento == null && aluno.aulas_por_mes == null) {
    return "Sem plano definido";
  }

  let line = "Mensal";
  if (aluno.valor_mensal != null) {
    line += ` ${formatCurrencyBRL(aluno.valor_mensal)}`;
  }
  if (aluno.dia_vencimento != null) {
    line += ` · vence dia ${aluno.dia_vencimento}`;
  } else if (aluno.aulas_por_mes != null) {
    line += ` · ${aluno.aulas_por_mes} aulas/mês`;
  }
  return line;
}

export function avatarColor(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 32%)`;
}
