# Estudio

A personal, ad-free Spanish learning app. Static HTML/CSS/vanilla JS (ES modules),
content as JSON files, progress stored in browser storage. No build step.

## Running locally

Requires Node.js (any recent version) — used only to serve static files, not to build anything.

```
npm run dev
```

Then open http://localhost:5173. (Content is loaded via `fetch()`, so it must be served
over http:// — opening `index.html` directly as a `file://` URL won't load the JSON.)

Any other static server works too, e.g. `npx serve .` or `python -m http.server`.

## Project structure

```
content/            One JSON file per unit (words, phrases, sentences, dialogue)
  units.json        Index of all units, referenced by the app
css/styles.css       Design system + all styles
js/
  data.js            Fetches + caches content JSON
  srs.js             Spaced repetition engine (5-box Leitner, localStorage)
  streak.js          Daily streak tracking (localStorage)
  main.js            Nav/router, mounts the active view
  modes/learn.js      Learn mode (flashcards)
  modes/practice.js   Practice mode (multiple choice + fill-in-the-blank)
  modes/progress.js   Progress view (streak, learned counts, per-unit mastery)
index.html
server.js            Zero-dependency static file server for local dev
```

## Content schema

Each unit file in `/content` follows:

```json
{
  "unit": "food_and_drink",
  "title": "Food & Drink",
  "level": "A1",
  "words": [{ "id": "food_and_drink_w1", "es": "el pan", "en": "bread", "pos": "noun" }],
  "phrases": [{ "id": "food_and_drink_p1", "es": "quiero un café", "en": "I want a coffee" }],
  "sentences": [{ "id": "food_and_drink_s1", "es": "...", "en": "...", "register": "formal" }],
  "dialogue": [{ "speaker": "waiter", "es": "...", "en": "..." }]
}
```

Every word/phrase/sentence has a stable `id` (`<unit>_w1`, `_p1`, `_s1`, ...) — this is what
the spaced repetition engine will key progress state on, so it's a required field for new units.

## Deployment

No build step, so any static host works as-is: push this folder to GitHub Pages, or connect
the repo to Vercel/Netlify with no framework preset (root directory, no build command, no
output directory override needed — the whole repo is the site).

## Spaced repetition

Every card gets a box (1–5) in a Leitner system. Answering correctly in Learn or Practice
moves a card up a box (longer interval before it's due again); answering incorrectly resets
it to box 1 (due immediately). State lives in `localStorage` under `estudio.srs.v1`, keyed by
card id, across all units combined — Practice mode's queue is just "every tracked card whose
`due` date has passed," so it's automatically cross-unit.

## Content sourcing

Topics and grammar sequencing are grounded in the **Plan Curricular del Instituto Cervantes**
(PCIC) — every unit maps to a specific PCIC gramática/funciones/nociones-específicas section
(see the grounding table below). B1 units reflect PCIC's actual A2→B1 grammar leap: present
subjunctive (deseo, duda, value judgments), conditional simple (cortesía, sugerencia, and
hypothetical wishes), and real *si* + present-indicative conditionals. Irrealis *si* + imperfect
subjunctive ("si fuera tú...") is technically B2 per PCIC, but appears sparingly as a flagged
preview in the Hypotheticals unit since PCIC itself places that function's inventory entry at
the B1–B2 boundary. Register and phrasing style are cross-checked against the public-domain
**FSI Spanish Basic Course** (terse, logistics-first dialogue) where topically relevant, to avoid
drifting into generic textbook phrasing — FSI has no equivalent for modern topics like
technology/internet or streaming entertainment, so those units rely on natural register variation
instead. PCIC/FSI inform *what* to teach and *how it should sound* — the actual words/phrases/
sentences are original, not copied.

| Unit | Level | PCIC grounding | Grammar focus |
|---|---|---|---|
| Greetings & Introductions | A1 | Nociones generales | Present tense, basic register (tú/usted) |
| Numbers & Time | A1 | Nociones generales | Numbers, ser/estar for time |
| Food & Drink | A1 | Nociones específicas §alimentación | Present tense, gustar-lite |
| Making Plans & Invitations | A2 | Funciones 4.13/4.16/4.17 (proponer/aceptar/rechazar) | ir a + inf., poder/querer, quedar |
| Talking About the Past | A2 | Gramática 9.1.3/9.1.6 | Pretérito indefinido vs. pretérito perfecto compuesto |
| Travel & Transport | A2 | Nociones específicas 14.1/14.3 (viajes/transporte) | ir a + inf., direct/indirect object pronouns |
| Home & Daily Routine | A2 | Nociones específicas 10.2/10.3 (vivienda/act. domésticas) | Reflexive verbs |
| Health & the Body | A2 | Nociones específicas 1.1/1.2/13 (salud); funciones 3.30 | Present tense, doler construction, tener que |
| Shopping & Clothes | A2 | Nociones específicas 12.1/12.2/12.4 | Present tense, demonstratives, quedar bien/mal |
| Weather & Seasons | A2 | Nociones específicas 20.4 (clima) | hacer/estar + weather expressions |
| Emotions & Feelings | A2 | Nociones específicas 2.2; funciones 3.11–3.27 | estar/sentirse + adjective |
| Work & School Life | B1 | Nociones específicas 7 (trabajo) / 6 (educación) | Present subjunctive (espero que, es importante que) |
| Movies, TV & Entertainment | B1 | Nociones específicas 8.1/8.2/9.5/18.6 | gustar-type verbs, subjunctive for recommendations |
| Giving Opinions & Agreeing/Disagreeing | B1 | Funciones 2.1/2.2/2.9/2.10 | Indicative vs. subjunctive after opinion verbs |
| Technology & the Internet | B1 | Nociones específicas 16.4/9.6 | Subjunctive for necessity (es necesario que) |
| Relationships & Social Plans | B1 | Nociones específicas 4.1/4.2/4.3 | Reciprocal verbs, subjunctive with espero/ojalá |
| Giving Advice & Suggestions | B1 | Funciones aconsejar/proponer-sugerir (B1) | Conditional (debería), yo que tú, subjunctive after recommend verbs |
| Hypotheticals | B1 | Funciones 2.15 (formular hipótesis, B1–B2 boundary) | Real si + present conditionals, conditional simple; irrealis si-clause previewed sparingly |
| Describing People & Personality | B1 | Nociones específicas 1.1/1.2/2.1/2.2 | ser vs. estar, comparatives |

## Status

- [x] Content schema + 19 units:
  - **A1** — Greetings & Introductions, Numbers & Time, Food & Drink
  - **A2** — Making Plans & Invitations, Talking About the Past, Travel & Transport,
    Home & Daily Routine, Health & the Body, Shopping & Clothes, Weather & Seasons,
    Emotions & Feelings
  - **B1** — Work & School Life, Movies/TV & Entertainment, Giving Opinions &
    Agreeing/Disagreeing, Technology & the Internet, Relationships & Social Plans,
    Giving Advice & Suggestions, Hypotheticals, Describing People & Personality
- [x] Learn mode
- [x] Spaced repetition engine
- [x] Practice mode
- [x] Progress view
- [ ] Conversation mode (Claude API)

## Scale notes (19 units / 893 cards, ~176KB content)

Verified via a full Playwright pass: cold load to a rendered unit picker ~550ms; `loadCardIndex()`
(fetches and flattens all 19 unit files) resolves in ~50ms once cached; a 96-card cross-unit
Practice queue built from 6 units ran with no errors; `localStorage` sits at ~33KB for 282 tracked
cards (roughly 117 bytes/card), so a fully-reviewed 19-unit deck (~900 cards) would land around
~100KB — trivial against the ~5–10MB browser quota. Nothing here strains the current architecture.
The one soft observation: the Learn unit picker is now a single flat grid seven rows tall with no
grouping or search — fine at 19 units, but if content keeps growing at this rate, collapsing by
CEFR level (A1/A2/B1 sections) or adding a level filter would keep it scannable. Not urgent yet.
