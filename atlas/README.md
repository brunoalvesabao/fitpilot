# Atlas

Seu app pessoal do dia a dia: **finanças**, **foco/produtividade** e **games**, num lugar só.
Inspirado no Nexus (Nocturne), feito sob medida para a sua rotina e para substituir a planilha de orçamento.

> "Atlas" é um nome provisório. Para trocar, mude `APP_NAME` em `src/config.ts`, o `<title>` em `index.html` e o `manifest.webmanifest`.

## Módulos

| Módulo | Telas | O que faz |
| --- | --- | --- |
| **Início** | Painel | Saudação, saldo do mês, contas a vencer, tarefas e hábitos de hoje, metas, resumo dos games, últimos lançamentos |
| **Finanças** | Lançar · Orçamento · Contas · Metas · Ano | Mesma lógica da planilha: receitas por fonte, categorias em **Essencial / Não essencial / Investimentos**, **orçado × realizado**, método **50/30/20**, contas a pagar com vencimento, metas com aporte sugerido, dívidas, resumo anual. Parcelamentos geram as parcelas nos meses seguintes |
| **Foco** | Hoje · Captura · Projetos · Hábitos · Revisão | Sucessor do Clara OS: foco do dia (top 3), tipos de energia (Foco/Rotina/Rua), aviso de sobrecarga com dados reais, captura de "despejo mental" organizada por IA (ou offline), projetos com próximo passo, banco de ideias, hábitos com sequência e mapa de calor, encerrar o dia e revisão semanal com métricas reais |
| **Games** | Trophies · Pokémon · To Play | Portado do Nocturne. A Pokédex é **idêntica** (normal/shiny, gêneros, filtros, formas regionais) |
| **Sistema** | — | Conta, notas, checklists, **importar planilha .xlsx**, tema claro/escuro, formas de pagamento, áreas, backup/restauração |

## Rodar localmente

```bash
cd atlas
npm install
npm run dev        # http://localhost:3000
npm run build      # checagem de tipos + build de produção
```

Sem nenhuma configuração o app funciona **100% local** (dados no navegador).

## Importar a planilha

Sistema → **Importar planilha** → escolha o `.xlsx`. O Atlas lê receitas e orçados (aba *ORÇAMENTO PESSOAL*),
os lançamentos das abas *JAN…DEZ*, *METAS* e *DÍVIDAS*. O arquivo é lido no próprio aparelho.
Reimportar substitui os dados **daquele ano** sem duplicar.

## Sincronizar entre celular e computador (Supabase)

1. Crie um projeto no [Supabase](https://supabase.com) (grátis).
2. No SQL Editor, rode `supabase/schema.sql`.
3. Em *Authentication → Providers*, deixe *Email* ativo (desligue "Confirm email" se não quiser confirmar por e-mail).
4. Copie a URL e a chave `anon` em *Project Settings → API* para as variáveis:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Os dados ficam numa linha JSON por usuário (como no Nexus), com cache local e sincronização automática.

## IA na Captura (opcional)

A rota `api/capture.ts` (função serverless da Vercel) usa o Claude para transformar o texto em tarefas,
projetos, ideias e notas. Configure `ANTHROPIC_API_KEY` **só no servidor** (variável de ambiente da Vercel).
Sem a chave, a Captura usa o organizador local, que entende atalhos como `amanhã`, `sexta`, `15/10`, `!`, `#casa`, `@rua`.

A chamada usa os fallbacks automáticos do servidor da Anthropic (`fallbacks: "default"`) para o caso raro de recusa.

## Deploy na Vercel

1. Importe o repositório na Vercel e defina **Root Directory = `atlas`** (framework: Vite).
2. Adicione as variáveis de ambiente acima.
3. Deploy. No celular, abra o site e use "Adicionar à tela de início" para usar como app (PWA).
