import { useMemo, useState } from 'react';
import { Banknote, CircleDollarSign, Pencil, Plus, Target, Trash2, TrendingDown } from 'lucide-react';
import type { Debt, Goal } from '../../types';
import { Button, Card, ConfirmDialog, EmptyState, Fab, Field, IconButton, Modal, PageHeader, ProgressBar, Ring, Segmented, Stat, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { formatDateBR, todayISO } from '../../lib/dates';
import { money, moneyInput, parseMoney, pct, sum } from '../../lib/format';
import { uid } from '../../lib/id';
import { GOAL_REASONS, PALETTE } from '../../lib/defaults';
import { debtRemaining, debtRemainingInstallments, goalCurrent, goalHorizon, goalMonthly, goalMonthsLeft } from './logic';
import { CategorySelect, MoneyField } from './TransactionForm';

export default function MetasScreen() {
  const [tab, setTab] = useState<'metas' | 'dividas'>('metas');
  const [goalEdit, setGoalEdit] = useState<Goal | 'new' | null>(null);
  const [debtEdit, setDebtEdit] = useState<Debt | 'new' | null>(null);

  return (
    <div>
      <PageHeader
        icon={Target}
        title="Metas"
        subtitle="Seus objetivos e o caminho até eles"
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'metas', label: 'Metas', icon: Target },
              { value: 'dividas', label: 'Dívidas', icon: TrendingDown },
            ]}
          />
        }
      />
      {tab === 'metas' ? <GoalsTab onEdit={setGoalEdit} /> : <DebtsTab onEdit={setDebtEdit} />}
      <Fab onClick={() => (tab === 'metas' ? setGoalEdit('new') : setDebtEdit('new'))} icon={Plus} label={tab === 'metas' ? 'Nova meta' : 'Nova dívida'} />
      <GoalModal goal={goalEdit} onClose={() => setGoalEdit(null)} />
      <DebtModal debt={debtEdit} onClose={() => setDebtEdit(null)} />
    </div>
  );
}

// ------------------------------------------------------------------ Metas
function GoalsTab({ onEdit }: { onEdit: (g: Goal) => void }) {
  const { data } = useStore();
  const goals = data.finance.goals;
  const [contrib, setContrib] = useState<Goal | null>(null);
  const totalTarget = sum(goals.map((g) => g.target));
  const totalCurrent = sum(goals.map(goalCurrent));
  const monthly = sum(goals.map(goalMonthly));

  if (!goals.length)
    return (
      <Card>
        <EmptyState icon={Target} title="Nenhuma meta ainda" text="Reserva de emergência, nome limpo, carro, viagem… Crie sua primeira meta e acompanhe os aportes." />
      </Card>
    );

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Acumulado" value={money(totalCurrent)} tone="brand" />
        <Stat label="Objetivo total" value={money(totalTarget)} />
        <Stat label="Progresso geral" value={pct(totalTarget ? totalCurrent / totalTarget : 0, 1)} />
        <Stat label="Aporte mensal ideal" value={money(monthly)} sub="Soma de todas as metas" />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {goals.map((g) => {
          const current = goalCurrent(g);
          const progress = g.target ? current / g.target : 0;
          const months = goalMonthsLeft(g);
          const late = months <= 0 && progress < 1;
          return (
            <Card key={g.id} className="flex flex-col">
              <div className="flex items-start gap-4">
                <Ring value={progress} size={72} color={g.color}>
                  <span className="font-display font-extrabold text-sm">{Math.round(progress * 100)}%</span>
                </Ring>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-display font-extrabold uppercase tracking-widest" style={{ color: g.color }}>
                    {g.reason} · {goalHorizon(g)}
                  </p>
                  <h3 className="font-display font-extrabold text-lg leading-tight mt-0.5 truncate">{g.name}</h3>
                  <p className="money text-sm mt-1">
                    {money(current)} <span className="text-text-muted">/ {money(g.target)}</span>
                  </p>
                </div>
                <IconButton icon={Pencil} title="Editar" onClick={() => onEdit(g)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="tile p-2.5">
                  <p className="text-text-muted">Prazo</p>
                  <p className={cx('font-semibold', late && 'text-rose-500')}>
                    {formatDateBR(g.deadline, true)} {late ? '· vencida' : `· ${Math.ceil(months)} meses`}
                  </p>
                </div>
                <div className="tile p-2.5">
                  <p className="text-text-muted">Aporte sugerido</p>
                  <p className="font-semibold money">{progress >= 1 ? 'Meta batida 🎉' : `${money(goalMonthly(g))}/mês`}</p>
                </div>
              </div>
              {g.where && <p className="text-xs text-text-muted mt-2">Onde: {g.where}</p>}
              <div className="flex-1" />
              <Button className="mt-4 w-full" variant="soft" icon={Banknote} onClick={() => setContrib(g)}>
                Aportar
              </Button>
            </Card>
          );
        })}
      </div>
      <ContributionModal goal={contrib} onClose={() => setContrib(null)} />
    </>
  );
}

function ContributionModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { data, setFinance, toast } = useStore();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [asExpense, setAsExpense] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [lastId, setLastId] = useState('');
  if (goal && goal.id !== lastId) {
    setLastId(goal.id);
    setAmount('');
    setDate(todayISO());
    const inv = data.finance.categories.find((c) => c.group === 'investimento' && !c.archived);
    setCategoryId(goal.categoryId || inv?.id || '');
    setAsExpense(true);
  }
  if (!goal) return null;
  const close = () => {
    setLastId('');
    onClose();
  };
  const history = [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date));
  const save = () => {
    const v = parseMoney(amount);
    if (!v) return toast('Informe o valor.');
    setFinance((f) => {
      const txId = asExpense && categoryId ? uid() : undefined;
      return {
        ...f,
        transactions: txId
          ? [...f.transactions, { id: txId, createdAt: new Date().toISOString(), date, description: `Aporte · ${goal.name}`, categoryId, amount: v, paymentMethod: 'PIX', goalId: goal.id }]
          : f.transactions,
        goals: f.goals.map((g) => (g.id === goal.id ? { ...g, categoryId: categoryId || g.categoryId, contributions: [...g.contributions, { id: uid(), date, amount: v, txId }] } : g)),
      };
    });
    toast('Aporte registrado!');
    close();
  };
  const removeContribution = (id: string) => {
    setFinance((f) => {
      const c = goal.contributions.find((x) => x.id === id);
      return {
        ...f,
        transactions: c?.txId ? f.transactions.filter((t) => t.id !== c.txId) : f.transactions,
        goals: f.goals.map((g) => (g.id === goal.id ? { ...g, contributions: g.contributions.filter((x) => x.id !== id) } : g)),
      };
    });
  };
  const live = data.finance.goals.find((g) => g.id === goal.id) || goal;
  return (
    <Modal open onClose={close} title={`Aportar · ${goal.name}`} footer={<Button onClick={save}>Registrar aporte</Button>}>
      <div className="space-y-4">
        <Field label="Valor">
          <MoneyField value={amount} onChange={setAmount} autoFocus big />
        </Field>
        <Field label="Data">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-mid">
          <input type="checkbox" className="w-4 h-4 accent-[var(--brand-primary)]" checked={asExpense} onChange={(e) => setAsExpense(e.target.checked)} />
          Lançar no orçamento (como investimento do mês)
        </label>
        {asExpense && <CategorySelect fin={data.finance} value={categoryId} onChange={setCategoryId} />}
        {history.length > 0 && (
          <div>
            <p className="label">Histórico</p>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {(live.contributions.length ? [...live.contributions].sort((a, b) => b.date.localeCompare(a.date)) : history).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-text-muted">{formatDateBR(c.date, true)}</span>
                  <span className="flex items-center gap-1">
                    <span className="money">{money(c.amount)}</span>
                    <IconButton icon={Trash2} className="!w-7 !h-7" title="Remover aporte" onClick={() => removeContribution(c.id)} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GoalModal({ goal, onClose }: { goal: Goal | 'new' | null; onClose: () => void }) {
  const { setFinance, toast } = useStore();
  const [f, setF] = useState({ name: '', reason: GOAL_REASONS[0], target: '', deadline: '', initial: '', where: '', color: PALETTE[0] });
  const [lastKey, setLastKey] = useState('');
  const [confirm, setConfirm] = useState(false);
  const key = goal === 'new' ? 'new' : goal?.id || '';
  if (goal && key !== lastKey) {
    setLastKey(key);
    if (goal === 'new') {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setF({ name: '', reason: GOAL_REASONS[0], target: '', deadline: d.toISOString().slice(0, 10), initial: '', where: '', color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
    } else setF({ name: goal.name, reason: goal.reason, target: moneyInput(goal.target), deadline: goal.deadline, initial: moneyInput(goal.initial), where: goal.where || '', color: goal.color });
  }
  if (!goal) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };
  const save = () => {
    if (!f.name.trim() || !parseMoney(f.target) || !f.deadline) return toast('Preencha nome, valor e prazo.');
    setFinance((fin) => {
      if (goal === 'new') {
        const g: Goal = { id: uid(), name: f.name.trim(), reason: f.reason, target: parseMoney(f.target), deadline: f.deadline, initial: parseMoney(f.initial), where: f.where || undefined, color: f.color, contributions: [], createdAt: new Date().toISOString() };
        return { ...fin, goals: [...fin.goals, g] };
      }
      return { ...fin, goals: fin.goals.map((g) => (g.id === goal.id ? { ...g, name: f.name.trim(), reason: f.reason, target: parseMoney(f.target), deadline: f.deadline, initial: parseMoney(f.initial), where: f.where || undefined, color: f.color } : g)) };
    });
    toast('Meta salva.');
    close();
  };
  return (
    <>
      <Modal
        open
        onClose={close}
        title={goal === 'new' ? 'Nova meta' : 'Editar meta'}
        footer={
          <div className="flex w-full gap-2">
            {goal !== 'new' && (
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirm(true)}>
                Excluir
              </Button>
            )}
            <div className="flex-1" />
            <Button onClick={save}>Salvar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Meta">
            <input className="field" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Reserva de emergência" />
          </Field>
          <Field label="Motivo">
            <select className="field" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
              {GOAL_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor da meta">
              <MoneyField value={f.target} onChange={(v) => setF({ ...f, target: v })} />
            </Field>
            <Field label="Já tenho">
              <MoneyField value={f.initial} onChange={(v) => setF({ ...f, initial: v })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quando">
              <input type="date" className="field" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
            </Field>
            <Field label="Onde (opcional)">
              <input className="field" value={f.where} onChange={(e) => setF({ ...f, where: e.target.value })} placeholder="Tesouro, CDB…" />
            </Field>
          </div>
          <Field label="Cor">
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setF({ ...f, color: c })} className={cx('w-8 h-8 rounded-full border-2', f.color === c ? 'border-text-high scale-110' : 'border-transparent')} style={{ background: c }} />
              ))}
            </div>
          </Field>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Excluir meta"
        message="Os aportes lançados no orçamento continuam como lançamentos. Excluir a meta?"
        onConfirm={() => {
          if (goal !== 'new') setFinance((fin) => ({ ...fin, goals: fin.goals.filter((g) => g.id !== goal.id) }));
          close();
        }}
      />
    </>
  );
}

// ------------------------------------------------------------------ Dívidas
function DebtsTab({ onEdit }: { onEdit: (d: Debt) => void }) {
  const { data, setFinance, toast } = useStore();
  const debts = data.finance.debts;
  const total = sum(debts.map(debtRemaining));
  const monthly = sum(debts.filter((d) => debtRemainingInstallments(d) > 0).map((d) => d.installmentValue));
  const active = useMemo(() => [...debts].sort((a, b) => debtRemaining(b) - debtRemaining(a)), [debts]);

  const payInstallment = (d: Debt) => {
    setFinance((f) => {
      const txs = d.categoryId
        ? [...f.transactions, { id: uid(), createdAt: new Date().toISOString(), date: todayISO(), description: `${d.creditor} · parcela ${d.currentInstallment}/${d.totalInstallments}`, categoryId: d.categoryId, amount: d.installmentValue, paymentMethod: 'PIX' }]
        : f.transactions;
      return { ...f, transactions: txs, debts: f.debts.map((x) => (x.id === d.id ? { ...x, currentInstallment: x.currentInstallment + 1 } : x)) };
    });
    toast(d.categoryId ? 'Parcela paga e lançada!' : 'Parcela registrada.');
  };

  if (!debts.length)
    return (
      <Card>
        <EmptyState icon={TrendingDown} title="Nenhuma dívida cadastrada" text="Cadastre financiamentos, empréstimos e parcelamentos para enxergar quanto falta e quando acaba." />
      </Card>
    );

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Stat label="Total devido" value={money(total)} tone="neg" />
        <Stat label="Parcelas por mês" value={money(monthly)} />
        <Stat label="Dívidas ativas" value={String(debts.filter((d) => debtRemainingInstallments(d) > 0).length)} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {active.map((d) => {
          const left = debtRemainingInstallments(d);
          const done = d.totalInstallments ? (d.currentInstallment - 1) / d.totalInstallments : 0;
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-extrabold text-lg truncate">{d.creditor}</h3>
                  <p className="text-xs text-text-muted">{d.reason || 'Sem motivo informado'} · desde {formatDateBR(d.startDate, true)}</p>
                </div>
                <IconButton icon={Pencil} title="Editar" onClick={() => onEdit(d)} />
              </div>
              <div className="flex items-end justify-between mt-4 mb-2">
                <div>
                  <p className="label !mb-0.5">Falta pagar</p>
                  <p className="money text-2xl font-semibold text-rose-500">{money(debtRemaining(d))}</p>
                </div>
                <p className="text-sm text-text-muted text-right">
                  {left > 0 ? `${left} parcelas de` : 'Quitada! 🎉'}
                  <br />
                  {left > 0 && <span className="money text-text-high">{money(d.installmentValue)}</span>}
                </p>
              </div>
              <ProgressBar value={done} color="#10b981" />
              <p className="text-[11px] text-text-muted mt-1.5">
                {d.currentInstallment - 1}/{d.totalInstallments} pagas
                {d.interest ? ` · juros ${d.interest}% a.m.` : ''}
                {d.cet ? ` · CET ${d.cet}% a.a.` : ''}
              </p>
              {left > 0 && (
                <Button className="mt-4 w-full" variant="soft" icon={CircleDollarSign} onClick={() => payInstallment(d)}>
                  Paguei a parcela {d.currentInstallment}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function DebtModal({ debt, onClose }: { debt: Debt | 'new' | null; onClose: () => void }) {
  const { data, setFinance, toast } = useStore();
  const empty = { creditor: '', startDate: todayISO(), initialValue: '', installmentValue: '', totalInstallments: '12', currentInstallment: '1', interest: '', cet: '', reason: '', categoryId: '' };
  const [f, setF] = useState(empty);
  const [lastKey, setLastKey] = useState('');
  const key = debt === 'new' ? 'new' : debt?.id || '';
  if (debt && key !== lastKey) {
    setLastKey(key);
    setF(
      debt === 'new'
        ? empty
        : {
            creditor: debt.creditor,
            startDate: debt.startDate,
            initialValue: moneyInput(debt.initialValue),
            installmentValue: moneyInput(debt.installmentValue),
            totalInstallments: String(debt.totalInstallments),
            currentInstallment: String(debt.currentInstallment),
            interest: debt.interest ? String(debt.interest) : '',
            cet: debt.cet ? String(debt.cet) : '',
            reason: debt.reason || '',
            categoryId: debt.categoryId || '',
          },
    );
  }
  if (!debt) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };
  const save = () => {
    if (!f.creditor.trim()) return toast('Informe o credor.');
    const d: Debt = {
      id: debt === 'new' ? uid() : debt.id,
      createdAt: debt === 'new' ? new Date().toISOString() : debt.createdAt,
      creditor: f.creditor.trim(),
      startDate: f.startDate,
      initialValue: parseMoney(f.initialValue),
      installmentValue: parseMoney(f.installmentValue),
      totalInstallments: Math.max(1, Number(f.totalInstallments) || 1),
      currentInstallment: Math.max(1, Number(f.currentInstallment) || 1),
      interest: parseFloat(f.interest.replace(',', '.')) || undefined,
      cet: parseFloat(f.cet.replace(',', '.')) || undefined,
      reason: f.reason || undefined,
      categoryId: f.categoryId || undefined,
    };
    setFinance((fin) => ({ ...fin, debts: debt === 'new' ? [...fin.debts, d] : fin.debts.map((x) => (x.id === d.id ? d : x)) }));
    toast('Dívida salva.');
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={debt === 'new' ? 'Nova dívida' : 'Editar dívida'}
      footer={
        <div className="flex w-full gap-2">
          {debt !== 'new' && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => {
                setFinance((fin) => ({ ...fin, debts: fin.debts.filter((x) => x.id !== debt.id) }));
                close();
              }}
            >
              Excluir
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={save}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Credor">
          <input className="field" autoFocus value={f.creditor} onChange={(e) => setF({ ...f, creditor: e.target.value })} placeholder="Banco, financeira, pessoa…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data inicial">
            <input type="date" className="field" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          </Field>
          <Field label="Valor inicial">
            <MoneyField value={f.initialValue} onChange={(v) => setF({ ...f, initialValue: v })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Parcela">
            <MoneyField value={f.installmentValue} onChange={(v) => setF({ ...f, installmentValue: v })} />
          </Field>
          <Field label="Nº parcelas">
            <input type="number" className="field no-spinners" value={f.totalInstallments} onChange={(e) => setF({ ...f, totalInstallments: e.target.value })} />
          </Field>
          <Field label="Parcela atual">
            <input type="number" className="field no-spinners" value={f.currentInstallment} onChange={(e) => setF({ ...f, currentInstallment: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Juros (% a.m.)">
            <input inputMode="decimal" className="field" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })} />
          </Field>
          <Field label="CET (% a.a.)">
            <input inputMode="decimal" className="field" value={f.cet} onChange={(e) => setF({ ...f, cet: e.target.value })} />
          </Field>
        </div>
        <Field label="Motivo">
          <input className="field" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Por que você se endividou?" />
        </Field>
        <Field label="Categoria ao pagar parcela (opcional)">
          <CategorySelect fin={data.finance} value={f.categoryId} onChange={(id) => setF({ ...f, categoryId: id })} />
        </Field>
      </div>
    </Modal>
  );
}
