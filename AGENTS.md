# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Vite + React + TypeScript app; main code lives in `src/` (pages/components/hooks/store/utils), static assets in `public/`, build output in `dist/`. Environment template: `frontend/.env.example`.
- `workers/`: Cloudflare Workers (`scoring`, `ai-report`, `api-proxy`) each with `src/index.ts`, `wrangler.toml`, and their own `package.json`.
- `supabase/migrations/`: placeholder for SQL migrations when the database schema evolves.
- `deploy.sh`: helper to deploy workers and the frontend via Wrangler; `docs/` reserved for project notes.

## Build, Test, and Development Commands
- Frontend: `cd frontend && npm install && npm run dev` for local dev, `npm run build` for type-check + production bundle, `npm run lint` for ESLint.
- Workers: `cd workers/<worker> && npm install && npm run dev` for Wrangler dev mode; `npm run deploy` to publish; `npm run test` (scoring and ai-report) for Vitest suites.
- Unified deploy: `./deploy.sh workers|frontend|all` after `npx wrangler login`; ensure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and (for ai-report) `OPENROUTER_API_KEY` are set.

## Coding Style & Naming Conventions
- TypeScript-first, React function components, 2-space indentation, single quotes, and semicolons as seen in existing files.
- Use the `@/` alias for imports within `frontend/src`; co-locate related hooks/utils near their pages or components.
- Tailwind utility strings are fine; group related classes for readability. Keep worker handlers small and extract shared helpers where possible.
- TS config is intentionally relaxed; still prefer explicit types and avoid `any` unless migration forces it.

## Testing Guidelines
- Workers: place Vitest files as `*.test.ts` alongside `src/` code; cover routing branches and payload validation. Run with `npm run test`.
- Frontend: no current suite—add Vitest + React Testing Library for new UI logic and mock Supabase/worker calls. Document manual checks for key flows when automation is missing.

## Commit & Pull Request Guidelines
- Commit messages follow short, imperative summaries (e.g., `Update worker URLs in .env.example`); keep one change-set per commit.
- PRs should include a brief description, commands run, linked issue/ID, screenshots for UI changes, and notes on env/secret updates or deploy targets.
- Ensure lint/tests pass before requesting review; highlight any areas lacking coverage.

## Security & Configuration Tips
- Never commit `.env`; copy `frontend/.env.example` locally. Store secrets with Wrangler (`npx wrangler secret put OPENROUTER_API_KEY`) and keep worker URLs in sync with frontend env vars.
- Double-check Supabase endpoints and worker URLs before deploying via `deploy.sh` to avoid mismatched environments.
