import * as path from "node:path";

export interface SecretFinding {
  type: string;
  file: string;
  line: number;
}

const SECRET_PATTERNS: { type: string; pattern: RegExp }[] = [
  { type: "AWS Access Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: "GitHub Token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { type: "Slack Token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { type: "Stripe Secret Key", pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { type: "Google API Key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { type: "Private Key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  {
    type: "Hardcoded Credential",
    pattern: /\b(?:api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i
  }
];

export function checkSecrets(
  targetDir: string,
  scannedFiles: { path: string; content: string }[]
): SecretFinding[] {
  const root = path.resolve(targetDir);
  const findings: SecretFinding[] = [];

  for (const file of scannedFiles) {
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { type, pattern } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({ type, file: path.relative(root, file.path), line: i + 1 });
        }
      }
    });
  }
  return findings;
}
