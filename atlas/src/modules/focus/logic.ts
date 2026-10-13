import type { Energy, FocusData, Priority, Task } from '../../types';
import { addDays, parseISODate, todayISO, toISODate } from '../../lib/dates';
import { uid } from '../../lib/id';

export const ENERGY_META: Record<Energy, { label: string; hint: string; color: string; emoji: string }> = {
  cognitiva: { label: 'Foco', hint: 'Exige concentração (escrever, estudar, planejar)', color: '#8b5cf6', emoji: '🧠' },
  operacional: { label: 'Rotina', hint: 'Rápido e repetitivo (contas, mensagens, e-mails)', color: '#3b82f6', emoji: '⚙️' },
  externa: { label: 'Rua', hint: 'Precisa sair de casa (mercado, banco, médico)', color: '#10b981', emoji: '🚗' },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  alta: { label: 'Alta', color: '#ef4444' },
  media: { label: 'Média', color: '#f59e0b' },
  baixa: { label: 'Baixa', color: '#94a3b8' },
};

const WEEKDAY_RES: [RegExp, number][] = [
  ['domingo', 0], ['segunda(?:-feira)?', 1], ['ter[cç]a(?:-feira)?', 2], ['quarta(?:-feira)?', 3],
  ['quinta(?:-feira)?', 4], ['sexta(?:-feira)?', 5], ['s[aá]bado', 6],
].map(([w, d]) => [new RegExp(`\\s(?:na |no |nesta |neste |pr[oó]xima |pr[oó]ximo )?${w}(?=\\s)`, 'i'), d as number] as [RegExp, number]);

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export interface QuickParse {
  title: string;
  due?: string;
  priority: Priority;
  energy?: Energy;
  area?: string;
}

/**
 * Entende atalhos digitados no título:
 * "hoje", "amanhã", "sexta", "15/10" → prazo · "!" → prioridade alta · "#casa" → área ·
 * "@rua" / "@foco" / "@rotina" → tipo de energia.
 */
export function parseQuickTask(input: string, areas: string[]): QuickParse {
  let title = ` ${input.trim()} `;
  let due: string | undefined;
  let priority: Priority = 'media';
  let energy: Energy | undefined;
  let area: string | undefined;
  const today = todayISO();

  if (/(^|\s)!{1,3}(\s|$)/.test(title) || /\burgente\b/i.test(title)) {
    priority = 'alta';
    title = title.replace(/(^|\s)!{1,3}(?=\s|$)/g, ' ');
  }
  title = title.replace(/(^|\s)#([\p{L}\d_-]+)/gu, (_m, sp, tag: string) => {
    const found = areas.find((a) => strip(a) === strip(tag));
    area = found || tag.charAt(0).toUpperCase() + tag.slice(1);
    return sp;
  });
  title = title.replace(/(^|\s)@([\p{L}]+)/gu, (m, sp, tag: string) => {
    const t = strip(tag);
    if (['rua', 'externa', 'fora'].includes(t)) energy = 'externa';
    else if (['foco', 'cognitiva', 'mente'].includes(t)) energy = 'cognitiva';
    else if (['rotina', 'operacional', 'rapido'].includes(t)) energy = 'operacional';
    else return m;
    return sp;
  });

  const lower = strip(title);
  if (/\s(hoje)\s/.test(lower)) {
    due = today;
    title = title.replace(/\shoje(?=\s)/i, ' ');
  } else if (/\s(amanha)\s/.test(lower)) {
    due = addDays(today, 1);
    title = title.replace(/\samanh[ãa](?=\s)/i, ' ');
  } else {
    const dm = title.match(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/);
    if (dm) {
      const now = new Date();
      let y = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : now.getFullYear();
      const d = new Date(y, Number(dm[2]) - 1, Number(dm[1]));
      if (!dm[3] && toISODate(d) < today) {
        y += 1;
        d.setFullYear(y);
      }
      due = toISODate(d);
      title = title.replace(dm[0], ' ');
    } else {
      for (const [re, dow] of WEEKDAY_RES) {
        if (re.test(title)) {
          const diff = (dow - parseISODate(today).getDay() + 7) % 7 || 7;
          due = addDays(today, diff);
          title = title.replace(re, ' ');
          break;
        }
      }
    }
  }

  if (!energy) {
    if (/\b(mercado|farm[aá]cia|banco|m[eé]dico|consulta|buscar|levar|comprar|cart[oó]rio|correios|posto)\b/i.test(title)) energy = 'externa';
    else if (/\b(pagar|responder|ligar|mandar|enviar|agendar|marcar|transferir)\b/i.test(title)) energy = 'operacional';
    else if (/\b(estudar|escrever|planejar|relat[oó]rio|ler|preparar|revisar|criar|desenvolver)\b/i.test(title)) energy = 'cognitiva';
  }

  const clean = title.replace(/\s+/g, ' ').trim();
  return { title: clean.charAt(0).toUpperCase() + clean.slice(1), due, priority, energy, area };
}

export function newTask(p: Partial<Task> & { title: string }): Task {
  return { id: uid(), done: false, createdAt: new Date().toISOString(), priority: 'media', ...p };
}

export function isOverdue(t: Task, today = todayISO()): boolean {
  return !t.done && !!t.due && t.due < today;
}

export function todayTasks(tasks: Task[], today = todayISO()) {
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const dueToday = tasks.filter((t) => !t.done && t.due === today);
  const focus = tasks.filter((t) => !t.done && t.focusDate === today);
  const doneToday = tasks.filter((t) => t.done && t.doneAt?.slice(0, 10) === today);
  return { overdue, dueToday, focus, doneToday };
}

const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };
export const byPriority = (a: Task, b: Task) =>
  PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.due || '9999').localeCompare(b.due || '9999') || a.createdAt.localeCompare(b.createdAt);

/** Sinal de sobrecarga (regra do Clara OS, mas com dados reais). */
export function overload(tasks: Task[]): string | null {
  const today = todayISO();
  const { overdue, dueToday } = todayTasks(tasks, today);
  const load = [...overdue, ...dueToday];
  const deep = load.filter((t) => t.energy === 'cognitiva').length;
  const street = load.filter((t) => t.energy === 'externa').length;
  if (load.length >= 10) return `Você tem ${load.length} tarefas para hoje. Escolha 3 para o foco e mova o resto — dia cheio demais vira frustração.`;
  if (deep >= 4) return `${deep} tarefas de foco profundo hoje é muita coisa. Seu cérebro rende bem 2 ou 3. Que tal mover alguma para amanhã?`;
  if (street >= 3) return `${street} tarefas na rua: agrupe numa saída só e economize tempo e combustível.`;
  if (overdue.length >= 5) return `${overdue.length} tarefas atrasadas. Faça uma faxina: reagende, delegue ou exclua o que não faz mais sentido.`;
  return null;
}

/** Concluir/desfazer, criando a próxima ocorrência quando a tarefa se repete. */
export function toggleTask(focus: FocusData, id: string): FocusData {
  const t = focus.tasks.find((x) => x.id === id);
  if (!t) return focus;
  const nowDone = !t.done;
  let tasks = focus.tasks.map((x) => (x.id === id ? { ...x, done: nowDone, doneAt: nowDone ? new Date().toISOString() : undefined } : x));
  if (nowDone && t.repeat) {
    const base = t.due || todayISO();
    let next = base;
    if (t.repeat === 'daily') next = addDays(base, 1);
    if (t.repeat === 'weekly') next = addDays(base, 7);
    if (t.repeat === 'monthly') {
      const d = parseISODate(base);
      d.setMonth(d.getMonth() + 1);
      next = toISODate(d);
    }
    tasks = [...tasks, { ...t, id: uid(), done: false, doneAt: undefined, due: next, focusDate: undefined, createdAt: new Date().toISOString(), checklist: t.checklist?.map((c) => ({ ...c, done: false })) }];
  }
  return { ...focus, tasks };
}

// ------------------------------------------------------------------
// Captura: transforma um "despejo mental" em itens
// ------------------------------------------------------------------
export type CaptureKind = 'tarefa' | 'projeto' | 'ideia' | 'nota';

export interface CaptureSuggestion {
  id: string;
  kind: CaptureKind;
  title: string;
  due?: string;
  priority: Priority;
  energy?: Energy;
  area?: string;
  detail?: string;
  checklist?: string[];
}

export function localOrganize(text: string, areas: string[]): CaptureSuggestion[] {
  const pieces = text
    .split(/\n|;|•|(?:^|\s)- (?=\S)|\. (?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)
    .map((s) => s.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((s) => s.length > 1);
  return pieces.map((raw) => {
    const low = strip(raw);
    let kind: CaptureKind = 'tarefa';
    let body = raw;
    const prefix = low.match(/^(ideia|projeto|nota|anotar|lembrete)\s*[:\-–]?\s*/);
    if (prefix) {
      kind = prefix[1] === 'ideia' ? 'ideia' : prefix[1] === 'projeto' ? 'projeto' : 'nota';
      body = raw.slice(prefix[0].length);
    } else if (/^(e se|seria legal|talvez|pensei em)/.test(low)) kind = 'ideia';
    const parsed = parseQuickTask(body, areas);
    if (!parsed.area && /\bcomprar\b/i.test(body)) parsed.area = areas.find((a) => strip(a) === 'compras') || 'Compras';
    return { id: uid(), kind, title: parsed.title || body, due: parsed.due, priority: parsed.priority, energy: parsed.energy, area: parsed.area };
  });
}
