import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — FitPilot",
};

export default function TermosPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2">
        <Link
          href="/cadastro"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-base font-semibold">Termos de Uso</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-xl flex-col gap-5 text-sm leading-relaxed text-fg-muted">
          <p className="rounded-card border border-amber/40 bg-amber/10 p-3 text-xs text-amber">
            Modelo inicial de referência. Antes de usar o FitPilot com alunos reais,
            revise este texto com um advogado para garantir que reflete exatamente
            como os dados são tratados no seu caso.
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">1. Sobre o FitPilot</h2>
            <p>
              O FitPilot é uma ferramenta de gestão para personal trainers autônomos,
              usada para organizar alunos, agenda, presença e pagamentos. Ao criar uma
              conta, você (o &quot;profissional&quot;) concorda com estes termos.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">2. Sua conta</h2>
            <p>
              Você é responsável por manter a confidencialidade da sua senha e por
              todas as atividades realizadas na sua conta. Avise imediatamente se
              suspeitar de uso não autorizado.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">3. Dados dos seus alunos</h2>
            <p>
              Você é quem cadastra e é responsável pelos dados dos seus alunos
              (nome, telefone, valores combinados, histórico de aulas e pagamentos).
              O FitPilot atua como ferramenta de armazenamento e organização desses
              dados por sua conta e ordem — você continua sendo responsável por ter
              uma base legal adequada (ex: consentimento ou execução de contrato)
              para tratar os dados de cada aluno.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">4. Uso aceitável</h2>
            <p>
              Não é permitido usar o FitPilot para armazenar dados de pessoas sem
              relação com sua atividade profissional, nem para fins ilícitos.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">5. Cancelamento</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento. Veja nossa{" "}
              <Link href="/privacidade" className="text-primary">
                Política de Privacidade
              </Link>{" "}
              para como isso afeta os dados armazenados.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">6. Alterações</h2>
            <p>
              Podemos atualizar estes termos. Mudanças relevantes serão comunicadas
              na própria plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
