import { GoogleGenAI, Type } from "@google/genai";

export type AlunoExtraido = {
  nome: string;
  telefone: string | null;
  valor_mensal: number | null;
  dia_vencimento: number | null;
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    alunos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING, description: "Nome completo do aluno." },
          telefone: {
            type: Type.STRING,
            nullable: true,
            description:
              "Telefone/WhatsApp, se houver. Mantenha apenas dígitos, +, espaços e parênteses.",
          },
          valor_mensal: {
            type: Type.NUMBER,
            nullable: true,
            description: "Valor da mensalidade em reais (apenas número, sem o R$).",
          },
          dia_vencimento: {
            type: Type.INTEGER,
            nullable: true,
            description: "Dia do mês (1 a 31) em que a mensalidade vence.",
          },
        },
        required: ["nome"],
      },
    },
  },
  required: ["alunos"],
};

const PROMPT_SISTEMA = `Você extrai dados de alunos de personal trainers a partir de texto livre em português \
(pode ser uma lista colada de planilha, mensagens de WhatsApp, anotações, etc.). \
Para cada aluno mencionado, extraia nome, telefone, valor da mensalidade e dia de vencimento, quando existirem no texto. \
Nunca invente informação que não está no texto: deixe o campo como null quando não tiver certeza. \
Responda apenas com o JSON pedido.`;

export async function extrairAlunosDoTexto(texto: string): Promise<AlunoExtraido[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não está configurada neste ambiente. Configure a variável de ambiente para habilitar a importação com IA.",
    );
  }

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: texto,
    config: {
      systemInstruction: PROMPT_SISTEMA,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const textoResposta = response.text;
  if (!textoResposta) {
    throw new Error("A IA não retornou uma lista de alunos. Tente novamente.");
  }

  let parsed: { alunos?: unknown };
  try {
    parsed = JSON.parse(textoResposta) as { alunos?: unknown };
  } catch {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  if (!Array.isArray(parsed.alunos)) {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }

  return parsed.alunos
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && typeof item.nome === "string",
    )
    .map((item) => ({
      nome: String(item.nome).trim(),
      telefone:
        typeof item.telefone === "string" && item.telefone.trim() ? item.telefone.trim() : null,
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
