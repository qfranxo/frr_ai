import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql", // ✅ 필수!
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})