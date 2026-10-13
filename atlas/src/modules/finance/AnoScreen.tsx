import { useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, IconButton, PageHeader, SectionTitle, Segmented, Stat, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { MONTHS_SHORT } from '../../lib/dates';
import { money, pct, sum } from '../../lib/format';
import { GROUP_META } from '../../lib/defaults';
import { GROUPS, categoryGroupMap, monthSummary } from './logic';

const INCOME_COLOR = '#10b981';
const OUT_COLOR = '#e07b07';
const AXIS_FMT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export default function AnoScreen() {
  const { data } = useStore();
  const fin = data.finance;
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<'grafico' | 'tabela'>('grafico');

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = `${year}-${String(i + 1).padStart(2, '0')}`;
        const s = monthSummary(fin, m);
        return { month: m, label: MONTHS_SHORT[i], ...s };
      }),
    [fin, year],
  );

  const totals = {
    income: sum(months.map((m) => m.income)),
    out: sum(months.map((m) => m.out)),
    invested: sum(months.map((m) => m.invested)),
  };
  const result = totals.income - totals.out;

  const topCategories = useMemo(() => {
    const groupOf = categoryGroupMap(fin);
    const totalsByCat: Record<string, number> = {};
    for (const t of fin.transactions) if (t.date.startsWith(String(year))) totalsByCat[t.categoryId] = (totalsByCat[t.categoryId] || 0) + t.amount;
    const name = Object.fromEntries(fin.categories.map((c) => [c.id, c.name]));
    return Object.entries(totalsByCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => ({ id, name: name[id] || '—', value: v, group: groupOf[id] || 'nao_essencial' }));
  }, [fin, year]);

  const groupYear = GROUPS.map((g) => ({ g, value: sum(months.map((m) => m.byGroup[g].real)) }));
  const maxTop = topCategories[0]?.value || 1;

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Resumo do ano"
        subtitle="Visão anual das suas finanças"
        actions={
          <div className="inline-flex items-center gap-1 bg-bg-surface-low border border-outline-variant/40 rounded-2xl p-1">
            <IconButton icon={ChevronLeft} onClick={() => setYear(year - 1)} title="Ano anterior" />
            <span className="font-display font-extrabold text-sm w-14 text-center">{year}</span>
            <IconButton icon={ChevronRight} onClick={() => setYear(year + 1)} title="Próximo ano" />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Receitas no ano" value={money(totals.income)} tone="pos" />
        <Stat label="Saídas no ano" value={money(totals.out)} tone="neg" />
        <Stat label="Investido" value={money(totals.invested)} sub={totals.income ? `${pct(totals.invested / totals.income, 1)} da renda` : undefined} />
        <Stat label="Resultado" value={money(result)} tone={result >= 0 ? 'brand' : 'neg'} />
      </div>

      <Card className="mb-6">
        <SectionTitle
          right={
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'grafico', label: 'Gráfico' },
                { value: 'tabela', label: 'Tabela' },
              ]}
            />
          }
        >
          Receitas × saídas por mês
        </SectionTitle>
        {view === 'grafico' ? (
          <>
            <div className="flex gap-4 text-xs text-text-mid mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: INCOME_COLOR }} /> Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: OUT_COLOR }} /> Saídas
              </span>
            </div>
            <div className="h-72 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} barGap={2} barCategoryGap="22%">
                  <CartesianGrid vertical={false} stroke="var(--bg-surface-high)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => AXIS_FMT.format(Number(v))} />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-surface-med)' }}
                    contentStyle={{ background: 'var(--bg-surface-low)', border: '1px solid var(--bg-surface-high)', borderRadius: 14, fontSize: 12, color: 'var(--text-high)' }}
                    formatter={(v, n) => [money(Number(v)), n === 'income' ? 'Receitas' : 'Saídas']}
                    labelStyle={{ color: 'var(--text-muted)' }}
                  />
                  <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out" fill={OUT_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-text-muted">
                  {['Mês', 'Receitas', 'Essencial', 'Não essencial', 'Investido', 'Resultado'].map((h) => (
                    <th key={h} className="label !mb-0 px-2 py-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-t border-outline-variant/10">
                    <td className="px-2 py-2 font-semibold">{m.label}</td>
                    <td className="px-2 py-2 money text-emerald-500">{money(m.income)}</td>
                    <td className="px-2 py-2 money">{money(m.byGroup.essencial.real)}</td>
                    <td className="px-2 py-2 money">{money(m.byGroup.nao_essencial.real)}</td>
                    <td className="px-2 py-2 money">{money(m.byGroup.investimento.real)}</td>
                    <td className={cx('px-2 py-2 money font-semibold', m.balance >= 0 ? 'text-text-high' : 'text-rose-500')}>{money(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>Divisão das saídas no ano</SectionTitle>
          <div className="flex h-4 rounded-full overflow-hidden gap-[2px] mb-4 bg-bg-surface-high">
            {groupYear.map(({ g, value }) => (
              <div key={g} style={{ width: `${(value / (totals.out || 1)) * 100}%`, background: GROUP_META[g].color }} title={GROUP_META[g].label} />
            ))}
          </div>
          <div className="space-y-2">
            {groupYear.map(({ g, value }) => (
              <div key={g} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: GROUP_META[g].color }} />
                  {GROUP_META[g].label}
                </span>
                <span className="text-text-muted">
                  <span className="money text-text-high">{money(value)}</span> · {pct(totals.income ? value / totals.income : 0, 1)} da renda (ideal {fin.rule[g]}%)
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Maiores categorias do ano</SectionTitle>
          {topCategories.length === 0 ? (
            <p className="text-sm text-text-muted">Sem lançamentos neste ano.</p>
          ) : (
            <div className="space-y-2.5">
              {topCategories.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{c.name}</span>
                    <span className="money">{money(c.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-surface-high overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.value / maxTop) * 100}%`, background: GROUP_META[c.group].color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
