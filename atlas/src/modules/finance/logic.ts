import type { Bill, BillPayment, CategoryGroup, Debt, FinanceData, Goal, Transaction } from '../../types';
import { addMonths, currentMonth, dateInMonth, diffDays, monthOf, todayISO } from '../../lib/dates';
import { uid } from '../../lib/id';
import { sum } from '../../lib/format';

export const GROUPS: CategoryGroup[] = ['essencial', 'nao_essencial', 'investimento'];

export function txOfMonth(fin: FinanceData, month: string): Transaction[] {
  return fin.transactions.filter((t) => monthOf(t.date) === month);
}

export function realizedByCategory(fin: FinanceData, month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of fin.transactions) {
    if (monthOf(t.date) !== month) continue;
    out[t.categoryId] = (out[t.categoryId] || 0) + t.amount;
  }
  return out;
}

export function incomeTotal(fin: FinanceData, month: string): number {
  return sum(fin.incomes.filter((i) => i.month === month).map((i) => i.amount));
}

export function incomeBySource(fin: FinanceData, month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of fin.incomes) if (i.month === month) out[i.sourceId] = (out[i.sourceId] || 0) + i.amount;
  return out;
}

export function categoryGroupMap(fin: FinanceData): Record<string, CategoryGroup> {
  return Object.fromEntries(fin.categories.map((c) => [c.id, c.group]));
}

export interface MonthSummary {
  income: number;
  spent: number; // despesas (essencial + não essencial)
  invested: number;
  out: number; // tudo que saiu
  balance: number; // receitas - tudo que saiu
  budgeted: number;
  byGroup: Record<CategoryGroup, { budget: number; real: number }>;
}

export function monthSummary(fin: FinanceData, month: string): MonthSummary {
  const groupOf = categoryGroupMap(fin);
  const real = realizedByCategory(fin, month);
  const budget = fin.budgets[month] || {};
  const byGroup: MonthSummary['byGroup'] = {
    essencial: { budget: 0, real: 0 },
    nao_essencial: { budget: 0, real: 0 },
    investimento: { budget: 0, real: 0 },
  };
  for (const [cat, v] of Object.entries(real)) byGroup[groupOf[cat] || 'nao_essencial'].real += v;
  for (const [cat, v] of Object.entries(budget)) byGroup[groupOf[cat] || 'nao_essencial'].budget += v;
  const income = incomeTotal(fin, month);
  const spent = byGroup.essencial.real + byGroup.nao_essencial.real;
  const invested = byGroup.investimento.real;
  const out = spent + invested;
  return {
    income,
    spent,
    invested,
    out,
    balance: income - out,
    budgeted: byGroup.essencial.budget + byGroup.nao_essencial.budget + byGroup.investimento.budget,
    byGroup,
  };
}

/** Cria 1 lançamento, ou N parcelas (uma por mês) quando total > 1. */
export function buildTransactions(base: Omit<Transaction, 'id' | 'createdAt' | 'installment'>, installments: number, startN = 1): Transaction[] {
  const now = new Date().toISOString();
  if (installments <= 1) return [{ ...base, id: uid(), createdAt: now }];
  const groupId = uid();
  const [y, m, d] = base.date.split('-').map(Number);
  const out: Transaction[] = [];
  for (let n = startN; n <= installments; n++) {
    const month = addMonths(`${y}-${String(m).padStart(2, '0')}`, n - startN);
    out.push({ ...base, id: uid(), createdAt: now, date: dateInMonth(month, d), installment: { n, total: installments, groupId } });
  }
  return out;
}

// ------------------------------------------------------------------
// Contas a pagar
// ------------------------------------------------------------------
export function billActiveIn(bill: Bill, month: string): boolean {
  if (bill.archived) return false;
  if (month < bill.startMonth) return false;
  if (bill.endMonth && month > bill.endMonth) return false;
  return true;
}

export type BillState = 'pago' | 'atrasado' | 'hoje' | 'proximo' | 'aberto';

export interface BillView {
  bill: Bill;
  due: string;
  payment?: BillPayment;
  state: BillState;
  daysLeft: number;
}

export function billsOfMonth(fin: FinanceData, month: string): BillView[] {
  const today = todayISO();
  return fin.bills
    .filter((b) => billActiveIn(b, month))
    .map((bill) => {
      const due = dateInMonth(month, bill.dueDay);
      const payment = fin.billPayments[month]?.[bill.id];
      const daysLeft = diffDays(today, due);
      let state: BillState = 'aberto';
      if (payment?.paid) state = 'pago';
      else if (daysLeft < 0) state = 'atrasado';
      else if (daysLeft === 0) state = 'hoje';
      else if (daysLeft <= 5) state = 'proximo';
      return { bill, due, payment, state, daysLeft };
    })
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Contas pendentes do mês atual + atrasadas do mês anterior. */
export function upcomingBills(fin: FinanceData, horizonDays = 7): BillView[] {
  const m = currentMonth();
  const list = [...billsOfMonth(fin, addMonths(m, -1)), ...billsOfMonth(fin, m), ...billsOfMonth(fin, addMonths(m, 1))];
  return list.filter((v) => v.state !== 'pago' && v.daysLeft <= horizonDays && v.daysLeft >= -40);
}

export function payBill(fin: FinanceData, month: string, bill: Bill, amount: number, date: string): FinanceData {
  const tx: Transaction = {
    id: uid(),
    createdAt: new Date().toISOString(),
    date,
    description: bill.name,
    categoryId: bill.categoryId,
    amount,
    paymentMethod: bill.paymentMethod,
    billId: bill.id,
  };
  return {
    ...fin,
    transactions: [...fin.transactions, tx],
    billPayments: {
      ...fin.billPayments,
      [month]: { ...(fin.billPayments[month] || {}), [bill.id]: { paid: true, amount, date, txId: tx.id } },
    },
  };
}

export function unpayBill(fin: FinanceData, month: string, billId: string): FinanceData {
  const p = fin.billPayments[month]?.[billId];
  const monthPayments = { ...(fin.billPayments[month] || {}) };
  delete monthPayments[billId];
  return {
    ...fin,
    transactions: p?.txId ? fin.transactions.filter((t) => t.id !== p.txId) : fin.transactions,
    billPayments: { ...fin.billPayments, [month]: monthPayments },
  };
}

// ------------------------------------------------------------------
// Metas e dívidas
// ------------------------------------------------------------------
export function goalCurrent(g: Goal): number {
  return g.initial + sum(g.contributions.map((c) => c.amount));
}

export function goalMonthsLeft(g: Goal): number {
  return Math.max(0, diffDays(todayISO(), g.deadline) / 30);
}

export function goalHorizon(g: Goal): 'Curto prazo' | 'Médio prazo' | 'Longo prazo' {
  const years = diffDays(todayISO(), g.deadline) / 365;
  if (years <= 2) return 'Curto prazo';
  if (years <= 5) return 'Médio prazo';
  return 'Longo prazo';
}

export function goalMonthly(g: Goal): number {
  const left = g.target - goalCurrent(g);
  if (left <= 0) return 0;
  const months = goalMonthsLeft(g);
  return months < 1 ? left : left / months;
}

export function debtRemainingInstallments(d: Debt): number {
  return Math.max(0, d.totalInstallments - d.currentInstallment + 1);
}

export function debtRemaining(d: Debt): number {
  return d.installmentValue * debtRemainingInstallments(d);
}

// ------------------------------------------------------------------
// Sugestões rápidas
// ------------------------------------------------------------------
export function recentCategories(fin: FinanceData, limit = 8): string[] {
  const counts: Record<string, number> = {};
  const recent = [...fin.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 120);
  for (const t of recent) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => fin.categories.some((c) => c.id === id && !c.archived))
    .slice(0, limit);
}

/** Sugere a categoria a partir de lançamentos anteriores com a mesma descrição. */
export function guessCategory(fin: FinanceData, description: string): string | undefined {
  const d = description.trim().toLowerCase();
  if (d.length < 3) return undefined;
  const match = [...fin.transactions].reverse().find((t) => t.description.trim().toLowerCase() === d);
  if (match) return match.categoryId;
  const cat = fin.categories.find((c) => c.name.toLowerCase() === d);
  return cat?.id;
}
