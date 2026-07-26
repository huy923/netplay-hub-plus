import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

if (existsSync(envPath)) {
  console.log("ℹ️  .env exists — skipping");
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error("❌ No .env.example found — cannot generate .env");
  process.exit(1);
}

const example = readFileSync(examplePath, "utf8");
const key = randomBytes(32).toString("hex");
const env = example.replace('ENCRYPTION_KEY=""', `ENCRYPTION_KEY="${key}"`);
writeFileSync(envPath, env);
console.log("✅ Created .env with generated ENCRYPTION_KEY");
console.log("📝 Fill in your Supabase keys in .env before running the app");
