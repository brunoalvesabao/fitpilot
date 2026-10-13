import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FolderKanban, Inbox, Lightbulb, ListTodo, Loader2, NotebookPen, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { AppNote, Energy, Idea, InboxItem, Priority, Project, Task } from '../../types';
import { Button, Card, EmptyState, IconButton, PageHeader, SectionTitle, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { WEEKDAYS, formatDateBR, relativeDayLabel, todayISO } from '../../lib/dates';
import { uid } from '../../lib/id';
import { PALETTE } from '../../lib/defaults';
import { ENERGY_META, localOrganize, newTask, type CaptureKind, type CaptureSuggestion } from './logic';

const KIND_META: Record<CaptureKind, { label: string; icon: typeof ListTodo; color: string }> = {
  tarefa: { label: 'Tarefa', icon: ListTodo, color: '#3b82f6' },
  projeto: { label: 'Projeto', icon: FolderKanban, color: '#8b5cf6' },
  ideia: { label: 'Ideia', icon: Lightbulb, color: '#f59e0b' },
  nota: { label: 'Nota', icon: NotebookPen, color: '#64748b' },
};

export default function CapturaScreen() {
  const { data, update, setFocus, toast } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<CaptureSuggestion[] | null>(null);
  const [overloadMsg, setOverloadMsg] = useState('');
  const [usedAI, setUsedAI] = useState(false);
  const [sourceInbox, setSourceInbox] = useState<string | null>(null);

  const organize = async (input = text, inboxId: string | null = null) => {
    if (!input.trim()) return;
    setBusy(true);
    setOverloadMsg('');
    setSourceInbox(inboxId);
    const today = todayISO();
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: input,
          today,
          weekday: WEEKDAYS[new Date().getDay()],
          areas: data.focus.areas,
          pending: data.focus.tasks.filter((t) => !t.done).slice(-60).map((t) => t.title),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const out = (await res.json()) as { items: (Omit<CaptureSuggestion, 'id' | 'energy' | 'checklist'> & { energy: Energy | ''; checklist: string[]; due: string })[]; overload: string };
      setSuggestions(
        out.items.map((i) => ({
          ...i,
          id: uid(),
          due: /^\d{4}-\d{2}-\d{2}$/.test(i.due) ? i.due : undefined,
          energy: i.energy || undefined,
          area: i.area || undefined,
          detail: i.detail || undefined,
          checklist: i.checklist.length ? i.checklist : undefined,
        })),
      );
      setOverloadMsg(out.overload);
      setUsedAI(true);
    } catch {
      // Sem IA (ou offline): organizador local
      setSuggestions(localOrganize(input, data.focus.areas));
      setUsedAI(false);
    }
    setBusy(false);
  };

  const saveToInbox = () => {
    if (!text.trim()) return;
    const item: InboxItem = { id: uid(), text: text.trim(), createdAt: new Date().toISOString() };
    setFocus((f) => ({ ...f, inbox: [item, ...f.inbox] }));
    setText('');
    toast('Guardado na caixa de entrada.');
  };

  const editSuggestion = (id: string, patch: Partial<CaptureSuggestion>) => setSuggestions((s) => s?.map((x) => (x.id === id ? { ...x, ...patch } : x)) || null);

  const commit = () => {
    if (!suggestions?.length) return;
    const now = new Date().toISOString();
    const tasks: Task[] = [];
    const projects: Project[] = [];
    const ideas: Idea[] = [];
    const notes: AppNote[] = [];
    suggestions.forEach((s, i) => {
      if (s.kind === 'tarefa')
        tasks.push(newTask({ title: s.title, due: s.due, priority: s.priority, energy: s.energy, area: s.area, notes: s.detail, checklist: s.checklist?.map((t) => ({ id: uid(), text: t, done: false })) }));
      if (s.kind === 'projeto') {
        const p: Project = { id: uid(), title: s.title, description: s.detail, status: 'planejamento', color: PALETTE[(i + 3) % PALETTE.length], createdAt: now, deadline: s.due };
        projects.push(p);
        s.checklist?.forEach((step) => tasks.push(newTask({ title: step, projectId: p.id, area: s.area })));
      }
      if (s.kind === 'ideia') ideas.push({ id: uid(), title: s.title, problem: s.detail, stage: 'semente', createdAt: now });
      if (s.kind === 'nota') notes.push({ id: uid(), text: s.detail ? `${s.title}\n${s.detail}` : s.title, createdAt: now });
    });
    update((d) => ({
      ...d,
      focus: {
        ...d.focus,
        tasks: [...d.focus.tasks, ...tasks],
        projects: [...d.focus.projects, ...projects],
        ideas: [...ideas, ...d.focus.ideas],
        inbox: sourceInbox ? d.focus.inbox.filter((x) => x.id !== sourceInbox) : d.focus.inbox,
      },
      notes: [...notes, ...d.notes],
    }));
    const parts = [tasks.length && `${tasks.length} tarefa(s)`, projects.length && `${projects.length} projeto(s)`, ideas.length && `${ideas.length} ideia(s)`, notes.length && `${notes.length} nota(s)`].filter(Boolean);
    toast(`Salvo: ${parts.join(', ')}.`);
    setSuggestions(null);
    setOverloadMsg('');
    if (!sourceInbox) setText('');
    setSourceInbox(null);
  };

  return (
    <div>
      <PageHeader icon={Inbox} title="Captura" subtitle="Tire da cabeça. O Atlas organiza." />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6">
          <Card strong>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Despeje tudo aqui, do jeito que vier…\n\nEx.: amanhã pagar o IPTU, levar a Helena na natação sexta, comprar leite e fralda, ideia: fazer planilha de manutenção do carro, projeto: organizar o aniversário da Alice'}
              className="w-full min-h-[200px] bg-transparent outline-none resize-y text-[15px] leading-relaxed placeholder:text-text-muted/70"
            />
            <div className="flex flex-wrap gap-2 justify-end pt-3 border-t border-outline-variant/10">
              <Button variant="ghost" icon={Save} onClick={saveToInbox} disabled={!text.trim()}>
                Guardar para depois
              </Button>
              <Button icon={busy ? Loader2 : Wand2} onClick={() => organize()} disabled={!text.trim() || busy} className={busy ? '[&>svg]:animate-spin' : ''}>
                Organizar
              </Button>
            </div>
          </Card>

          {suggestions && (
            <Card>
              <SectionTitle
                right={
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    {usedAI ? (
                      <>
                        <Sparkles size={12} className="text-brand-primary" /> organizado por IA
                      </>
                    ) : (
                      'organizado offline'
                    )}
                  </span>
                }
              >
                Revise antes de salvar
              </SectionTitle>
              {overloadMsg && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 mb-4 text-sm">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" /> {overloadMsg}
                </div>
              )}
              {suggestions.length === 0 ? (
                <p className="text-sm text-text-muted">Nada para organizar.</p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => {
                    const K = KIND_META[s.kind];
                    return (
                      <div key={s.id} className="tile p-3">
                        <div className="flex items-start gap-2">
                          <input className="flex-1 bg-transparent outline-none text-sm font-semibold min-w-0" value={s.title} onChange={(e) => editSuggestion(s.id, { title: e.target.value })} />
                          <IconButton icon={Trash2} className="!w-7 !h-7" title="Descartar" onClick={() => setSuggestions((x) => x?.filter((y) => y.id !== s.id) || null)} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {(Object.keys(KIND_META) as CaptureKind[]).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => editSuggestion(s.id, { kind: k })}
                              className={cx('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-display font-extrabold uppercase tracking-wider border transition-all', s.kind === k ? 'text-white border-transparent' : 'text-text-muted border-outline-variant/20')}
                              style={s.kind === k ? { background: KIND_META[k].color } : undefined}
                            >
                              {(() => {
                                const I = KIND_META[k].icon;
                                return <I size={11} />;
                              })()}
                              {KIND_META[k].label}
                            </button>
                          ))}
                          {s.kind === 'tarefa' && (
                            <>
                              <select className="bg-bg-surface-low border border-outline-variant/20 rounded-lg text-[11px] px-1.5 py-1" value={s.priority} onChange={(e) => editSuggestion(s.id, { priority: e.target.value as Priority })}>
                                <option value="alta">Alta</option>
                                <option value="media">Média</option>
                                <option value="baixa">Baixa</option>
                              </select>
                              <input type="date" className="bg-bg-surface-low border border-outline-variant/20 rounded-lg text-[11px] px-1.5 py-0.5" value={s.due || ''} onChange={(e) => editSuggestion(s.id, { due: e.target.value || undefined })} />
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted mt-1.5 flex flex-wrap gap-x-2">
                          <span style={{ color: K.color }}>{K.label}</span>
                          {s.due && <span>📅 {relativeDayLabel(s.due)}</span>}
                          {s.energy && (
                            <span>
                              {ENERGY_META[s.energy].emoji} {ENERGY_META[s.energy].label}
                            </span>
                          )}
                          {s.area && <span>#{s.area}</span>}
                          {s.checklist && <span>☑ {s.checklist.join(', ')}</span>}
                        </p>
                        {s.detail && <p className="text-xs text-text-mid mt-1">{s.detail}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setSuggestions(null)}>
                  Cancelar
                </Button>
                <Button icon={CheckCircle2} onClick={commit} disabled={!suggestions.length}>
                  Salvar tudo
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle>Caixa de entrada · {data.focus.inbox.length}</SectionTitle>
            {data.focus.inbox.length === 0 ? (
              <EmptyState icon={Inbox} title="Vazia" text="Ótimo! Tudo processado." />
            ) : (
              <div className="space-y-2">
                {data.focus.inbox.map((i) => (
                  <div key={i.id} className="tile p-3">
                    <p className="text-sm whitespace-pre-wrap line-clamp-4">{i.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-text-muted">{formatDateBR(i.createdAt.slice(0, 10))}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="soft"
                          icon={Wand2}
                          onClick={() => {
                            setText(i.text);
                            void organize(i.text, i.id);
                          }}
                        >
                          Processar
                        </Button>
                        <IconButton icon={Trash2} className="!w-8 !h-8" title="Excluir" onClick={() => setFocus((f) => ({ ...f, inbox: f.inbox.filter((x) => x.id !== i.id) }))} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <SectionTitle>Atalhos que o Atlas entende</SectionTitle>
            <ul className="text-sm text-text-mid space-y-1.5">
              <li>
                <b>hoje, amanhã, sexta, 15/10</b> → prazo
              </li>
              <li>
                <b>!</b> ou <b>urgente</b> → prioridade alta
              </li>
              <li>
                <b>#casa</b>, <b>#trabalho</b> → área
              </li>
              <li>
                <b>@rua</b>, <b>@foco</b>, <b>@rotina</b> → tipo de energia
              </li>
              <li>
                <b>ideia:</b>, <b>projeto:</b>, <b>nota:</b> → tipo do item
              </li>
              <li>Uma linha (ou “;”) por item.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
