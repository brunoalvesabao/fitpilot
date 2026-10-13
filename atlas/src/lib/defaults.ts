import type { AppData, CategoryGroup, FinCategory, IncomeSource, PokemonEntry, PokemonGeneration } from '../types';
import { RAW_POKEMON_GEN1_TSV } from '../modules/games/pokemonSeed';

export const SCHEMA_VERSION = 1;

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Categorias da planilha "ORÇAMENTO PESSOAL" (aba List), agrupadas como na planilha.
const CATEGORY_SEED: Record<CategoryGroup, string[]> = {
  essencial: [
    'Dízimo', 'Financiamento Casa', 'Água', 'Energia', 'Internet/Telefone', 'Imposto IPTU', 'Manutenção Casa',
    'Supermercado', 'Sacolão/Padaria', 'Leite Fórmula', 'Passagem Trabalho', 'Passagem Igreja', 'Farmácia',
    'Terapia', 'Mensalidade Escola', 'Livros Escolares', 'Faculdade', 'Lazer', 'Condução Escolar', 'Curso Inglês',
    'Natação',
  ],
  nao_essencial: [
    'Cuidados Edi', 'Cuidados Bruno', 'Torrar Edi', 'Cartão Edi', 'Torrar Bruno', 'Cartão Bruno',
    'Tarifa C. Corrente', 'Cartão Assinaturas', 'Cartão Família', 'Presentes', 'Empréstimo MP', 'Mesada Crianças',
    'Personal', 'Gympass', 'Uniforme Escolar', 'Caixinha Trabalho', 'Reforço Escolar', 'Cartão Extra', 'Gastos SJC',
    'Outros',
  ],
  investimento: ['Emergência', 'Slavery Freedom', 'Investimentos'],
};

const INCOME_SEED = [
  'Salário Bruno', 'Salário Edi', 'Extra', 'Diária SJC Bruno', 'Diária SJC Edi', '13º Salário Bruno',
  '13º Salário Edi', 'Férias Bruno', 'Férias Edi',
];

export function makeCategoryId(name: string): string {
  return `cat-${slug(name)}`;
}
export function makeIncomeSourceId(name: string): string {
  return `inc-${slug(name)}`;
}

export function defaultCategories(): FinCategory[] {
  return (Object.keys(CATEGORY_SEED) as CategoryGroup[]).flatMap((group) =>
    CATEGORY_SEED[group].map((name) => ({ id: makeCategoryId(name), name, group })),
  );
}

export function defaultIncomeSources(): IncomeSource[] {
  return INCOME_SEED.map((name) => ({ id: makeIncomeSourceId(name), name }));
}

export const GROUP_META: Record<CategoryGroup, { label: string; short: string; color: string; soft: string; text: string }> = {
  essencial: { label: 'Essencial', short: 'Essencial', color: '#3b82f6', soft: 'bg-blue-500/10', text: 'text-blue-500' },
  nao_essencial: { label: 'Não essencial', short: 'Não essencial', color: '#f59e0b', soft: 'bg-amber-500/10', text: 'text-amber-500' },
  investimento: { label: 'Investimentos', short: 'Investir', color: '#10b981', soft: 'bg-emerald-500/10', text: 'text-emerald-500' },
};

export const GOAL_REASONS = ['SEGURANÇA', 'LIBERDADE', 'CONFORTO', 'PRAZER/SONHO', 'MISSÃO DE VIDA', 'OUTRO'];

export const PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];

export const DEFAULT_AREAS = ['Trabalho', 'Casa', 'Família', 'Finanças', 'Igreja', 'Estudos', 'Saúde', 'Compras', 'Pessoal'];

// ------------------------------------------------------------
// Pokédex (idêntica ao Nocturne)
// ------------------------------------------------------------
export function parseRawPokemonGen1(): PokemonEntry[] {
  return RAW_POKEMON_GEN1_TSV.split('\n').map((line) => {
    const parts = line.split('\t');
    const num = parts[0] || '001';
    const id = parts[1] || num;
    const name = parts[2] || 'Unknown';
    const m = (parts[3] || '--').trim().toUpperCase();
    const f = (parts[4] || '--').trim().toUpperCase();
    const g = (parts[5] || '--').trim().toUpperCase();
    return {
      id,
      num,
      name,
      hasMale: m === 'X',
      hasFemale: f === 'X' || f === 'F',
      hasGenderless: g === 'X',
      isMaleCaught: false,
      isFemaleCaught: false,
      isGenderlessCaught: false,
    };
  });
}

export function defaultPokemonGenerations(): PokemonGeneration[] {
  return [
    { id: 'gen1', name: '1ª Geração', pokemons: parseRawPokemonGen1() },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `gen${i + 2}`, name: `${i + 2}ª Geração`, pokemons: [] })),
  ];
}

export function createDefaultData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { name: 'Bruno' },
    finance: {
      categories: defaultCategories(),
      incomeSources: defaultIncomeSources(),
      paymentMethods: ['PIX', 'Cartão de Crédito', 'Débito', 'Dinheiro', 'Boleto'],
      transactions: [],
      incomes: [],
      budgets: {},
      bills: [],
      billPayments: {},
      goals: [],
      debts: [],
      rule: { essencial: 50, nao_essencial: 30, investimento: 20 },
    },
    focus: {
      tasks: [],
      projects: [],
      ideas: [],
      inbox: [],
      habits: [],
      reviews: [],
      areas: DEFAULT_AREAS,
    },
    games: {
      trophyEntries: [],
      toPlayConsoles: [],
      pokemonGenerations: defaultPokemonGenerations(),
    },
    notes: [],
    checklists: [],
    updatedAt: new Date(0).toISOString(),
  };
}

/** Garante que dados antigos/importados tenham todos os campos esperados. */
export function normalizeData(raw: unknown): AppData {
  const base = createDefaultData();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Partial<AppData>;
  return {
    ...base,
    ...d,
    schemaVersion: SCHEMA_VERSION,
    profile: { ...base.profile, ...(d.profile || {}) },
    finance: { ...base.finance, ...(d.finance || {}), rule: { ...base.finance.rule, ...(d.finance?.rule || {}) } },
    focus: { ...base.focus, ...(d.focus || {}) },
    games: {
      ...base.games,
      ...(d.games || {}),
      pokemonGenerations: d.games?.pokemonGenerations?.length ? d.games.pokemonGenerations : base.games.pokemonGenerations,
    },
    notes: d.notes || [],
    checklists: d.checklists || [],
    updatedAt: d.updatedAt || base.updatedAt,
  };
}
