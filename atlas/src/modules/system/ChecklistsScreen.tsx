import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ListChecks, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { ChecklistCategory } from '../../types';
import { Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, ProgressBar, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { uid } from '../../lib/id';

export default function ChecklistsScreen() {
  const { data, update } = useStore();
  const { navigate } = useNav();
  const [name, setName] = useState('');
  const [toDelete, setToDelete] = useState<ChecklistCategory | null>(null);
  const set = (fn: (c: ChecklistCategory[]) => ChecklistCategory[]) => update((d) => ({ ...d, checklists: fn(d.checklists) }));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    set((c) => [...c, { id: uid(), name: name.trim(), items: [] }]);
    setName('');
  };

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title="Checklists"
        subtitle="Listas reutilizáveis: viagem, mercado, mala da maternidade…"
        actions={
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('system')}>
            Sistema
          </Button>
        }
      />
      <form onSubmit={add} className="flex gap-2 mb-6 max-w-md">
        <input className="field" placeholder="Nova lista…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" icon={Plus}>
          Criar
        </Button>
      </form>
      {data.checklists.length === 0 ? (
        <Card>
          <EmptyState icon={ListChecks} title="Nenhuma lista" text="Crie listas que você usa sempre e desmarque tudo com um toque para reutilizar." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.checklists.map((cl) => (
            <ChecklistCard key={cl.id} cl={cl} set={set} onDelete={() => setToDelete(cl)} />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir lista"
        message={`Excluir "${toDelete?.name}"?`}
        onConfirm={() => toDelete && set((c) => c.filter((x) => x.id !== toDelete.id))}
      />
    </div>
  );
}

function ChecklistCard({ cl, set, onDelete }: { cl: ChecklistCategory; set: (fn: (c: ChecklistCategory[]) => ChecklistCategory[]) => void; onDelete: () => void }) {
  const [text, setText] = useState('');
  const done = cl.items.filter((i) => i.completed).length;
  const patch = (fn: (c: ChecklistCategory) => ChecklistCategory) => set((all) => all.map((x) => (x.id === cl.id ? fn(x) : x)));
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="flex-1 font-display font-extrabold truncate">{cl.name}</h3>
        <span className="text-xs text-text-muted">
          {done}/{cl.items.length}
        </span>
        <IconButton icon={RotateCcw} title="Desmarcar tudo" onClick={() => patch((c) => ({ ...c, items: c.items.map((i) => ({ ...i, completed: false })) }))} />
        <IconButton icon={Trash2} title="Excluir lista" onClick={onDelete} />
      </div>
      <ProgressBar value={cl.items.length ? done / cl.items.length : 0} className="!h-1.5 mb-3" />
      <div className="space-y-0.5">
        {cl.items.map((i) => (
          <div key={i.id} className="group flex items-center gap-2.5 py-1.5">
            <button
              type="button"
              onClick={() => patch((c) => ({ ...c, items: c.items.map((x) => (x.id === i.id ? { ...x, completed: !x.completed } : x)) }))}
              className={cx('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0', i.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-outline-variant/40')}
            >
              {i.completed && <Check size={12} strokeWidth={3} />}
            </button>
            <span className={cx('flex-1 text-sm', i.completed && 'line-through text-text-muted')}>{i.text}</span>
            <button type="button" onClick={() => patch((c) => ({ ...c, items: c.items.filter((x) => x.id !== i.id) }))} className="text-text-muted md:opacity-0 group-hover:opacity-100 hover:text-rose-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          patch((c) => ({ ...c, items: [...c.items, { id: uid(), text: text.trim(), completed: false }] }));
          setText('');
        }}
      >
        <input className="field !py-2 text-sm" placeholder="+ item (Enter)" value={text} onChange={(e) => setText(e.target.value)} />
      </form>
    </Card>
  );
}
