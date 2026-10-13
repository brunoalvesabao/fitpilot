// ============================================================
// FINANÇAS — modelado a partir da planilha de orçamento familiar
// ============================================================

export type CategoryGroup = 'essencial' | 'nao_essencial' | 'investimento';

export interface FinCategory {
  id: string;
  name: string;
  group: CategoryGroup;
  archived?: boolean;
}

export interface IncomeSource {
  id: string;
  name: string;
  archived?: boolean;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string; // estabelecimento
  categoryId: string;
  amount: number; // sempre positivo (despesa)
  paymentMethod: string;
  installment?: { n: number; total: number; groupId?: string };
  billId?: string;
  goalId?: string;
  note?: string;
  createdAt: string;
}

export interface Income {
  id: string;
  month: string; // YYYY-MM
  sourceId: string;
  amount: number;
  received?: boolean;
  note?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // 1-31
  categoryId: string;
  paymentMethod: string;
  startMonth: string; // YYYY-MM
  endMonth?: string; // YYYY-MM (inclusive) — vazio = sem fim
  archived?: boolean;
}

export interface BillPayment {
  paid: boolean;
  amount: number;
  date: string;
  txId?: string;
}

export interface GoalContribution {
  id: string;
  date: string;
  amount: number;
  txId?: string;
}

export interface Goal {
  id: string;
  name: string;
  reason: string; // SEGURANÇA, LIBERDADE, CONFORTO...
  target: number;
  deadline: string; // YYYY-MM-DD
  initial: number;
  where?: string;
  categoryId?: string; // categoria de investimento usada ao aportar
  contributions: GoalContribution[];
  color: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  creditor: string;
  startDate: string;
  initialValue: number;
  installmentValue: number;
  totalInstallments: number;
  currentInstallment: number; // próxima parcela a pagar
  interest?: number; // % a.m.
  cet?: number; // % a.a.
  reason?: string;
  categoryId?: string;
  createdAt: string;
}

export interface FinanceData {
  categories: FinCategory[];
  incomeSources: IncomeSource[];
  paymentMethods: string[];
  transactions: Transaction[];
  incomes: Income[];
  budgets: Record<string, Record<string, number>>; // month -> categoryId -> orçado
  bills: Bill[];
  billPayments: Record<string, Record<string, BillPayment>>; // month -> billId -> pagamento
  goals: Goal[];
  debts: Debt[];
  rule: { essencial: number; nao_essencial: number; investimento: number };
}

// ============================================================
// FOCO — produtividade (sucessor do Clara OS)
// ============================================================

export type Energy = 'cognitiva' | 'operacional' | 'externa';
export type Priority = 'alta' | 'media' | 'baixa';

export interface ChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  doneAt?: string; // ISO
  createdAt: string;
  due?: string; // YYYY-MM-DD
  priority: Priority;
  energy?: Energy;
  area?: string;
  projectId?: string;
  focusDate?: string; // data em que entrou no "Top 3 do dia"
  checklist?: ChecklistEntry[];
  repeat?: 'daily' | 'weekly' | 'monthly';
}

export type ProjectStatus = 'ativo' | 'planejamento' | 'pausado' | 'concluido';

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  deadline?: string;
  createdAt: string;
}

export type IdeaStage = 'semente' | 'refinando' | 'pronta';

export interface Idea {
  id: string;
  title: string;
  problem?: string;
  audience?: string;
  mvp?: string;
  stage: IdeaStage;
  createdAt: string;
}

export interface InboxItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  weekdays: number[]; // 0=Dom ... 6=Sáb
  log: Record<string, boolean>; // YYYY-MM-DD -> feito
  createdAt: string;
  archived?: boolean;
}

export interface DayReview {
  date: string; // YYYY-MM-DD
  mood?: number; // 1..5
  note?: string;
  closedAt: string;
}

export interface FocusData {
  tasks: Task[];
  projects: Project[];
  ideas: Idea[];
  inbox: InboxItem[];
  habits: Habit[];
  reviews: DayReview[];
  areas: string[];
}

// ============================================================
// GAMES — mesmo modelo do Nocturne
// ============================================================

export interface GameTrophyEntry {
  id: string;
  jogo: string;
  platina: number;
  ouro: number;
  prata: number;
  bronze: number;
  platforms: ('PS3' | 'PSVita' | 'PS4' | 'PS5')[];
  garapa: boolean;
  hide: boolean;
  dataPlatina?: string; // YYYY-MM-DD
}

export interface ToPlayGame {
  id: string;
  name: string;
}

export interface ToPlayConsole {
  id: string;
  name: string;
  games: ToPlayGame[];
}

export interface PokemonEntry {
  id: string;
  num: string;
  name: string;
  spriteId?: string;
  hasMale: boolean;
  hasFemale: boolean;
  hasGenderless: boolean;
  isMaleCaught?: boolean;
  isFemaleCaught?: boolean;
  isGenderlessCaught?: boolean;
  isShinyCaught?: boolean;
  isShinyExcluded?: boolean;
  type1?: string;
  type2?: string;
  isLegendary?: boolean;
  isMythical?: boolean;
  isExtraForm?: boolean;
}

export interface PokemonGeneration {
  id: string;
  name: string;
  pokemons: PokemonEntry[];
}

export interface GamesData {
  trophyEntries: GameTrophyEntry[];
  toPlayConsoles: ToPlayConsole[];
  pokemonGenerations: PokemonGeneration[];
}

// ============================================================
// SISTEMA
// ============================================================

export interface AppNote {
  id: string;
  text: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface AppData {
  schemaVersion: number;
  profile: { name: string };
  finance: FinanceData;
  focus: FocusData;
  games: GamesData;
  notes: AppNote[];
  checklists: ChecklistCategory[];
  updatedAt: string; // ISO — usado na sincronização (last-write-wins)
}

export type Theme = 'light' | 'dark';

export type ModuleId = 'home' | 'finance' | 'focus' | 'games' | 'system';

export type ScreenId =
  | 'home'
  | 'fin-lancamentos'
  | 'fin-orcamento'
  | 'fin-contas'
  | 'fin-metas'
  | 'fin-ano'
  | 'focus-hoje'
  | 'focus-captura'
  | 'focus-projetos'
  | 'focus-habitos'
  | 'focus-revisao'
  | 'games-trophies'
  | 'games-pokemon'
  | 'games-toplay'
  | 'system'
  | 'system-notes'
  | 'system-checklists'
  | 'system-import';
