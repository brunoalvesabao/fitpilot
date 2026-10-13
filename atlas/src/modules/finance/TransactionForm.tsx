import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react';
import type { FinanceData, Income, Transaction } from '../../types';
import { Button, Chip, Field, Modal, Segmented, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { monthOf, todayISO } from '../../lib/dates';
import { moneyInput, parseMoney } from '../../lib/format';
import { uid } from '../../lib/id';
import { GROUP_META } from '../../lib/defaults';
import { buildTransactions, GROUPS, guessCategory, recentCategories } from './logic';

export function CategorySelect({ fin, value, onChange, className }: { fin: FinanceData; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <select className={cx('field', className)} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        Selecione…
      </option>
      {GROUPS.map((g) => (
        <optgroup key={g} label={GROUP_META[g].label}>
          {fin.categories
            .filter((c) => c.group === g && (!c.archived || c.id === value))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

export function MoneyField({ value, onChange, autoFocus, big }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; big?: boolean }) {
  return (
    <div className={cx('flex items-center gap-2 field', big && '!py-3')}>
      <span className={cx('text-text-muted font-semibold', big ? 'text-lg' : 'text-sm')}>R$</span>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder="0,00"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ''))}
        className={cx('bg-transparent outline-none w-full money text-text-high', big ? 'text-3xl font-semibold' : 'text-base')}
      />
    </div>
  );
}

type Mode = 'despesa' | 'receita';

export function TransactionForm({
  open,
  onClose,
  editing,
  defaultDate,
  defaultMode = 'despesa',
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultDate?: string;
  defaultMode?: Mode;
}) {
  const { data, setFinance, toast } = useStore();
  const fin = data.finance;

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState(fin.paymentMethods[0] || 'PIX');
  const [date, setDate] = useState(defaultDate || todayISO());
  const [installments, setInstallments] = useState(1);
  const [currentN, setCurrentN] = useState(1);
  const [note, setNote] = useState('');
  const [sourceId, setSourceId] = useState(fin.incomeSources[0]?.id || '');
  const [touchedCategory, setTouchedCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMode('despesa');
      setAmount(moneyInput(editing.amount));
      setDescription(editing.description);
      setCategoryId(editing.categoryId);
      setMethod(editing.paymentMethod);
      setDate(editing.date);
      setInstallments(editing.installment?.total || 1);
      setCurrentN(editing.installment?.n || 1);
      setNote(editing.note || '');
      setTouchedCategory(true);
    } else {
      setMode(defaultMode);
      setAmount('');
      setDescription('');
      setCategoryId('');
      setMethod(fin.paymentMethods[0] || 'PIX');
      setDate(defaultDate || todayISO());
      setInstallments(1);
      setCurrentN(1);
      setNote('');
      setTouchedCategory(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const recents = useMemo(() => recentCategories(fin), [fin]);
  const descriptions = useMemo(() => Array.from(new Set(fin.transactions.map((t) => t.description))).slice(-300), [fin.transactions]);

  const onDescription = (v: string) => {
    setDescription(v);
    if (!touchedCategory) {
      const g = guessCategory(fin, v);
      if (g) setCategoryId(g);
    }
  };

  const value = parseMoney(amount);

  const save = () => {
    if (value <= 0) return toast('Informe um valor.');
    if (mode === 'receita') {
      if (!sourceId) return toast('Escolha a fonte da receita.');
      const inc: Income = { id: uid(), month: monthOf(date), sourceId, amount: value, received: true, note: note || undefined };
      setFinance((f) => ({ ...f, incomes: [...f.incomes, inc] }));
      toast('Receita lançada!');
      onClose();
      return;
    }
    if (!categoryId) return toast('Escolha uma categoria.');
    const desc = description.trim() || fin.categories.find((c) => c.id === categoryId)?.name || 'Lançamento';
    if (editing) {
      setFinance((f) => ({
        ...f,
        transactions: f.transactions.map((t) =>
          t.id === editing.id
            ? { ...t, amount: value, description: desc, categoryId, paymentMethod: method, date, note: note || undefined }
            : t,
        ),
      }));
      toast('Lançamento atualizado.');
    } else {
      const txs = buildTransactions(
        { date, description: desc, categoryId, amount: value, paymentMethod: method, note: note || undefined },
        installments,
        Math.min(currentN, installments),
      );
      setFinance((f) => ({ ...f, transactions: [...f.transactions, ...txs] }));
      toast(txs.length > 1 ? `${txs.length} parcelas lançadas!` : 'Despesa lançada!');
    }
    onClose();
  };

  const remove = (all: boolean) => {
    if (!editing) return;
    const gid = editing.installment?.groupId;
    setFinance((f) => ({
      ...f,
      transactions: f.transactions.filter((t) => (all && gid ? !(t.installment?.groupId === gid && t.date >= editing.date) : t.id !== editing.id)),
    }));
    toast('Lançamento excluído.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <div className="flex w-full gap-2 items-center">
          {editing && (
            <>
              <Button variant="danger" icon={Trash2} size="sm" onClick={() => remove(false)}>
                Excluir
              </Button>
              {editing.installment?.groupId && (
                <Button variant="ghost" size="sm" onClick={() => remove(true)}>
                  + seguintes
                </Button>
              )}
            </>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!editing && (
          <Segmented
            value={mode}
            onChange={setMode}
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            options={[
              { value: 'despesa', label: 'Despesa', icon: ArrowDownCircle },
              { value: 'receita', label: 'Receita', icon: ArrowUpCircle },
            ]}
          />
        )}

        <MoneyField value={amount} onChange={setAmount} autoFocus big />

        {mode === 'despesa' ? (
          <>
            <Field label="Estabelecimento / descrição">
              <input className="field" list="atlas-descriptions" value={description} onChange={(e) => onDescription(e.target.value)} placeholder="Ex.: Mercado, Farmácia…" />
              <datalist id="atlas-descriptions">
                {descriptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>

            <Field label="Categoria">
              <CategorySelect
                fin={fin}
                value={categoryId}
                onChange={(id) => {
                  setCategoryId(id);
                  setTouchedCategory(true);
                }}
              />
            </Field>
            {recents.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mt-2 pb-1">
                {recents.map((id) => (
                  <Chip
                    key={id}
                    active={categoryId === id}
                    onClick={() => {
                      setCategoryId(id);
                      setTouchedCategory(true);
                    }}
                  >
                    {fin.categories.find((c) => c.id === id)?.name}
                  </Chip>
                ))}
              </div>
            )}

            <Field label="Forma de pagamento">
              <div className="flex flex-wrap gap-1.5">
                {fin.paymentMethods.map((m) => (
                  <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
                    {m}
                  </Chip>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              {!editing ? (
                <Field label="Parcelas">
                  <select className="field" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                    <option value={1}>À vista</option>
                    {Array.from({ length: 47 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                editing.installment && (
                  <Field label="Parcela">
                    <div className="field text-text-muted">
                      {editing.installment.n}/{editing.installment.total}
                    </div>
                  </Field>
                )
              )}
            </div>
            {!editing && installments > 1 && (
              <div className="tile p-3 space-y-2">
                <Field label="Começar na parcela nº (se já está pagando)">
                  <input
                    type="number"
                    min={1}
                    max={installments}
                    className="field no-spinners"
                    value={currentN}
                    onChange={(e) => setCurrentN(Math.max(1, Math.min(installments, Number(e.target.value) || 1)))}
                  />
                </Field>
                <p className="text-xs text-text-muted">
                  Serão criadas {installments - currentN + 1} parcelas de {amount || '0,00'}, uma por mês a partir desta data. O valor é o da parcela.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Fonte da receita">
              <select className="field" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                {fin.incomeSources
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Data (define o mês da receita)">
              <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </>
        )}

        <Field label="Observação (opcional)">
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
