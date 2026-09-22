#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { Command } from "commander";
import pc from "picocolors";
import { scan } from "./scanner.js";
import { runFixer } from "./fixer.js";
import {
  OUTPUT_FORMATS,
  countFindings,
  formatMarkdown,
  render,
  type OutputFormat
} from "./formatters.js";
import { sendTelemetry } from "./telemetry.js";

function readVersion(): string {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf8")) as { version?: string };
    return pkg.version ?? "1.1.0";
  } catch {
    return "1.1.0";
  }
}

interface CliOptions {
  dir?: string;
  fix?: boolean;
  format: string;
  githubSummary?: boolean;
}

const version = readVersion();
const program = new Command();

program
  .name("prodshield")
  .version(version, "-v, --version", "output the current version")
  .description("Scan a project for secrets, missing env vars and undeclared dependencies")
  .argument("[dir]", "project directory to scan", ".")
  .option("-d, --dir <path>", "directory to scan (default: '.')")
  .option("--fix", "automatically remediate issues")
  .option("--format <type>", "output format: text | json | markdown", "text")
  .option("--github-summary", "append a markdown report to $GITHUB_STEP_SUMMARY")
  .action(async (dir: string, options: CliOptions) => {
    const started = Date.now();

    if (!OUTPUT_FORMATS.includes(options.format as OutputFormat)) {
      console.error(
        pc.red(`Invalid --format "${options.format}". Use one of: ${OUTPUT_FORMATS.join(", ")}`)
      );
      process.exit(1);
    }
    const format = options.format as OutputFormat;
    const targetDir = options.dir ?? dir;

    const report = await scan(targetDir);

    let fixes: string[] = [];
    let envFixed = false;
    if (options.fix && report.missingEnv.length > 0) {
      fixes = await runFixer(report, targetDir);
      envFixed = true;
    }

    console.log(render(format, report, fixes));

    if (options.githubSummary) {
      const summaryFile = process.env.GITHUB_STEP_SUMMARY;
      if (summaryFile) {
        await appendFile(summaryFile, formatMarkdown(report, fixes) + "\n", "utf8");
      } else {
        console.error(pc.yellow("--github-summary set but GITHUB_STEP_SUMMARY is not defined"));
      }
    }

    const failed =
      report.secrets.length > 0 ||
      (report.missingEnv.length > 0 && !envFixed) ||
      report.missingDependencies.length > 0;

    await sendTelemetry({
      version,
      durationMs: Date.now() - started,
      findings: countFindings(report)
    });

    process.exit(failed ? 1 : 0);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
