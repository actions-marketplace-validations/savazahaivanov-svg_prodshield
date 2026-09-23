<div align="center">

# 🛡️ ProdShield

**Sub-second pre-flight gatekeeper catching AI package hallucinations (slopsquatting), leaked secrets, and undeclared env vars.** (Cursor, Claude, Copilot)

[![npm version](https://img.shields.io/npm/v/prodshield.svg)](https://www.npmjs.com/package/prodshield)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-ProdShield-blue?logo=github)](https://github.com/marketplace/actions/prodshield-pre-flight-gatekeeper)
[![License: MIT](https://img.shields.io/npm/l/prodshield.svg)](LICENSE)

</div>

---

AI coding assistants ship code fast — but they don't ship it *safe*. ProdShield is a single, dependency-light check that runs before a merge or a deploy and catches the three failure modes AI-generated code introduces most often.

## The Problem

| Vector | What happens |
| --- | --- |
| **Slopsquatting / hallucinated packages** | The assistant `import`s a package that sounds plausible but was never installed — or doesn't exist on npm at all. Attackers register these hallucinated names, so a confident-looking `import` can pull in malicious code the moment someone runs `npm install`. |
| **Hardcoded secrets & API keys** | Keys get pasted straight into source "just to make it work," then committed and pushed to a public or shared repo. |
| **Undeclared environment variables** | Code reads `process.env.SOMETHING` that no `.env` file declares, so the app builds fine locally and breaks the moment it hits a fresh deploy target. |

ProdShield scans for all three and exits non-zero the moment it finds one, so it can gate a PR or a deploy before the damage ships.

## Enterprise Threat Model: Why Traditional SCA Fails AI Code

1. **The Zero-CVE Blind Spot (Slopsquatting).** Traditional SCA tools (Snyk, Dependabot) key off known CVE feeds — they flag a *vulnerable* package, not a *nonexistent* one. When an LLM hallucinates a plausible-sounding package name (a conflated or invented library), there is no CVE to match because the package was never a known dependency in the first place. Attackers pre-register these hallucinated names on public registries with malicious install hooks, betting that someone's assistant will suggest the name again. ProdShield checks every import against your own `package.json` before resolution, so a hallucinated name is flagged the moment it appears in source — no CVE feed required.
2. **Sub-400ms Static Analysis, Zero Runtime Dependencies.** ProdShield ships with no heavy background daemon and no multi-gigabyte Docker container. It's a single lightweight CLI that scans source text directly, so it drops into a pre-commit hook or a CI job without adding meaningful build time.
3. **Data Sovereignty by Design.** 100% local execution. Source code, tokens, and repo manifests are never transmitted outside the execution environment. See [Privacy & Telemetry](#privacy--telemetry) for exactly what, if anything, leaves the machine.

## Quick Start

### Zero-install CLI

```bash
# Scan the current project
npx --yes prodshield@latest

# Scan and auto-patch what can be safely fixed
npx --yes prodshield@latest --fix
```

### GitHub Action (composite)

```yaml
- uses: savazahaivanov-svg/prodshield@v1.1.3
  with:
    dir: '.'
    format: 'text'
    fix: 'false'
```

### GitHub Action (raw workflow)

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

Either way, the report lands on the workflow run's step summary and the job fails if issues are found.

## Core Features

| Feature | Description |
| --- | --- |
| 🔑 **Secret Leak Detection** | OpenAI, Stripe, AWS, GitHub, Slack and Google tokens, private keys, and generic hardcoded credentials — reported with file and line number. |
| 🌱 **Missing Environment Variable Audit** | Diffs `process.env.*` / `import.meta.env.*` usage against `.env`, `.env.local`, `.env.example` and `.env.development`. Standard CI/runtime vars (`NODE_ENV`, `CI`, `GITHUB_ACTIONS`, etc.) are ignored by default. |
| 👻 **Ghost / Hallucinated Package Detection** | Diffs `import` / `require` statements against `dependencies` and `devDependencies` in `package.json`. Relative imports, Node built-ins and `@/` aliases are ignored. |
| 🛠️ **Autonomous Remediation** | `--fix` creates or appends to `.env.example` for missing variables. Existing entries are never overwritten or removed. |
| 📄 **CI-Native Output** | `text`, `json` and `markdown` formats, plus direct `$GITHUB_STEP_SUMMARY` integration. |

## CLI Flags

| Flag | Description |
| --- | --- |
| `-d, --dir <path>` | Directory to scan. Defaults to the current directory. A positional `[dir]` argument also works. |
| `--fix` | Automatically remediate issues (creates or appends missing variables to `.env.example`). |
| `--format <type>` | Output format: `text` (default), `json` or `markdown`. |
| `--github-summary` | Append the Markdown report to the file named by `$GITHUB_STEP_SUMMARY`. |
| `-v, --version` | Print the installed version. |
| `-h, --help` | Show usage information. |

**Exit codes:** `0` when the project is clean (or missing env vars were fixed by `--fix`); `1` when unresolved secrets, env vars, or dependencies remain.

## Configuration

Drop a `.prodshieldrc.json` in the directory you scan to tune what gets flagged:

```json
{
  "ignoreSecrets": ["Hardcoded Credential"],
  "ignorePackages": ["@my-org/*", "virtual-module"],
  "ignorePaths": ["**/fixtures/**", "scripts/legacy/**"]
}
```

| Key | Type | Meaning |
| --- | --- | --- |
| `ignoreSecrets` | `string[]` | Secret types to ignore, matched by name (e.g. `OpenAI API Key`). `*` is a wildcard. |
| `ignorePackages` | `string[]` | Package names to exclude from the undeclared-dependency check. `*` is a wildcard. |
| `ignorePaths` | `string[]` | Glob patterns for files to skip entirely. |

All keys are optional. Without a config file, nothing extra is ignored.

## Privacy & Telemetry

ProdShield can send a single, minimal anonymous ping per run: **CLI version, run duration, and total finding count only.**

- **No source code, file paths, file names, secret values, or env var names ever leave your machine.**
- Telemetry is sent **only if `PRODSHIELD_TELEMETRY_URL` is explicitly configured** — it is off by default with no endpoint set.
- It is always disabled when `DO_NOT_TRACK=1` or `PRODSHIELD_NO_ANALYTICS=1` is set.
- Requests time out after 1.5 seconds and fail silently — a network hiccup never blocks your scan or your CI job.

## License

[MIT](LICENSE)
