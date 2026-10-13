import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Clock, Pencil, Plus, Undo2 } from 'lucide-react';
import type { Bill } from '../../types';
import { Button, Card, Chip, EmptyState, Fab, Field, IconButton, Modal, MonthSwitcher, PageHeader, ProgressBar, Stat, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { currentMonth, formatDateBR, monthLabel, todayISO } from '../../lib/dates';
import { money, moneyInput, parseMoney, sum } from '../../lib/format';
import { uid } from '../../lib/id';
import { billsOfMonth, payBill, unpayBill, type BillState, type BillView } from './logic';
import { CategorySelect, MoneyField } from './TransactionForm';

const STATE_META: Record<BillState, { label: string; cls: string; icon: typeof Check }> = {
  pago: { label: 'Pago', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25', icon: CheckCircle2 },
  atrasado: { label: 'Atrasado', cls: 'bg-rose-500/10 text-rose-600 border-rose-500/25', icon: AlertTriangle },
  hoje: { label: 'Vence hoje', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  proximo: { label: 'Vence logo', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  aberto: { label: 'Em aberto', cls: 'bg-bg-surface-med text-text-muted border-outline-variant/20', icon: Clock },
};

export function BillStatePill({ state, daysLeft }: { state: BillState; daysLeft: number }) {
  const m = STATE_META[state];
  const label = state === 'proximo' ? `Em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}` : state === 'atrasado' ? `${-daysLeft}d atraso` : m.label;
  return (
    <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-display font-extrabold uppercase tracking-wider', m.cls)}>
      <m.icon size={11} /> {label}
    </span>
  );
}

export function PayBillModal({ view, month, onClose }: { view: BillView | null; month: string; onClose: () => void }) {
  const { setFinance, toast } = useStore();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [lastId, setLastId] = useState('');
  if (view && view.bill.id + month !== lastId) {
    setLastId(view.bill.id + month);
    setAmount(moneyInput(view.bill.amount));
    setDate(todayISO());
  }
  if (!view) return null;
  const close = () => {
    setLastId('');
    onClose();
  };
  return (
    <Modal
      open
      onClose={close}
      title={`Pagar · ${view.bill.name}`}
      footer={
        <Button
          icon={Check}
          onClick={() => {
            setFinance((f) => payBill(f, month, view.bill, parseMoney(amount), date));
            toast('Conta paga e lançada nas despesas!');
            close();
          }}
        >
          Confirmar pagamento
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Vencimento {formatDateBR(view.due, true)} · {view.bill.paymentMethod}. O pagamento vira um lançamento na categoria da conta.
        </p>
        <Field label="Valor pago">
          <MoneyField value={amount} onChange={setAmount} autoFocus />
        </Field>
        <Field label="Data do pagamento">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export default function ContasScreen() {
  const { data, setFinance, toast } = useStore();
  const fin = data.finance;
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'pagas'>('todas');
  const [paying, setPaying] = useState<BillView | null>(null);
  const [editing, setEditing] = useState<Bill | null | 'new'>(null);

  const views = useMemo(() => billsOfMonth(fin, month), [fin, month]);
  const shown = views.filter((v) => (filter === 'pagas' ? v.state === 'pago' : filter === 'pendentes' ? v.state !== 'pago' : true));
  const total = sum(views.map((v) => v.payment?.amount ?? v.bill.amount));
  const paid = sum(views.filter((v) => v.state === 'pago').map((v) => v.payment!.amount));
  const late = views.filter((v) => v.state === 'atrasado').length;
  const catName = Object.fromEntries(fin.categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader icon={CalendarClock} title="Contas" subtitle="Pagamento de contas do mês" actions={<MonthSwitcher month={month} onChange={setMonth} />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Total do mês" value={money(total)} />
        <Stat label="Pago" value={money(paid)} tone="pos" />
        <Stat label="A pagar" value={money(total - paid)} tone={total - paid > 0 ? 'brand' : undefined} />
        <Stat label="Atrasadas" value={String(late)} tone={late ? 'neg' : undefined} sub={`${views.length} contas no mês`} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex gap-1.5">
            {(['todas', 'pendentes', 'pagas'] as const).map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}
              </Chip>
            ))}
          </div>
          <div className="w-40">
            <ProgressBar value={total ? paid / total : 0} color="#10b981" />
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={views.length ? 'Nada aqui' : 'Nenhuma conta cadastrada'}
            text={views.length ? 'Mude o filtro.' : 'Cadastre suas contas fixas (luz, água, internet, financiamento…) e o Atlas lembra você todo mês.'}
            action={!views.length && <Button icon={Plus} onClick={() => setEditing('new')}>Nova conta</Button>}
          />
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {shown.map((v) => (
              <div key={v.bill.id} className="flex items-center gap-3 py-3">
                <div className={cx('w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border', v.state === 'pago' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-bg-surface-med border-outline-variant/15')}>
                  <span className="text-[9px] font-display font-extrabold uppercase text-text-muted leading-none">dia</span>
                  <span className="font-display font-extrabold text-base leading-none mt-0.5">{v.due.slice(8)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cx('text-sm font-semibold truncate', v.state === 'pago' && 'line-through text-text-muted')}>{v.bill.name}</span>
                    <BillStatePill state={v.state} daysLeft={v.daysLeft} />
                  </div>
                  <p className="text-[11px] text-text-muted truncate">
                    {catName[v.bill.categoryId]} · {v.bill.paymentMethod}
                    {v.payment?.paid && ` · pago em ${formatDateBR(v.payment.date)}`}
                  </p>
                </div>
                <span className="money text-sm font-semibold whitespace-nowrap">{money(v.payment?.amount ?? v.bill.amount)}</span>
                {v.state === 'pago' ? (
                  <IconButton
                    icon={Undo2}
                    title="Desfazer pagamento"
                    onClick={() => {
                      setFinance((f) => unpayBill(f, month, v.bill.id));
                      toast('Pagamento desfeito.');
                    }}
                  />
                ) : (
                  <Button size="sm" onClick={() => setPaying(v)}>
                    Pagar
                  </Button>
                )}
                <IconButton icon={Pencil} title="Editar conta" onClick={() => setEditing(v.bill)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Fab onClick={() => setEditing('new')} icon={Plus} label="Nova conta" />
      <PayBillModal view={paying} month={month} onClose={() => setPaying(null)} />
      <BillModal bill={editing} month={month} onClose={() => setEditing(null)} />
    </div>
  );
}

function BillModal({ bill, month, onClose }: { bill: Bill | null | 'new'; month: string; onClose: () => void }) {
  const { data, setFinance, toast } = useStore();
  const fin = data.finance;
  const [form, setForm] = useState({ name: '', amount: '', dueDay: '10', categoryId: '', paymentMethod: 'PIX', startMonth: month, endMonth: '' });
  const [lastKey, setLastKey] = useState<string>('');
  const key = bill === 'new' ? `new-${month}` : bill?.id || '';
  if (bill && key !== lastKey) {
    setLastKey(key);
    if (bill === 'new') setForm({ name: '', amount: '', dueDay: '10', categoryId: '', paymentMethod: fin.paymentMethods[0] || 'PIX', startMonth: month, endMonth: '' });
    else
      setForm({
        name: bill.name,
        amount: moneyInput(bill.amount),
        dueDay: String(bill.dueDay),
        categoryId: bill.categoryId,
        paymentMethod: bill.paymentMethod,
        startMonth: bill.startMonth,
        endMonth: bill.endMonth || '',
      });
  }
  if (!bill) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };
  const save = () => {
    if (!form.name.trim() || !form.categoryId) return toast('Preencha nome e categoria.');
    const b: Bill = {
      id: bill === 'new' ? uid() : bill.id,
      name: form.name.trim(),
      amount: parseMoney(form.amount),
      dueDay: Math.max(1, Math.min(31, Number(form.dueDay) || 1)),
      categoryId: form.categoryId,
      paymentMethod: form.paymentMethod,
      startMonth: form.startMonth || month,
      endMonth: form.endMonth || undefined,
    };
    setFinance((f) => ({ ...f, bills: bill === 'new' ? [...f.bills, b] : f.bills.map((x) => (x.id === b.id ? b : x)) }));
    toast('Conta salva.');
    close();
  };
  const archive = () => {
    if (bill === 'new') return;
    setFinance((f) => ({ ...f, bills: f.bills.map((x) => (x.id === bill.id ? { ...x, endMonth: month } : x)) }));
    toast(`Conta encerrada a partir de ${monthLabel(month)}.`);
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={bill === 'new' ? 'Nova conta' : 'Editar conta'}
      footer={
        <div className="flex w-full gap-2">
          {bill !== 'new' && (
            <Button variant="ghost" size="sm" onClick={archive}>
              Encerrar neste mês
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={save}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Descrição">
          <input className="field" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Energia, Internet, Financiamento" />
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Valor previsto">
            <MoneyField value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
          </Field>
          <Field label="Vence dia">
            <input type="number" min={1} max={31} className="field no-spinners" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
          </Field>
        </div>
        <Field label="Categoria">
          <CategorySelect fin={fin} value={form.categoryId} onChange={(id) => setForm({ ...form, categoryId: id })} />
        </Field>
        <Field label="Forma de pagamento">
          <div className="flex flex-wrap gap-1.5">
            {fin.paymentMethods.map((m) => (
              <Chip key={m} active={form.paymentMethod === m} onClick={() => setForm({ ...form, paymentMethod: m })}>
                {m}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Começa em">
            <input type="month" className="field" value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} />
          </Field>
          <Field label="Termina em (opcional)">
            <input type="month" className="field" value={form.endMonth} onChange={(e) => setForm({ ...form, endMonth: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
