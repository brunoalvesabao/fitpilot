import { useState } from 'react';
import { ArrowLeft, NotebookPen, Pin, Plus, Search, Trash2 } from 'lucide-react';
import type { AppNote } from '../../types';
import { Button, Card, EmptyState, IconButton, Modal, PageHeader, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { uid } from '../../lib/id';

export default function NotesScreen() {
  const { data, update, toast } = useStore();
  const { navigate } = useNav();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AppNote | null>(null);
  const [draft, setDraft] = useState('');

  const notes = data.notes
    .filter((n) => !query || n.text.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

  const setNotes = (fn: (n: AppNote[]) => AppNote[]) => update((d) => ({ ...d, notes: fn(d.notes) }));

  const open = (n: AppNote | null) => {
    const note = n || { id: uid(), text: '', createdAt: new Date().toISOString() };
    setEditing(note);
    setDraft(note.text);
  };

  const save = () => {
    if (!editing) return;
    const text = draft.trim();
    if (!text) {
      setNotes((ns) => ns.filter((x) => x.id !== editing.id));
    } else {
      const exists = data.notes.some((x) => x.id === editing.id);
      const note = { ...editing, text, updatedAt: new Date().toISOString() };
      setNotes((ns) => (exists ? ns.map((x) => (x.id === note.id ? note : x)) : [note, ...ns]));
    }
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        icon={NotebookPen}
        title="Notas"
        actions={
          <>
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('system')}>
              Sistema
            </Button>
            <Button icon={Plus} onClick={() => open(null)}>
              Nova nota
            </Button>
          </>
        }
      />
      <div className="flex items-center gap-2 field !py-2 mb-5">
        <Search size={15} className="text-text-muted" />
        <input className="bg-transparent outline-none w-full text-sm" placeholder="Buscar nas notas…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {notes.length === 0 ? (
        <Card>
          <EmptyState icon={NotebookPen} title="Nenhuma nota" text="Senhas de wi-fi, medidas, versículos, números de protocolo… guarde tudo aqui." />
        </Card>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [&>*]:mb-4">
          {notes.map((n) => (
            <div key={n.id} className="break-inside-avoid card p-4 cursor-pointer hover:border-brand-primary/40" onClick={() => open(n)}>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm whitespace-pre-wrap line-clamp-[12]">{n.text}</p>
                <button
                  type="button"
                  title={n.pinned ? 'Desafixar' : 'Fixar'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotes((ns) => ns.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)));
                  }}
                  className={cx('p-1 rounded-lg', n.pinned ? 'text-brand-primary' : 'text-text-muted/40 hover:text-text-muted')}
                >
                  <Pin size={14} fill={n.pinned ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="text-[10px] text-text-muted mt-3">{new Date(n.updatedAt || n.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!editing}
        onClose={save}
        title="Nota"
        footer={
          <div className="flex w-full gap-2">
            <IconButton
              icon={Trash2}
              title="Excluir"
              onClick={() => {
                if (editing) setNotes((ns) => ns.filter((x) => x.id !== editing.id));
                setEditing(null);
                toast('Nota excluída.');
              }}
            />
            <div className="flex-1" />
            <Button onClick={save}>Salvar</Button>
          </div>
        }
      >
        <textarea autoFocus className="field min-h-[260px] leading-relaxed" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva…" />
      </Modal>
    </div>
  );
}
