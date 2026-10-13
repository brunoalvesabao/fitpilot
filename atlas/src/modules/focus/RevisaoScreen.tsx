import { useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, LineChart, Moon } from 'lucide-react';
import { Button, Card, IconButton, Modal, PageHeader, SectionTitle, Stat, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { WEEKDAYS_SHORT, addDays, formatDateBR, longDateLabel, parseISODate, startOfWeek, todayISO } from '../../lib/dates';
import { pct } from '../../lib/format';
import { isHabitDay } from './HabitosScreen';
import { todayTasks } from './logic';
import type { ScreenId } from '../../types';

const MOODS = ['😫', '😕', '😐', '🙂', '🤩'];

export function EndDayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, setFocus, toast } = useStore();
  const today = todayISO();
  const existing = data.focus.reviews.find((r) => r.date === today);
  const [mood, setMood] = useState<number | undefined>(existing?.mood);
  const [note, setNote] = useState(existing?.note || '');
  const { overdue, dueToday, focus, doneToday } = todayTasks(data.focus.tasks, today);
  const pending = Array.from(new Map([...overdue, ...dueToday, ...focus].map((t) => [t.id, t])).values());

  const finish = (moveAll: boolean) => {
    const tomorrow = addDays(today, 1);
    setFocus((f) => ({
      ...f,
      tasks: moveAll ? f.tasks.map((t) => (pending.some((p) => p.id === t.id) ? { ...t, due: tomorrow, focusDate: undefined } : t)) : f.tasks,
      reviews: [...f.reviews.filter((r) => r.date !== today), { date: today, mood, note: note || undefined, closedAt: new Date().toISOString() }],
    }));
    toast(moveAll && pending.length ? `Dia encerrado. ${pending.length} tarefa(s) foram para amanhã.` : 'Dia encerrado. Bom descanso! 🌙');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Encerrar o dia">
      <div className="space-y-5">
        <div className="tile p-4">
          <p className="text-sm">
            ✅ Você concluiu <b>{doneToday.length}</b> {doneToday.length === 1 ? 'tarefa' : 'tarefas'} hoje.
          </p>
          {doneToday.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-text-muted">
              {doneToday.slice(0, 8).map((t) => (
                <li key={t.id}>• {t.title}</li>
              ))}
            </ul>
          )}
        </div>
        {pending.length > 0 && (
          <div className="tile p-4">
            <p className="text-sm">
              ⏳ Ficaram <b>{pending.length}</b> pendentes:
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-text-muted">
              {pending.slice(0, 8).map((t) => (
                <li key={t.id}>• {t.title}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="label">Como foi o dia?</p>
          <div className="flex gap-2">
            {MOODS.map((m, i) => (
              <button key={m} type="button" onClick={() => setMood(i + 1)} className={cx('flex-1 py-2 rounded-2xl text-2xl transition-all', mood === i + 1 ? 'bg-brand-primary/20 ring-2 ring-brand-primary scale-105' : 'bg-bg-surface-med')}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">Uma frase sobre hoje (opcional)</span>
          <textarea className="field min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Gratidão, aprendizado, o que travou…" />
        </label>
        <div className="flex flex-col gap-2">
          {pending.length > 0 && (
            <Button icon={ArrowRight} onClick={() => finish(true)}>
              Encerrar e mover pendentes para amanhã
            </Button>
          )}
          <Button variant={pending.length ? 'outline' : 'primary'} icon={Moon} onClick={() => finish(false)}>
            Encerrar o dia
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const WEEKLY_STEPS: { text: string; screen: ScreenId }[] = [
  { text: 'Esvaziar a caixa de entrada', screen: 'focus-captura' },
  { text: 'Revisar projetos e definir o próximo passo', screen: 'focus-projetos' },
  { text: 'Conferir contas da próxima semana', screen: 'fin-contas' },
  { text: 'Lançar gastos que faltaram', screen: 'fin-lancamentos' },
  { text: 'Ver como está o orçamento do mês', screen: 'fin-orcamento' },
  { text: 'Escolher as prioridades da semana', screen: 'focus-hoje' },
];

export default function RevisaoScreen() {
  const { data } = useStore();
  const { navigate } = useNav();
  const [weekOffset, setWeekOffset] = useState(0);
  const [endDay, setEndDay] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const today = todayISO();
  const start = addDays(startOfWeek(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];

  const stats = useMemo(() => {
    const tasks = data.focus.tasks;
    const doneIn = (a: string, b: string) => tasks.filter((t) => t.done && t.doneAt && t.doneAt.slice(0, 10) >= a && t.doneAt.slice(0, 10) <= b);
    const done = doneIn(start, end);
    const prev = doneIn(addDays(start, -7), addDays(start, -1));
    const dueInWeek = tasks.filter((t) => t.due && t.due >= start && t.due <= end);
    const onTime = dueInWeek.filter((t) => t.done && t.doneAt && t.doneAt.slice(0, 10) <= t.due!).length;
    const perDay = days.map((d) => done.filter((t) => t.doneAt!.slice(0, 10) === d).length);
    const byArea: Record<string, number> = {};
    for (const t of done) byArea[t.area || 'Sem área'] = (byArea[t.area || 'Sem área'] || 0) + 1;

    let scheduled = 0;
    let habitsDone = 0;
    for (const h of data.focus.habits.filter((x) => !x.archived)) {
      for (const d of days) {
        if (d > today || d < h.createdAt.slice(0, 10)) continue;
        if (isHabitDay(h, d)) {
          scheduled++;
          if (h.log[d]) habitsDone++;
        }
      }
    }
    const moods = data.focus.reviews.filter((r) => r.date >= start && r.date <= end && r.mood);
    return {
      done: done.length,
      prev: prev.length,
      onTimeRate: dueInWeek.length ? onTime / dueInWeek.length : 0,
      dueCount: dueInWeek.length,
      perDay,
      byArea: Object.entries(byArea).sort((a, b) => b[1] - a[1]),
      habitRate: scheduled ? habitsDone / scheduled : 0,
      avgMood: moods.length ? moods.reduce((s, r) => s + (r.mood || 0), 0) / moods.length : 0,
    };
  }, [data.focus, start, end, days, today]);

  const maxDay = Math.max(1, ...stats.perDay);
  const reviews = data.focus.reviews.filter((r) => r.date >= start && r.date <= end).sort((a, b) => b.date.localeCompare(a.date));
  const diff = stats.done - stats.prev;

  return (
    <div>
      <PageHeader
        icon={LineChart}
        title="Revisão"
        subtitle={`Semana de ${formatDateBR(start)} a ${formatDateBR(end)}`}
        actions={
          <>
            <div className="inline-flex items-center gap-1 bg-bg-surface-low border border-outline-variant/40 rounded-2xl p-1">
              <IconButton icon={ChevronLeft} onClick={() => setWeekOffset(weekOffset - 1)} title="Semana anterior" />
              <span className="font-display font-extrabold uppercase tracking-wider text-[11px] w-24 text-center">{weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Passada' : `${-weekOffset} sem. atrás`}</span>
              <IconButton icon={ChevronRight} onClick={() => setWeekOffset(Math.min(0, weekOffset + 1))} title="Próxima semana" />
            </div>
            <Button variant="outline" icon={Moon} onClick={() => setEndDay(true)}>
              Encerrar o dia
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Tarefas concluídas" value={String(stats.done)} tone="brand" sub={stats.prev || stats.done ? `${diff >= 0 ? '+' : ''}${diff} vs. semana anterior` : undefined} />
        <Stat label="No prazo" value={stats.dueCount ? pct(stats.onTimeRate) : '—'} sub={`${stats.dueCount} com prazo na semana`} />
        <Stat label="Hábitos cumpridos" value={data.focus.habits.length ? pct(stats.habitRate) : '—'} />
        <Stat label="Humor médio" value={stats.avgMood ? MOODS[Math.round(stats.avgMood) - 1] : '—'} sub={`${reviews.length} dia(s) encerrados`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <SectionTitle>Concluídas por dia</SectionTitle>
          <div className="flex items-end gap-2 h-40">
            {days.map((d, i) => (
              <div key={d} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title={`${stats.perDay[i]} em ${formatDateBR(d)}`}>
                <span className="text-[11px] text-text-muted">{stats.perDay[i] || ''}</span>
                <div className={cx('w-full rounded-t-[4px] transition-all', d === today ? 'brand-gradient' : 'bg-brand-primary/35')} style={{ height: `${(stats.perDay[i] / maxDay) * 100}%`, minHeight: stats.perDay[i] ? 6 : 2 }} />
                <span className={cx('text-[10px] font-display font-extrabold uppercase', d === today ? 'text-brand-primary' : 'text-text-muted')}>{WEEKDAYS_SHORT[parseISODate(d).getDay()]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Onde foi sua energia</SectionTitle>
          {stats.byArea.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhuma tarefa concluída nesta semana ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.byArea.map(([area, n]) => (
                <div key={area}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{area}</span>
                    <span className="text-text-muted">{n}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-surface-high overflow-hidden">
                    <div className="h-full rounded-full brand-gradient" style={{ width: `${(n / stats.done) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <CalendarCheck size={12} /> Revisão semanal (15 min)
            </span>
          </SectionTitle>
          <div className="space-y-1">
            {WEEKLY_STEPS.map((s, i) => (
              <div key={s.text} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setChecked({ ...checked, [i]: !checked[i] })}
                  className={cx('w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center', checked[i] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-outline-variant/40')}
                >
                  {checked[i] && <CheckCircle2 size={14} />}
                </button>
                <span className={cx('flex-1 text-sm', checked[i] && 'line-through text-text-muted')}>{s.text}</span>
                <button type="button" onClick={() => navigate(s.screen)} className="text-xs text-brand-primary font-semibold">
                  Abrir
                </button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Diário da semana</SectionTitle>
          {reviews.length === 0 ? (
            <p className="text-sm text-text-muted">Use “Encerrar o dia” para registrar como foi cada dia.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.date} className="flex gap-3">
                  <span className="text-2xl">{r.mood ? MOODS[r.mood - 1] : '📝'}</span>
                  <div>
                    <p className="text-xs font-semibold text-text-muted">{longDateLabel(r.date)}</p>
                    <p className="text-sm">{r.note || <span className="text-text-muted">Sem anotação</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <EndDayModal open={endDay} onClose={() => setEndDay(false)} />
    </div>
  );
}
