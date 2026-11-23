# Dimension-based highlighting, scores and RTT (Hamlet v1.5 + Heidi)

## 1. Audit (before implementation)

| Area | Hamlet v1.5 (before) | Heidi (before) |
|---|---|---|
| Dimension selector | 8 tabs with scores, N/A shown | 7 tabs; Wordplay hidden |
| Phrase highlighting | Exact code-point spans for Original English + Human German only; AI German / Context AI German not shown in the card | Exact spans (EN + DE), but evidence-ID lookup bug: v2 IDs are already group-qualified (`chCC-aGGG:dim:id`), so clicking a span never found its evidence |
| Categories | Changed = **blue**; review = amber dashed | Same component; no "Uncertain" |
| RTT | **Fabricated:** per-dimension "RTT" scores from heuristics, original English used as a fake back-translation when none existed, hard-coded heatmap deltas (`semantic +1.2`, `wordplay −6.5`, …) | v1 direction (English → AI German) no longer matched the spec; templates still read `back_translated_german` |
| Disagreement | Only dataset `requires_expert_review`; signed Δ compared with threshold (negatives missed) | Present, labelled "Disagreement" |
| Evidence inspector | Popover only; no accept / reject / reclassify per evidence item | List only; no per-evidence actions |
| Navigation | Next Review only | Next Review only |

**Data actually present**

- **Hamlet** (`hamlet_angular_corrected_full_play.json`, 1,107 dialogues):
  - Direct scores exist per version × dimension. Non-applicable dimensions are stored as `applicable:false`.
  - Phrase evidence: 34,544 items, all span-validated (code points).
  - RTT: 99 dialogues have a completed **semantic** RTT (`round_trip_verification`); 1,008 are `not_run`. No dimension-specific RTT exists.
  - No phrase evidence exists for back-translations.
- **Heidi** (now built **only** from `heidi_part1_side_by_side.json`, 581 groups; see §5):
  - Provisional heuristic scores exist only for verified/high groups (434).
  - Wordplay is not assessed. Emotion, Imagery and Cultural are N/A where no cue exists.
  - RTT: 0 completed.

## 2. What changed

**Shared** (`src/app/shared/analysis/`):

- `phrase-categories.ts`: categories, colours, `disagreementOf`, `locateSpan`.
- `EvidenceReviewService`: per-evidence expert decisions in `hamlet_evidence_reviews_v1` / `heidi_evidence_reviews_v1`. The original machine assessment is copied into `original` and never modified.
- `DimensionSummaryComponent`
- `RttComparePanelComponent`
- `EvidenceDetailComponent`
- `PhraseLegendComponent`

**Highlighting** (`EvidenceHighlightedTextComponent`):

- Colours: Changed = amber, Uncertain = gray dotted underline.
- Keyboard accessible, with an `aria-label` per span.
- Identical span inputs no longer rebuild the DOM. Before this fix, hover and click on the highlights did not work reliably.

**Hamlet**

- RTT is semantic-only, taken from the dataset or from a live back-translation. All other dimensions show "Not evaluated". There is no fabricated baseline.
- Heatmap RTT is the mean of computed semantic RTT scores, shown with n/N. The difference is computed over the same dialogues.
- New panel showing AI German / Context AI German / BT English with highlights for the selected dimension.
- Evidence Inspector added; Previous/Next dialogue navigation added.
- Unlocated evidence is listed separately.
- RTT disagreements with |Δ| ≥ the threshold enter the queue as "Potential disagreement — review recommended". The threshold is shared with the queue and persisted in `hamlet_rtt_threshold_v1`.

**Heidi**

- Direction: Human English → German original → AI back-translated English, comparing Human English ↔ AI English. This is labelled as a reverse-translation consistency check.
- All 8 dimensions are shown; Wordplay is N/A.
- BT English panel, Evidence Inspector, and Previous/Next navigation added.
- Low-confidence evidence is shown as Uncertain.
- The curated confidence label is shown instead of a fake percentage. Paragraph IDs and alignment notes are shown.
- Only Chapter 1 is labelled verified.

**Pipeline:** `scripts/heidi_rtt_pipeline.py` v2 sends the German original to the translator (de→en), uses `english_similarity` (parity-tested with the TypeScript version), and writes results to the cache `heidi_rtt_cache_v2.json`.

## 3. Data fields used

- **Hamlet:**
  - `analysis.<version>.<dim>.{applicable, score, confidence, status, explanation, needs_review, evidence[]}`
  - `evidence[].{evidence_id, source_span{start,end,text}, target_span{…}, status, explanation, verified, ui_highlight_eligible, span_validation}`
  - `round_trip_verification.{status, back_translated_english, back_translation_model, similarity_model, direct_semantic_score, rtt_semantic_score, disagreement, requires_expert_review, generated_at}`
  - `analysis_status`, `analysis_provenance`
- **Heidi:**
  - Side-by-side: `chapters[].{id, number, alignment_status, rows[].{id, confidence, note, en[]/de[].{id, type, text}}}`
  - Derived: `groups[].{alignment.status, analysis.dimensions.<dim>.{status, score, phrase_evidence[].{id, de, en, kind, confidence, explanation}, evidence_en[], evidence_de[], method, confidence}, unlocated_evidence[]}`
  - RTT is stored at runtime in `heidi_analysis_rtt_v2`.

## 4. Coverage and missing evaluations

| Item | Coverage |
|---|---|
| Hamlet semantic RTT | 99 / 1,107 dialogues (8.9%). 83 of the 99 have \|Δ\| ≥ 15, which suggests the similarity scale is not calibrated against the direct score |
| Hamlet RTT for the other 7 dimensions | 0. No method exists, so they are shown as "Not evaluated" |
| Hamlet phrase evidence on BT English | 0 (not recorded) |
| Heidi direct scores | 434 / 581 groups. Semantic, tone, voice and omissions are scored in all 434; emotion in 224, cultural in 199, imagery in 113 |
| Heidi Wordplay | Not assessed (0) |
| Heidi medium / low / unmatched groups | 147 unscored, pending alignment review |
| Heidi RTT | 0 completed. The pipeline is ready, but the MyMemory API is not reachable from the build environment |
| Expert-validated evidence | 0 (all evidence is machine-generated and provisional) |
| Threshold calibration | Not calibrated; needs expert labels (see ACL 2023 RTT paper, Zhuo et al.) |

## 5. Heidi: single dataset, scores computed in the browser

`src/assets/data/heidi_part1_side_by_side.json` is the only Heidi data file. The app loads it once and never modifies it. Removed from `src/assets/data/`:

- `heidi_part1_analysis_v2.json`
- `heidi_aligned_chapters_1_14.json` (v1)
- `heidi_alignment_validation_report.json`
- `heidi_rtt_research_evaluation.json`

**Scores and phrase evidence.** `src/app/heidi-analysis/scoring/heidi-scoring.ts` computes every score and every evidence span at load time from the file's texts, using the `automated_heuristic_v1` method (provisional). It takes about 0.4 s for all 581 groups.

- It is an exact port of `scripts/heidi_build_dataset.py`, `heidi_lexicon.py` and `heidi_align.py`.
- Regexes are converted to Unicode-aware JavaScript, and rounding follows Python's half-to-even rule.
- Parity check: `node scripts/heidi_scoring_parity.mjs <reference.json>`, where `HEIDI_V2_OUT=<reference.json> python3 scripts/heidi_build_v2.py` produces the reference. Result: 3,472 dimension assessments compared, 0 differences in score, status, confidence, evidence spans or evidence kinds.
- While porting, I fixed a call-order-dependent cache in `Bilex.translations` (the compound fallback was cached by stem). It now caches by word.

**Lexicon.** The semantic and omission dimensions need a German→English dictionary. `scoring/heidi-lexicon.data.ts` is generated by `scripts/heidi_build_lexicon_ts.py` and holds:

- the Ding de-en translations of the 5,524 German content words in Part I, restricted to the 2,077 English stems that occur in Stork's text (lossless for this method);
- the Snowball-English stem of each English word;
- the method's rule lists.

It is about 250 KB (≈115 KB compressed, in the lazy-loaded Heidi chunk). Ding is GPL-licensed; check that this fits the repository's licence.

**RTT.** Generated in the browser from the German original (de→en, MyMemory), per passage or with "Run RTT for chapter". The chapter run goes one passage at a time and stops at the first service error, such as the free quota of about 5,000 characters a day. Results are cached in `heidi_analysis_rtt_v2`. The offline script `scripts/heidi_rtt_pipeline.py` reads only the side-by-side file and writes to `scripts/heidi_work/`.

**Lost by dropping the derived file:** PDF page numbers per passage. They came from the PDF extraction, which isn't part of the side-by-side file. The PDF links remain, without page numbers.
