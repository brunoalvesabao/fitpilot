import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronDown, ChevronRight, Inbox, Moon, Star, Sun } from 'lucide-react';
import type { Energy, Task } from '../../types';
import { Button, Card, Chip, EmptyState, PageHeader, Ring, SectionTitle, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { addDays, longDateLabel, todayISO } from '../../lib/dates';
import { ENERGY_META, byPriority, overload, todayTasks } from './logic';
import { QuickAdd, TaskModal, TaskRow } from './TaskBits';
import { HabitStrip } from './HabitosScreen';
import { EndDayModal } from './RevisaoScreen';

export default function HojeScreen() {
  const { data, setFocus, toast } = useStore();
  const { navigate } = useNav();
  const tasks = data.focus.tasks;
  const today = todayISO();
  const [open, setOpen] = useState<Task | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showSomeday, setShowSomeday] = useState(false);
  const [endDay, setEndDay] = useState(false);

  const { overdue, dueToday, focus, doneToday } = useMemo(() => todayTasks(tasks, today), [tasks, today]);
  const warning = useMemo(() => overload(tasks), [tasks]);
  const filt = (l: Task[]) => (energy ? l.filter((t) => t.energy === energy) : l).sort(byPriority);

  const focusList = filt(focus);
  const todayList = filt([...overdue, ...dueToday].filter((t) => t.focusDate !== today));
  const upcoming = filt(tasks.filter((t) => !t.done && t.due && t.due > today && t.due <= addDays(today, 7) && t.focusDate !== today));
  const someday = filt(tasks.filter((t) => !t.done && !t.due && t.focusDate !== today && !t.projectId));
  const totalToday = focus.length + overdue.length + dueToday.filter((t) => t.focusDate !== today).length + doneToday.length;
  const progress = totalToday ? doneToday.length / totalToday : 0;
  const inboxCount = data.focus.inbox.length;

  const moveOverdueToToday = () => {
    setFocus((f) => ({ ...f, tasks: f.tasks.map((t) => (!t.done && t.due && t.due < today ? { ...t, due: today } : t)) }));
    toast('Atrasadas trazidas para hoje.');
  };

  return (
    <div>
      <PageHeader
        icon={Sun}
        title="Hoje"
        subtitle={longDateLabel(today)}
        actions={
          <Button variant="outline" icon={Moon} onClick={() => setEndDay(true)}>
            Encerrar o dia
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <Card strong className="relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full brand-gradient opacity-10 blur-2xl" />
            <div className="flex items-center gap-5">
              <Ring value={progress} size={78} stroke={8}>
                <span className="font-display font-extrabold text-lg">{Math.round(progress * 100)}%</span>
              </Ring>
              <div className="min-w-0">
                <p className="font-display font-extrabold text-xl">
                  {doneToday.length} de {totalToday} feitas
                </p>
                <p className="text-sm text-text-muted mt-0.5">
                  {totalToday === 0
                    ? 'Dia livre. Que tal planejar o foco de hoje?'
                    : progress === 1
                      ? 'Tudo feito. Orgulho! 🎉'
                      : focus.length === 0
                        ? 'Marque a ⭐ nas 3 tarefas mais importantes do dia.'
                        : 'Comece pelo foco do dia.'}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <QuickAdd defaults={{ due: today }} placeholder="O que precisa ser feito hoje? (#casa @rua !)" />
            </div>
          </Card>

          {warning && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm text-text-high">{warning}</p>
                {overdue.length > 0 && (
                  <button type="button" onClick={moveOverdueToToday} className="text-xs font-semibold text-amber-600 mt-2">
                    Trazer atrasadas para hoje
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <Chip active={!energy} onClick={() => setEnergy(null)}>
              Todas
            </Chip>
            {(Object.keys(ENERGY_META) as Energy[]).map((e) => (
              <Chip key={e} active={energy === e} onClick={() => setEnergy(energy === e ? null : e)} color={ENERGY_META[e].color}>
                {ENERGY_META[e].emoji} {ENERGY_META[e].label}
              </Chip>
            ))}
          </div>

          <Card>
            <SectionTitle right={<span className="text-xs text-text-muted">{focusList.length}/3</span>}>
              <span className="flex items-center gap-1.5">
                <Star size={12} className="text-brand-primary" fill="currentColor" /> Foco do dia
              </span>
            </SectionTitle>
            {focusList.length === 0 ? (
              <p className="text-sm text-text-muted">Toque na estrela de uma tarefa para colocá-la aqui. Ideal: até 3.</p>
            ) : (
              <div className="-mx-3">{focusList.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />)}</div>
            )}
            {focusList.length > 3 && <p className="text-xs text-amber-600 mt-2">Mais de 3 no foco tira o sentido do foco 😉</p>}
          </Card>

          <Card>
            <SectionTitle right={<span className="text-xs text-text-muted">{todayList.length}</span>}>Para hoje</SectionTitle>
            {todayList.length === 0 ? (
              <EmptyState icon={Sun} title="Nada pendente para hoje" text="Adicione acima ou puxe algo dos próximos dias." />
            ) : (
              <div className="-mx-3">{todayList.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />)}</div>
            )}
          </Card>

          {doneToday.length > 0 && (
            <Card>
              <SectionTitle>Feitas hoje · {doneToday.length}</SectionTitle>
              <div className="-mx-3">{doneToday.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />)}</div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle right={<button type="button" className="text-xs text-brand-primary font-semibold" onClick={() => navigate('focus-habitos')}>Ver</button>}>
              Hábitos de hoje
            </SectionTitle>
            <HabitStrip />
          </Card>

          {inboxCount > 0 && (
            <button type="button" onClick={() => navigate('focus-captura')} className="card w-full p-4 flex items-center gap-3 text-left hover:border-brand-primary/40">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Inbox size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{inboxCount} itens na caixa de entrada</p>
                <p className="text-xs text-text-muted">Processe para não perder nada</p>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          )}

          <Card>
            <button type="button" onClick={() => setShowUpcoming(!showUpcoming)} className="w-full">
              <SectionTitle right={showUpcoming ? <ChevronDown size={16} /> : <ChevronRight size={16} />}>
                <span className="flex items-center gap-1.5">
                  <CalendarRange size={12} /> Próximos 7 dias · {upcoming.length}
                </span>
              </SectionTitle>
            </button>
            {showUpcoming &&
              (upcoming.length === 0 ? <p className="text-sm text-text-muted">Semana tranquila.</p> : <div className="-mx-3">{upcoming.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />)}</div>)}
          </Card>

          <Card>
            <button type="button" onClick={() => setShowSomeday(!showSomeday)} className="w-full">
              <SectionTitle right={showSomeday ? <ChevronDown size={16} /> : <ChevronRight size={16} />}>Sem data · {someday.length}</SectionTitle>
            </button>
            {showSomeday &&
              (someday.length === 0 ? <p className="text-sm text-text-muted">Nada solto por aqui.</p> : <div className={cx('-mx-3 max-h-[420px] overflow-y-auto custom-scrollbar')}>{someday.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />)}</div>)}
          </Card>
        </div>
      </div>

      <TaskModal task={open} onClose={() => setOpen(null)} />
      <EndDayModal open={endDay} onClose={() => setEndDay(false)} />
    </div>
  );
}
