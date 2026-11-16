# Heidi Translation Analysis v1.0

Separate research page at `/heidi-analysis` (Hamlet v1.5 stays at `/hamlet-analysis`; `/` still opens Hamlet).
Switch projects with the bar at the top of the app.

## Sources (exact editions)
- German original: *Heidis Lehr- und Wanderjahre*, Johanna Spyri — Project Gutenberg #7500
- English: *Heidi* (Gift Edition), tr. Elisabeth P. Stork — Project Gutenberg #20781
- Scope: Part I, chapters 1–14 only. PDFs are served from `src/assets/heidi/`.

## Data pipeline (reproducible)
```bash
pip install pdfplumber snowballstemmer
apt-get download trans-de-en && dpkg-deb -x trans-de-en_*.deb ding   # Ding de-en dictionary (GPL)
export DING_DE_EN=$PWD/ding/usr/share/trans/de-en

python3 scripts/heidi_extract.py --en-pdf EN.pdf --de-pdf DE.pdf   # -> scripts/heidi_work/heidi_extracted.json
python3 scripts/heidi_lexicon.py                                   # builds the stem lexicon cache (not committed)
python3 scripts/heidi_align.py                                     # -> scripts/heidi_work/heidi_alignment.json
python3 scripts/heidi_build_dataset.py                             # -> src/assets/data/heidi_aligned_chapters_1_14.json
python3 scripts/heidi_validate.py --en-pdf EN.pdf --de-pdf DE.pdf  # -> src/assets/data/heidi_alignment_validation_report.json
python3 scripts/heidi_rtt_pipeline.py --limit 20                   # needs network access to api.mymemory.translated.net
```

## What the statuses mean
- **Alignment** `aligned` = automatic, confidence ≥ 0.55 — *not* expert-verified. `needs_review` / `low_confidence` are shown
  as **Needs Alignment Review** and receive no literary scores. `unmatched_de` / `unmatched_en` = no counterpart detected.
- **Analysis** `automated_heuristic_v1` scores are provisional lexicon/dictionary heuristics (see the docstring in
  `scripts/heidi_build_dataset.py`). They are labelled as such everywhere and are never mixed with expert scores.
  Wordplay is `not_assessed` (null), never 0.
- **RTT**: English (Stork) → MyMemory NMT (en|de) → AI German, compared with Spyri's German using
  `heidi-german-lexical-sim-v1` (CISTEM stems + char 4-grams). Not calibrated against the direct score — triage only.

## Storage keys (browser localStorage)
- `heidi_analysis_reviews_v1` — expert reviews (Hamlet uses `hamlet_v5_expert_reviews`)
- `heidi_analysis_rtt_v1` — RTT results
- `heidi_analysis_reviewer_v1` — last reviewer name
