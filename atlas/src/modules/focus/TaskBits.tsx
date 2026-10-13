import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Check, Flag, ListChecks, Plus, Repeat, Star, Trash2, X } from 'lucide-react';
import type { Energy, Priority, Task } from '../../types';
import { Button, Chip, Field, Modal, Segmented, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { addDays, relativeDayLabel, todayISO } from '../../lib/dates';
import { uid } from '../../lib/id';
import { ENERGY_META, PRIORITY_META, isOverdue, newTask, parseQuickTask, toggleTask } from './logic';

export function TaskRow({ task, onOpen, showProject = true }: { task: Task; onOpen?: (t: Task) => void; showProject?: boolean }) {
  const { data, setFocus } = useStore();
  const today = todayISO();
  const project = showProject && task.projectId ? data.focus.projects.find((p) => p.id === task.projectId) : undefined;
  const isFocus = task.focusDate === today && !task.done;
  const checklistDone = task.checklist?.filter((c) => c.done).length || 0;

  return (
    <motion.div layout className={cx('group flex items-start gap-3 p-3 rounded-2xl transition-colors hover:bg-bg-surface-med', task.done && 'opacity-55')}>
      <button
        type="button"
        aria-label={task.done ? 'Desmarcar' : 'Concluir'}
        onClick={() => setFocus((f) => toggleTask(f, task.id))}
        className={cx(
          'mt-0.5 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90',
          task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-outline-variant/40 hover:border-brand-primary',
        )}
        style={!task.done && task.priority === 'alta' ? { borderColor: PRIORITY_META.alta.color } : undefined}
      >
        {task.done && <Check size={13} strokeWidth={3} className="animate-pop" />}
      </button>
      <button type="button" onClick={() => onOpen?.(task)} className="flex-1 min-w-0 text-left">
        <span className={cx('block text-sm font-medium text-text-high', task.done && 'line-through')}>{task.title}</span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-text-muted">
          {task.due && (
            <span className={cx('flex items-center gap-1', isOverdue(task, today) && 'text-rose-500 font-semibold')}>
              <CalendarDays size={11} /> {relativeDayLabel(task.due)}
            </span>
          )}
          {task.energy && (
            <span className="flex items-center gap-1" style={{ color: ENERGY_META[task.energy].color }}>
              {ENERGY_META[task.energy].emoji} {ENERGY_META[task.energy].label}
            </span>
          )}
          {task.area && <span>#{task.area}</span>}
          {project && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.color }} />
              {project.title}
            </span>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks size={11} /> {checklistDone}/{task.checklist.length}
            </span>
          )}
          {task.repeat && <Repeat size={11} />}
        </span>
      </button>
      {!task.done && (
        <button
          type="button"
          title={isFocus ? 'Tirar do foco do dia' : 'Colocar no foco do dia'}
          onClick={() => setFocus((f) => ({ ...f, tasks: f.tasks.map((t) => (t.id === task.id ? { ...t, focusDate: isFocus ? undefined : today } : t)) }))}
          className={cx('p-1.5 rounded-lg transition-all', isFocus ? 'text-brand-primary' : 'text-text-muted/40 hover:text-brand-primary md:opacity-0 md:group-hover:opacity-100')}
        >
          <Star size={16} fill={isFocus ? 'currentColor' : 'none'} />
        </button>
      )}
    </motion.div>
  );
}

export function QuickAdd({ defaults, placeholder = 'Nova tarefa… (ex.: pagar luz amanhã !)', autoFocus }: { defaults?: Partial<Task>; placeholder?: string; autoFocus?: boolean }) {
  const { data, setFocus, toast } = useStore();
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const p = parseQuickTask(text, data.focus.areas);
    const t = newTask({ ...defaults, title: p.title || text.trim(), due: p.due ?? defaults?.due, priority: p.priority, energy: p.energy ?? defaults?.energy, area: p.area ?? defaults?.area });
    setFocus((f) => ({ ...f, tasks: [...f.tasks, t] }));
    setText('');
    toast(t.due ? `Tarefa para ${relativeDayLabel(t.due).toLowerCase()}.` : 'Tarefa adicionada.');
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 field !py-1.5 !pr-1.5">
      <Plus size={16} className="text-brand-primary shrink-0" />
      <input autoFocus={autoFocus} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none text-sm py-1.5 min-w-0" />
      <button type="submit" disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-brand-primary text-brand-ink text-[10px] font-display font-extrabold uppercase tracking-wider disabled:opacity-30">
        Add
      </button>
    </form>
  );
}

export function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data, setFocus, toast } = useStore();
  const [draft, setDraft] = useState<Task | null>(null);
  const [newItem, setNewItem] = useState('');
  const [lastId, setLastId] = useState('');
  if (task && task.id !== lastId) {
    setLastId(task.id);
    setDraft({ ...task });
  }
  if (!task || !draft) return null;
  const close = () => {
    setLastId('');
    onClose();
  };
  const set = (p: Partial<Task>) => setDraft({ ...draft, ...p });
  const save = () => {
    setFocus((f) => ({ ...f, tasks: f.tasks.some((t) => t.id === draft.id) ? f.tasks.map((t) => (t.id === draft.id ? { ...draft, title: draft.title.trim() || t.title } : t)) : [...f.tasks, draft] }));
    close();
  };
  const remove = () => {
    setFocus((f) => ({ ...f, tasks: f.tasks.filter((t) => t.id !== draft.id) }));
    toast('Tarefa excluída.');
    close();
  };
  const today = todayISO();
  return (
    <Modal
      open
      onClose={close}
      title="Tarefa"
      footer={
        <div className="flex w-full gap-2">
          <Button variant="danger" size="sm" icon={Trash2} onClick={remove}>
            Excluir
          </Button>
          <div className="flex-1" />
          <Button onClick={save}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <input className="field !text-base font-semibold" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        <Field label="Prazo">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Chip active={draft.due === today} onClick={() => set({ due: today })}>
              Hoje
            </Chip>
            <Chip active={draft.due === addDays(today, 1)} onClick={() => set({ due: addDays(today, 1) })}>
              Amanhã
            </Chip>
            <Chip active={draft.due === addDays(today, 7)} onClick={() => set({ due: addDays(today, 7) })}>
              Em 1 semana
            </Chip>
            <Chip active={!draft.due} onClick={() => set({ due: undefined })}>
              Sem data
            </Chip>
          </div>
          <input type="date" className="field" value={draft.due || ''} onChange={(e) => set({ due: e.target.value || undefined })} />
        </Field>
        <Field label="Prioridade">
          <Segmented<Priority> value={draft.priority} onChange={(v) => set({ priority: v })} options={(['alta', 'media', 'baixa'] as Priority[]).map((p) => ({ value: p, label: PRIORITY_META[p].label, icon: Flag }))} />
        </Field>
        <Field label="Tipo de energia">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ENERGY_META) as Energy[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set({ energy: draft.energy === e ? undefined : e })}
                className={cx('tile p-2.5 text-left transition-all', draft.energy === e && '!border-2')}
                style={draft.energy === e ? { borderColor: ENERGY_META[e].color } : undefined}
              >
                <span className="text-lg">{ENERGY_META[e].emoji}</span>
                <span className="block text-xs font-semibold mt-1">{ENERGY_META[e].label}</span>
                <span className="block text-[10px] text-text-muted leading-tight mt-0.5">{ENERGY_META[e].hint}</span>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área">
            <select className="field" value={draft.area || ''} onChange={(e) => set({ area: e.target.value || undefined })}>
              <option value="">—</option>
              {Array.from(new Set([...data.focus.areas, ...(draft.area ? [draft.area] : [])])).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Projeto">
            <select className="field" value={draft.projectId || ''} onChange={(e) => set({ projectId: e.target.value || undefined })}>
              <option value="">—</option>
              {data.focus.projects
                .filter((p) => p.status !== 'concluido' || p.id === draft.projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Repetir">
          <select className="field" value={draft.repeat || ''} onChange={(e) => set({ repeat: (e.target.value || undefined) as Task['repeat'] })}>
            <option value="">Não repete</option>
            <option value="daily">Todo dia</option>
            <option value="weekly">Toda semana</option>
            <option value="monthly">Todo mês</option>
          </select>
        </Field>
        <Field label="Checklist (não esquecer)">
          <div className="space-y-1.5">
            {(draft.checklist || []).map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--brand-primary)]"
                  checked={c.done}
                  onChange={() => set({ checklist: draft.checklist!.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
                />
                <span className={cx('flex-1 text-sm', c.done && 'line-through text-text-muted')}>{c.text}</span>
                <button type="button" onClick={() => set({ checklist: draft.checklist!.filter((x) => x.id !== c.id) })} className="text-text-muted hover:text-rose-500">
                  <X size={14} />
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItem.trim()) return;
                set({ checklist: [...(draft.checklist || []), { id: uid(), text: newItem.trim(), done: false }] });
                setNewItem('');
              }}
            >
              <input className="field !py-2 text-sm" placeholder="+ item (Enter)" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            </form>
          </div>
        </Field>
        <Field label="Notas">
          <textarea className="field min-h-[80px]" value={draft.notes || ''} onChange={(e) => set({ notes: e.target.value || undefined })} />
        </Field>
      </div>
    </Modal>
  );
}
