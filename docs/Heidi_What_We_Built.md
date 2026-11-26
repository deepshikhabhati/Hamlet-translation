# Heidi Translation Analysis — What We Built

Nov 26, 2026 · Alwa

## Overview

Heidi Translation Analysis now compares Johanna Spyri's German original with Elisabeth P. Stork's English translation (Part I, chapters 1–14) across eight literary dimensions, down to the sentence and phrase. The work is committed as `5480c69` on branch `phase6` but is **not deployed**: the GitHub push was refused because this session is not authorised for `deepshikhabhati/Hamlet-translation`, so the live site still shows the older version.

| Item | Value |
| --- | --- |
| App | Angular 15, Heidi page beside Hamlet v1.5 (unchanged) |
| Live site | [deepshikhabhati.github.io/Hamlet-translation](https://deepshikhabhati.github.io/Hamlet-translation/) |
| Text source | heidi_part1_side_by_side.json (581 alignment groups, unchanged) |
| Analysis output | heidi_literary_analysis.json (evidence, scores, sentence records) |
| Latest commits | 60d786f (eight-dimension analysis), 5480c69 (simplified UI, sentence layer) |
| Tests | 264 Angular + 22 pipeline tests passing |
| Deployment | Not deployed — repository access missing |

## What was done, phase by phase

Eight phases took Heidi from a new page to a scholar-facing reading tool; the latest is listed first.

| Phase | What changed | Commit |
| --- | --- | --- |
| 8. UI simplification | One clean passage view, sentence-level highlighting, collapsible inspector, Expert Feedback drawer, Ask Assistant AI, compact RTT, 100-point score bars | 5480c69 |
| 7. Literary analysis | Eight-dimension phrase-level comparison of 430 passages in all 14 chapters, replacing the heuristic scores | 60d786f |
| 6. Single dataset | Whole Heidi dataset built from heidi_part1_side_by_side.json only | 25e0cab |
| 5. Highlighting and RTT | Dimension-based highlighting, honest RTT labels, evidence inspector | ee39bf7 |
| 4. Analysis card | Full selected-passage card in the centre panel | earlier |
| 3. Hamlet parity | Heidi styled with the Hamlet v1.5 design system | earlier |
| 2. Deployment work | Build fixes, GitHub Pages checks | earlier |
| 1. Heidi page | New lazy-loaded Heidi route beside Hamlet | earlier |

## Eight-dimension literary analysis

Every verified or high-confidence passage was read in German and English and its differences recorded as phrase-level evidence; scores come from a written rubric, not word matching. The German original is treated as authoritative.

- **Dimensions:** Semantic, Emotion, Metaphor/Imagery, Tone, Character Voice, Cultural/Archaic, Omissions/Additions, Wordplay.
- **Categories:** Preserved (green), Changed (amber), Lost (red), Added (purple), Uncertain (grey dotted).
- **Evidence:** 2,553 items, each with an ID, both phrases, exact character spans, an explanation, confidence and provenance. Every phrase was located in the text.
- **Rubric:** score = weighted credit (Preserved 1.0, Added 0.7, Changed 0.6, Lost 0); omissions use a penalty instead.
- **N/A is never 0:** a dimension with no relevant feature is N/A; one with no evidence is "Not evaluated".
- **Assessor:** written in-session by Claude after reading each pair, labelled model-assisted and provisional. No API key was available, so no other model was used.

The supervisor's example passage shows why the old heuristic had to go:

| Dimension (ch01-a002) | Old heuristic | New result | Why it changed |
| --- | --- | --- | --- |
| Semantic | 100 | 89 | Old score was capped at 100 and missed the lost "um und um gebunden" |
| Emotion | 0 | N/A | The 0 was a calculation artifact; the glowing cheeks come from heat, not feeling |
| Metaphor | 60 | 76 | Old score counted ordinary nouns as imagery |
| Tone | 67 | 60 | "Wart einen Augenblick, Dete" becomes the politer "please wait" |
| Voice | 62 | 60 | Old score counted quotation marks |
| Cultural | 100 | 76 | "im Dörfli" kept with an added gloss; the Alm becomes "great mountain" |
| Omissions | 99 | 78 | One phrase lost, two additions |
| Wordplay | — | N/A | No wordplay in the passage |

Coverage: 430 passages analysed and 4 found misaligned on reading (ch07-a033, ch10-a002, ch10-a005, ch14-a016), which together are all 434 verified or high-confidence groups. The other 147 groups await alignment review and are never scored.

## Sentence-level semantic layer

Every sentence of every analysed passage now sits in exactly one sentence-alignment record, so a paragraph is accounted for in full; only Chapter 1's 416 sentences were assessed one by one.

- **Alignment:** sentences are grouped by meaning (1:1, 1:N, N:1, N:M), never by position. Lost groups have no English sentence; Added groups have no German one.
- **Classification:** Preserved, Changed, Lost, Added, Uncertain or Not assessed. A sentence with one omitted phrase is Changed, with that phrase in red inside it.
- **Record fields:** stable ID (for example HEIDI-CH01-A002-SA03), passage, chapter, sentences and exact spans on both sides, classification, explanation, linked phrase evidence, confidence, provenance and review status.
- **Honesty rule:** a sentence with no recorded judgement is Not assessed, never assumed Preserved. Records marked expert-reviewed are never overwritten.

Sentence coverage by chapter (heidi_literary_analysis.json · 3,727 sentences in 430 analysed passages). Only Chapter 1 is assessed sentence by sentence; 546 of 3,727 sentences have no judgement yet.

| Chapter | Sentences | Assessed one by one | Derived from phrase evidence | Not yet assessed |
| --- | --- | --- | --- | --- |
| 1 | 416 | 416 | 0 | 0 |
| 2 | 271 | 0 | 199 | 72 |
| 3 | 403 | 0 | 334 | 69 |
| 4 | 357 | 0 | 290 | 67 |
| 5 | 215 | 0 | 192 | 23 |
| 6 | 179 | 0 | 154 | 25 |
| 7 | 301 | 0 | 275 | 26 |
| 8 | 294 | 0 | 248 | 46 |
| 9 | 115 | 0 | 96 | 19 |
| 10 | 131 | 0 | 104 | 27 |
| 11 | 131 | 0 | 108 | 23 |
| 12 | 276 | 0 | 219 | 57 |
| 13 | 410 | 0 | 361 | 49 |
| 14 | 228 | 0 | 185 | 43 |
| **All** | **3,727** | **416** | **2,765** | **546** |

The remaining 546 sentences can be filled by the pipeline's cached sentence assessor once an API key is set, or by expert sentence files; finished passages are not reassessed.

## Interface changes

The passage view now shows only what a scholar reads and decides from; technical detail moved into one collapsed Research details section.

1. Breadcrumb and Previous / Next navigation.
2. Dimension selector: score badge, colour bar and review dot for all eight dimensions; scrolls sideways on small screens.
3. Score line with status and a compact colour legend.
4. Stork's English beside Spyri's German in serif 17–19px. Semantic tints every sentence and underlines phrase differences; other dimensions show only their own evidence.
5. Round-Trip Translation, collapsed: one section with a switch between "German original → AI English" and "Human English → AI German → AI English". Statuses are neutral (Evaluated, Not evaluated, Potential disagreement, Expert reviewed).
6. Expert Feedback and Ask Assistant AI buttons.
7. Research details, collapsed: evidence IDs, weights, span status, method, assessor, models, RTT threshold, storage keys, export and import.

Other changes:

- **Evidence Inspector:** a collapsible right-hand panel. Clicking a sentence or phrase highlights its counterpart in the other language and shows the classification and explanation without scrolling the text. Lost and Added items say plainly which side is absent.
- **Expert Feedback:** a side drawer opened on demand, with Accept / Reject / Needs Revision, revised classification, one corrected score (0–100), corrected translation, reviewer and justification. Alignment and RTT corrections sit under a collapsed Advanced review.
- **Ask Assistant AI:** a drawer that sends the passage, selection and evidence to a server that holds the API key. With no server configured it says "Assistant unavailable" and generates nothing. Its proposals appear separately from the published text and reach a review only when the expert saves them.
- **Chapter score bars:** every chapter bar has the same width and shows its score out of 100 (for example 88/100). Dimension mini-bars share one height, including Wordplay; N/A shows a neutral striped bar, never a red zero.

Before and after screenshots:

**Before:** the earlier passage view, before the simplification.

![Before: the earlier passage view](heidi-what-we-built-images/before-passage.png)

**After:** dimension selector, score line and legend, sentence tints with phrase underlines, and the inspector showing the selected phrase.

![After: simplified passage view with a phrase selected](heidi-what-we-built-images/after-passage.png)

**After:** Expert Feedback drawer.

![After: Expert Feedback drawer](heidi-what-we-built-images/after-feedback.png)

**After:** Round-Trip Translation expanded, with the workflow switch.

![After: Round-Trip Translation section](heidi-what-we-built-images/after-rtt.png)

## Data integrity safeguards

Nothing in the app is invented: missing judgements stay visibly missing and source files are never altered.

- **Source text unchanged:** heidi_part1_side_by_side.json is the only text source and is never modified.
- **Exact spans:** every highlight is checked character by character against the displayed text; a mismatch is dropped and listed, never shifted.
- **No false zeros:** N/A and Not evaluated are separate from 0 and are left out of chapter averages.
- **No fabricated scores:** unassessed sentences are not called Preserved. RTT and BERTScore values appear only where they were actually computed.
- **Disputed alignments:** the 4 misaligned passages and 147 low-confidence groups are not scored.
- **Expert decisions kept:** the machine result is stored beside every expert decision; expert-reviewed records are never overwritten.
- **RTT kept separate:** round-trip similarity is never copied into Emotion, Metaphor, Tone or other dimensions, and the AI German is never presented as Spyri's text.
- **No keys in the app:** the assistant's API key lives only on the server.
- **Translator attribution:** the source JSON names Helen B. Dole, but Project Gutenberg #20781 is Elisabeth P. Stork's 1915 translation. The app shows Stork; the source file is left as it was.

## Testing and verification

All automated checks pass and the production build succeeds; checks on the live site are still to be done after deployment.

| Check | Result |
| --- | --- |
| Angular unit tests | 264 of 264 pass |
| Literary pipeline tests | 22 of 22 pass (scoring rules, sentence coverage, exact spans, Lost/Added rules, expert records kept) |
| Pipeline validation | 0 problems across 430 passages |
| Production build (base href /Hamlet-translation/) | Succeeds |
| Local GitHub Pages copy, Heidi and Hamlet | Both load with no errors |
| Responsive layout at 900px | No horizontal clipping; inspector becomes an overlay |
| Expert Feedback | Opens, cancels without saving, validates the score, saves |
| Ask Assistant AI | Shows "unavailable" without a server; with a test server the proposal stays separate and saves only after approval |
| Live site | Not yet verified — not deployed |

## Open items and next steps

The main blocker is repository access; everything else is follow-up work.

- [ ] Grant this session access to deepshikhabhati/Hamlet-translation, or push and deploy from the front folder (commands below), then check the live Heidi and Hamlet pages.
- [ ] Assess the remaining 546 sentences in chapters 2–14 (sentence assessor with an API key, or expert sentence files).
- [ ] Review the 4 disputed alignments and the 147 low-confidence groups; full list in docs/HEIDI_UNRESOLVED.md (362 open items).
- [ ] Host the assistant server (server/heidi-assistant) with an API key and set its URL in src/assets/config/heidi-assistant.json.
- [ ] Run the BERTScore script where Hugging Face is reachable; it was blocked in both this environment and on your computer.
- [ ] Open the PDFs inside the app with the selected paragraph highlighted (requested, not yet started).
- [ ] Note: Hamlet's own assistant still shows simulated answers; it was left unchanged.

Deploy from the front folder:

```bash
git add -A && git commit -m "Heidi: simplified view, sentence layer, Expert Feedback, assistant"
git push origin HEAD:main
npx ng build --configuration production --base-href /Hamlet-translation/
npx angular-cli-ghpages --dir=dist/chat
```
