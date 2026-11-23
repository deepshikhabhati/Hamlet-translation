# Heidi Translation Analysis v1.0

Separate research page at `/heidi-analysis` (Hamlet v1.5 stays at `/hamlet-analysis`; `/` still opens Hamlet).
Switch projects with the bar at the top of the app.

## Sources (exact editions)
- German original: *Heidis Lehr- und Wanderjahre*, Johanna Spyri — Project Gutenberg #7500
- English: *Heidi* (Gift Edition), tr. Elisabeth P. Stork — Project Gutenberg #20781
- Scope: Part I, chapters 1–14 only. PDFs are served from `src/assets/heidi/`.

## Data (single file)
The whole Heidi dataset is `src/assets/data/heidi_part1_side_by_side.json`: the curated English/German parallel index with
chapter, alignment-group (`chCC-aGGG`) and paragraph (`en-CC-PPP`, `de-CC-PPP`) IDs. Chapter 1 is verified; chapters 2–14 are automatic.
The app loads only this file. Every score and every phrase-level evidence span is computed in the browser by
`src/app/heidi-analysis/scoring/heidi-scoring.ts` (see `docs/DIMENSION_HIGHLIGHTING_RTT.md` §5).

## Method resources (rebuild only if the method changes)
```bash
pip install snowballstemmer
apt-get download trans-de-en && dpkg-deb -x trans-de-en_*.deb ding   # Ding de-en dictionary (GPL)
export DING_DE_EN=$PWD/ding/usr/share/trans/de-en
python3 scripts/heidi_lexicon.py                       # stem lexicon cache (not committed)
python3 scripts/heidi_build_lexicon_ts.py              # -> src/app/heidi-analysis/scoring/heidi-lexicon.data.ts
HEIDI_V2_OUT=/tmp/ref.json python3 scripts/heidi_build_v2.py && node scripts/heidi_scoring_parity.mjs /tmp/ref.json   # 0 differences
python3 scripts/heidi_rtt_pipeline.py --limit 20       # optional offline RTT (needs api.mymemory.translated.net)
```

## What the statuses mean
- **Alignment**: `verified` (Chapter 1, checked by reading) and `aligned` (curated confidence *high*, automatic, unreviewed) are scored.
  `needs_review` (medium) / `low_confidence` (low) are shown as **Needs Alignment Review** and receive no literary scores.
  `unmatched_de` / `unmatched_en` = an empty side.
- **Analysis**: `automated_heuristic_v1` scores are provisional lexicon/dictionary heuristics. They are labelled as such everywhere
  and are never mixed with expert scores. Wordplay is `not_assessed` (null), never 0.
- **RTT**: a reverse-translation consistency check against the human English translation: Human English → German original →
  AI back-translated English (MyMemory de|en), compared with Stork's English using `heidi-english-lexical-sim-v1`.
  Semantic only; not calibrated against the direct score, so it is used for triage only.

## Storage keys (browser localStorage)
- `heidi_analysis_reviews_v2` — passage-level expert reviews (Hamlet uses `hamlet_v5_expert_reviews`)
- `heidi_evidence_reviews_v1` — evidence-level decisions (machine assessment preserved)
- `heidi_analysis_rtt_v2` — RTT results; `heidi_analysis_rtt_threshold_v1` — disagreement threshold
- `heidi_analysis_reviewer_v1` — last reviewer name


> **Update:** scores and phrase evidence now come from the eight-dimension literary comparison — see [HEIDI_LITERARY_ANALYSIS.md](HEIDI_LITERARY_ANALYSIS.md). The browser heuristic scorer is no longer used for scores.
