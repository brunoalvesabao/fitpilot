import { useRef, useState } from 'react';
import { Archive, Download, FileSpreadsheet, ListChecks, LogOut, NotebookPen, Plus, RotateCcw, Settings, Upload, X } from 'lucide-react';
import { Button, Card, ConfirmDialog, PageHeader, SectionTitle, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import { isSupabaseConfigured } from '../../lib/supabase';
import { createDefaultData, normalizeData } from '../../lib/defaults';
import { APP_NAME, APP_VERSION } from '../../config';

export default function SystemScreen() {
  const { data, update, setFinance, setFocus, replaceAll, theme, setTheme, session, signOut, toast } = useStore();
  const { navigate } = useNav();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newMethod, setNewMethod] = useState('');
  const [newArea, setNewArea] = useState('');

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${APP_NAME.toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup baixado.');
  };

  const onBackupFile = async (file: File) => {
    try {
      setPendingImport(JSON.parse(await file.text()));
    } catch {
      toast('Arquivo de backup inválido.');
    }
  };

  const archivedCats = data.finance.categories.filter((c) => c.archived);
  const email = session?.user.email;

  return (
    <div>
      <PageHeader icon={Settings} title="Sistema" />
      <div className="space-y-6">
        <Card>
          <SectionTitle>Conta</SectionTitle>
          <div className="tile p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center font-display font-extrabold">
              {(data.profile.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <input
                className="bg-transparent outline-none font-semibold text-sm w-full"
                value={data.profile.name}
                onChange={(e) => update((d) => ({ ...d, profile: { ...d.profile, name: e.target.value } }))}
                aria-label="Seu nome"
              />
              <p className="text-xs text-text-muted truncate">
                {email || (isSupabaseConfigured ? 'Modo local (sem sincronizar)' : 'Modo local — configure o Supabase para sincronizar entre aparelhos')}
              </p>
            </div>
            {session ? (
              <Button variant="danger" size="sm" icon={LogOut} onClick={() => void signOut()}>
                Sair
              </Button>
            ) : (
              isSupabaseConfigured && (
                <Button variant="soft" size="sm" onClick={() => void signOut()}>
                  Entrar
                </Button>
              )
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle>Ferramentas</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Notas', icon: NotebookPen, to: 'system-notes' as const },
              { label: 'Checklists', icon: ListChecks, to: 'system-checklists' as const },
              { label: 'Importar planilha', icon: FileSpreadsheet, to: 'system-import' as const },
            ].map((t) => (
              <button key={t.label} type="button" onClick={() => navigate(t.to)} className="tile py-6 flex flex-col items-center gap-2 hover:border-brand-primary/40 transition-all active:scale-[0.98]">
                <t.icon size={20} className="text-brand-primary" />
                <span className="font-display text-[10px] font-extrabold uppercase tracking-widest">{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Aparência</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cx('rounded-2xl p-3 border transition-all text-left', theme === t ? 'border-brand-primary bg-brand-primary/10' : 'border-outline-variant/20 bg-bg-surface-med')}
              >
                <div className={cx('h-12 rounded-xl flex items-center justify-end px-3 border', t === 'dark' ? 'bg-black border-zinc-800' : 'bg-white border-slate-200')}>
                  <span className={cx('w-3 h-3 rounded-full', t === 'dark' ? 'bg-[#ffc533]' : 'bg-[#e07b07]')} />
                </div>
                <p className={cx('mt-2 text-center font-display text-[10px] font-extrabold uppercase tracking-widest', theme === t ? 'text-text-high' : 'text-text-muted')}>{t === 'dark' ? 'Modo escuro' : 'Modo claro'}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <SectionTitle>Formas de pagamento</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.finance.paymentMethods.map((m) => (
                <span key={m} className="tile pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 text-sm">
                  {m}
                  <button type="button" title="Remover" onClick={() => setFinance((f) => ({ ...f, paymentMethods: f.paymentMethods.filter((x) => x !== m) }))} className="text-text-muted hover:text-rose-500">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = newMethod.trim();
                if (v && !data.finance.paymentMethods.includes(v)) setFinance((f) => ({ ...f, paymentMethods: [...f.paymentMethods, v] }));
                setNewMethod('');
              }}
            >
              <input className="field !py-2" placeholder="Ex.: Cartão Nubank" value={newMethod} onChange={(e) => setNewMethod(e.target.value)} />
              <Button type="submit" variant="soft" icon={Plus} />
            </form>
          </Card>

          <Card>
            <SectionTitle>Áreas da vida (tarefas)</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.focus.areas.map((a) => (
                <span key={a} className="tile pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 text-sm">
                  {a}
                  <button type="button" title="Remover" onClick={() => setFocus((f) => ({ ...f, areas: f.areas.filter((x) => x !== a) }))} className="text-text-muted hover:text-rose-500">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = newArea.trim();
                if (v && !data.focus.areas.includes(v)) setFocus((f) => ({ ...f, areas: [...f.areas, v] }));
                setNewArea('');
              }}
            >
              <input className="field !py-2" placeholder="Ex.: Ministério" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
              <Button type="submit" variant="soft" icon={Plus} />
            </form>
          </Card>
        </div>

        {archivedCats.length > 0 && (
          <Card>
            <SectionTitle>Categorias arquivadas</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {archivedCats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFinance((f) => ({ ...f, categories: f.categories.map((x) => (x.id === c.id ? { ...x, archived: false } : x)) }))}
                  className="tile px-3 py-1.5 text-sm flex items-center gap-1.5 hover:border-brand-primary/40"
                  title="Restaurar"
                >
                  <Archive size={13} className="text-text-muted" /> {c.name}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <SectionTitle>Dados</SectionTitle>
          <p className="text-sm text-text-muted mb-4">
            {session ? 'Seus dados ficam salvos neste aparelho e sincronizados na nuvem (Supabase).' : 'Seus dados ficam salvos neste navegador. Faça backups de vez em quando.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={Download} onClick={exportJSON}>
              Exportar backup
            </Button>
            <Button variant="outline" icon={Upload} onClick={() => fileRef.current?.click()}>
              Restaurar backup
            </Button>
            <Button variant="danger" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
              Apagar tudo
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onBackupFile(e.target.files[0])} />
          </div>
        </Card>

        <p className="text-center text-xs text-text-muted pb-4">
          {APP_NAME} v{APP_VERSION} · feito sob medida, inspirado no Nexus
        </p>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Restaurar backup"
        confirmLabel="Restaurar"
        message="Isso substitui TODOS os dados atuais pelos do arquivo. Continuar?"
        onConfirm={() => {
          replaceAll(normalizeData(pendingImport));
          toast('Backup restaurado.');
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Apagar tudo"
        confirmLabel="Apagar tudo"
        message="Todos os lançamentos, tarefas, hábitos, metas e jogos serão apagados (inclusive na nuvem). Exporte um backup antes se quiser guardar."
        onConfirm={() => {
          replaceAll(createDefaultData());
          toast('Dados apagados.');
        }}
      />
    </div>
  );
}
