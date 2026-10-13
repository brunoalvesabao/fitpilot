import { useState } from 'react';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import type { FinanceData, Goal, Debt, Income, Transaction } from '../../types';
import { Button, Card, PageHeader, SectionTitle, Stat } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { parsePlanilha, norm, type ParsedPlanilha, type RawSheet } from '../../lib/planilha';
import { makeCategoryId, makeIncomeSourceId, PALETTE } from '../../lib/defaults';
import { uid } from '../../lib/id';
import { money, sum } from '../../lib/format';

/** Aplica a planilha: substitui os dados financeiros DAQUELE ANO (pode reimportar sem duplicar). */
export function applyPlanilha(fin: FinanceData, p: ParsedPlanilha): FinanceData {
  const y = String(p.year);
  const now = new Date().toISOString();
  const categories = [...fin.categories];
  const catIdByName: Record<string, string> = Object.fromEntries(categories.map((c) => [norm(c.name), c.id]));
  for (const c of p.categories) {
    const k = norm(c.name);
    if (!catIdByName[k]) {
      const id = makeCategoryId(c.name);
      categories.push({ id, name: c.name, group: c.group });
      catIdByName[k] = id;
    } else {
      const i = categories.findIndex((x) => x.id === catIdByName[k]);
      categories[i] = { ...categories[i], group: c.group, archived: false };
    }
  }
  const incomeSources = [...fin.incomeSources];
  const srcIdByName: Record<string, string> = Object.fromEntries(incomeSources.map((s) => [norm(s.name), s.id]));
  for (const inc of p.incomes) {
    const k = norm(inc.source);
    if (!srcIdByName[k]) {
      const id = makeIncomeSourceId(inc.source);
      incomeSources.push({ id, name: inc.source });
      srcIdByName[k] = id;
    }
  }
  const mm = (m: number) => `${y}-${String(m).padStart(2, '0')}`;

  const budgets = { ...fin.budgets };
  for (let m = 1; m <= 12; m++) delete budgets[mm(m)];
  for (const b of p.budgets) budgets[mm(b.month)] = { ...(budgets[mm(b.month)] || {}), [catIdByName[norm(b.category)]]: b.amount };

  const incomes: Income[] = [
    ...fin.incomes.filter((i) => !i.month.startsWith(y)),
    ...p.incomes.map((i) => ({ id: uid(), month: mm(i.month), sourceId: srcIdByName[norm(i.source)], amount: i.amount, received: true })),
  ];

  const transactions: Transaction[] = [
    ...fin.transactions.filter((t) => !t.date.startsWith(y)),
    ...p.transactions.map((t) => ({
      id: uid(),
      createdAt: now,
      date: t.date,
      description: t.description,
      categoryId: catIdByName[norm(t.category)],
      amount: t.amount,
      paymentMethod: t.method,
      installment: t.total > 1 ? { n: t.n, total: t.total } : undefined,
    })),
  ];

  const goals: Goal[] = [...fin.goals];
  p.goals.forEach((g, i) => {
    const idx = goals.findIndex((x) => norm(x.name) === norm(g.name));
    const base = { name: g.name, reason: g.reason, target: g.target, deadline: g.deadline, where: g.where || undefined };
    if (idx >= 0) goals[idx] = { ...goals[idx], ...base };
    else goals.push({ id: uid(), ...base, initial: Math.max(g.initial, g.current), contributions: [], color: PALETTE[i % PALETTE.length], createdAt: now });
  });

  const debts: Debt[] = [...fin.debts];
  for (const d of p.debts) {
    const idx = debts.findIndex((x) => norm(x.creditor) === norm(d.creditor));
    const base = { ...d, interest: d.interest || undefined, cet: d.cet || undefined, reason: d.reason || undefined };
    if (idx >= 0) debts[idx] = { ...debts[idx], ...base };
    else debts.push({ id: uid(), createdAt: now, ...base });
  }

  const paymentMethods = Array.from(new Set([...fin.paymentMethods, ...p.paymentMethods]));

  return { ...fin, categories, incomeSources, budgets, incomes, transactions, goals, debts, paymentMethods };
}

export default function ImportScreen() {
  const { setFinance, toast } = useStore();
  const { navigate } = useNav();
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedPlanilha | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    setError('');
    setDone(false);
    setFileName(file.name);
    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const sheets = (await readXlsxFile(file)) as unknown as RawSheet[];
      setParsed(parsePlanilha(sheets));
    } catch (err) {
      console.error(err);
      setError('Não consegui ler esse arquivo. Ele precisa ser .xlsx (Excel).');
      setParsed(null);
    }
    setBusy(false);
  };

  const apply = () => {
    if (!parsed) return;
    setFinance((f) => applyPlanilha(f, parsed));
    setDone(true);
    toast(`Planilha ${parsed.year} importada!`);
  };

  return (
    <div>
      <PageHeader
        icon={FileSpreadsheet}
        title="Importar planilha"
        subtitle="Traga seu orçamento do Excel para o Atlas"
        actions={
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('system')}>
            Sistema
          </Button>
        }
      />

      <Card className="mb-6">
        <SectionTitle>1. Escolha o arquivo</SectionTitle>
        <p className="text-sm text-text-muted mb-4 max-w-2xl">
          Funciona com a sua planilha de orçamento familiar: lê <b>Receitas</b> e <b>Orçado</b> (aba ORÇAMENTO PESSOAL), os <b>lançamentos</b> das abas JAN a DEZ, as <b>Metas</b> e as <b>Dívidas</b>.
          O arquivo é lido aqui mesmo no seu aparelho — nada é enviado para servidor nenhum.
        </p>
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-outline-variant/30 rounded-3xl py-10 cursor-pointer hover:border-brand-primary/60 hover:bg-brand-primary/5 transition-colors">
          {busy ? <Loader2 className="animate-spin text-brand-primary" /> : <Upload className="text-brand-primary" />}
          <span className="font-display text-xs font-extrabold uppercase tracking-widest">{fileName || 'Selecionar .xlsx'}</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {error && <p className="text-sm text-rose-500 mt-3">{error}</p>}
      </Card>

      {parsed && (
        <Card>
          <SectionTitle>2. Confira e importe · ano {parsed.year}</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Stat label="Lançamentos" value={String(parsed.transactions.length)} sub={money(sum(parsed.transactions.map((t) => t.amount)))} />
            <Stat label="Receitas" value={String(parsed.incomes.length)} sub={money(sum(parsed.incomes.map((i) => i.amount)))} />
            <Stat label="Categorias" value={String(parsed.categories.length)} sub={`${parsed.budgets.length} valores orçados`} />
            <Stat label="Metas · Dívidas" value={`${parsed.goals.length} · ${parsed.debts.length}`} />
          </div>
          {parsed.warnings.length > 0 && (
            <ul className="text-xs text-amber-600 mb-4 list-disc pl-5">
              {parsed.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p className="text-sm text-text-muted mb-5">
            Isso <b>substitui</b> os lançamentos, receitas e orçados de {parsed.year} que já estiverem no Atlas (outros anos não mudam). Metas e dívidas com o mesmo nome são atualizadas. Pode importar de novo quantas vezes quiser sem duplicar.
          </p>
          {done ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                <CheckCircle2 size={18} /> Importado!
              </span>
              <Button variant="outline" onClick={() => navigate('fin-orcamento')}>
                Ver orçamento
              </Button>
              <Button variant="outline" onClick={() => navigate('fin-ano')}>
                Ver resumo do ano
              </Button>
            </div>
          ) : (
            <Button icon={Upload} onClick={apply}>
              Importar {parsed.year}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
