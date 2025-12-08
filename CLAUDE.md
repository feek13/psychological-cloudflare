# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

心理测评系统 (Psychological Assessment Platform) - A serverless psychological assessment platform using Cloudflare Workers + Supabase + React. Features scale management, assessment testing, scoring calculation, and AI-powered report generation.

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev              # Development server (port 5173)
npm run build            # TypeScript check + production build
npm run lint             # ESLint
rm -rf node_modules/.vite  # Clear Vite cache if needed
```

### Workers
```bash
cd workers/<worker-name>  # scoring | ai-report | api-proxy
npm install
npm run dev               # Local Wrangler dev mode
npm run deploy            # Deploy to Cloudflare
npm run test              # Vitest (scoring & ai-report only)
```

### Unified Deployment
```bash
./deploy.sh workers       # Deploy all workers
./deploy.sh frontend      # Build and deploy frontend to Cloudflare Pages
./deploy.sh all           # Deploy everything
```

**Prerequisites:**
- `npx wrangler login` before deployment
- Set `OPENROUTER_API_KEY` secret: `cd workers/ai-report && npx wrangler secret put OPENROUTER_API_KEY`

## Architecture

```
psychological-cloudflare/
├── frontend/              # React + TypeScript + Vite
│   └── src/
│       ├── api/           # Supabase client + API functions
│       ├── pages/         # Student pages + teacher/ subdirectory
│       ├── components/    # UI components + item-bank/ + modals/
│       ├── store/         # Zustand (authStore, themeStore)
│       └── types/         # TypeScript definitions
├── workers/
│   ├── scoring/           # Assessment scoring (SCL-90 + generic)
│   ├── ai-report/         # AI report generation via OpenRouter
│   └── api-proxy/         # HTTPS→HTTP proxy for mixed content + RLS bypass
└── supabase/              # Database migrations placeholder
```

### Request Flow

1. **Frontend** → Cloudflare Pages (HTTPS)
2. **Supabase Auth** → Via api-proxy worker (solves mixed content)
3. **Database** → Supabase PostgreSQL with RLS
4. **Scoring** → scoring-worker calculates assessment results
5. **Reports** → ai-report-worker generates AI analysis via OpenRouter

### Workers

| Worker | Endpoint | Purpose |
|--------|----------|---------|
| scoring-worker | `POST /score` | Calculate assessment scores (SCL-90 or generic) |
| ai-report-worker | `POST /generate` | Generate AI psychological reports |
| api-proxy-worker | `/rest/v1/*`, `/auth/v1/*`, `/admin/rest/v1/*` | Proxy Supabase API, bypass RLS for admin |

### Key Frontend Patterns

- **Path alias:** `@/` → `./src/`
- **State:** Zustand stores for auth + theme
- **Routing:** React Router v6 with lazy-loaded pages
- **Protected routes:** `ProtectedRoute` (students) and `TeacherProtectedRoute` (teachers/admins)
- **Admin client:** `getAdminClient()` in `api/supabase.ts` uses api-proxy to bypass RLS

## Environment Configuration

**Frontend (.env):**
```env
VITE_SUPABASE_URL=http://148.135.56.115:8000
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SCORING_WORKER_URL=https://scoring-worker.<account>.workers.dev
VITE_AI_REPORT_WORKER_URL=https://ai-report-worker.<account>.workers.dev
VITE_API_PROXY_WORKER_URL=https://api-proxy-worker.<account>.workers.dev
```

**Workers (wrangler.toml vars):**
- api-proxy: `BACKEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- ai-report: `OPENROUTER_API_KEY` (set via `wrangler secret put`)

## User Roles & Routes

| Role | Routes | Features |
|------|--------|----------|
| Student | `/dashboard`, `/scales`, `/assessment/*`, `/reports/*` | Take assessments, view reports |
| Teacher | `/teacher/*` | Manage scales, publications, view student results, item bank |
| Admin | `/teacher/*` | All teacher features + user management |

## Tech Stack

**Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, Axios, React Router v6, react-hot-toast, react-markdown, recharts

**Backend:** Cloudflare Workers, Supabase (PostgreSQL + Auth), OpenRouter API (AI reports)

## Common Issues

1. **Vite JSX errors:** `rm -rf frontend/node_modules/.vite`
2. **Mixed content (HTTPS→HTTP):** Use api-proxy-worker as Supabase URL
3. **RLS bypass needed:** Use `getAdminClient()` which routes through `/admin/rest/v1/*`
4. **Worker secrets:** Must use `wrangler secret put`, not wrangler.toml
