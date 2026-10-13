import { useState } from 'react';
import { Check, Flame, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Habit } from '../../types';
import { Button, Card, EmptyState, Fab, Field, IconButton, Modal, PageHeader, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { WEEKDAYS_SHORT, addDays, parseISODate, todayISO } from '../../lib/dates';
import { uid } from '../../lib/id';
import { PALETTE } from '../../lib/defaults';

const EMOJIS = ['💧', '📖', '🏃', '🙏', '🧘', '💪', '🥗', '😴', '💊', '🎸', '🧠', '✍️', '🚭', '💰', '📵', '🧹'];

export function isHabitDay(h: Habit, iso: string) {
  return h.weekdays.includes(parseISODate(iso).getDay());
}

export function habitStreak(h: Habit, today = todayISO()): number {
  let streak = 0;
  let d = today;
  // hoje ainda não feito não quebra a sequência
  if (!h.log[d]) d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    if (isHabitDay(h, d)) {
      if (h.log[d]) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function habitRate(h: Habit, days = 30, today = todayISO()): number {
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (d < h.createdAt.slice(0, 10)) break;
    if (isHabitDay(h, d)) {
      scheduled++;
      if (h.log[d]) done++;
    }
  }
  return scheduled ? done / scheduled : 0;
}

export function useToggleHabit() {
  const { setFocus } = useStore();
  return (id: string, date: string) =>
    setFocus((f) => ({
      ...f,
      habits: f.habits.map((h) => {
        if (h.id !== id) return h;
        const log = { ...h.log };
        if (log[date]) delete log[date];
        else log[date] = true;
        return { ...h, log };
      }),
    }));
}

/** Faixa compacta para marcar os hábitos de hoje (usada no Hoje e no Início). */
export function HabitStrip() {
  const { data } = useStore();
  const toggle = useToggleHabit();
  const today = todayISO();
  const habits = data.focus.habits.filter((h) => !h.archived && isHabitDay(h, today));
  if (!habits.length) return <p className="text-sm text-text-muted">Nenhum hábito para hoje. Crie em Foco → Hábitos.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {habits.map((h) => {
        const done = !!h.log[today];
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => toggle(h.id, today)}
            className={cx('flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all active:scale-95', done ? 'border-transparent text-white' : 'border-outline-variant/20 bg-bg-surface-med')}
            style={done ? { background: h.color } : undefined}
          >
            <span className="text-lg">{h.emoji}</span>
            <span className={cx('text-xs font-semibold leading-tight flex-1 min-w-0 truncate', done ? 'text-white' : 'text-text-high')}>{h.name}</span>
            {done && <Check size={14} strokeWidth={3} className="text-white" />}
          </button>
        );
      })}
    </div>
  );
}

export default function HabitosScreen() {
  const { data } = useStore();
  const toggle = useToggleHabit();
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const today = todayISO();
  const habits = data.focus.habits.filter((h) => !h.archived);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <div>
      <PageHeader icon={Flame} title="Hábitos" subtitle="Pequenas vitórias, todo dia" />
      {habits.length === 0 ? (
        <Card>
          <EmptyState icon={Flame} title="Nenhum hábito ainda" text="Beber água, ler, orar, treinar… Crie hábitos e marque um toque por dia." action={<Button icon={Plus} onClick={() => setEditing('new')}>Novo hábito</Button>} />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {habits.map((h) => {
            const streak = habitStreak(h);
            const rate = habitRate(h);
            return (
              <Card key={h.id}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: `${h.color}22` }}>
                    {h.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-extrabold truncate">{h.name}</p>
                    <p className="text-xs text-text-muted">
                      🔥 {streak} {streak === 1 ? 'dia' : 'dias'} seguidos · {Math.round(rate * 100)}% nos últimos 30 dias
                    </p>
                  </div>
                  <IconButton icon={Pencil} title="Editar" onClick={() => setEditing(h)} />
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {week.map((d) => {
                    const active = isHabitDay(h, d);
                    const done = !!h.log[d];
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!active || d > today}
                        onClick={() => toggle(h.id, d)}
                        className={cx(
                          'flex flex-col items-center gap-1 py-2 rounded-xl border transition-all',
                          !active ? 'opacity-30 border-transparent' : done ? 'border-transparent text-white' : 'border-outline-variant/20 bg-bg-surface-med',
                          d === today && !done && active && 'ring-2 ring-brand-primary/50',
                        )}
                        style={done && active ? { background: h.color } : undefined}
                      >
                        <span className={cx('text-[9px] font-display font-extrabold uppercase', done ? 'text-white/90' : 'text-text-muted')}>{WEEKDAYS_SHORT[parseISODate(d).getDay()]}</span>
                        <span className={cx('text-xs font-semibold', done ? 'text-white' : 'text-text-high')}>{done ? '✓' : d.slice(8)}</span>
                      </button>
                    );
                  })}
                </div>
                <HeatMap habit={h} />
              </Card>
            );
          })}
        </div>
      )}
      <Fab onClick={() => setEditing('new')} icon={Plus} label="Novo hábito" />
      <HabitModal habit={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function HeatMap({ habit }: { habit: Habit }) {
  const today = todayISO();
  const days = Array.from({ length: 84 }, (_, i) => addDays(today, i - 83));
  return (
    <div className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px] justify-start overflow-x-auto no-scrollbar">
      {days.map((d) => (
        <span
          key={d}
          title={d}
          className="w-[11px] h-[11px] rounded-[3px]"
          style={{ background: habit.log[d] ? habit.color : isHabitDay(habit, d) ? 'var(--bg-surface-high)' : 'transparent' }}
        />
      ))}
    </div>
  );
}

function HabitModal({ habit, onClose }: { habit: Habit | 'new' | null; onClose: () => void }) {
  const { setFocus } = useStore();
  const [f, setF] = useState({ name: '', emoji: EMOJIS[0], color: PALETTE[2], weekdays: [0, 1, 2, 3, 4, 5, 6] });
  const [lastKey, setLastKey] = useState('');
  const key = habit === 'new' ? 'new' : habit?.id || '';
  if (habit && key !== lastKey) {
    setLastKey(key);
    setF(habit === 'new' ? { name: '', emoji: EMOJIS[0], color: PALETTE[2], weekdays: [0, 1, 2, 3, 4, 5, 6] } : { name: habit.name, emoji: habit.emoji, color: habit.color, weekdays: habit.weekdays });
  }
  if (!habit) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };
  const save = () => {
    if (!f.name.trim() || !f.weekdays.length) return;
    setFocus((fo) => ({
      ...fo,
      habits:
        habit === 'new'
          ? [...fo.habits, { id: uid(), name: f.name.trim(), emoji: f.emoji, color: f.color, weekdays: f.weekdays, log: {}, createdAt: new Date().toISOString() }]
          : fo.habits.map((h) => (h.id === habit.id ? { ...h, ...f, name: f.name.trim() } : h)),
    }));
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={habit === 'new' ? 'Novo hábito' : 'Editar hábito'}
      footer={
        <div className="flex w-full gap-2">
          {habit !== 'new' && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => {
                setFocus((fo) => ({ ...fo, habits: fo.habits.filter((h) => h.id !== habit.id) }));
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
        <Field label="Hábito">
          <input className="field" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Beber 2L de água" />
        </Field>
        <Field label="Ícone">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setF({ ...f, emoji: e })} className={cx('w-10 h-10 rounded-xl text-xl', f.emoji === e ? 'bg-brand-primary/20 ring-2 ring-brand-primary' : 'bg-bg-surface-med')}>
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cor">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setF({ ...f, color: c })} className={cx('w-8 h-8 rounded-full border-2', f.color === c ? 'border-text-high scale-110' : 'border-transparent')} style={{ background: c }} />
            ))}
          </div>
        </Field>
        <Field label="Dias da semana">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((w, i) => {
              const on = f.weekdays.includes(i);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setF({ ...f, weekdays: on ? f.weekdays.filter((x) => x !== i) : [...f.weekdays, i].sort() })}
                  className={cx('py-2 rounded-xl text-[10px] font-display font-extrabold uppercase', on ? 'bg-brand-primary text-brand-ink' : 'bg-bg-surface-med text-text-muted')}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
