/**
 * POST /api/capture — organiza um "despejo mental" em tarefas, projetos, ideias e notas.
 * Roda como função serverless na Vercel. A chave ANTHROPIC_API_KEY fica só no servidor.
 * Sem chave configurada, responde 501 e o app usa o organizador local (offline).
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const SYSTEM = `Você é o assistente de produtividade do app pessoal "Atlas" de um usuário brasileiro (pai de família, trabalha, vai à igreja, cuida das finanças da casa).
Ele despeja tudo que está na cabeça, em português informal. Seu trabalho é transformar isso em itens claros e acionáveis, sem inventar nada que ele não disse.

Para cada item decida o tipo:
- "tarefa": uma ação concreta e única ("Pagar conta de luz"). Comece com verbo no infinitivo. Separe ações diferentes em tarefas diferentes.
- "projeto": algo com várias etapas que não se resolve numa ação só ("Organizar festa da Alice"). Coloque as primeiras etapas em "checklist".
- "ideia": algo para pensar/explorar no futuro, sem compromisso agora.
- "nota": informação para guardar (fatos, lembranças, referências), sem ação associada.

Regras dos campos:
- "due": data no formato AAAA-MM-DD somente se ele indicou quando (hoje, amanhã, sexta, dia 15...). Use a data de hoje informada para calcular. Senão "".
- "priority": "alta" só se for urgente ou tiver prazo hoje/amanhã com consequência; "baixa" se for opcional; senão "media". Não deixe tudo urgente.
- "energy": "cognitiva" (exige foco: escrever, estudar, planejar), "operacional" (rápido e repetitivo: pagar, responder, agendar) ou "externa" (precisa sair de casa: mercado, banco, médico). Para ideias/notas use "".
- "area": uma das áreas disponíveis que melhor se encaixe, ou "".
- "checklist": itens que ele não pode esquecer para aquela tarefa/projeto (ex.: documentos para levar). Lista vazia se não houver.
- "detail": contexto útil curto, ou "".
- Títulos curtos (até ~60 caracteres), em português, sem emojis.
Em "overload" escreva um aviso gentil e firme se ele estiver querendo abraçar coisa demais para hoje/amanhã; senão "".`;

const ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'title', 'due', 'priority', 'energy', 'area', 'checklist', 'detail'],
  properties: {
    kind: { type: 'string', enum: ['tarefa', 'projeto', 'ideia', 'nota'] },
    title: { type: 'string' },
    due: { type: 'string' },
    priority: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    energy: { type: 'string', enum: ['cognitiva', 'operacional', 'externa', ''] },
    area: { type: 'string' },
    checklist: { type: 'array', items: { type: 'string' } },
    detail: { type: 'string' },
  },
};

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'overload'],
  properties: { items: { type: 'array', items: ITEM_SCHEMA }, overload: { type: 'string' } },
};

const Output = z.object({
  items: z.array(
    z.object({
      kind: z.enum(['tarefa', 'projeto', 'ideia', 'nota']),
      title: z.string(),
      due: z.string(),
      priority: z.enum(['alta', 'media', 'baixa']),
      energy: z.enum(['cognitiva', 'operacional', 'externa', '']),
      area: z.string(),
      checklist: z.array(z.string()),
      detail: z.string(),
    }),
  ),
  overload: z.string(),
});

const Input = z.object({
  text: z.string().min(1).max(8000),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekday: z.string().max(20).optional(),
  areas: z.array(z.string().max(40)).max(30).default([]),
  pending: z.array(z.string().max(200)).max(60).default([]),
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'IA não configurada' }, 501);

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Entrada inválida' }, 400);
  const { text, today, weekday, areas, pending } = parsed.data;

  const context = [
    `Hoje é ${weekday ? `${weekday}, ` : ''}${today}.`,
    `Áreas disponíveis: ${areas.join(', ') || '(nenhuma)'}.`,
    pending.length ? `Tarefas que ele já tem pendentes (não duplique; se algo novo se relaciona, mencione no "detail"): ${pending.join(' | ')}` : '',
    '',
    'Despejo mental:',
    text,
  ]
    .filter(Boolean)
    .join('\n');

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: context }],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'A IA não conseguiu processar este texto.' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'Texto longo demais para organizar de uma vez.' }, 422);

    const textBlock = response.content.find((b) => b.type === 'text');
    const result = Output.safeParse(textBlock && textBlock.type === 'text' ? JSON.parse(textBlock.text) : null);
    if (!result.success) return json({ error: 'Resposta da IA em formato inesperado.' }, 502);
    return json(result.data);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Muitas requisições. Tente em instantes.' }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'Chave da IA inválida.' }, 500);
    if (error instanceof Anthropic.APIError) return json({ error: `Erro da IA (${error.status}).` }, 502);
    if (error instanceof SyntaxError) return json({ error: 'Resposta da IA em formato inesperado.' }, 502);
    return json({ error: 'Falha ao falar com a IA.' }, 502);
  }
}
