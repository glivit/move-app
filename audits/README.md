# MŌVE Audit Pipeline

Drie-agent workflow voor continuous app-improvement.

## Snel starten

```bash
# 1. Eenmalig — install Playwright (alleen 1ste keer)
npm i -D @playwright/test
npx playwright install chromium --with-deps

# 2. Set test credentials voor authed routes
echo 'TEST_USER_EMAIL=test@move.app' >> .env.test
echo 'TEST_USER_PASSWORD=…' >> .env.test

# 3. Start dev server (in aparte terminal of background)
npm run dev

# 4. Run audit vanuit Claude Code
/audit                    # report-only
/audit --auto-optimize    # report + auto-fix blockers/majors
```

## Wat gebeurt er

1. **`/audit` command** — orchestrator, leest in `.claude/commands/audit.md`
2. Spawnt **2 agents parallel:**
   - `ux-auditor` — Playwright walk-through + screenshot eval → `audits/<date>/ux-report.md`
   - `code-auditor` — TypeScript, ESLint, perf, robustness → `audits/<date>/code-report.md`
3. Toont samenvatting aan jou
4. Optional: `optimizer` agent applies BLOCKER+MAJOR fixes, commits in batches

## Output structuur

```
audits/
└── 2026-05-03/
    ├── ux-report.md          ← UX findings (max 40, severity-tagged)
    ├── code-report.md        ← Code findings (max 50, severity-tagged)
    ├── changes.md            ← Wat optimizer heeft toegepast
    ├── todo.md               ← Wat optimizer heeft uitgesteld
    ├── screens/              ← Playwright PNG's per route
    │   ├── home.png
    │   ├── workout-overview.png
    │   └── …
    └── dom/                  ← JSON van interactives + contrast issues
        ├── home.json
        ├── home.contrast-issues.json
        └── …
```

## Severity-systeem

| Tag | Betekenis | Optimizer behandelt? |
|---|---|---|
| BLOCKER | Build kapot, white-on-white, dood-klikkende knop | Ja, eerst |
| MAJOR | Premium-feel ondermijnd, perf hit, missing error handling | Ja |
| MINOR | Cosmetisch, tiny perf, code smell | Naar todo.md |
| NIT | Opinion / nice-to-have | Naar todo.md |

## Tuning

- **Routes** in `audits/playwright/walk-through.spec.ts` — voeg toe wanneer er nieuwe screens komen
- **Caps** in elke agent (max findings per run) — zie respective `.md` bestanden
- **Memory:** patterns die >1 audit terugkomen → schrijf weg in `~/.claude/memory/move-app-patterns.md` zodat agents leren herkennen

## Cadans

- **Na elke UI-batch** (zoals deze v6→v7 migratie): één run om regressions te vangen
- **Voor release**: full run + auto-optimize
- **Niet** elke commit — overhead te hoog

## Wanneer NIET draaien

- Tijdens active feature-werk — finds zijn dan instabiel
- Met gebroken build — optimizer kan niet veilig opereren
- Zonder dev server — UX auditor heeft `:3000` nodig
