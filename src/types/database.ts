// Hand-authored types mirroring the existing Supabase schema.
// Replace with `supabase gen types typescript` output once the CLI is linked to the project.

export type UUID = string;

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export type StatusAgendamento =
  | "agendado"
  | "realizada"
  | "falta"
  | "cancelado_com_aviso";

export type StatusPagamento = "pendente" | "pago" | "atrasado";

export type StatusAluno =
  | "ativo"
  | "vencendo"
  | "inadimplente"
  | "pausa"
  | "ex_aluno"
  | "lead";

// NOTE: these are `type` aliases, not `interface` declarations, on purpose —
// interfaces don't structurally satisfy the `Record<string, unknown>` shape
// that the Supabase query builder generics expect for Row/Insert/Update.

export type Profissional = {
  id: UUID; // references auth.users.id
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Aluno = {
  id: UUID;
  profissional_id: UUID;
  nome: string;
  telefone: string | null;
  foto_url: string | null;
  valor_mensal: number | null;
  dia_vencimento: number | null; // 1-31
  aulas_por_mes: number | null;
  status: StatusAluno;
  observacoes: string | null;
  ativo: boolean; // soft delete flag
  criado_em: string;
};

export type HorarioFixo = {
  id: UUID;
  aluno_id: UUID;
  dia_semana: DiaSemana;
  hora: string; // "HH:mm:ss"
  local: string | null;
};

export type Agendamento = {
  id: UUID;
  profissional_id: UUID;
  aluno_id: UUID;
  data_hora: string; // ISO timestamp
  duracao_min: number;
  status: StatusAgendamento;
  local: string | null;
  criado_em: string;
};

export type Pagamento = {
  id: UUID;
  profissional_id: UUID;
  aluno_id: UUID;
  valor: number;
  referencia_mes: string; // "YYYY-MM"
  data_vencimento: string;
  data_pagamento: string | null;
  status: StatusPagamento;
  forma_pagamento: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditoReposicao = {
  id: UUID;
  profissional_id: UUID;
  aluno_id: UUID;
  agendamento_origem_id: UUID | null;
  agendamento_utilizado_id: UUID | null;
  utilizado: boolean;
  data_expiracao: string | null;
  created_at: string;
  updated_at: string;
};

export type ConfigModulos = {
  id: UUID;
  profissional_id: UUID;
  modulo_financeiro: boolean;
  modulo_reposicao: boolean;
  modulo_avaliacao: boolean;
  created_at: string;
  updated_at: string;
};

export type ConfigReposicao = {
  id: UUID;
  profissional_id: UUID;
  prazo_solicitacao_horas: number;
  validade_credito_dias: number;
  limite_creditos_por_aluno: number;
  created_at: string;
  updated_at: string;
};

export type Bloqueio = {
  id: UUID;
  profissional_id: UUID;
  inicio: string; // ISO timestamp
  fim: string; // ISO timestamp
  motivo: string | null;
};

export type Database = {
  public: {
    Tables: {
      profissional: {
        Row: Profissional;
        Insert: Partial<Profissional> & Pick<Profissional, "id" | "nome" | "email">;
        Update: Partial<Profissional>;
        Relationships: [];
      };
      aluno: {
        Row: Aluno;
        Insert: Partial<Aluno> & Pick<Aluno, "profissional_id" | "nome" | "status">;
        Update: Partial<Aluno>;
        Relationships: [];
      };
      horario_fixo: {
        Row: HorarioFixo;
        Insert: Partial<HorarioFixo> & Pick<HorarioFixo, "aluno_id" | "dia_semana" | "hora">;
        Update: Partial<HorarioFixo>;
        Relationships: [];
      };
      agendamento: {
        Row: Agendamento;
        Insert: Partial<Agendamento> &
          Pick<Agendamento, "profissional_id" | "aluno_id" | "data_hora">;
        Update: Partial<Agendamento>;
        Relationships: [];
      };
      pagamento: {
        Row: Pagamento;
        Insert: Partial<Pagamento> &
          Pick<Pagamento, "profissional_id" | "aluno_id" | "valor" | "referencia_mes" | "data_vencimento">;
        Update: Partial<Pagamento>;
        Relationships: [];
      };
      credito_reposicao: {
        Row: CreditoReposicao;
        Insert: Partial<CreditoReposicao> & Pick<CreditoReposicao, "profissional_id" | "aluno_id">;
        Update: Partial<CreditoReposicao>;
        Relationships: [];
      };
      config_modulos: {
        Row: ConfigModulos;
        Insert: Partial<ConfigModulos> & Pick<ConfigModulos, "profissional_id">;
        Update: Partial<ConfigModulos>;
        Relationships: [];
      };
      config_reposicao: {
        Row: ConfigReposicao;
        Insert: Partial<ConfigReposicao> & Pick<ConfigReposicao, "profissional_id">;
        Update: Partial<ConfigReposicao>;
        Relationships: [];
      };
      bloqueio: {
        Row: Bloqueio;
        Insert: Partial<Bloqueio> & Pick<Bloqueio, "profissional_id" | "inicio" | "fim">;
        Update: Partial<Bloqueio>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
