import { useState } from 'react';
import { AlertTriangle, FolderKanban, Lightbulb, Pencil, Plus, Rocket, Trash2 } from 'lucide-react';
import type { Idea, IdeaStage, Project, ProjectStatus, Task } from '../../types';
import { Button, Card, Chip, EmptyState, Fab, Field, IconButton, Modal, PageHeader, ProgressBar, Segmented, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { formatDateBR } from '../../lib/dates';
import { uid } from '../../lib/id';
import { PALETTE } from '../../lib/defaults';
import { byPriority } from './logic';
import { QuickAdd, TaskModal, TaskRow } from './TaskBits';

const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: '#10b981' },
  planejamento: { label: 'Planejamento', color: '#3b82f6' },
  pausado: { label: 'Pausado', color: '#94a3b8' },
  concluido: { label: 'Concluído', color: '#8b5cf6' },
};

const STAGE_META: Record<IdeaStage, { label: string; emoji: string }> = {
  semente: { label: 'Semente', emoji: '🌱' },
  refinando: { label: 'Refinando', emoji: '🛠️' },
  pronta: { label: 'Pronta', emoji: '🚀' },
};

export default function ProjetosScreen() {
  const [tab, setTab] = useState<'projetos' | 'ideias'>('projetos');
  const [editProject, setEditProject] = useState<Project | 'new' | null>(null);
  const [editIdea, setEditIdea] = useState<Idea | 'new' | null>(null);
  return (
    <div>
      <PageHeader
        icon={FolderKanban}
        title="Projetos"
        subtitle="Poucos ativos, bem andados"
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'projetos', label: 'Projetos', icon: FolderKanban },
              { value: 'ideias', label: 'Ideias', icon: Lightbulb },
            ]}
          />
        }
      />
      {tab === 'projetos' ? <ProjectsTab onEdit={setEditProject} /> : <IdeasTab onEdit={setEditIdea} onPromote={() => setTab('projetos')} />}
      <Fab onClick={() => (tab === 'projetos' ? setEditProject('new') : setEditIdea('new'))} icon={Plus} label={tab === 'projetos' ? 'Novo projeto' : 'Nova ideia'} />
      <ProjectModal project={editProject} onClose={() => setEditProject(null)} />
      <IdeaModal idea={editIdea} onClose={() => setEditIdea(null)} />
    </div>
  );
}

function ProjectsTab({ onEdit }: { onEdit: (p: Project) => void }) {
  const { data } = useStore();
  const [filter, setFilter] = useState<ProjectStatus | 'abertos'>('abertos');
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const projects = data.focus.projects.filter((p) => (filter === 'abertos' ? p.status !== 'concluido' : p.status === filter));
  const activeCount = data.focus.projects.filter((p) => p.status === 'ativo').length;

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-5">
        <Chip active={filter === 'abertos'} onClick={() => setFilter('abertos')}>
          Em aberto
        </Chip>
        {(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)} color={STATUS_META[s].color}>
            {STATUS_META[s].label}
          </Chip>
        ))}
      </div>
      {activeCount > 3 && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 mb-5 text-sm">
          <AlertTriangle className="text-amber-500 shrink-0" size={18} />
          Você tem {activeCount} projetos ativos. Foco máximo é 3 — pause algum para os outros andarem de verdade.
        </div>
      )}
      {projects.length === 0 ? (
        <Card>
          <EmptyState icon={FolderKanban} title="Nenhum projeto aqui" text="Projeto é tudo que tem mais de uma etapa: reforma, festa, viagem, curso…" />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const tasks = data.focus.tasks.filter((t) => t.projectId === p.id);
            const done = tasks.filter((t) => t.done).length;
            const open = tasks.filter((t) => !t.done).sort(byPriority);
            const next = open[0];
            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-extrabold text-lg leading-tight">{p.title}</h3>
                    {p.description && <p className="text-sm text-text-muted mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  <IconButton icon={Pencil} title="Editar" onClick={() => onEdit(p)} />
                </div>
                <div className="flex items-center gap-2 mt-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full font-display font-extrabold uppercase tracking-wider text-white" style={{ background: STATUS_META[p.status].color }}>
                    {STATUS_META[p.status].label}
                  </span>
                  {p.deadline && <span className="text-text-muted">até {formatDateBR(p.deadline, true)}</span>}
                  <span className="ml-auto text-text-muted">
                    {done}/{tasks.length} etapas
                  </span>
                </div>
                <ProgressBar value={tasks.length ? done / tasks.length : 0} color={p.color} className="mt-2" />
                {next && (
                  <p className="text-xs mt-3 text-text-mid">
                    <b className="text-brand-primary">Próximo passo:</b> {next.title}
                  </p>
                )}
                <div className="-mx-3 mt-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {open.slice(0, 6).map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setOpenTask} showProject={false} />
                  ))}
                </div>
                {open.length > 6 && <p className="text-[11px] text-text-muted">+{open.length - 6} etapas</p>}
                <div className="flex-1" />
                <div className="mt-3">
                  <QuickAdd defaults={{ projectId: p.id }} placeholder="Nova etapa…" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <TaskModal task={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}

function IdeasTab({ onEdit, onPromote }: { onEdit: (i: Idea) => void; onPromote: () => void }) {
  const { data, update, toast } = useStore();
  const ideas = data.focus.ideas;
  const promote = (i: Idea) => {
    update((d) => ({
      ...d,
      focus: {
        ...d.focus,
        ideas: d.focus.ideas.filter((x) => x.id !== i.id),
        projects: [...d.focus.projects, { id: uid(), title: i.title, description: [i.problem, i.mvp && `MVP: ${i.mvp}`].filter(Boolean).join('\n'), status: 'planejamento', color: PALETTE[d.focus.projects.length % PALETTE.length], createdAt: new Date().toISOString() }],
      },
    }));
    toast('Ideia virou projeto!');
    onPromote();
  };
  if (!ideas.length)
    return (
      <Card>
        <EmptyState icon={Lightbulb} title="Banco de ideias vazio" text="Guarde aqui ideias de negócio, apps, presentes, viagens… sem compromisso. Refine quando der." />
      </Card>
    );
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {ideas.map((i) => (
        <Card key={i.id} className="flex flex-col">
          <div className="flex items-start gap-2">
            <span className="text-xl">{STAGE_META[i.stage].emoji}</span>
            <h3 className="flex-1 font-display font-extrabold leading-tight">{i.title}</h3>
            <IconButton icon={Pencil} title="Refinar" onClick={() => onEdit(i)} />
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            {i.problem && (
              <div>
                <dt className="label !mb-0">Problema</dt>
                <dd className="text-text-mid">{i.problem}</dd>
              </div>
            )}
            {i.audience && (
              <div>
                <dt className="label !mb-0">Para quem</dt>
                <dd className="text-text-mid">{i.audience}</dd>
              </div>
            )}
            {i.mvp && (
              <div>
                <dt className="label !mb-0">Primeira versão</dt>
                <dd className="text-text-mid">{i.mvp}</dd>
              </div>
            )}
          </dl>
          <div className="flex-1" />
          <Button size="sm" variant="soft" icon={Rocket} className="mt-4" onClick={() => promote(i)}>
            Virar projeto
          </Button>
        </Card>
      ))}
    </div>
  );
}

function ProjectModal({ project, onClose }: { project: Project | 'new' | null; onClose: () => void }) {
  const { setFocus } = useStore();
  const [f, setF] = useState({ title: '', description: '', status: 'ativo' as ProjectStatus, color: PALETTE[1], deadline: '' });
  const [lastKey, setLastKey] = useState('');
  const key = project === 'new' ? 'new' : project?.id || '';
  if (project && key !== lastKey) {
    setLastKey(key);
    setF(project === 'new' ? { title: '', description: '', status: 'ativo', color: PALETTE[Math.floor(Math.random() * PALETTE.length)], deadline: '' } : { title: project.title, description: project.description || '', status: project.status, color: project.color, deadline: project.deadline || '' });
  }
  if (!project) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };
  const save = () => {
    if (!f.title.trim()) return;
    const base = { title: f.title.trim(), description: f.description || undefined, status: f.status, color: f.color, deadline: f.deadline || undefined };
    setFocus((fo) => ({ ...fo, projects: project === 'new' ? [...fo.projects, { id: uid(), createdAt: new Date().toISOString(), ...base }] : fo.projects.map((p) => (p.id === project.id ? { ...p, ...base } : p)) }));
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={project === 'new' ? 'Novo projeto' : 'Editar projeto'}
      footer={
        <div className="flex w-full gap-2">
          {project !== 'new' && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => {
                setFocus((fo) => ({ ...fo, projects: fo.projects.filter((p) => p.id !== project.id), tasks: fo.tasks.map((t) => (t.projectId === project.id ? { ...t, projectId: undefined } : t)) }));
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
        <Field label="Nome">
          <input className="field" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Objetivo">
          <textarea className="field min-h-[80px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Como você sabe que terminou?" />
        </Field>
        <Field label="Status">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => (
              <Chip key={s} active={f.status === s} color={STATUS_META[s].color} onClick={() => setF({ ...f, status: s })}>
                {STATUS_META[s].label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Prazo (opcional)">
          <input type="date" className="field" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
        </Field>
        <Field label="Cor">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setF({ ...f, color: c })} className={cx('w-8 h-8 rounded-full border-2', f.color === c ? 'border-text-high scale-110' : 'border-transparent')} style={{ background: c }} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function IdeaModal({ idea, onClose }: { idea: Idea | 'new' | null; onClose: () => void }) {
  const { setFocus } = useStore();
  const empty = { title: '', problem: '', audience: '', mvp: '', stage: 'semente' as IdeaStage };
  const [f, setF] = useState(empty);
  const [lastKey, setLastKey] = useState('');
  const key = idea === 'new' ? 'new' : idea?.id || '';
  if (idea && key !== lastKey) {
    setLastKey(key);
    setF(idea === 'new' ? empty : { title: idea.title, problem: idea.problem || '', audience: idea.audience || '', mvp: idea.mvp || '', stage: idea.stage });
  }
  if (!idea) return null;
  const close = () => {
    setLastKey('');
    onClose();
  };
  const save = () => {
    if (!f.title.trim()) return;
    const base = { title: f.title.trim(), problem: f.problem || undefined, audience: f.audience || undefined, mvp: f.mvp || undefined, stage: f.stage };
    setFocus((fo) => ({ ...fo, ideas: idea === 'new' ? [{ id: uid(), createdAt: new Date().toISOString(), ...base }, ...fo.ideas] : fo.ideas.map((i) => (i.id === idea.id ? { ...i, ...base } : i)) }));
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={idea === 'new' ? 'Nova ideia' : 'Refinar ideia'}
      footer={
        <div className="flex w-full gap-2">
          {idea !== 'new' && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => {
                setFocus((fo) => ({ ...fo, ideas: fo.ideas.filter((i) => i.id !== idea.id) }));
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
        <Field label="Ideia">
          <input className="field" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Que problema resolve?">
          <textarea className="field" value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} />
        </Field>
        <Field label="Para quem?">
          <input className="field" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} />
        </Field>
        <Field label="Menor versão possível (MVP)">
          <textarea className="field" value={f.mvp} onChange={(e) => setF({ ...f, mvp: e.target.value })} />
        </Field>
        <Field label="Estágio">
          <Segmented value={f.stage} onChange={(v) => setF({ ...f, stage: v })} options={(Object.keys(STAGE_META) as IdeaStage[]).map((s) => ({ value: s, label: `${STAGE_META[s].emoji} ${STAGE_META[s].label}` }))} />
        </Field>
      </div>
    </Modal>
  );
}
