// Hand-authored types mirroring the existing Supabase schema.
// Replace with `supabase gen types typescript` output once the CLI is linked to the project.

export type UUID = string;

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export type StatusAgendamento =
  | "agendado"
  | "concluido"
  | "cancelado"
  | "falta";

export type StatusPagamento = "pendente" | "pago" | "atrasado";

export interface Profissional {
  id: UUID; // references auth.users.id
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Aluno {
  id: UUID;
  profissional_id: UUID;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  objetivo: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface HorarioFixo {
  id: UUID;
  profissional_id: UUID;
  aluno_id: UUID;
  dia_semana: DiaSemana;
  hora_inicio: string; // "HH:mm:ss"
  hora_fim: string; // "HH:mm:ss"
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agendamento {
  id: UUID;
  profissional_id: UUID;
  aluno_id: UUID;
  horario_fixo_id: UUID | null;
  data: string; // "YYYY-MM-DD"
  hora_inicio: string;
  hora_fim: string;
  status: StatusAgendamento;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagamento {
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
}

export interface CreditoReposicao {
  id: UUID;
  profissional_id: UUID;
  aluno_id: UUID;
  agendamento_origem_id: UUID | null;
  agendamento_utilizado_id: UUID | null;
  utilizado: boolean;
  data_expiracao: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfigModulos {
  id: UUID;
  profissional_id: UUID;
  modulo_financeiro: boolean;
  modulo_reposicao: boolean;
  modulo_avaliacao: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigReposicao {
  id: UUID;
  profissional_id: UUID;
  prazo_solicitacao_horas: number;
  validade_credito_dias: number;
  limite_creditos_por_aluno: number;
  created_at: string;
  updated_at: string;
}

export interface Bloqueio {
  id: UUID;
  profissional_id: UUID;
  data_inicio: string; // ISO timestamp
  data_fim: string; // ISO timestamp
  dia_todo: boolean;
  motivo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profissional: {
        Row: Profissional;
        Insert: Partial<Profissional> & Pick<Profissional, "id" | "nome" | "email">;
        Update: Partial<Profissional>;
      };
      aluno: {
        Row: Aluno;
        Insert: Partial<Aluno> & Pick<Aluno, "profissional_id" | "nome">;
        Update: Partial<Aluno>;
      };
      horario_fixo: {
        Row: HorarioFixo;
        Insert: Partial<HorarioFixo> &
          Pick<HorarioFixo, "profissional_id" | "aluno_id" | "dia_semana" | "hora_inicio" | "hora_fim">;
        Update: Partial<HorarioFixo>;
      };
      agendamento: {
        Row: Agendamento;
        Insert: Partial<Agendamento> &
          Pick<Agendamento, "profissional_id" | "aluno_id" | "data" | "hora_inicio" | "hora_fim">;
        Update: Partial<Agendamento>;
      };
      pagamento: {
        Row: Pagamento;
        Insert: Partial<Pagamento> &
          Pick<Pagamento, "profissional_id" | "aluno_id" | "valor" | "referencia_mes" | "data_vencimento">;
        Update: Partial<Pagamento>;
      };
      credito_reposicao: {
        Row: CreditoReposicao;
        Insert: Partial<CreditoReposicao> & Pick<CreditoReposicao, "profissional_id" | "aluno_id">;
        Update: Partial<CreditoReposicao>;
      };
      config_modulos: {
        Row: ConfigModulos;
        Insert: Partial<ConfigModulos> & Pick<ConfigModulos, "profissional_id">;
        Update: Partial<ConfigModulos>;
      };
      config_reposicao: {
        Row: ConfigReposicao;
        Insert: Partial<ConfigReposicao> & Pick<ConfigReposicao, "profissional_id">;
        Update: Partial<ConfigReposicao>;
      };
      bloqueio: {
        Row: Bloqueio;
        Insert: Partial<Bloqueio> & Pick<Bloqueio, "profissional_id" | "data_inicio" | "data_fim">;
        Update: Partial<Bloqueio>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
