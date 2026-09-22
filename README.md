# ProdShield

[![npm version](https://img.shields.io/npm/v/prodshield.svg)](https://www.npmjs.com/package/prodshield)
[![npm downloads](https://img.shields.io/npm/dm/prodshield.svg)](https://www.npmjs.com/package/prodshield)
[![License: MIT](https://img.shields.io/npm/l/prodshield.svg)](LICENSE)
[![Node: >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

**The pre-flight safety scanner and deployment gatekeeper for AI-generated code.**

---

## The Problem

AI coding assistants such as Cursor, Claude, Bolt and Copilot ship code fast, but they routinely leave behind problems that only show up once you deploy:

- **Hallucinated packages.** The assistant imports an npm package that was never added to `package.json`. The app runs locally on a stale `node_modules` and crashes in CI or production.
- **Leaked secrets.** API keys and tokens get pasted straight into source files, then committed and pushed.
- **Missing environment variables.** Code reads `process.env.SOMETHING` that is not declared in any `.env` file, so a fresh deploy fails or misbehaves.

ProdShield catches all three before they reach production and exits non-zero so it can gate your deploy.

## Quick Start

```bash
# Scan the current project
npx prodshield

# Scan and patch what can be safely fixed
npx prodshield --fix
```

## Features

| Feature | Description |
| --- | --- |
| **Secret Leak Detection** | OpenAI, Stripe, AWS, GitHub, Slack and Google tokens, private keys and generic hardcoded credentials, with file and line numbers. |
| **Missing Environment Variable Audit** | Compares `process.env.*` / `import.meta.env.*` usage against `.env`, `.env.local`, `.env.example` and `.env.development`. |
| **Ghost / Hallucinated Package Detection** | Compares `import` / `require` statements against `dependencies` and `devDependencies`. Relative imports, Node built-ins and `@/` aliases are ignored. |
| **Autonomous Remediation** | `--fix` creates or appends to `.env.example`. Existing entries are never overwritten. |
| **CI-friendly output** | Text, JSON and Markdown reports, plus GitHub step summaries. |

## CLI Flags

| Flag | Description |
| --- | --- |
| `-d, --dir <path>` | Directory to scan. Defaults to the current directory. A positional `[dir]` argument also works. |
| `--fix` | Automatically remediate issues (creates or appends missing variables to `.env.example`). |
| `--format <type>` | Output format: `text` (default), `json` or `markdown`. |
| `--github-summary` | Append the Markdown report to the file named by `$GITHUB_STEP_SUMMARY`. |
| `-v, --version` | Print the installed version. |
| `-h, --help` | Show usage information. |

Exit codes: `0` when the project is clean (or missing env vars were fixed), `1` when unresolved secrets, env vars or dependencies remain.

## Configuration

Create a `.prodshieldrc.json` in the directory you scan:

```json
{
  "ignoreSecrets": ["Hardcoded Credential"],
  "ignorePackages": ["@my-org/*", "virtual-module"],
  "ignorePaths": ["**/fixtures/**", "scripts/legacy/**"]
}
```

| Key | Type | Meaning |
| --- | --- | --- |
| `ignoreSecrets` | `string[]` | Secret types to ignore, matched by name (for example `OpenAI API Key`). `*` is a wildcard. |
| `ignorePackages` | `string[]` | Package names to exclude from the undeclared-dependency check. `*` is a wildcard. |
| `ignorePaths` | `string[]` | Glob patterns for files to skip entirely. |

All keys are optional. Without a config file, nothing extra is ignored.

## GitHub Actions

Copy this into `.github/workflows/prodshield.yml` to gate every pull request:

```yaml
name: ProdShield Pre-Flight Check

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run ProdShield
        run: npx --yes prodshield@latest --dir . --github-summary
```

The report appears on the workflow run's summary page, and the job fails if issues are found.

## Telemetry

ProdShield can send an anonymous usage ping containing only the CLI version, run duration and total finding count. It never includes file names, paths, code or secret values.

It is **off unless a collector URL is configured** via `PRODSHIELD_TELEMETRY_URL`, and it is always disabled when `DO_NOT_TRACK=1` or `PRODSHIELD_NO_ANALYTICS=1` is set. Requests time out after 1.5 seconds and failures are silent.

## License

[MIT](LICENSE)
