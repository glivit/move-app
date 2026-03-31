# MOVE Design Strategy v2 — "Less but better"

## Design Principes

1. **Eén waarheid per scherm** — 2-seconden test: kijker weet meteen wat er gevraagd wordt
2. **Progressive disclosure** — Laag 1 (laden): de ene waarheid. Laag 2 (scroll): context. Laag 3 (tap): detail
3. **Empty states zijn het design** — Dag 1 moet warm voelen, geen nullen
4. **Getallen in serif** — Alle cijfers in Cormorant Garamond (premium feel)
5. **Kaarten alleen voor interactie** — Niet alles in witte cards, sommige secties direct op cream

---

## Fase 1: Design Tokens & Typografie

- [ ] globals.css: Cormorant Garamond als standaard voor alle getallen (.stat-number class)
- [ ] Cards: verwijder shadows, gebruik enkel border-subtle (behalve modals/sheets)
- [ ] Label class: DM Sans 600, 11px, uppercase, tracking 0.12em, #A09D96
- [ ] Dividers: 1px #E8E4DC of 32px whitespace (geen harde lijnen)
- [ ] Accent kleuren verfijnen: terracotta #D46A3A voor CTAs, warm rood #E05A3A voor streak

## Fase 2: Vandaag (Home redesign)

- [x] Hero: "Glenn." in Cormorant 48px bold met punt — geen "Goedemorgen"
- [x] Weekdots: compact M D W D V Z Z met filled/empty/check dots
- [x] Smart Today Card: één kaart met de eerstvolgende actie (training/rustdag/check-in)
- [x] "Morgen" preview onder de today card
- [x] Voeding compact: één regel + thin progress bar ("1432 / 2200 kcal")
- [x] Contextuele nudge: alleen tonen als relevant (check-in, nieuw programma, etc.)
- [x] Empty state dag 1: warm welkom, geen nullen, één actie
- [x] Weg: twee stat-cards, volledige weekkalender met nummers, training als aparte sectie

## Fase 3: Voortgang (Progress redesign)

- [x] Hero: ÉÉN dynamisch groot getal (Cormorant 72px) — streak, workouts, of gewichtsverschil
- [x] Supporting stats als tekst (niet kaarten): "4 weken actief · 4 records"
- [x] Chart: full-width, clean, één metric tegelijk met tab switcher
- [x] Records: top 3 inline, tappable, "Bekijk alles" link
- [x] Foto vergelijking CTA: prominent als er foto's zijn
- [x] Weg: 4 stat-cards, achievements sectie, 4 quick-link kaarten
- [x] Achievements verplaatst naar profiel of aparte pagina

## Fase 4: Workout Complete redesign

- [x] Getallen in Cormorant Garamond (minuten/sets/volume)
- [x] Tekst-chips voor mood ipv emoji's (Zwaar/Oké/Goed/Sterk/Top)
- [x] Moeilijkheidsgraad: genummerd 1-5 ipv tekst
- [x] Number counter animatie: 0 → einwaarde in 0.8s
- [x] Subtiele confetti (3-5 particles, 2s)
- [x] Coach feedback textarea

## Fase 5: Actieve Workout polish

- [x] Timer: Cormorant Garamond serif, groter, prominenter
- [x] "KLAAR" button: terracotta (#D46A3A) ipv groen
- [x] "VORIGE" kolom: lichter (#C5C2BC), kleiner font
- [x] Set completion: checkmark bounce + rij groene tint
- [x] Sticky header per oefening (naam altijd zichtbaar bij scroll)
- [x] Rust-timer na set completion

## Fase 6: Kalender redesign

- [x] Dot grid ipv nummer grid (gevulde cirkels = activiteit)
- [x] Vandaag = terracotta accent dot
- [x] Lege cirkels = geen activiteit
- [x] Maandnaam in Cormorant 40px
- [x] Tap op dag = detail slide-up panel

## Fase 7: Check-in guided flow

- [ ] Van scroll-pagina naar stap-voor-stap flow
- [ ] Stap 1: Gewicht
- [ ] Stap 2: Foto
- [ ] Stap 3: Hoe voel je je (energie/slaap/stress)
- [ ] Stap 4: Bevestiging
- [ ] Grotere touch targets voor scores

## Fase 8: Voeding refinement

- [x] Macro ring: groter (min 120px diameter)
- [x] Progress bars: dunner, subtielere kleuren
- [x] Maaltijd placeholder: "Notitie..." ipv lange tekst
- [x] Empty state: "Begin met ontbijt →"

## Fase 9: Tab bar & Navigatie

- [x] Evalueer 4 tabs (Vandaag/Voortgang/Chat/Profiel) vs huidige 5
- [x] + button: contextuele floating action of smart quick-access
- [x] Iconen verfijnen: dunner, consistent stroke width
- [x] Active state: terracotta accent of bold label

## Fase 10: App icoon

- [x] SVG: cream (#EEEBE3) achtergrond
- [x] Centered M met macron in #1A1917
- [x] Cormorant Garamond bold
- [ ] Export naar alle benodigde formaten (192x192, 512x512, apple-touch-icon)

## Fase 11: Animaties

- [x] Page enter: fade-in 300ms + translateY(12px)
- [x] Tab switch: crossfade 200ms
- [x] List items: stagger slide-up, 60ms delay per item
- [x] Number counter: count-up 800ms ease-out
- [x] Set complete: checkmark bounce 400ms + row tint 200ms
- [x] Card tap: scale(0.98) 100ms → scale(1) 200ms
- [x] Progress bar: width animate 600ms ease-out on load
- [x] Sheet open: slide-up 300ms + backdrop fade 200ms

## Fase 12: Empty states

- [x] Vandaag dag 1: welkomstbericht + eerste actie
- [x] Voortgang geen data: motivatie + "Start je eerste workout"
- [x] Voeding geen plan: "Je coach bereidt je voedingsplan voor"
- [x] Chat geen berichten: "Stuur je coach een bericht"
- [x] Kalender leeg: "Je eerste workout staat klaar"

## Fase 13: TypeScript compilatie & test

- [x] npx tsc --noEmit — 0 errors
- [x] Visuele check alle schermen
- [ ] Mobile responsive test
- [ ] Desktop responsive test
- [ ] Empty state test per scherm
