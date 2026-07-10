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
  settings.js        User preferences (autoplay, last practice mode), localStorage
  audio.js           Spanish text-to-speech (Web Speech API) + speaker button helpers
  answerCheck.js     Lenient answer checking (case/accent-insensitive, edit-distance tolerant)
  main.js            Nav/router, settings panel, mounts the active view
  modes/learn.js      Learn mode (grammar notes -> flashcards -> dialogue)
  modes/practice.js   Practice mode (multiple choice, fill-in-blank, production, listening)
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
  "grammarNotes": ["2-4 short notes on the grammar 'why' behind this unit's patterns."],
  "words": [{ "id": "food_and_drink_w1", "es": "el pan", "en": "bread", "pos": "noun" }],
  "phrases": [{ "id": "food_and_drink_p1", "es": "quiero un café", "en": "I want a coffee" }],
  "sentences": [{ "id": "food_and_drink_s1", "es": "...", "en": "...", "register": "formal" }],
  "dialogue": [{ "speaker": "waiter", "es": "...", "en": "..." }]
}
```

Every word/phrase/sentence has a stable `id` (`<unit>_w1`, `_p1`, `_s1`, ...) — this is what
the spaced repetition engine keys progress state on, so it's a required field for new units.
`grammarNotes` is surfaced as a skippable expandable panel at the start of a unit in Learn mode.

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

## Audio

Spanish text-to-speech uses the browser's native `speechSynthesis` API — no key, no account,
works offline once the page has loaded. `audio.js` picks the best available Spanish voice at
runtime (prefers es-419/Latin American, falls back to es-ES, then any es-*) and caches the
choice. If no Spanish voice is installed on the device, speaker buttons disable themselves with
a tooltip explaining why, rather than failing silently or throwing — this path is exercised on
every CI/test run here, since this dev machine only has English voices installed. Auto-play (one
play per card, first time it's shown in Learn) is on by default and toggleable from the gear icon
in the top bar; the toggle and the voice list are both loaded once at startup so the first speaker
click isn't slow.

## Practice modes

Practice offers a mode picker each session — Multiple Choice, Production, Listening, or Mixed —
all pulling from the *same* due-cards SRS queue, so switching modes never creates a second
competing review system. Production shows the English and asks for typed Spanish from scratch;
Listening plays audio only (no Spanish text) and asks for typed Spanish, then reveals both Spanish
and English. Both use `answerCheck.js`: case-insensitive, accent-insensitive, and tolerant of a
1-2 character edit distance, so "como estas" correctly matches "¿Cómo estás?". A typed answer
outside that tolerance shows the correct (accented) form and asks the user to self-grade — "I
basically had it" counts as correct for SRS purposes, "I didn't know this" resets the card to
box 1 — so a near-miss doesn't get penalized as hard as a total blank.

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
- [x] Learn mode (with grammar-notes primer + speaker audio)
- [x] Spaced repetition engine
- [x] Practice mode (multiple choice, fill-in-blank, production, listening)
- [x] Progress view
- [x] Audio (Web Speech API, graceful fallback when no Spanish voice is installed)
- [x] Grammar notes (all 19 units)
- [ ] Conversation mode (Claude API) — deliberately deferred this session

## Scale notes (19 units / 893 cards, ~176KB content)

Verified via a full Playwright pass across Chromium desktop, Chromium mobile viewport, and
WebKit: cold load to a rendered unit picker ~550ms; `loadCardIndex()` (fetches and flattens all
19 unit files) resolves in ~50ms once cached; a 96-card cross-unit Practice queue built from 6
units ran with no errors; all four Practice question types (choice, fill-in-blank, production,
listening) appeared correctly in a Mixed session on every engine tested. `localStorage` sits at
~27KB for 235 tracked cards (~114 bytes/card — unchanged by adding production/listening, since
both route through the same `recordResult()` call as everything else); settings + streak add a
negligible ~100 bytes combined. A fully-reviewed 19-unit library (~900 cards) projects to roughly
~100KB — trivial against the ~5–10MB browser quota. Nothing here strains the current architecture.

Two soft, non-urgent observations: (1) the Learn unit picker is a flat grid seven rows tall with
no grouping — fine now, but a CEFR-level filter would help past ~30 units; (2) this dev/CI
environment has no Spanish TTS voice installed, so the "no voice available" fallback path was
exercised thoroughly but actual Spanish audio *output* on real devices (especially mobile Safari's
stricter autoplay/gesture rules) hasn't been verified — worth a real-device spot-check.
