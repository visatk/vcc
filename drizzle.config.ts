import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/worker/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    // This is required for `drizzle-kit` to connect to the local D1 database during development.
    // Ensure you are using the correct account_id, database_id, and token if connecting to remote.
    // For local dev, wrangler usually handles this, but Drizzle Kit might need explicit paths.
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
  verbose: true,
  strict: true,
});
