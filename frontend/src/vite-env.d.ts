/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SCORING_WORKER_URL: string;
  readonly VITE_AI_REPORT_WORKER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
