import * as fs from "node:fs/promises";
import * as path from "node:path";
import fg from "fast-glob";
import { loadConfig, matchesPattern } from "./config.js";
import { checkSecrets, type SecretFinding } from "./rules/secrets.js";
import { checkMissingEnvVars, type MissingEnvFinding } from "./rules/env.js";
import {
  checkMissingDependencies,
  type MissingDependencyFinding
} from "./rules/dependencies.js";

export interface ScanReport {
  scannedFiles: number;
  secrets: SecretFinding[];
  missingEnv: MissingEnvFinding[];
  missingDependencies: MissingDependencyFinding[];
}

export async function scan(targetDir: string): Promise<ScanReport> {
  const root = path.resolve(targetDir);
  const config = await loadConfig(root);

  const paths = await fg("**/*.{js,jsx,ts,tsx}", {
    cwd: root,
    absolute: true,
    dot: false,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/*.d.ts", ...config.ignorePaths]
  });

  const scannedFiles: { path: string; content: string }[] = [];
  for (const p of paths) {
    try {
      scannedFiles.push({ path: p, content: await fs.readFile(p, "utf8") });
    } catch {
      // Unreadable file, skip
    }
  }

  const secrets = checkSecrets(root, scannedFiles).filter(
    (f) => !config.ignoreSecrets.some((p) => matchesPattern(f.type, p))
  );
  const missingEnv = await checkMissingEnvVars(root, scannedFiles);
  const missingDependencies = (await checkMissingDependencies(root, scannedFiles)).filter(
    (d) => !config.ignorePackages.some((p) => matchesPattern(d.packageName, p))
  );

  return { scannedFiles: scannedFiles.length, secrets, missingEnv, missingDependencies };
}
