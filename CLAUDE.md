@AGENTS.md

# Bolão Copa 2026 – CFC

## Comandos

```bash
npm run dev      # localhost:3000
npm run build
npm run lint
npx tsc --noEmit
```

## Stack

- **Next.js 16** (App Router) — `src/proxy.ts` exporta `proxy` (não `middleware`)
- **Supabase** (`vzmbzlncghmgjbaypfsy`) — auth + banco PostgreSQL em `sa-east-1`
- **Tailwind CSS v4** — tema laranja escuro

## Arquitetura

- Rotas protegidas por `src/proxy.ts` (redireciona para `/login` sem sessão)
- Rotas públicas: `/`, `/ranking` (leitura pública do banco)
- Rotas admin: `/admin/**` — protegidas por `is_admin = true` no layout
- Mutações via API Route (`/api/sofascore/sync/[matchId]`) + client-side com `router.refresh()`

## Banco (Supabase)

Tabelas: `profiles`, `matches`, `predictions`  
View: `standings` (classificação calculada)  
Schema em `supabase/schema.sql` | Seed em `supabase/seed.sql`

## Sistema de Pontuação

`src/lib/scoring.ts` — função `calculatePoints()`:
- Resultado certo (V/E/D): 3 pts × multiplicador
- Gols da casa exatos: 1 pt × multiplicador
- Gols do visitante exatos: 1 pt × multiplicador
- Bônus placar exato: 3 pts × multiplicador

Multiplicadores: grupo ×1 | rod32 ×2 | oitavas ×3 | quartas ×4 | semis ×5 | 3º ×4 | final ×6

## Variáveis de Ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://vzmbzlncghmgjbaypfsy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Tornar-se Admin

Execute no Supabase SQL Editor:
```sql
update public.profiles set is_admin = true where email = 'seu@email.com';
```
