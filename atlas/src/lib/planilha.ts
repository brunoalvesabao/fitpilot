/**
 * Leitor da planilha "ORÇAMENTO FAMÍLIA" (.xlsx) para importar no Atlas.
 * Procura as seções pelos rótulos (RECEITAS, ESSENCIAL, NÃO ESSENCIAL, INVESTIMENTOS, abas JAN..DEZ,
 * METAS, DÍVIDAS) em vez de células fixas, então tolera linhas/colunas extras.
 * Sem dependências: recebe as abas já lidas (matriz de células).
 */
import type { CategoryGroup } from '../types';

export type Cell = string | number | boolean | Date | null | undefined;
export interface RawSheet {
  sheet: string;
  data: Cell[][];
}

export interface ParsedPlanilha {
  year: number;
  incomes: { source: string; month: number; amount: number }[];
  categories: { name: string; group: CategoryGroup }[];
  budgets: { category: string; month: number; amount: number }[];
  transactions: { date: string; description: string; category: string; method: string; n: number; total: number; amount: number }[];
  goals: { name: string; reason: string; target: number; deadline: string; initial: number; current: number; where: string }[];
  debts: { creditor: string; startDate: string; initialValue: number; installmentValue: number; totalInstallments: number; currentInstallment: number; interest: number; cet: number; reason: string }[];
  paymentMethods: string[];
  warnings: string[];
}

const MONTH_NAMES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTH_SHEETS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export const norm = (v: Cell): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const text = (v: Cell): string => (v instanceof Date ? '' : String(v ?? '').replace(/\s+/g, ' ').trim());

const toNumber = (v: Cell): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    let s = v.replace(/[^\d,.-]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const pad = (n: number) => String(n).padStart(2, '0');

function toISO(v: Cell): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    // datas do Excel chegam em UTC à meia-noite
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      return `${y}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

function findSheet(sheets: RawSheet[], ...names: string[]): RawSheet | undefined {
  const wanted = names.map(norm);
  return sheets.find((s) => wanted.includes(norm(s.sheet)));
}

/** Acha a primeira célula cujo texto normalizado satisfaz o teste. */
function findCell(rows: Cell[][], test: (s: string) => boolean, fromRow = 0): { r: number; c: number } | null {
  for (let r = fromRow; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) if (test(norm(row[c]))) return { r, c };
  }
  return null;
}

/** Colunas de cada mês (Janeiro..Dezembro) na linha de cabeçalho. */
function monthColumns(row: Cell[]): number[] {
  const cols: number[] = [];
  MONTH_NAMES.forEach((m, i) => {
    const c = row.findIndex((v) => norm(v) === m);
    cols[i] = c;
  });
  return cols;
}

const SECTION_HEADERS: { key: string; group?: CategoryGroup }[] = [
  { key: 'receitas' },
  { key: 'essencial', group: 'essencial' },
  { key: 'nao essencial', group: 'nao_essencial' },
  { key: 'investimentos', group: 'investimento' },
];

const isHeaderRow = (row: Cell[]) => row.some((v) => norm(v) === 'janeiro');

export function parsePlanilha(sheets: RawSheet[]): ParsedPlanilha {
  const out: ParsedPlanilha = { year: new Date().getFullYear(), incomes: [], categories: [], budgets: [], transactions: [], goals: [], debts: [], paymentMethods: [], warnings: [] };

  // ---------------- Lançamentos mensais (abas JAN..DEZ) — também definem o ano
  const years: Record<number, number> = {};
  const methods = new Set<string>();
  MONTH_SHEETS.forEach((name, mi) => {
    const sh = findSheet(sheets, name);
    if (!sh) return;
    const rows = sh.data;
    const head = findCell(rows, (s) => s.startsWith('data'));
    if (!head) return;
    const hr = rows[head.r] || [];
    const col = (prefix: string, fallback: number) => {
      const i = hr.findIndex((v, idx) => idx >= head.c && norm(v).startsWith(prefix));
      return i >= 0 ? i : fallback;
    };
    const cDate = head.c;
    const cDesc = col('estabelecimento', head.c + 1);
    const cCat = col('categoria', head.c + 2);
    const cMethod = col('forma de pagamento', head.c + 3);
    const cN = col('n', head.c + 4);
    const cTotal = col('qtde parcelas', head.c + 5);
    const cValue = col('valor parcela', head.c + 6);
    for (let r = head.r + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const date = toISO(row[cDate]);
      const desc = text(row[cDesc]);
      const cat = text(row[cCat]);
      const amount = toNumber(row[cValue]);
      if (!date && !desc && !amount) continue;
      if (!amount || !cat) continue;
      const iso = date || `${out.year}-${pad(mi + 1)}-01`;
      const y = Number(iso.slice(0, 4));
      years[y] = (years[y] || 0) + 1;
      const method = text(row[cMethod]) || 'PIX';
      methods.add(method);
      out.transactions.push({
        date: iso,
        description: desc || cat,
        category: cat,
        method,
        n: Math.max(1, Math.round(toNumber(row[cN])) || 1),
        total: Math.max(1, Math.round(toNumber(row[cTotal])) || 1),
        amount: Math.round(amount * 100) / 100,
      });
    }
  });
  const bestYear = Object.entries(years).sort((a, b) => b[1] - a[1])[0];
  if (bestYear) out.year = Number(bestYear[0]);
  out.paymentMethods = Array.from(methods);

  // ---------------- ORÇAMENTO PESSOAL: receitas, categorias e orçado
  const orc = findSheet(sheets, 'ORÇAMENTO PESSOAL', 'ORCAMENTO PESSOAL', 'ORÇAMENTO');
  if (orc) {
    const rows = orc.data;
    for (const section of SECTION_HEADERS) {
      const head = findCell(rows, (s) => s === section.key);
      if (!head) {
        out.warnings.push(`Seção "${section.key.toUpperCase()}" não encontrada no ORÇAMENTO PESSOAL.`);
        continue;
      }
      const cols = monthColumns(rows[head.r] || []);
      for (let r = head.r + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const label = text(row[head.c]);
        const n = norm(label);
        if (!label) {
          // linha "Orçado / Realizado / Saldo" logo abaixo do cabeçalho
          if (row.some((v) => norm(v) === 'orcado')) continue;
          continue;
        }
        if (isHeaderRow(row) || n === 'total' || n.startsWith('sobra')) break;
        if (!section.group && n === 'receitas') break; // linha de total das receitas
        if (section.group) {
          if (!out.categories.some((c) => norm(c.name) === n)) out.categories.push({ name: label, group: section.group });
        }
        cols.forEach((c, mi) => {
          if (c < 0) return;
          const v = toNumber(row[c]);
          if (!v) return;
          if (section.group) out.budgets.push({ category: label, month: mi + 1, amount: Math.round(v * 100) / 100 });
          else out.incomes.push({ source: label, month: mi + 1, amount: Math.round(v * 100) / 100 });
        });
      }
    }
  } else {
    out.warnings.push('Aba "ORÇAMENTO PESSOAL" não encontrada.');
  }

  // Categorias usadas nos lançamentos e que não estão no orçamento
  for (const t of out.transactions) {
    if (!out.categories.some((c) => norm(c.name) === norm(t.category))) out.categories.push({ name: t.category, group: 'nao_essencial' });
  }

  // ---------------- METAS
  const metas = findSheet(sheets, 'METAS');
  if (metas) {
    const rows = metas.data;
    const head = findCell(rows, (s) => s === 'metas');
    if (head) {
      const hr = rows[head.r] || [];
      const col = (name: string) => hr.findIndex((v) => norm(v) === name);
      const cReason = col('motivo');
      const cValue = col('valor');
      const cWhen = col('quando');
      const cInitial = col('valor inicial');
      const cWhere = col('onde');
      const cCurrent = col('valor atual');
      for (let r = head.r + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const name = text(row[head.c]);
        if (!name) {
          if (r > head.r + 1) break;
          continue;
        }
        const target = toNumber(row[cValue]);
        if (!target) continue;
        out.goals.push({
          name,
          reason: text(row[cReason]) || 'OUTRO',
          target,
          deadline: toISO(row[cWhen]) || `${out.year + 1}-12-01`,
          initial: toNumber(row[cInitial]),
          current: toNumber(row[cCurrent]),
          where: text(row[cWhere]),
        });
      }
    }
  }

  // ---------------- DÍVIDAS
  const div = findSheet(sheets, 'DÍVIDAS', 'DIVIDAS');
  if (div) {
    const rows = div.data;
    const head = findCell(rows, (s) => s === 'credor');
    if (head) {
      const hr = rows[head.r] || [];
      const col = (prefix: string) => hr.findIndex((v) => norm(v).startsWith(prefix));
      for (let r = head.r + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const creditor = text(row[head.c]);
        if (!creditor || norm(creditor) === 'total') continue;
        out.debts.push({
          creditor,
          startDate: toISO(row[col('data inicial')]) || `${out.year}-01-01`,
          initialValue: toNumber(row[col('valor inicial')]),
          installmentValue: toNumber(row[col('valor parcela')]),
          totalInstallments: Math.max(1, Math.round(toNumber(row[col('n')])) || 1),
          currentInstallment: Math.max(1, Math.round(toNumber(row[col('parcela atual')])) || 1),
          interest: toNumber(row[col('juros')]),
          cet: toNumber(row[col('cet')]),
          reason: text(row[col('motivo')]),
        });
      }
    }
  }

  return out;
}
