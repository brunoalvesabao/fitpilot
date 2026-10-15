import Anthropic from "@anthropic-ai/sdk";

export type AlunoExtraido = {
  nome: string;
  telefone: string | null;
  valor_mensal: number | null;
  dia_vencimento: number | null;
};

const EXTRAIR_ALUNOS_TOOL = {
  name: "registrar_alunos",
  description: "Registra a lista de alunos extraída do texto.",
  input_schema: {
    type: "object" as const,
    properties: {
      alunos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome completo do aluno." },
            telefone: {
              type: ["string", "null"],
              description: "Telefone/WhatsApp, se houver. Mantenha apenas dígitos, +, espaços e parênteses.",
            },
            valor_mensal: {
              type: ["number", "null"],
              description: "Valor da mensalidade em reais (apenas número, sem o R$).",
            },
            dia_vencimento: {
              type: ["integer", "null"],
              description: "Dia do mês (1 a 31) em que a mensalidade vence.",
            },
          },
          required: ["nome", "telefone", "valor_mensal", "dia_vencimento"],
        },
      },
    },
    required: ["alunos"],
  },
};

const PROMPT_SISTEMA = `Você extrai dados de alunos de personal trainers a partir de texto livre em português \
(pode ser uma lista colada de planilha, mensagens de WhatsApp, anotações, etc.). \
Para cada aluno mencionado, extraia nome, telefone, valor da mensalidade e dia de vencimento, quando existirem no texto. \
Nunca invente informação que não está no texto: deixe o campo como null quando não tiver certeza. \
Use a ferramenta "registrar_alunos" para responder.`;

export async function extrairAlunosDoTexto(texto: string): Promise<AlunoExtraido[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não está configurada neste ambiente. Configure a variável de ambiente para habilitar a importação com IA.",
    );
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 4096,
    system: PROMPT_SISTEMA,
    tools: [EXTRAIR_ALUNOS_TOOL],
    tool_choice: { type: "tool", name: "registrar_alunos" },
    messages: [
      {
        role: "user",
        content: texto,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("A IA não retornou uma lista de alunos. Tente novamente.");
  }

  const input = toolUse.input as { alunos?: unknown };
  if (!Array.isArray(input.alunos)) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return input.alunos
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && typeof item.nome === "string",
    )
    .map((item) => ({
      nome: String(item.nome).trim(),
      telefone: typeof item.telefone === "string" && item.telefone.trim() ? item.telefone.trim() : null,
      valor_mensal: typeof item.valor_mensal === "number" ? item.valor_mensal : null,
      dia_vencimento:
        typeof item.dia_vencimento === "number" &&
        Number.isInteger(item.dia_vencimento) &&
        item.dia_vencimento >= 1 &&
        item.dia_vencimento <= 31
          ? item.dia_vencimento
          : null,
    }))
    .filter((aluno) => aluno.nome.length > 0);
}
