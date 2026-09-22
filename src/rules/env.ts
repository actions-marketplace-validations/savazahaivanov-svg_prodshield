import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface MissingEnvFinding {
  variable: string;
  files: string[];
}

function parseEnvContent(content: string): string[] {
  const keys: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=/);
    if (match && match[1]) {
      keys.push(match[1]);
    }
  }
  return keys;
}

const BUILTIN_IGNORED_ENV_VARS = new Set([
  "NODE_ENV",
  "CI",
  "GITHUB_ACTIONS",
  "GITHUB_STEP_SUMMARY",
  "DO_NOT_TRACK",
  "PRODSHIELD_TELEMETRY_URL",
  "PRODSHIELD_NO_ANALYTICS",
  "PORT",
  "TZ"
]);

const ENV_PATTERNS: RegExp[] = [
  /process\.env\.([A-Z0-9_]+)/g,
  /import\.meta\.env\.([A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g
];

export async function checkMissingEnvVars(
  targetDir: string,
  scannedFiles: { path: string; content: string }[]
): Promise<MissingEnvFinding[]> {
  const resolvedPath = path.resolve(targetDir);

  const declaredKeys = new Set<string>();
  const envCandidates = [".env", ".env.local", ".env.example", ".env.development"];

  for (const envFile of envCandidates) {
    try {
      const fullPath = path.join(resolvedPath, envFile);
      const rawContent = await fs.readFile(fullPath, "utf8");
      const keys = parseEnvContent(rawContent);
      keys.forEach((k) => declaredKeys.add(k));
    } catch {
      // File does not exist, ignore
    }
  }

  const usedVars = new Map<string, Set<string>>();

  for (const file of scannedFiles) {
    for (const pattern of ENV_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        const varName = match[1];
        if (!varName) continue; // Type guard: ensures varName is strictly string

        if (BUILTIN_IGNORED_ENV_VARS.has(varName)) continue;

        if (!usedVars.has(varName)) {
          usedVars.set(varName, new Set<string>());
        }
        usedVars.get(varName)!.add(path.relative(resolvedPath, file.path));
      }
    }
  }

  const missing: MissingEnvFinding[] = [];
  for (const [varName, occurrences] of usedVars.entries()) {
    if (!declaredKeys.has(varName)) {
      missing.push({
        variable: varName,
        files: Array.from(occurrences)
      });
    }
  }

  return missing;
}