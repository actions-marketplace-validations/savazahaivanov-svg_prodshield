# Show HN Submission

**Title:** Show HN: ProdShield – Sub-second pre-flight scanner for AI-generated code

**URL:** https://github.com/savazahaivanov-svg/prodshield

---

## First Comment (post as OP)

Hi HN — I built ProdShield after watching AI coding assistants (Cursor, Claude, Copilot) confidently `import` packages that were never installed, hardcode API keys "just to make it work," and leave `process.env.SOMETHING` reads with no matching `.env` entry. All three look fine in the editor and all three break the moment the code actually ships.

The dependency one is the sneakiest: LLMs will occasionally hallucinate a plausible-sounding package name (a phenomenon researchers have started calling "slopsquatting"). If that name happens to exist on npm — and attackers have started pre-registering popular hallucinated names — `npm install` will happily pull down whatever's actually published there. It's a real supply-chain vector that didn't exist at this scale before autocomplete started writing import statements.

ProdShield is a single scan that runs before a merge or a deploy and checks for exactly these three things:

- **Hallucinated / undeclared packages** — every `import`/`require` diffed against `package.json`.
- **Hardcoded secrets** — OpenAI, Stripe, AWS, GitHub, Slack and Google token patterns, private keys, generic credentials.
- **Missing environment variables** — every `process.env.*` read diffed against your `.env` files.

It runs locally — nothing about your source, your file paths, or your secrets is ever transmitted anywhere. The only thing that can leave your machine is an optional, off-by-default telemetry ping (CLI version + duration + a finding count, nothing else), and even that's gated behind an explicit env var and disabled entirely by `DO_NOT_TRACK=1`.

Try it in one line, no install:

```bash
npx --yes prodshield@latest
```

There's also a `--fix` flag that safely backfills `.env.example` with any variables it finds missing, and a GitHub Action if you want it gating PRs instead of running by hand.

I'd genuinely like technical pushback here — on the secret-detection regexes (false positive/negative rate), on the dependency-resolution heuristics (monorepo/workspace edge cases especially), and on whether the scan speed holds up on codebases much bigger than the ones I've tested against. Happy to answer anything in the thread.
