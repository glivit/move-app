---
description: Run full UX + code audit op MŌVE, dan optimizer met findings
allowed-tools: Bash, Read, Write, Agent
argument-hint: "[--skip-ux] [--skip-code] [--auto-optimize]"
---

# /audit — MŌVE 3-agent audit pipeline

Args (optional): $ARGUMENTS

## Setup

```bash
DATE=$(date +%Y-%m-%d)
mkdir -p audits/$DATE/screens
echo "Audit dir: audits/$DATE/"
```

## Stap 1 — Verify prerequisites

1. Check dev server running: `curl -s http://localhost:3000 > /dev/null` — als niet, start `npm run dev` in background via Bash met `run_in_background: true`. Wacht 8s tot ready.
2. Check Playwright installed: `npx playwright --version`. Als niet → `npm i -D @playwright/test && npx playwright install chromium --with-deps`.
3. Check beide audit-files niet al bestaan voor vandaag (anders flag: "Audit van vandaag bestaat al, overschrijven? y/n").

## Stap 2 — Spawn auditors in parallel

Roep beide tegelijk aan in één bericht (twee Agent-calls, parallel):

**Agent A — ux-auditor**
```
subagent_type: ux-auditor
description: UX audit van vandaag
prompt: "Doe een volledige UX audit volgens je instructies. Output: audits/$DATE/ux-report.md.
Belangrijke aandachtspunten deze run:
- Premium frosted glass feel — voldoende presence per scherm?
- Lime accent gebruikt waar het telt (Voltooid, today, PR)?
- Chat smooth bij openen?
- Workout exercise picker en delete-flow intuïtief?
- Progress page leesbaar (geen wit-op-wit)?
Cap: 40 findings. Begin nu."
```

**Agent B — code-auditor**
```
subagent_type: code-auditor
description: Code audit van vandaag
prompt: "Doe een volledige code audit volgens je instructies. Output: audits/$DATE/code-report.md.
Specifiek deze run:
- backdrop-filter overhead per route
- Recente sed-passes (variables.css, globals.css) — clean?
- Service worker precache health
- Active workout component grootte (>3000 lines)
- Inline-style dichtheid in DashboardClient + workout/active
Cap: 50 findings. Begin nu."
```

Wacht op beide. Beide moeten succesvol terugkomen.

## Stap 3 — Spawn optimizer (alleen als --auto-optimize gevraagd)

Default = STOP na stap 2 en toon findings aan user. User beslist of optimizer mag draaien.

Als `--auto-optimize` flag → spawn optimizer:
```
subagent_type: optimizer
description: Apply audit fixes
prompt: "Lees audits/$DATE/ux-report.md en audits/$DATE/code-report.md. Implementeer alle BLOCKER en MAJOR findings. Document in audits/$DATE/changes.md. TypeScript moet schoon blijven na elke change. Commit in batches van 5. Begin nu."
```

## Stap 4 — Final summary

Toon de user:

```markdown
# Audit run · $DATE

✅ UX report: audits/$DATE/ux-report.md (N findings)
✅ Code report: audits/$DATE/code-report.md (M findings)

## Top 5 blockers across both
1. …
2. …

## Top 5 quick wins (low effort, high impact)
1. …

## Volgende stap
- [ ] Run optimizer? `/audit --auto-optimize`
- [ ] Of pak handmatig de top-5 blockers aan
- [ ] Of plan een design-call voor de UX-blockers
```

## Belangrijke notes

- Stop dev server NIET na audit (user werkt er nog mee)
- Schrijf raw findings ook naar `audits/<date>/raw/` als JSON voor latere diff-tracking
- Als beide auditors >100 findings genereren: vraag user welke severity-tiers prioriteit hebben

## Edge cases

- **Login required:** UX auditor moet test-credentials gebruiken. Als niet aanwezig, fail vroeg met duidelijke error.
- **Server start fail:** check `package.json` scripts en port-conflicts. Niet alleen `next dev`, kan ook turbopack zijn.
- **Playwright install fail:** vraag user om handmatig `npx playwright install --with-deps` te runnen.
