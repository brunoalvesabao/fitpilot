import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — FitPilot",
};

export default function PrivacidadePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2">
        <Link
          href="/cadastro"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-base font-semibold">Política de Privacidade</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-xl flex-col gap-5 text-sm leading-relaxed text-fg-muted">
          <p className="rounded-card border border-amber/40 bg-amber/10 p-3 text-xs text-amber">
            Modelo inicial de referência, escrito para dar transparência básica
            sobre o tratamento de dados no FitPilot. Antes de operar com alunos
            reais, revise com um advogado à luz da LGPD (Lei 13.709/2018).
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">1. Quais dados coletamos</h2>
            <p>
              Do profissional: nome, email e senha (autenticação). Dos alunos,
              cadastrados pelo profissional: nome, telefone, valor mensal, dia de
              vencimento, horários fixos, histórico de presença e pagamentos.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">2. Finalidade</h2>
            <p>
              Esses dados existem para permitir a gestão da agenda, controle de
              presença, cálculo de reposições e acompanhamento financeiro entre o
              profissional e seus alunos.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">3. Armazenamento</h2>
            <p>
              Os dados são armazenados em banco de dados hospedado pela Supabase,
              com acesso restrito por autenticação e por regras de segurança em
              nível de linha (cada profissional só acessa os dados que cadastrou).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">4. Direitos do titular dos dados</h2>
            <p>
              Qualquer aluno cujos dados estejam cadastrados no FitPilot pode, por
              meio do profissional responsável, solicitar: acesso aos seus dados,
              correção de dados incorretos, exportação dos dados em formato legível,
              e exclusão definitiva. A ficha de cada aluno, dentro do app, tem
              opções para exportar e para excluir permanentemente os dados.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">5. Retenção e exclusão</h2>
            <p>
              Desativar um aluno (dentro do app) apenas o remove das listas ativas —
              os dados continuam armazenados. A exclusão permanente, disponível na
              ficha do aluno, remove definitivamente o cadastro, horários,
              histórico de presença, pagamentos e créditos de reposição associados,
              e não pode ser desfeita.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">6. Compartilhamento</h2>
            <p>
              Não vendemos nem compartilhamos dados de alunos com terceiros para
              fins de publicidade. Dados podem ser processados por provedores de
              infraestrutura (como a Supabase) estritamente para operar o serviço.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">7. Contato</h2>
            <p>
              Dúvidas sobre tratamento de dados podem ser direcionadas ao
              profissional responsável pelo cadastro, que é quem controla os dados
              armazenados sobre cada aluno.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
