# MŌVE v3 Design Overhaul — Plan of Attack

## Het probleem

De app heeft twee gezichten. De 5 hand-geschreven pagina's (home, nutrition, workout overview/complete/history) voelen als Oura Ring. De overige ~30 pagina's voelen als een Tailwind template met een color swap. Het verschil is zichtbaar en voelbaar.

---

## FASE 1: Fundament fixen (globals.css + skeleton + layout)

### 1A. globals.css opschonen — het hart van het probleem

Het huidige `globals.css` bevat **twee design systemen door elkaar**:
- **Oud (v1/v2):** `--color-bg: #EEEBE3`, `--color-border-subtle: #E8E4DC`, `--color-text-muted: #A09D96`, `card-v2`, `card-editorial`, `card-bordered`, `card-tactile`, `shadow-clean`, etc.
- **Nieuw (v3):** Inline hardcoded `#F0F0EE`, `#ACACAC`, `#C0C0C0`, `#1A1917` direct in de pagina's

**Actie:**
- `@theme` block vervangen met v3 tokens:
  - `--color-bg: #FFFFFF` (niet #EEEBE3)
  - `--color-border-subtle: #F0F0EE` (niet #E8E4DC)
  - `--color-text-muted: #C0C0C0` (niet #A09D96)
  - `--color-text-secondary: #ACACAC` (niet #6B6862)
  - `--color-surface-muted: #F8F8F6` (niet #E5E1D9)
- `card-v2` class updaten: `border: 1px solid #F0F0EE` (geen shadow, geen hover shadow)
- `shadow-clean` definiëren of verwijderen
- `body` background naar `#FFFFFF` voor client-app
- Alle backward-compat classes (`card-editorial`, `card-bordered`, `card-tactile`, `card-elevated`) updaten naar v3 tokens

**Impact:** Elke pagina die CSS variables gebruikt wordt instant gefixt.

### 1B. Skeleton loading (client/loading.tsx)

Huidige staat: kapotte `shadow-[shadow-lg]` syntax, geen shimmer, geen layout matching.

**Actie:**
- Verwijder `shadow-[shadow-lg]`
- Voeg `animate-shimmer` toe (bestaat al in globals.css)
- Skeleton layout moet de echte pagina simuleren: hero tekst placeholder, thin border rows, macro row blokken
- Gebruik `bg-[#F0F0EE]` voor skeleton blokken (niet wit-op-wit)

### 1C. Page transitions

Nu: harde knip tussen pagina's. Geen animatie.

**Actie:**
- Wrapper component `<PageTransition>` in `ClientLayoutShell`
- Gebruikt `animate-fade-in` of `animate-gentle-rise` (al gedefinieerd in globals)
- Wrap `{children}` met: `<div className="animate-fade-in">{children}</div>`
- Optioneel: `framer-motion` `AnimatePresence` voor route-based transitions (maar simpele CSS is vaak genoeg)

---

## FASE 2: De 6 slechtste pagina's from-scratch herschrijven

Deze pagina's scoren onder 7/10 en hebben structurele problemen die niet met zoek-en-vervang op te lossen zijn.

### 2A. Stats page (`/client/stats/page.tsx`)
- **Problemen:** `shadow-[shadow-lg]` (kapotte syntax), geen font tokens, hardcoded chart kleuren
- **Aanpak:** Complete rewrite met v3 hero nummers, thin border sections, tokenized chart kleuren

### 2B. Measurements page (`/client/measurements/page.tsx`)
- **Problemen:** `shadow-[shadow-lg]`, geen v3 typografie
- **Aanpak:** Rewrite met chart in v3 stijl, grote hero measurement number

### 2C. Program page (`/client/program/page.tsx`)
- **Problemen:** `shadow-clean`, onbekende CSS variables (`client-surface-muted`, `text-text-primary`)
- **Aanpak:** Rewrite met v3 tokens, clean day-list met thin borders

### 2D. Check-in page (`/client/check-in/page.tsx`)
- **Problemen:** 3x `card-v2`, formulier-stijl past niet bij v3
- **Aanpak:** Rewrite als stap-voor-stap flow met grote vraag-tekst, minimal input styling

### 2E. Progress page (`/client/progress/page.tsx`)
- **Problemen:** `card-v2`, `card-v2-interactive`, geen v3 hero moment
- **Aanpak:** Rewrite met foto-vergelijking als hero, stats als thin border rows

### 2F. Meal-plan page (`/client/meal-plan/page.tsx`)
- **Problemen:** 4x `shadow-clean`, mogelijk overlap met nutrition page
- **Aanpak:** Evalueer of deze pagina nog nodig is naast nutrition. Zo ja: rewrite. Zo nee: redirect.

---

## FASE 3: Batch-fix 18 pagina's die `text-editorial-h2` gebruiken

Deze pagina's gebruiken `text-editorial-h2` voor hun header. Dat is technisch correct (het mapped naar Manrope 32px 600 in globals.css), maar ze missen:
- Hero typografie momenten (grote nummers, dramatische tekst)
- Staggered entry animaties
- Micro-interacties (hover states, transitions op rijen)
- `var(--font-body)` op body text (vallen nu terug op system font of DM Sans via body selector)

**Pagina's:**
1. `/client/notifications/page.tsx`
2. `/client/notifications/[id]/page.tsx`
3. `/client/prompts/page.tsx`
4. `/client/health/page.tsx`
5. `/client/booking/page.tsx`
6. `/client/supplements/page.tsx`
7. `/client/resources/page.tsx`
8. `/client/community/page.tsx`
9. `/client/profile/page.tsx`
10. `/client/profile/edit/page.tsx`
11. `/client/profile/diet/page.tsx`
12. `/client/profile/health/page.tsx`
13. `/client/profile/goals/page.tsx`
14. `/client/profile/help/page.tsx`
15. `/client/profile/notifications/page.tsx`
16. `/client/profile/privacy/page.tsx`
17. `/client/profile/invoices/page.tsx`
18. `/client/exercises/page.tsx` (geen font tokens)

**Actie per pagina:**
- Vervang `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` met `border border-[#F0F0EE]` only (geen shadow)
- Voeg `animate-fade-in` toe op main container
- Voeg `animate-slide-up stagger-N` toe op content secties
- Check hover states op interactieve elementen
- Kan grotendeels in batch met sed + targeted edits

---

## FASE 4: Micro-interacties & Polish

### 4A. Hover states standaardiseren
- Interactieve rijen: `hover:bg-[#FAFAF8] transition-colors`
- Knoppen: `active:scale-[0.98] transition-transform`
- Links: `hover:text-[#1A1917] transition-colors`

### 4B. Number animations
- Elk groot nummer op een pagina moet een count-up animatie hebben bij mount
- Herbruikbaar `<AnimatedNumber>` component (bestaat al in workout/complete)
- Toepassen op: home stats, nutrition hero, progress stats, measurements

### 4C. Staggered entry
- Elke pagina: content sections krijgen `animate-slide-up` met `stagger-1` t/m `stagger-6`
- Geeft de "items vallen op hun plek" feel van Apple Health

### 4D. Pull-to-refresh feel
- Spinner bij data laden: consistente `border-2 border-[#1A1917] border-t-transparent` spinner
- Geen grijze spinners, geen blauwe spinners

### 4E. Success states
- Meal afgevinkt: groene flash (`animate-row-success`)
- Workout voltooid: confetti (bestaat al)
- Check-in verzonden: check bounce (`animate-check-bounce`)

---

## FASE 5: Systeem-level verbeteringen

### 5A. Type scale documenteren en afdwingen
Huidige situatie: willekeurig van 11px tot 52px.

**Voorstel v3 type scale:**
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| hero | 52px | 800 | Calorie number, main stat |
| display | 36-48px | 200-700 | Page hero text, rest day |
| h1 | 28px | 700 | Page titles |
| h2 | 20px | 600 | Section headers |
| body | 15px | 400 | Default text |
| body-sm | 13px | 400 | Secondary text |
| label | 12px | 500 | Section labels, uppercase |
| caption | 11px | 500 | Meta text, timestamps |
| micro | 10px | 600 | Badges |

### 5B. Color tokens finaliseren
Vervang in `@theme`:
```css
--color-bg: #FFFFFF;
--color-bg-subtle: #F8F8F6;
--color-bg-muted: #FAFAF8;
--color-text-primary: #1A1917;
--color-text-secondary: #ACACAC;
--color-text-muted: #C0C0C0;
--color-text-faint: #D5D5D5;
--color-border: #F0F0EE;
--color-border-strong: #E0E0E0;
--color-accent: #D46A3A;
--color-success: #3D8B5C;
```

### 5C. Consistent card pattern
Eén pattern voor alle kaarten:
```
bg-white rounded-2xl border border-[#F0F0EE]
```
Geen shadows. Geen card-v2. Geen shadow-clean. Puur border.

---

## Volgorde van uitvoering

| # | Wat | Impact | Effort | Methode |
|---|-----|--------|--------|---------|
| 1 | globals.css @theme + card-v2 fix | HOOG — fixt 7+ pagina's instant | 30 min | Handmatig |
| 2 | loading.tsx skeleton | HOOG — eerste indruk | 10 min | Rewrite |
| 3 | Page transition wrapper | MIDDEL — voelt direct premium | 15 min | Component |
| 4 | Stats page rewrite | HOOG — meest kapotte pagina | 45 min | Agent |
| 5 | Measurements rewrite | MIDDEL | 30 min | Agent |
| 6 | Program page rewrite | MIDDEL | 30 min | Agent |
| 7 | Check-in rewrite | MIDDEL | 45 min | Agent |
| 8 | Progress rewrite | MIDDEL | 30 min | Agent |
| 9 | Batch-fix 18 pagina's (shadows, animations) | HOOG — veel pagina's | 30 min | Batch sed + agents |
| 10 | AnimatedNumber component extracten | LAAG | 15 min | Handmatig |
| 11 | Staggered entry toevoegen | MIDDEL — premium feel | 20 min | Batch |
| 12 | TypeScript check + final commit | MUST | 10 min | CLI |

**Geschatte totale effort: ~5 uur werk, op te splitsen in 3-4 sessies.**

---

## Definition of Done

Een pagina is "v3 compliant" als:
- [ ] Witte achtergrond, geen beige
- [ ] Alle tekst gebruikt Manrope (display) of DM Sans (body) — GEEN system font fallback
- [ ] Geen `card-v2`, `shadow-clean`, `shadow-[shadow-lg]` of oude tokens
- [ ] Borders zijn `#F0F0EE`, niet `#E8E4DC`
- [ ] Ten minste één hero typografie moment (groot nummer of grote tekst)
- [ ] Entry animatie (fade-in of slide-up)
- [ ] Hover states op interactieve elementen
- [ ] Consistent spinner stijl
- [ ] Geen hardcoded shadows behalve modals/sheets
