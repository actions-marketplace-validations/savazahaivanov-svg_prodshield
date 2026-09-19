import * as fs from "node:fs/promises";
import * as path from "node:path";
import { builtinModules } from "node:module";

export interface MissingDependencyFinding {
  packageName: string;
  files: string[];
}

const SOURCE_EXT = /\.(?:js|jsx|ts|tsx)$/;

const IMPORT_PATTERNS: RegExp[] = [
  /\bimport\s+(?:[\w*\s{},$]+?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:[\w*\s{},$]+?\s+)from\s+['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
];

const BUILTINS = new Set(builtinModules.map((m) => m.replace(/^node:/, "")));

function toPackageName(specifier: string): string | null {
  if (specifier.startsWith("./") || specifier.startsWith("../")) return null;
  if (specifier === "." || specifier === ".." || specifier.startsWith("/")) return null;
  if (specifier.startsWith("node:")) return null;
  if (specifier.startsWith("@/") || specifier.startsWith("~/") || specifier.startsWith("#")) return null;

  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  if (!name) return null;
  if (specifier.startsWith("@") && parts.length < 2) return null;

  if (BUILTINS.has(name)) return null;
  return name;
}

export async function checkMissingDependencies(
  targetDir: string,
  scannedFiles: { path: string; content: string }[]
): Promise<MissingDependencyFinding[]> {
  const resolvedPath = path.resolve(targetDir);

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(await fs.readFile(path.join(resolvedPath, "package.json"), "utf8"));
  } catch {
    // No readable package.json: nothing to compare against.
    return [];
  }

  const declared = new Set<string>();
  for (const field of ["dependencies", "devDependencies"]) {
    const section = pkg[field];
    if (section && typeof section === "object") {
      Object.keys(section).forEach((k) => declared.add(k));
    }
  }

  const used = new Map<string, Set<string>>();

  for (const file of scannedFiles) {
    if (!SOURCE_EXT.test(file.path)) continue;
    for (const pattern of IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        const specifier = match[1];
        if (!specifier) continue;
        const name = toPackageName(specifier);
        if (!name) continue;
        if (!used.has(name)) used.set(name, new Set<string>());
        used.get(name)!.add(path.relative(resolvedPath, file.path));
      }
    }
  }

  const missing: MissingDependencyFinding[] = [];
  for (const [name, files] of used.entries()) {
    if (!declared.has(name)) {
      missing.push({ packageName: name, files: Array.from(files) });
    }
  }
  return missing;
}
