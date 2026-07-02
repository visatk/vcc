export interface Env {
  DB: D1Database;
  sessions: KVNamespace;
  EMAIL: SendEmail;
  TURNSTILE_SECRET: string;
  DESTINATION_BTC_ADDRESS: string;
  DESTINATION_LTC_ADDRESS: string;
  DESTINATION_BCH_ADDRESS: string;
  DESTINATION_DOGE_ADDRESS: string;
  DESTINATION_TRX_ADDRESS: string;
  BREVO_API_KEY: string;
  WEBHOOK_SECRET: string;
}

export type AppVariables = {
  db: ReturnType<typeof import('./db').getDb>;
  user?: import('./middleware/auth').AuthUser;
};
