import { useMemo, useState } from 'react';
import { Archive, Copy, PieChart, Plus, Settings2 } from 'lucide-react';
import type { CategoryGroup, FinCategory } from '../../types';
import { Button, Card, Field, IconButton, Modal, MonthSwitcher, PageHeader, ProgressBar, SectionTitle, Segmented, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { addMonths, currentMonth, monthLabel } from '../../lib/dates';
import { money, moneyInput, parseMoney, pct, sum } from '../../lib/format';
import { GROUP_META, makeCategoryId, makeIncomeSourceId } from '../../lib/defaults';
import { GROUPS, incomeBySource, monthSummary, realizedByCategory } from './logic';
import { MoneyField } from './TransactionForm';
import { uid } from '../../lib/id';

export default function OrcamentoScreen() {
  const { data, setFinance, toast } = useStore();
  const fin = data.finance;
  const [month, setMonth] = useState(currentMonth());
  const [editCat, setEditCat] = useState<FinCategory | null>(null);
  const [editSource, setEditSource] = useState<{ id: string; name: string } | null>(null);
  const [newCatGroup, setNewCatGroup] = useState<CategoryGroup | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);

  const summary = useMemo(() => monthSummary(fin, month), [fin, month]);
  const real = useMemo(() => realizedByCategory(fin, month), [fin, month]);
  const budget = fin.budgets[month] || {};
  const incomeBy = useMemo(() => incomeBySource(fin, month), [fin, month]);
  const prevMonth = addMonths(month, -1);
  const hasPrevBudget = Object.keys(fin.budgets[prevMonth] || {}).length > 0;

  const copyPrevious = () => {
    setFinance((f) => ({ ...f, budgets: { ...f.budgets, [month]: { ...(f.budgets[prevMonth] || {}) } } }));
    toast(`Orçamento copiado de ${monthLabel(prevMonth)}.`);
  };

  const income = summary.income;
  const sobra = income - summary.budgeted;

  return (
    <div>
      <PageHeader
        icon={PieChart}
        title="Orçamento"
        subtitle="Orçado × realizado, como na planilha"
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
          </>
        }
      />

      {/* Resumo + 50/30/20 */}
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 mb-6">
        <Card strong className="relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full brand-gradient opacity-10 blur-2xl" />
          <p className="label">Resultado do mês</p>
          <p className={cx('money text-4xl font-semibold', summary.balance >= 0 ? 'text-text-high' : 'text-rose-500')}>{money(summary.balance)}</p>
          <p className="text-sm text-text-muted mt-1">
            Receitas {money(income)} − saídas {money(summary.out)}
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div>
              <p className="label !mb-0.5">Orçado</p>
              <p className="money text-sm font-semibold">{money(summary.budgeted)}</p>
            </div>
            <div>
              <p className="label !mb-0.5">Realizado</p>
              <p className="money text-sm font-semibold">{money(summary.out)}</p>
            </div>
            <div>
              <p className="label !mb-0.5">Sobra prevista</p>
              <p className={cx('money text-sm font-semibold', sobra >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{money(sobra)}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {hasPrevBudget && (
              <Button size="sm" variant="outline" icon={Copy} onClick={copyPrevious}>
                Copiar orçado de {monthLabel(prevMonth, true)}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setHideEmpty(!hideEmpty)}>
              {hideEmpty ? 'Mostrar todas' : 'Ocultar zeradas'}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle right={<IconButton icon={Settings2} title="Ajustar regra" onClick={() => setRuleOpen(true)} />}>
            Método {fin.rule.essencial}/{fin.rule.nao_essencial}/{fin.rule.investimento}
          </SectionTitle>
          <div className="space-y-4">
            {GROUPS.map((g) => {
              const ideal = fin.rule[g] / 100;
              const actual = income ? summary.byGroup[g].real / income : 0;
              const planned = income ? summary.byGroup[g].budget / income : 0;
              const bad = g === 'investimento' ? actual < ideal : actual > ideal;
              return (
                <div key={g}>
                  <div className="flex items-baseline justify-between text-sm mb-1.5">
                    <span className="font-semibold" style={{ color: GROUP_META[g].color }}>
                      {GROUP_META[g].label}
                    </span>
                    <span className="text-xs text-text-muted">
                      real <b className={cx('money', bad ? 'text-rose-500' : 'text-emerald-500')}>{pct(actual, 1)}</b> · orçado {pct(planned, 1)} · ideal {pct(ideal)}
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-bg-surface-high overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, actual * 100)}%`, background: GROUP_META[g].color }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-text-high/70" style={{ left: `${Math.min(100, ideal * 100)}%` }} title="Ideal" />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Ideal: até {money(income * ideal)} {g === 'investimento' && '(mínimo)'} · realizado {money(summary.byGroup[g].real)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Receitas */}
      <Card className="mb-6">
        <SectionTitle
          right={
            <Button size="sm" variant="soft" icon={Plus} onClick={() => setEditSource({ id: '', name: '' })}>
              Fonte
            </Button>
          }
        >
          Receitas · {money(income)}
        </SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {fin.incomeSources
            .filter((s) => !s.archived)
            .filter((s) => !hideEmpty || incomeBy[s.id])
            .map((s) => (
              <IncomeRow key={s.id} name={s.name} value={incomeBy[s.id] || 0} onRename={() => setEditSource(s)} onSet={(v) => {
                setFinance((f) => {
                  const others = f.incomes.filter((i) => !(i.month === month && i.sourceId === s.id));
                  return { ...f, incomes: v > 0 ? [...others, { id: uid(), month, sourceId: s.id, amount: v, received: true }] : others };
                });
              }} />
            ))}
        </div>
      </Card>

      {/* Grupos de despesas */}
      <div className="space-y-6">
        {GROUPS.map((g) => {
          const cats = fin.categories.filter((c) => c.group === g && !c.archived).filter((c) => !hideEmpty || budget[c.id] || real[c.id]);
          const tBudget = sum(cats.map((c) => budget[c.id] || 0));
          const tReal = sum(cats.map((c) => real[c.id] || 0));
          return (
            <Card key={g}>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: GROUP_META[g].color }} />
                  <h2 className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em]">{GROUP_META[g].label}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-muted">
                    <span className="money text-text-high font-semibold">{money(tReal)}</span> de <span className="money">{money(tBudget)}</span>
                  </span>
                  <span className={cx('money font-semibold', tBudget - tReal >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                    saldo {money(tBudget - tReal)}
                  </span>
                  <IconButton icon={Plus} title="Nova categoria" onClick={() => setNewCatGroup(g)} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-1">
                {cats.map((c) => {
                  const b = budget[c.id] || 0;
                  const r = real[c.id] || 0;
                  const over = b > 0 ? r > b : r > 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEditCat(c)}
                      className="text-left py-2.5 px-2 -mx-2 rounded-xl hover:bg-bg-surface-med transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium truncate">{c.name}</span>
                        <span className="text-xs whitespace-nowrap">
                          <span className={cx('money font-semibold', over ? 'text-rose-500' : 'text-text-high')}>{money(r)}</span>
                          <span className="text-text-muted"> / {money(b)}</span>
                        </span>
                      </div>
                      <ProgressBar value={b ? r / b : r ? 1 : 0} over={over} color={GROUP_META[g].color} className="!h-1.5" />
                    </button>
                  );
                })}
                {cats.length === 0 && <p className="text-sm text-text-muted py-2">Nenhuma categoria{hideEmpty ? ' com valores' : ''}.</p>}
              </div>
            </Card>
          );
        })}
      </div>

      <CategoryModal
        cat={editCat}
        month={month}
        onClose={() => setEditCat(null)}
        budgetValue={editCat ? budget[editCat.id] || 0 : 0}
        realValue={editCat ? real[editCat.id] || 0 : 0}
      />
      <NewCategoryModal group={newCatGroup} onClose={() => setNewCatGroup(null)} />
      <SourceModal source={editSource} onClose={() => setEditSource(null)} />
      <RuleModal open={ruleOpen} onClose={() => setRuleOpen(false)} />
    </div>
  );
}

function IncomeRow({ name, value, onSet, onRename }: { name: string; value: number; onSet: (v: number) => void; onRename: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="tile flex items-center gap-2 px-3 py-2">
      <button type="button" onClick={onRename} className="flex-1 text-sm text-left truncate text-text-mid hover:text-text-high">
        {name}
      </button>
      <input
        inputMode="decimal"
        className={cx('w-28 bg-transparent text-right money text-sm outline-none rounded-lg px-2 py-1 focus:bg-bg-surface-low', value ? 'text-emerald-500' : 'text-text-muted')}
        value={draft ?? (value ? moneyInput(value) : '')}
        placeholder="0,00"
        onFocus={() => setDraft(value ? moneyInput(value) : '')}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d,.]/g, ''))}
        onBlur={() => {
          if (draft !== null) {
            const v = parseMoney(draft);
            if (v !== value) onSet(v);
          }
          setDraft(null);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

function CategoryModal({ cat, month, onClose, budgetValue, realValue }: { cat: FinCategory | null; month: string; onClose: () => void; budgetValue: number; realValue: number }) {
  const { setFinance, toast } = useStore();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState<CategoryGroup>('essencial');
  const [applyNext, setApplyNext] = useState(false);
  const [lastKey, setLastKey] = useState('');
  const key = cat ? `${cat.id}-${month}` : '';
  if (cat && key !== lastKey) {
    setLastKey(key);
    setAmount(moneyInput(budgetValue));
    setName(cat.name);
    setGroup(cat.group);
    setApplyNext(false);
  }
  if (!cat) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };

  const save = () => {
    const v = parseMoney(amount);
    setFinance((f) => {
      const budgets = { ...f.budgets };
      const months = [month];
      if (applyNext) {
        const [y, m] = month.split('-').map(Number);
        for (let i = m + 1; i <= 12; i++) months.push(`${y}-${String(i).padStart(2, '0')}`);
      }
      for (const mm of months) budgets[mm] = { ...(budgets[mm] || {}), [cat.id]: v };
      return {
        ...f,
        budgets,
        categories: f.categories.map((c) => (c.id === cat.id ? { ...c, name: name.trim() || c.name, group } : c)),
      };
    });
    toast('Orçamento salvo.');
    close();
  };

  const archive = () => {
    setFinance((f) => ({ ...f, categories: f.categories.map((c) => (c.id === cat.id ? { ...c, archived: true } : c)) }));
    toast('Categoria arquivada (o histórico continua).');
    close();
  };

  return (
    <Modal
      open={!!cat}
      onClose={close}
      title={cat.name}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="ghost" size="sm" icon={Archive} onClick={archive}>
            Arquivar
          </Button>
          <div className="flex-1" />
          <Button onClick={save}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="tile p-4 flex justify-between text-sm">
          <span className="text-text-muted">Realizado em {monthLabel(month)}</span>
          <span className="money font-semibold">{money(realValue)}</span>
        </div>
        <Field label={`Orçado para ${monthLabel(month)}`}>
          <MoneyField value={amount} onChange={setAmount} autoFocus />
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-mid">
          <input type="checkbox" checked={applyNext} onChange={(e) => setApplyNext(e.target.checked)} className="accent-[var(--brand-primary)] w-4 h-4" />
          Aplicar também aos meses seguintes do ano
        </label>
        <Field label="Nome">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Grupo">
          <Segmented
            value={group}
            onChange={setGroup}
            options={GROUPS.map((g) => ({ value: g, label: GROUP_META[g].short }))}
          />
        </Field>
      </div>
    </Modal>
  );
}

function NewCategoryModal({ group, onClose }: { group: CategoryGroup | null; onClose: () => void }) {
  const { setFinance, toast } = useStore();
  const [name, setName] = useState('');
  if (!group) return null;
  const save = () => {
    const n = name.trim();
    if (!n) return;
    setFinance((f) => {
      let id = makeCategoryId(n);
      if (f.categories.some((c) => c.id === id)) id = `${id}-${uid().slice(0, 4)}`;
      return { ...f, categories: [...f.categories, { id, name: n, group }] };
    });
    toast('Categoria criada.');
    setName('');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Nova categoria · ${GROUP_META[group].label}`} footer={<Button onClick={save}>Criar</Button>}>
      <Field label="Nome">
        <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </Field>
    </Modal>
  );
}

function SourceModal({ source, onClose }: { source: { id: string; name: string } | null; onClose: () => void }) {
  const { setFinance, toast } = useStore();
  const [name, setName] = useState('');
  const [lastId, setLastId] = useState<string | null>(null);
  if (source && source.id !== lastId) {
    setLastId(source.id);
    setName(source.name);
  }
  if (!source) return null;
  const close = () => {
    setLastId(null);
    onClose();
  };
  const save = () => {
    const n = name.trim();
    if (!n) return;
    setFinance((f) =>
      source.id
        ? { ...f, incomeSources: f.incomeSources.map((s) => (s.id === source.id ? { ...s, name: n } : s)) }
        : { ...f, incomeSources: [...f.incomeSources, { id: f.incomeSources.some((s) => s.id === makeIncomeSourceId(n)) ? uid() : makeIncomeSourceId(n), name: n }] },
    );
    toast('Fonte de receita salva.');
    close();
  };
  const archive = () => {
    setFinance((f) => ({ ...f, incomeSources: f.incomeSources.map((s) => (s.id === source.id ? { ...s, archived: true } : s)) }));
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={source.id ? 'Fonte de receita' : 'Nova fonte de receita'}
      footer={
        <div className="flex w-full gap-2">
          {source.id && (
            <Button variant="ghost" size="sm" icon={Archive} onClick={archive}>
              Arquivar
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={save}>Salvar</Button>
        </div>
      }
    >
      <Field label="Nome">
        <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </Field>
    </Modal>
  );
}

function RuleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, setFinance } = useStore();
  const [rule, setRule] = useState(data.finance.rule);
  const total = rule.essencial + rule.nao_essencial + rule.investimento;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regra de divisão da renda"
      footer={
        <Button
          disabled={total !== 100}
          onClick={() => {
            setFinance((f) => ({ ...f, rule }));
            onClose();
          }}
        >
          Salvar
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {GROUPS.map((g) => (
          <Field key={g} label={`${GROUP_META[g].short} %`}>
            <input type="number" className="field no-spinners" value={rule[g]} onChange={(e) => setRule({ ...rule, [g]: Number(e.target.value) || 0 })} />
          </Field>
        ))}
      </div>
      <p className={cx('text-xs mt-3', total === 100 ? 'text-text-muted' : 'text-rose-500')}>Soma: {total}% (precisa dar 100%).</p>
    </Modal>
  );
}
