import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ProdShieldConfig {
  ignoreSecrets: string[];
  ignorePackages: string[];
  ignorePaths: string[];
}

export const CONFIG_FILE = ".prodshieldrc.json";

export const DEFAULT_CONFIG: ProdShieldConfig = {
  ignoreSecrets: [],
  ignorePackages: [],
  ignorePaths: []
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function loadConfig(targetDir: string): Promise<ProdShieldConfig> {
  const file = path.join(path.resolve(targetDir), CONFIG_FILE);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ignoreSecrets: toStringArray(parsed.ignoreSecrets),
      ignorePackages: toStringArray(parsed.ignorePackages),
      ignorePaths: toStringArray(parsed.ignorePaths)
    };
  } catch {
    throw new Error(`Invalid JSON in ${CONFIG_FILE}`);
  }
}

/** Matches a name against a pattern; `*` is a wildcard, everything else is literal. */
export function matchesPattern(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}
