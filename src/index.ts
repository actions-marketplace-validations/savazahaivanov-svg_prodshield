#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Command } from "commander";
import pc from "picocolors";
import { scan } from "./scanner.js";
import { runFixer } from "./fixer.js";

function readVersion(): string {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf8")) as { version?: string };
    return pkg.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
}

const program = new Command();

program
  .name("prodshield")
  .version(readVersion(), "-v, --version", "output the current version")
  .description("Scan a project for secrets, missing env vars and undeclared dependencies")
  .argument("[dir]", "project directory to scan", ".")
  .option("-d, --dir <path>", "project directory to scan (overrides [dir])")
  .option("--fix", "Automatically remediate configuration issues")
  .action(async (dir: string, options: { fix?: boolean; dir?: string }) => {
    const targetDir = options.dir ?? dir;
    const report = await scan(targetDir);
    console.log(pc.bold(`Scanned ${report.scannedFiles} files`));

    if (report.secrets.length > 0) {
      console.log(pc.red(`\nPotential secrets (${report.secrets.length}):`));
      for (const s of report.secrets) {
        console.log(`  ${pc.red("✖")} ${s.type} ${pc.dim(`${s.file}:${s.line}`)}`);
      }
    }

    if (report.missingEnv.length > 0) {
      console.log(pc.yellow(`\nUndeclared environment variables (${report.missingEnv.length}):`));
      for (const e of report.missingEnv) {
        console.log(`  ${pc.yellow("!")} ${e.variable} ${pc.dim(e.files.join(", "))}`);
      }
    }

    if (report.missingDependencies.length > 0) {
      console.log(pc.yellow(`\nUndeclared dependencies (${report.missingDependencies.length}):`));
      for (const d of report.missingDependencies) {
        console.log(`  ${pc.yellow("!")} ${d.packageName} ${pc.dim(d.files.join(", "))}`);
      }
    }

    let envFixed = false;
    if (options.fix && report.missingEnv.length > 0) {
      const actions = await runFixer(report, targetDir);
      if (actions.length > 0) {
        console.log(pc.green("\nFixes applied:"));
        for (const a of actions) console.log(pc.green(`  ✔ ${a}`));
      }
      envFixed = true;
    }

    const failed =
      report.secrets.length > 0 ||
      (report.missingEnv.length > 0 && !envFixed) ||
      report.missingDependencies.length > 0;

    if (failed) {
      process.exit(1);
    }
    console.log(pc.green("\n✔ No issues found"));
    process.exit(0);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
