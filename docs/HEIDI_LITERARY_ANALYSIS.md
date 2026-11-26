# Heidi — eight-dimension literary comparison

Johanna Spyri, *Heidis Lehr- und Wanderjahre* (German original, authoritative) compared with Elisabeth P. Stork's English
translation, Part I, chapters 1–14. Text source: `src/assets/data/heidi_part1_side_by_side.json` (unchanged).
Analysis output: `src/assets/data/heidi_literary_analysis.json` (schema `heidi-literary-analysis-v1`; evidence and scores only, no text).

## 1. Audit of the previous scores (ch01-a002)

| Dimension | Old heuristic | Why it was wrong | New result |
|---|---|---|---|
| Semantic | 100 | lexicon coverage ≥ 60 % was clamped to 100; the lost "um und um gebunden" was invisible | **89** (4 Preserved, 1 Changed) |
| Emotion | **0** | the German emotion profile was empty, English "Small *wonder*" matched *surprise*, 0 vs 2 exclamations → every component 0. A calculation artifact, not a finding | **N/A** — the glowing cheeks come from heat and over-dressing (Uncertain evidence kept for review) |
| Metaphor/Imagery | 60 | counted ordinary nouns (Bergpfade, Tal, Baumwolltuch) as imagery | **76** — "flammend rot durchleuchteten" → "in such a glow…" Changed; frost simile Preserved |
| Tone | 67 | punctuation / quote counts | **60** — "Wart einen Augenblick, Dete" → "Deta, please wait one moment!" adds politeness (Changed) |
| Voice | 62 | quote counts | **60** |
| Cultural | 100 | — | **76** — "im Dörfli" Preserved with the added gloss "The Little Village"; Alm → "great mountain named the Alm" Changed |
| Omissions | 99 | length ratio only | **78** — "um und um gebunden" Lost, "around her shoulders" and the gloss Added |
| Wordplay | (not shown) | — | **N/A** |

The heuristic scorer (`scoring/heidi-scoring.ts`) is no longer used for any score in the UI; only its structural
helpers (passage type, speaker, alignment status) remain.

## 2. Pipeline (`scripts/heidi_literary_pipeline.py`)

1. **Segmentation** — paragraphs → sentences (`SENT_SPLIT`, quote-aware); code-point offsets into the joined passage text (`\n\n` between paragraphs).
2. **Sentence alignment** — bilingual-lexicon similarity + position prior; links 1:1, 1:n, n:1; unmatched sentences counted. Never by index.
3. **Eight analyses** — one assessment per alignment group (`scripts/heidi_work/literary/chNN.assess.py`), each item:
   `(dimension, category, weight, german_phrase|None, english_phrase|None, explanation[, confidence[, de_occurrence, en_occurrence]])`.
   Passage-level items (both phrases `None`) count in the score but are not highlighted.
4. **Phrase evidence** — phrases are located in the text (exact → quote variants → occurrence hint → sentence-alignment disambiguation).
5. **Offset validation** — every span is re-sliced and compared; unlocated / ambiguous evidence is kept and flagged `requires_expert_review`.
6. **Aggregation** — rubric below; coverage report; manifest of text hashes (a changed text marks the assessment stale).

Validation rejects: Preserved/Changed with one side only, Lost with an English phrase, Added with a German phrase, unlocated phrases.
Run: `python3 scripts/heidi_literary_pipeline.py` (`--assessor anthropic --model … --limit N` calls the Messages API server-side, caching each
passage under `literary/api_cache/`; resumable). Tests: `python3 scripts/test_heidi_literary_pipeline.py`.

### Assessor / provenance
No model API key is available in this environment, so the assessments were written **in-session by Claude after reading each
German/English pair** and are stored as reviewable source files. Provenance on every record: `model_assisted_provisional:claude-in-session`.
They are provisional and not expert-validated. No key is ever shipped to the browser.

## 3. Rubric (`rubric_v1`)

* Credit: Preserved 1.0, Changed 0.6, Added 0.7, Lost 0; Uncertain excluded. `score = round(100·Σ w·credit / Σ w)`.
* Omissions & additions: penalty `max(0, 100 − Σ(Lost 8w, Changed 4w, Added 3w))`.
* Emotion, imagery, voice, cultural, wordplay with no evidence → **not_applicable** (N/A) with a reason; voice in pure narration → N/A.
* Semantic, tone, omissions with no evidence → **not_evaluated** ("Not evaluated").
* Only uncertain evidence → **uncertain** (no score) unless the assessor gave an N/A reason.
* Missing values are never 0, never averaged as 0, and chapter means show their denominator.

## 4. Evidence record

`evidence_id` (`HEIDI-CH01-A002-SEM-001`), `passage_id`, `dimension`, `category`, `weight`, `source_language` `de`, `source_phrase`,
`target_language` `en`, `target_phrase`, `source_span` / `target_span` `{start,end,text}` (code points), `span_status`
(located · located_by_alignment · ambiguous_occurrence · unlocated · passage_level), `sentence_alignment_verified`,
`explanation`, `confidence`, `requires_expert_review`, `provenance`.
Per dimension: `applicability`, `score`, `confidence`, `method`, `evidence_count`, `category_counts`, `explanation`, `review_status`.

## 5. Coverage (Part I, chapters 1–14)

* 581 alignment groups; 434 verified/high-confidence → **430 analysed**, **4 alignment disputed** on reading (ch07-a033, ch10-a002, ch10-a005, ch14-a016).
* 147 medium/low/unmatched groups are **awaiting alignment review** (not analysed; shown as such, never scored).
* 2,553 evidence items: 1,351 Preserved, 565 Changed, 525 Lost, 75 Added, 37 Uncertain; 0 unlocated, 12 ambiguous occurrences;
  282 flagged for expert review.
* Dimension applicability: semantic 430 evaluated; emotion 227 / N/A 203; imagery 143 / N/A 287; tone 428; voice 223 / N/A 207;
  cultural 103 / N/A 327; omissions 411; wordplay 20 evaluated, 3 uncertain, 407 N/A.

## 6. RTT (kept separate)

* **Workflow A** — German original → AI English (MyMemory de|en), compared with Stork's English (lexical similarity). Semantic only.
* **Workflow B** — Stork's English → AI German → AI English, compared with Stork's English. Stored separately (`heidi_analysis_rtt_en_v1`).
  The AI German is never labelled as, or compared with, Spyri's original.
* RTT is never copied into other dimensions. Cached Workflow-A records are re-based on the new literary semantic score.

## 7. Unresolved comparisons (Uncertain evidence and disputed alignments)

| Passage | Dimension | Note |
|---|---|---|
| `ch01-a001` | wordplay | Possible sound echo between "Heideland" (heath land) and the heroine's name Heidi; English "heath" keeps a sim |
| `ch01-a002` | emotion | Glowing cheeks are explained by the heat and the bundling ("kein Wunder ... so verpackt"); this is physical, n |
| `ch01-a014` | wordplay | Possible echo of the name Heidi in "Heide" (heathen); "heathen" preserves a similar sound link. Intentionality |
| `ch03-a012` | semantic | This German sentence is rendered at the start of English group ch03-a013 ("the boy took off his bag"); the gro |
| `ch03-a013` | semantic | This English sentence renders the end of German group ch03-a012; group boundaries differ. |
| `ch03-a033` | semantic | Peter's reply belongs to German group ch03-a034; group boundaries differ. |
| `ch03-a034` | semantic | Rendered in English group ch03-a033; group boundaries differ. |
| `ch04-a003` | semantic | This part of the German group may be rendered in an English group that is not aligned with confidence. |
| `ch04-a007` | semantic | The English sentence does not match the German one (determination despite delay vs immediate approval); the al |
| `ch06-a034` | semantic | This English sentence belongs to a later German group (not in this alignment group); group boundaries differ. |
| `ch07-a012` | semantic | Rottenmeier's scolding is rendered in English group ch07-a013; group boundaries differ. |
| `ch07-a017` | semantic | Sebastian's answer is rendered in English group ch07-a018; group boundaries differ. |
| `ch07-a024` | semantic | These lines belong to German groups ch07-a025/a026; boundaries differ. |
| `ch07-a026` | semantic | Rendered in English group ch07-a024; boundaries differ. |
| `ch07-a026` | semantic | The boy's reply belongs to a later German group. |
| `ch07-a033` | ALIGNMENT | The English text of this group does not correspond to the German: the German is Heidi pulling the tower bell a |
| `ch07-a059` | semantic | Heidi's answer is rendered in English group ch07-a060; boundaries differ. |
| `ch07-a060` | wordplay | Heidi's "Ich mache nicht, die Kätzlein machen" (from ch07-a059) is rendered here. |
| `ch08-a009` | semantic | Clara's reply appears in English group ch08-a010; boundaries differ. |
| `ch08-a022` | semantic | Heidi's "No" is in English group ch08-a023; boundaries differ. |
| `ch08-a028` | semantic | This English sentence belongs to a later German group; boundaries differ. |
| `ch09-a014` | semantic | Group boundary differs: the English starts with Heidi's "Fresh water?" and includes material from the followin |
| `ch09-a015` | semantic | Group boundary differs: part of this German appears in the previous English group, and Clara's answer belongs  |
| `ch09-a016` | semantic | Group boundary differs: Clara's plea appears in the previous English group, Heidi's reply is moved here. |
| `ch09-a017` | omissions | Heidi's answer appears in the previous English group (group boundary). |
| `ch10-a002` | ALIGNMENT | The English describes the carriage arriving and Tinette summoning Heidi; the German is Heidi's greeting "Guten |
| `ch10-a005` | ALIGNMENT | The German is Rottenmeier justifying the name 'Adelheid' for the servants' sake; the English is the grandmothe |
| `ch10-a026` | semantic | Group boundary: the grandmother's reply and Heidi's "Kann ich gehen?" appear in the next English group. |
| `ch10-a027` | semantic | Group boundary: the tutor's visit to Frau Sesemann (second German paragraph) has no counterpart in this Englis |
| `ch11-a009` | semantic | Group boundary: Heidi's repentant reply (German next group) is included at the end of this English group. |
| `ch11-a010` | semantic | Heidi's reply appears in the previous English group (group boundary). |
| `ch13-a006` | semantic | Group boundary: the English sentence about Heidi in her Sunday frock belongs to the next German group. |
| `ch13-a007` | semantic | Group boundary differs: the German (Heidi unaware; Tinette's contempt; Sesemann's "Wo ist das Kind?") overlaps |
| `ch13-a007` | tone | Not reliably assessable due to group boundary. |
| `ch13-a010` | semantic | Rendered at the start of the next English group (boundary). |
| `ch13-a014` | semantic | English continues beyond this German group (Sesemann returns the bundle, thanks, message to the doctor); this  |
| `ch13-a017` | semantic | Belongs to the next German group (boundary). |
| `ch13-a048` | semantic | Belongs to the next German group (boundary). |
| `ch13-a049` | semantic | Rendered in the previous English group (boundary). |
| `ch14-a016` | ALIGNMENT | The English ("Grandmama explained it all to me" and the grandfather's "nobody can come back") renders the firs |
| `ch14-a017` | semantic | This German sentence is rendered in the previous English group (group boundary). |

Plus the 147 groups awaiting alignment review.


## 8. Sentence-level semantic layer (schema `heidi-sentence-alignment-v1`)

Every analysed passage carries `sentences` (code-point spans of each German / English sentence) and `sentence_alignments`:
one record per aligned sentence group, and **every sentence is in exactly one record** (validated).

| Field | Meaning |
|---|---|
| `sentence_alignment_id` | stable, e.g. `HEIDI-CH01-A002-SA03` |
| `passage_id`, `chapter`, `dimension` | `dimension` is `semantic` |
| `source_sentences` / `target_sentences` | sentence indices; 1:1, 1:N, N:1, N:M; `[]` on one side for Lost / Added |
| `source_spans` / `target_spans` | exact `{start, end, text}` checked against the displayed text |
| `classification` | preserved · changed · lost · added · uncertain · **unassessed** |
| `basis` | `assessed` (sentence reviewed) · `derived` (from recorded phrase evidence only) · `unassessed` |
| `explanation`, `phrase_evidence_ids`, `confidence`, `provenance`, `review_status` | |

Rules: a sentence where only a phrase is omitted is **changed** (the omitted phrase is red inside it), never wholly lost.
Lost groups have no English sentence, Added groups no German sentence. A sentence without any recorded judgement is
`unassessed` — it is never assumed preserved. An assessment marked `expert_reviewed` is kept as it is.

Sources, in order of precedence: `scripts/heidi_work/literary/chNN.sentences.py` (in-session or expert),
cached API results (`--sentence-assessor anthropic`, needs `ANTHROPIC_API_KEY`, cached per passage), then derivation
from phrase evidence over the automatic sentence alignment (connected components of meaning-based links).

### Coverage

| Chapter | Groups | Analysed | Disputed | Awaiting alignment | Sentences | Assessed | Derived | Not yet assessed |
|---|---|---|---|---|---|---|---|---|
| 1 | 49 | 48 | 0 | 1 | 416 | 416 | 0 | 0 |
| 2 | 33 | 31 | 0 | 2 | 271 | 0 | 199 | 72 |
| 3 | 62 | 52 | 0 | 10 | 403 | 0 | 334 | 69 |
| 4 | 47 | 36 | 0 | 11 | 357 | 0 | 290 | 67 |
| 5 | 38 | 23 | 0 | 15 | 215 | 0 | 192 | 23 |
| 6 | 39 | 32 | 0 | 7 | 179 | 0 | 154 | 25 |
| 7 | 62 | 38 | 1 | 23 | 301 | 0 | 275 | 26 |
| 8 | 34 | 27 | 0 | 7 | 294 | 0 | 248 | 46 |
| 9 | 25 | 15 | 0 | 10 | 115 | 0 | 96 | 19 |
| 10 | 33 | 16 | 2 | 15 | 131 | 0 | 104 | 27 |
| 11 | 17 | 13 | 0 | 4 | 131 | 0 | 108 | 23 |
| 12 | 52 | 37 | 0 | 15 | 276 | 0 | 219 | 57 |
| 13 | 51 | 40 | 0 | 11 | 410 | 0 | 361 | 49 |
| 14 | 39 | 22 | 1 | 16 | 228 | 0 | 185 | 43 |
| **All** | 581 | 430 | 4 | 147 | 3727 | 416 | 2765 | 546 |

Chapter 1 (verified alignment) is fully sentence-assessed. Chapters 2–14 use derived labels where phrase evidence exists;
546 sentences have no recorded judgement yet and are shown as *Not assessed*. Running the sentence assessor (or an expert
pass) fills them incrementally — completed passages are not reassessed.

## 9. Interface

* Passage view: breadcrumb → dimension selector → score/status + legend → Stork | Spyri reader → collapsed
  Round-Trip Translation → Expert Feedback / Ask Assistant AI → collapsed **Research details** (IDs, method, assessor,
  weights, span status, models, threshold, storage keys, export/import).
* Semantic shows a light sentence tint for every sentence plus phrase underlines; other dimensions show phrase evidence only.
* Clicking a sentence or phrase links the counterpart in the other language and fills the right-hand Evidence Inspector
  (collapsible); the reader does not scroll.
* Round-trip statuses are neutral: Evaluated · Not evaluated · Potential disagreement · Expert reviewed. BERTScore results are
  shown, labelled as BERTScore-based similarity, only if `src/assets/data/heidi_rtt_bertscore.json` exists
  (`scripts/heidi_rtt_bertscore/`; not run here — Hugging Face models are not reachable from this environment).
* Ask Assistant AI posts the passage context to a server (`server/heidi-assistant`) that holds the API key; with no
  configured endpoint (`src/assets/config/heidi-assistant.json`) it says it is unavailable and generates nothing.
* Translator attribution: the source JSON says Helen B. Dole, but PG #20781 is Stork's translation; the app shows and
  exports Stork (the source file is left unchanged).

Unresolved items: see [HEIDI_UNRESOLVED.md](HEIDI_UNRESOLVED.md).
