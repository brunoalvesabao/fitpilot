import { createClient } from "@/lib/supabase/server";
import { spParts } from "@/lib/datetime";
import { classificarCobranca, competenciaStr, diaVencimentoEfetivo } from "@/lib/financeiro";
import { recalcularStatusAlunos } from "../alunos/actions";
import { FinanceiroClient, type LinhaFinanceiro } from "./_components/financeiro-client";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível identificar sua sessão. Faça login novamente.
        </p>
      </div>
    );
  }

  await recalcularStatusAlunos();

  const hoje = spParts(new Date());
  let ano = hoje.year;
  let mes = hoje.month;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split("-").map(Number);
    ano = y;
    mes = m;
  }

  const competencia = competenciaStr(ano, mes);

  const { data: alunosData } = await supabase
    .from("aluno")
    .select("id, nome, foto_url, valor_mensal, dia_vencimento")
    .eq("profissional_id", user.id)
    .eq("ativo", true)
    .not("status", "in", "(pausa,ex_aluno,lead)")
    .order("nome", { ascending: true });

  const populacao = alunosData ?? [];

  const { data: pagamentosData } = await supabase
    .from("pagamento")
    .select("aluno_id, valor, data_pagamento")
    .eq("profissional_id", user.id)
    .eq("competencia", competencia);

  const pagamentos = pagamentosData ?? [];
  const pagamentoPorAluno = new Map(pagamentos.map((p) => [p.aluno_id, p]));

  const recebido = pagamentos.reduce(
    (sum, p) => (p.data_pagamento != null ? sum + p.valor : sum),
    0,
  );

  const linhas: LinhaFinanceiro[] = populacao.map((aluno) => {
    const pagamento = pagamentoPorAluno.get(aluno.id);
    const pago = pagamento?.data_pagamento != null;
    const { status, diasAtraso } = classificarCobranca({
      hoje,
      diaVencimento: aluno.dia_vencimento,
      ano,
      mes,
      pago,
    });

    return {
      id: aluno.id,
      nome: aluno.nome,
      fotoUrl: aluno.foto_url,
      valorMensal: aluno.valor_mensal,
      diaVencimentoEfetivo:
        aluno.dia_vencimento != null ? diaVencimentoEfetivo(aluno.dia_vencimento, ano, mes) : null,
      status,
      diasAtraso,
      dataPagamento: pagamento?.data_pagamento ?? null,
      valorPago: pago ? (pagamento?.valor ?? null) : null,
    };
  });

  const esperado = populacao.reduce((sum, aluno) => sum + (aluno.valor_mensal ?? 0), 0);
  const aReceber = linhas.reduce(
    (sum, linha) => (linha.status === "pendente" ? sum + (linha.valorMensal ?? 0) : sum),
    0,
  );
  const atrasado = linhas.reduce(
    (sum, linha) => (linha.status === "atrasado" ? sum + (linha.valorMensal ?? 0) : sum),
    0,
  );
  const pagaramCount = linhas.reduce((sum, linha) => (linha.status === "pago" ? sum + 1 : sum), 0);

  return (
    <FinanceiroClient
      ano={ano}
      mes={mes}
      competencia={competencia}
      recebido={recebido}
      aReceber={aReceber}
      atrasado={atrasado}
      esperado={esperado}
      totalPopulacao={populacao.length}
      pagaramCount={pagaramCount}
      linhas={linhas}
    />
  );
}
