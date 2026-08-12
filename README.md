# FitPilot

PWA de gestão para personal trainers autônomos. Next.js 15 (App Router), TypeScript, Tailwind v4, Supabase (auth via `@supabase/ssr`). Mobile-first, dark mode apenas.

## Setup

```bash
npm install
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Estrutura

- `src/app/login`, `src/app/cadastro` — autenticação (email + senha)
- `src/app/app/*` — área autenticada (layout com bottom tab bar: Hoje, Alunos, Financeiro, Mais)
- `src/lib/supabase/{client,server,middleware}.ts` — clientes Supabase para browser, server components e middleware
- `src/middleware.ts` — protege tudo sob `/app`, redireciona para `/login`
- `src/types/database.ts` — tipos das tabelas do banco

O registro em `profissional` é criado por trigger no Supabase a partir de `raw_user_meta_data.nome` no cadastro — não há insert manual no código.
