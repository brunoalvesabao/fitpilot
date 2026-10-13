const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const money = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const moneyCompact = (v: number) => (Math.abs(v) < 10000 ? money(v) : brlCompact.format(v));
export const number = (v: number) => num.format(v);
export const pct = (v: number, digits = 0) => `${(Number.isFinite(v) ? v * 100 : 0).toFixed(digits)}%`;

/** Converte "1.234,56" / "1234.56" / "1234,5" em número. */
export function parseMoney(input: string): number {
  if (!input) return 0;
  let s = input.replace(/[^\d,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Formata valor para exibição em input editável ("1234,56"). */
export function moneyInput(v: number): string {
  if (!v) return '';
  return v.toFixed(2).replace('.', ',');
}

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
