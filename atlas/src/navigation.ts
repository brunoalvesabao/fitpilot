import { createContext, useContext } from 'react';
import {
  BarChart3,
  CalendarClock,
  FolderKanban,
  Gamepad2,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Flame,
  PieChart,
  Play,
  ReceiptText,
  Settings,
  Sun,
  Target,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId, ScreenId } from './types';
import { PokeballIcon } from './components/icons';

export interface NavScreen {
  id: ScreenId;
  label: string;
  icon: LucideIcon | typeof PokeballIcon;
}

export interface NavModule {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  screens: NavScreen[];
}

export const MODULES: NavModule[] = [
  { id: 'home', label: 'Início', icon: LayoutDashboard, screens: [{ id: 'home', label: 'Início', icon: LayoutDashboard }] },
  {
    id: 'finance',
    label: 'Finanças',
    icon: Wallet,
    screens: [
      { id: 'fin-lancamentos', label: 'Lançar', icon: ReceiptText },
      { id: 'fin-orcamento', label: 'Orçamento', icon: PieChart },
      { id: 'fin-contas', label: 'Contas', icon: CalendarClock },
      { id: 'fin-metas', label: 'Metas', icon: Target },
      { id: 'fin-ano', label: 'Ano', icon: BarChart3 },
    ],
  },
  {
    id: 'focus',
    label: 'Foco',
    icon: Zap,
    screens: [
      { id: 'focus-hoje', label: 'Hoje', icon: Sun },
      { id: 'focus-captura', label: 'Captura', icon: Inbox },
      { id: 'focus-projetos', label: 'Projetos', icon: FolderKanban },
      { id: 'focus-habitos', label: 'Hábitos', icon: Flame },
      { id: 'focus-revisao', label: 'Revisão', icon: LineChart },
    ],
  },
  {
    id: 'games',
    label: 'Games',
    icon: Gamepad2,
    screens: [
      { id: 'games-trophies', label: 'Trophies', icon: Trophy },
      { id: 'games-pokemon', label: 'Pokémon', icon: PokeballIcon },
      { id: 'games-toplay', label: 'To Play', icon: Play },
    ],
  },
  { id: 'system', label: 'Sistema', icon: Settings, screens: [{ id: 'system', label: 'Sistema', icon: Settings }] },
];

export const SYSTEM_SUBSCREENS: ScreenId[] = ['system-notes', 'system-checklists', 'system-import'];

export function moduleOf(screen: ScreenId): ModuleId {
  if (SYSTEM_SUBSCREENS.includes(screen)) return 'system';
  return MODULES.find((m) => m.screens.some((s) => s.id === screen))?.id ?? 'home';
}

export const ListIcon = ListTodo;

interface NavValue {
  screen: ScreenId;
  navigate: (s: ScreenId) => void;
}
export const NavContext = createContext<NavValue>({ screen: 'home', navigate: () => {} });
export const useNav = () => useContext(NavContext);
