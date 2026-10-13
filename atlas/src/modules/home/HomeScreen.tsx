import { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Gamepad2, Plus, ReceiptText, Sparkles, Target, Trophy, Wallet, Zap } from 'lucide-react';
import { Button, Card, ProgressBar, Ring, SectionTitle, cx } from '../../components/ui';
import { PokeballIcon } from '../../components/icons';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { currentMonth, formatDateBR, longDateLabel, monthOf, todayISO } from '../../lib/dates';
import { money } from '../../lib/format';
import { goalCurrent, monthSummary, upcomingBills, type BillView } from '../finance/logic';
import { BillStatePill, PayBillModal } from '../finance/ContasScreen';
import { TransactionForm } from '../finance/TransactionForm';
import { byPriority, todayTasks } from '../focus/logic';
import { QuickAdd, TaskModal, TaskRow } from '../focus/TaskBits';
import { HabitStrip } from '../focus/HabitosScreen';
import type { Task } from '../../types';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function HomeScreen() {
  const { data } = useStore();
  const { navigate } = useNav();
  const today = todayISO();
  const month = currentMonth();
  const fin = data.finance;
  const [txOpen, setTxOpen] = useState(false);
  const [paying, setPaying] = useState<BillView | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const summary = useMemo(() => monthSummary(fin, month), [fin, month]);
  const bills = useMemo(() => upcomingBills(fin, 7).slice(0, 5), [fin]);
  const { overdue, dueToday, focus, doneToday } = useMemo(() => todayTasks(data.focus.tasks, today), [data.focus.tasks, today]);
  const todayList = Array.from(new Map([...focus, ...overdue, ...dueToday].map((t) => [t.id, t])).values()).sort((a, b) => (a.focusDate === today ? -1 : 0) - (b.focusDate === today ? -1 : 0) || byPriority(a, b));
  const total = todayList.length + doneToday.length;

  const pokedex = useMemo(() => {
    let need = 0;
    let got = 0;
    for (const g of data.games.pokemonGenerations)
      for (const p of g.pokemons) {
        if (p.isExtraForm) continue;
        if (p.hasMale) {
          need++;
          if (p.isMaleCaught) got++;
        }
        if (p.hasFemale) {
          need++;
          if (p.isFemaleCaught) got++;
        }
        if (p.hasGenderless) {
          need++;
          if (p.isGenderlessCaught) got++;
        }
      }
    return { need, got };
  }, [data.games.pokemonGenerations]);
  const platinas = data.games.trophyEntries.reduce((s, e) => s + (e.platina || 0), 0);
  const toPlay = data.games.toPlayConsoles.reduce((s, c) => s + c.games.length, 0);
  const budgetUse = summary.budgeted ? summary.out / summary.budgeted : 0;

  return (
    <div>
      {/* Saudação */}
      <div className="mb-6">
        <p className="text-sm text-text-muted">{longDateLabel(today)}</p>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight mt-1">
          {greeting()}, {data.profile.name}.
        </h1>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-6">
        <QuickAdd placeholder="Anotar tarefa rápida… (ex.: ligar pro banco amanhã)" />
        <div className="flex gap-2">
          <Button icon={ReceiptText} onClick={() => setTxOpen(true)} className="flex-1 md:flex-none">
            Lançar gasto
          </Button>
          <Button variant="outline" icon={Sparkles} onClick={() => navigate('focus-captura')} className="flex-1 md:flex-none">
            Capturar
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Finanças do mês */}
        <Card strong className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full brand-gradient opacity-[0.12] blur-2xl" />
          <SectionTitle right={<LinkBtn onClick={() => navigate('fin-orcamento')}>Orçamento</LinkBtn>}>
            <span className="flex items-center gap-1.5">
              <Wallet size={12} /> Finanças de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
            </span>
          </SectionTitle>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="label !mb-0.5">Saldo do mês</p>
              <p className={cx('money text-4xl font-semibold', summary.balance < 0 && 'text-rose-500')}>{money(summary.balance)}</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="label !mb-0.5">Receitas</p>
                <p className="money font-semibold text-emerald-500">{money(summary.income)}</p>
              </div>
              <div>
                <p className="label !mb-0.5">Gastos</p>
                <p className="money font-semibold">{money(summary.spent)}</p>
              </div>
              <div>
                <p className="label !mb-0.5">Investido</p>
                <p className="money font-semibold">{money(summary.invested)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>Orçamento usado</span>
              <span>
                {money(summary.out)} de {money(summary.budgeted)}
              </span>
            </div>
            <ProgressBar value={budgetUse} over={budgetUse > 1} className="!h-2.5" />
            {!summary.budgeted && (
              <p className="text-xs text-text-muted mt-2">
                Defina o orçado das categorias em <button type="button" className="text-brand-primary font-semibold" onClick={() => navigate('fin-orcamento')}>Orçamento</button> ou importe sua planilha em <button type="button" className="text-brand-primary font-semibold" onClick={() => navigate('system-import')}>Sistema</button>.
              </p>
            )}
          </div>
        </Card>

        {/* Contas */}
        <Card>
          <SectionTitle right={<LinkBtn onClick={() => navigate('fin-contas')}>Todas</LinkBtn>}>
            <span className="flex items-center gap-1.5">
              <CalendarClock size={12} /> Contas a vencer
            </span>
          </SectionTitle>
          {bills.length === 0 ? (
            <p className="text-sm text-text-muted">{fin.bills.length ? 'Nada vencendo nos próximos 7 dias. 👌' : 'Cadastre suas contas fixas para receber lembretes aqui.'}</p>
          ) : (
            <div className="space-y-2">
              {bills.map((v) => (
                <div key={v.bill.id + v.due} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{v.bill.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-text-muted">{formatDateBR(v.due)}</span>
                      <BillStatePill state={v.state} daysLeft={v.daysLeft} />
                    </div>
                  </div>
                  <span className="money text-sm">{money(v.bill.amount)}</span>
                  <Button size="sm" onClick={() => setPaying(v)}>
                    Pagar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Hoje */}
        <Card className="lg:col-span-2">
          <SectionTitle right={<LinkBtn onClick={() => navigate('focus-hoje')}>Abrir Foco</LinkBtn>}>
            <span className="flex items-center gap-1.5">
              <Zap size={12} /> Hoje
            </span>
          </SectionTitle>
          <div className="flex items-center gap-4 mb-3">
            <Ring value={total ? doneToday.length / total : 0} size={56} stroke={6}>
              <span className="text-xs font-display font-extrabold">
                {doneToday.length}/{total}
              </span>
            </Ring>
            <p className="text-sm text-text-muted">
              {total === 0 ? 'Nenhuma tarefa para hoje.' : todayList.length === 0 ? 'Tudo feito por hoje! 🎉' : `${todayList.length} pendente(s)${overdue.length ? ` · ${overdue.length} atrasada(s)` : ''}`}
            </p>
          </div>
          <div className="-mx-3">
            {todayList.slice(0, 6).map((t) => (
              <TaskRow key={t.id} task={t} onOpen={setOpenTask} />
            ))}
          </div>
          {todayList.length > 6 && <p className="text-xs text-text-muted mt-1">+{todayList.length - 6} tarefas</p>}
        </Card>

        {/* Hábitos */}
        <Card>
          <SectionTitle right={<LinkBtn onClick={() => navigate('focus-habitos')}>Hábitos</LinkBtn>}>Hábitos de hoje</SectionTitle>
          <HabitStrip />
        </Card>

        {/* Metas */}
        <Card>
          <SectionTitle right={<LinkBtn onClick={() => navigate('fin-metas')}>Metas</LinkBtn>}>
            <span className="flex items-center gap-1.5">
              <Target size={12} /> Metas
            </span>
          </SectionTitle>
          {fin.goals.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhuma meta ainda.</p>
          ) : (
            <div className="space-y-3">
              {fin.goals.slice(0, 4).map((g) => {
                const cur = goalCurrent(g);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate">{g.name}</span>
                      <span className="text-text-muted text-xs">{Math.round((cur / g.target) * 100)}%</span>
                    </div>
                    <ProgressBar value={cur / g.target} color={g.color} className="!h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Games */}
        <Card className="lg:col-span-2">
          <SectionTitle right={<LinkBtn onClick={() => navigate('games-pokemon')}>Games</LinkBtn>}>
            <span className="flex items-center gap-1.5">
              <Gamepad2 size={12} /> Games
            </span>
          </SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={() => navigate('games-pokemon')} className="tile p-4 text-left hover:border-brand-primary/40">
              <PokeballIcon size={18} className="text-rose-500" />
              <p className="font-display font-extrabold text-xl mt-2">{pokedex.need ? Math.round((pokedex.got / pokedex.need) * 100) : 0}%</p>
              <p className="text-[11px] text-text-muted">Pokédex · {pokedex.got}/{pokedex.need}</p>
            </button>
            <button type="button" onClick={() => navigate('games-trophies')} className="tile p-4 text-left hover:border-brand-primary/40">
              <Trophy size={18} className="text-cyan-500" />
              <p className="font-display font-extrabold text-xl mt-2">{platinas}</p>
              <p className="text-[11px] text-text-muted">Platinas · {data.games.trophyEntries.length} jogos</p>
            </button>
            <button type="button" onClick={() => navigate('games-toplay')} className="tile p-4 text-left hover:border-brand-primary/40">
              <Gamepad2 size={18} className="text-brand-primary" />
              <p className="font-display font-extrabold text-xl mt-2">{toPlay}</p>
              <p className="text-[11px] text-text-muted">Na fila para jogar</p>
            </button>
          </div>
        </Card>
      </div>

      {/* Últimos lançamentos */}
      <Card className="mt-5">
        <SectionTitle right={<LinkBtn onClick={() => navigate('fin-lancamentos')}>Ver todos</LinkBtn>}>Últimos lançamentos</SectionTitle>
        <RecentTransactions />
        <button type="button" onClick={() => setTxOpen(true)} className="mt-3 text-sm text-brand-primary font-semibold flex items-center gap-1">
          <Plus size={14} /> Lançar
        </button>
      </Card>

      <TransactionForm open={txOpen} onClose={() => setTxOpen(false)} />
      <PayBillModal view={paying} month={paying ? monthOf(paying.due) : month} onClose={() => setPaying(null)} />
      <TaskModal task={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function LinkBtn({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-display font-extrabold uppercase tracking-wider text-text-muted hover:text-brand-primary flex items-center gap-1">
      {children} <ArrowRight size={12} />
    </button>
  );
}

function RecentTransactions() {
  const { data } = useStore();
  const fin = data.finance;
  const catName = Object.fromEntries(fin.categories.map((c) => [c.id, c.name]));
  const recent = [...fin.transactions].filter((t) => t.date <= todayISO()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  if (!recent.length) return <p className="text-sm text-text-muted">Nenhum lançamento ainda.</p>;
  return (
    <div className="divide-y divide-outline-variant/10">
      {recent.map((t) => (
        <div key={t.id} className="flex items-center gap-3 py-2.5">
          <span className="text-[11px] text-text-muted w-10">{formatDateBR(t.date)}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm truncate">{t.description}</span>
            <span className="block text-[11px] text-text-muted truncate">{catName[t.categoryId]}</span>
          </span>
          <span className="money text-sm">−{money(t.amount)}</span>
        </div>
      ))}
    </div>
  );
}
