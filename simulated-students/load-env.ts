// Side-effect module: loads .env.local into process.env BEFORE any
// grader code runs. Imported first in run.ts so that USE_REAL_GRADING
// (read at module-load time in lib/graders/index.ts) sees the value.
//
// Next.js loads .env.local automatically, but a standalone tsx script
// does not — hence this tiny, dependency-free loader. Variables already
// present in the environment (exported or inline) take precedence.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  const contents = readFileSync(envPath, "utf8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip matching surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
