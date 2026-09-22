import pc from "picocolors";
import type { ScanReport } from "./scanner.js";

export type OutputFormat = "text" | "json" | "markdown";
export const OUTPUT_FORMATS: OutputFormat[] = ["text", "json", "markdown"];

export function countFindings(report: ScanReport): number {
  return report.secrets.length + report.missingEnv.length + report.missingDependencies.length;
}

export function formatText(report: ScanReport, fixes: string[] = []): string {
  const out: string[] = [pc.bold(`Scanned ${report.scannedFiles} files`)];

  if (report.secrets.length > 0) {
    out.push(pc.red(`\nPotential secrets (${report.secrets.length}):`));
    for (const s of report.secrets) {
      out.push(`  ${pc.red("✖")} ${s.type} ${pc.dim(`${s.file}:${s.line}`)}`);
    }
  }
  if (report.missingEnv.length > 0) {
    out.push(pc.yellow(`\nUndeclared environment variables (${report.missingEnv.length}):`));
    for (const e of report.missingEnv) {
      out.push(`  ${pc.yellow("!")} ${e.variable} ${pc.dim(e.files.join(", "))}`);
    }
  }
  if (report.missingDependencies.length > 0) {
    out.push(pc.yellow(`\nUndeclared dependencies (${report.missingDependencies.length}):`));
    for (const d of report.missingDependencies) {
      out.push(`  ${pc.yellow("!")} ${d.packageName} ${pc.dim(d.files.join(", "))}`);
    }
  }
  if (fixes.length > 0) {
    out.push(pc.green("\nFixes applied:"));
    for (const f of fixes) out.push(pc.green(`  ✔ ${f}`));
  }
  if (countFindings(report) === 0) out.push(pc.green("\n✔ No issues found"));
  return out.join("\n");
}

export function formatJson(report: ScanReport, fixes: string[] = []): string {
  return JSON.stringify({ ...report, fixes, totalFindings: countFindings(report) }, null, 2);
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

export function formatMarkdown(report: ScanReport, fixes: string[] = []): string {
  const total = countFindings(report);
  const out: string[] = [
    `## ${total === 0 ? "✅" : "❌"} ProdShield Pre-Flight Check`,
    "",
    `Scanned **${report.scannedFiles}** files, found **${total}** issue(s).`
  ];

  if (total > 0) {
    out.push("", "| Severity | Category | Finding | Location |", "| --- | --- | --- | --- |");
    for (const s of report.secrets) {
      out.push(`| 🔴 Critical | Secret | ${cell(s.type)} | \`${cell(`${s.file}:${s.line}`)}\` |`);
    }
    for (const e of report.missingEnv) {
      out.push(`| 🟡 Warning | Env var | \`${cell(e.variable)}\` | ${cell(e.files.join(", "))} |`);
    }
    for (const d of report.missingDependencies) {
      out.push(`| 🟡 Warning | Dependency | \`${cell(d.packageName)}\` | ${cell(d.files.join(", "))} |`);
    }
  }
  if (fixes.length > 0) {
    out.push("", "**Fixes applied**", "", ...fixes.map((f) => `- ${f}`));
  }
  return out.join("\n");
}

export function render(format: OutputFormat, report: ScanReport, fixes: string[] = []): string {
  switch (format) {
    case "json":
      return formatJson(report, fixes);
    case "markdown":
      return formatMarkdown(report, fixes);
    default:
      return formatText(report, fixes);
  }
}
