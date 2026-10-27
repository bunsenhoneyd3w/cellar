import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` compares schema.ts to the last migration and writes a
// new SQL file into drizzle/. The app applies pending files when it starts.
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dbCredentials: { url: './data/cellar.db' }
});
