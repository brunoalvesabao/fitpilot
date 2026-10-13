import { useMemo, useState } from 'react';
import { ArrowUpCircle, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import type { CategoryGroup, Transaction } from '../../types';
import { Card, Chip, EmptyState, Fab, IconButton, MonthSwitcher, PageHeader, SectionTitle, Stat, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { currentMonth, longDateLabel, weekOfMonth } from '../../lib/dates';
import { money, sum } from '../../lib/format';
import { GROUP_META } from '../../lib/defaults';
import { categoryGroupMap, monthSummary, txOfMonth } from './logic';
import { TransactionForm } from './TransactionForm';

export default function LancamentosScreen() {
  const { data, setFinance, toast } = useStore();
  const fin = data.finance;
  const [month, setMonth] = useState(currentMonth());
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<CategoryGroup | 'all'>('all');
  const [week, setWeek] = useState<number | 0>(0);
  const [method, setMethod] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'despesa' | 'receita'>('despesa');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const catName = useMemo(() => Object.fromEntries(fin.categories.map((c) => [c.id, c.name])), [fin.categories]);
  const groupOf = useMemo(() => categoryGroupMap(fin), [fin]);
  const summary = useMemo(() => monthSummary(fin, month), [fin, month]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txOfMonth(fin, month)
      .filter((t) => group === 'all' || groupOf[t.categoryId] === group)
      .filter((t) => !week || weekOfMonth(t.date) === week)
      .filter((t) => !method || t.paymentMethod === method)
      .filter((t) => !q || t.description.toLowerCase().includes(q) || (catName[t.categoryId] || '').toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [fin, month, query, group, week, method, groupOf, catName]);

  const byDay = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of list) map.set(t.date, [...(map.get(t.date) || []), t]);
    return Array.from(map.entries());
  }, [list]);

  const byMethod = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of txOfMonth(fin, month)) out[t.paymentMethod] = (out[t.paymentMethod] || 0) + t.amount;
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, [fin, month]);

  const incomes = fin.incomes.filter((i) => i.month === month);
  const sourceName = Object.fromEntries(fin.incomeSources.map((s) => [s.id, s.name]));
  const filtered = group !== 'all' || week || method || query;

  const openNew = (mode: 'despesa' | 'receita') => {
    setEditing(null);
    setFormMode(mode);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader icon={ReceiptText} title="Lançamentos" subtitle="Tudo que entrou e saiu no mês" actions={<MonthSwitcher month={month} onChange={setMonth} />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Receitas" value={money(summary.income)} tone="pos" />
        <Stat label="Despesas" value={money(summary.spent)} tone="neg" />
        <Stat label="Investido" value={money(summary.invested)} />
        <Stat label="Saldo do mês" value={money(summary.balance)} tone={summary.balance >= 0 ? 'brand' : 'neg'} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <Card>
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-2 field !py-2">
              <Search size={15} className="text-text-muted" />
              <input className="bg-transparent outline-none w-full text-sm" placeholder="Buscar lançamento ou categoria…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              <Chip active={group === 'all'} onClick={() => setGroup('all')}>
                Todos
              </Chip>
              {(Object.keys(GROUP_META) as CategoryGroup[]).map((g) => (
                <Chip key={g} active={group === g} onClick={() => setGroup(g)} color={GROUP_META[g].color}>
                  {GROUP_META[g].label}
                </Chip>
              ))}
              <span className="w-px bg-outline-variant/20 mx-1 shrink-0" />
              {[1, 2, 3, 4, 5].map((w) => (
                <Chip key={w} active={week === w} onClick={() => setWeek(week === w ? 0 : w)}>
                  Sem. {w}
                </Chip>
              ))}
            </div>
            {fin.paymentMethods.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {fin.paymentMethods.map((m) => (
                  <Chip key={m} active={method === m} onClick={() => setMethod(method === m ? '' : m)}>
                    {m}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {filtered && list.length > 0 && (
            <p className="text-xs text-text-muted mb-4">
              {list.length} lançamentos · <span className="money text-text-high">{money(sum(list.map((t) => t.amount)))}</span>
            </p>
          )}

          {byDay.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title={filtered ? 'Nada encontrado' : 'Nenhum lançamento'}
              text={filtered ? 'Tente outro filtro.' : 'Toque no + para lançar sua primeira despesa deste mês.'}
            />
          ) : (
            <div className="space-y-5">
              {byDay.map(([day, items]) => (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="font-display text-[10px] font-extrabold uppercase tracking-widest text-text-muted">{longDateLabel(day)}</p>
                    <p className="money text-xs text-text-muted">{money(sum(items.map((t) => t.amount)))}</p>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((t) => {
                      const g = groupOf[t.categoryId] || 'nao_essencial';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-bg-surface-med transition-colors text-left"
                        >
                          <span
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-extrabold font-display"
                            style={{ background: `${GROUP_META[g].color}1a`, color: GROUP_META[g].color }}
                          >
                            {(catName[t.categoryId] || '?').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-text-high truncate">{t.description}</span>
                            <span className="block text-[11px] text-text-muted truncate">
                              {catName[t.categoryId] || 'Sem categoria'} · {t.paymentMethod}
                              {t.installment && ` · ${t.installment.n}/${t.installment.total}`}
                              {t.billId && ' · conta'}
                            </span>
                          </span>
                          <span className="money text-sm font-semibold text-text-high whitespace-nowrap">−{money(t.amount)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle
              right={
                <button type="button" onClick={() => openNew('receita')} className="text-brand-primary">
                  <Plus size={16} />
                </button>
              }
            >
              Receitas do mês
            </SectionTitle>
            {incomes.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhuma receita lançada.</p>
            ) : (
              <div className="space-y-1">
                {incomes.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 py-1.5 group">
                    <ArrowUpCircle size={15} className="text-emerald-500 shrink-0" />
                    <span className="flex-1 text-sm truncate">{sourceName[i.sourceId] || 'Receita'}</span>
                    <span className="money text-sm text-emerald-500">{money(i.amount)}</span>
                    <IconButton
                      icon={Trash2}
                      title="Excluir receita"
                      className="!w-7 !h-7 opacity-60 hover:opacity-100"
                      onClick={() => {
                        setFinance((f) => ({ ...f, incomes: f.incomes.filter((x) => x.id !== i.id) }));
                        toast('Receita removida.');
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Por forma de pagamento</SectionTitle>
            {byMethod.length === 0 ? (
              <p className="text-sm text-text-muted">Sem despesas no mês.</p>
            ) : (
              <div className="space-y-2.5">
                {byMethod.map(([m, v]) => (
                  <div key={m}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-mid">{m}</span>
                      <span className="money">{money(v)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-surface-high overflow-hidden">
                      <div className={cx('h-full rounded-full brand-gradient')} style={{ width: `${(v / (summary.out || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Fab onClick={() => openNew('despesa')} icon={Plus} label="Novo lançamento" />
      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        defaultMode={formMode}
        defaultDate={month === currentMonth() ? undefined : `${month}-01`}
      />
    </div>
  );
}
