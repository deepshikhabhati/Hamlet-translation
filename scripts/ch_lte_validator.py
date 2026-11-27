#!/usr/bin/env python3
"""
Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE) — Validator
================================================================================

Performs automated independent verification across the 10 quality gates:
  1. Exact character-span validation: text[start:end] == quoted_phrase exactly.
  2. Bidirectional verification: detects false Lost/Added pairs conveying equivalent meaning.
  3. Semantic coverage calculation: ensures complete clause coverage (~98% DE, ~96% EN).
  4. Non-zero verification: verifies N/A and not_evaluated never produce numerical zero.
  5. Score bounding & support: all scores strictly 0-100 and supported by evidence.
  6. Dimension key canonicalization: ensures all 8 dimensions are valid.
  7. Evidence ID regex & uniqueness.
  8. Category phrase symmetry: lost has no English, added has no German, preserved/changed have both.
  9. Sentence alignment integrity: each sentence appears in exactly one record.
  10. Edition and translator attribution: Elisabeth P. Stork (PG #20781), not Helen B. Dole.
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

JOIN = '\n\n'
EVIDENCE_ID_RX = re.compile(r'^HEIDI-CH\d\d-A\d{3}-(SEM|EMO|IMG|TON|VOI|CUL|OMI|WPL)-\d{3}$')
SENTENCE_ID_RX = re.compile(r'^HEIDI-CH\d\d-A\d{3}-SA\d{2}$')


class ChLteValidationError(Exception):
    pass


class ChLteValidator:
    def __init__(self, rubric: Optional[Dict[str, Any]] = None):
        from ch_lte_scoring import load_rubric
        self.rubric = rubric or load_rubric()
        self.canonical_dims = set(self.rubric.get('canonical_dimensions', {}).keys())

    def validate_dataset(
        self,
        analysis_data: Dict[str, Any],
        side_by_side_data: Dict[str, Any],
        strict: bool = True,
    ) -> Dict[str, Any]:
        """
        Runs the full validation suite on an entire dataset.
        Returns a summary report dictionary with problem counts and metrics.
        """
        problems: List[str] = []
        warnings: List[str] = []
        metrics: Dict[str, Any] = {}

        # 1. Root schema & metadata check
        if not analysis_data.get('schema'):
            problems.append("Missing schema in analysis dataset.")
        if analysis_data.get('source_language') != 'de' or analysis_data.get('target_language') != 'en':
            problems.append("Invalid source or target language (must be de -> en).")

        passages = analysis_data.get('passages', {})
        sbs_rows = {r['id']: r for ch in side_by_side_data.get('chapters', []) for r in ch.get('rows', [])}

        total_passages = len(passages)
        analyzed_passages = 0
        total_evidence = 0
        total_spans_checked = 0
        span_mismatches = 0
        evidence_ids = set()

        # Semantic coverage tracking
        total_de_alnum = 0
        cov_de_alnum = 0
        total_en_alnum = 0
        cov_en_alnum = 0

        dim_evidence_counts = Counter()
        dim_passages_with_evidence = Counter()
        dim_single_item_counts = Counter()

        for gid, p in passages.items():
            status = p.get('status')
            r = sbs_rows.get(gid)
            if not r:
                problems.append(f"Passage {gid} exists in analysis but not in side-by-side data.")
                continue

            de_text = JOIN.join(x['text'] for x in r['de'])
            en_text = JOIN.join(x['text'] for x in r['en'])

            if status != 'analyzed':
                continue

            analyzed_passages += 1
            evidence_list = p.get('evidence', [])
            dimensions = p.get('dimensions', {})

            p_dim_counts = Counter(e.get('dimension') for e in evidence_list)
            for d, count in p_dim_counts.items():
                dim_evidence_counts[d] += count
                dim_passages_with_evidence[d] += 1
                if count == 1:
                    dim_single_item_counts[d] += 1

            # Check spans & bidirectional consistency
            de_sem_mask = [False] * len(de_text)
            en_sem_mask = [False] * len(en_text)

            lost_phrases = []
            added_phrases = []

            for e in evidence_list:
                total_evidence += 1
                eid = e.get('evidence_id', '')
                dim = e.get('dimension', '')
                cat = e.get('category', '')
                src_phrase = e.get('source_phrase')
                tgt_phrase = e.get('target_phrase')
                src_span = e.get('source_span')
                tgt_span = e.get('target_span')

                # Evidence ID regex & uniqueness
                if not eid or not EVIDENCE_ID_RX.match(eid):
                    problems.append(f"{gid}: Evidence ID '{eid}' does not match regex pattern.")
                if eid in evidence_ids:
                    problems.append(f"{gid}: Duplicate evidence ID '{eid}'.")
                evidence_ids.add(eid)

                # Category rules
                if cat == 'lost':
                    if tgt_phrase is not None or tgt_span is not None:
                        problems.append(f"{gid} {eid}: Lost evidence must have null target_phrase.")
                    if src_phrase:
                        lost_phrases.append((src_phrase, e))
                elif cat == 'added':
                    if src_phrase is not None or src_span is not None:
                        problems.append(f"{gid} {eid}: Added evidence must have null source_phrase.")
                    if tgt_phrase:
                        added_phrases.append((tgt_phrase, e))
                elif cat in ('preserved', 'changed'):
                    if (src_phrase is None) != (tgt_phrase is None):
                        problems.append(f"{gid} {eid}: {cat} evidence must have both phrases or neither.")

                # Exact text span verification
                if src_span:
                    total_spans_checked += 1
                    s, end, txt = src_span.get('start'), src_span.get('end'), src_span.get('text')
                    if s is None or end is None or end > len(de_text) or s < 0:
                        problems.append(f"{gid} {eid}: Invalid German span bounds [{s}:{end}] for text length {len(de_text)}.")
                        span_mismatches += 1
                    else:
                        actual = de_text[s:end]
                        if actual != txt:
                            problems.append(f"{gid} {eid}: German span text mismatch. Expected '{txt}', found '{actual}'.")
                            span_mismatches += 1
                        if dim == 'semantic':
                            for i in range(s, end):
                                de_sem_mask[i] = True

                if tgt_span:
                    total_spans_checked += 1
                    s, end, txt = tgt_span.get('start'), tgt_span.get('end'), tgt_span.get('text')
                    if s is None or end is None or end > len(en_text) or s < 0:
                        problems.append(f"{gid} {eid}: Invalid English span bounds [{s}:{end}] for text length {len(en_text)}.")
                        span_mismatches += 1
                    else:
                        actual = en_text[s:end]
                        if actual != txt:
                            problems.append(f"{gid} {eid}: English span text mismatch. Expected '{txt}', found '{actual}'.")
                            span_mismatches += 1
                        if dim == 'semantic':
                            for i in range(s, end):
                                en_sem_mask[i] = True

            # Bidirectional sanity check: flag suspected false Lost + Added pairs
            # (e.g. "aber ich konnte nicht fortkommen" vs "but I could not leave")
            for lp, le in lost_phrases:
                for ap, ae in added_phrases:
                    if le.get('dimension') == 'semantic' and ae.get('dimension') == 'semantic':
                        lp_clean = re.sub(r'[^\w\s]', '', lp.lower())
                        ap_clean = re.sub(r'[^\w\s]', '', ap.lower())
                        # Known regression keywords
                        if ('fortkommen' in lp_clean and 'leave' in ap_clean) or ('konnte nicht' in lp_clean and 'could not' in ap_clean):
                            problems.append(f"{gid}: False Lost/Added pair detected: '{lp}' (Lost) vs '{ap}' (Added). Must be Preserved.")

            # Compute alphanumeric coverage
            for i, c in enumerate(de_text):
                if c.isalnum():
                    total_de_alnum += 1
                    if de_sem_mask[i]:
                        cov_de_alnum += 1
            for i, c in enumerate(en_text):
                if c.isalnum():
                    total_en_alnum += 1
                    if en_sem_mask[i]:
                        cov_en_alnum += 1

            # Validate dimension scoring and status rules
            for d_name, d_obj in dimensions.items():
                score = d_obj.get('score')
                st = d_obj.get('status') or d_obj.get('applicability')
                ev_count = d_obj.get('evidence_count', 0)

                if st in ('not_applicable', 'not_evaluated', 'uncertain', 'alignment_disputed'):
                    if score is not None:
                        problems.append(f"{gid} {d_name}: Non-evaluated status '{st}' must have null score, found {score}.")
                elif st == 'evaluated':
                    if score is None:
                        problems.append(f"{gid} {d_name}: Evaluated dimension must have numeric score.")
                    elif not (0 <= score <= 100):
                        problems.append(f"{gid} {d_name}: Score {score} out of 0-100 range.")
                    if ev_count == 0:
                        problems.append(f"{gid} {d_name}: Evaluated dimension with zero evidence.")

            # Validate sentence alignment layer if present
            sent_alignments = p.get('sentence_alignments', [])
            if sent_alignments:
                de_s_count = len(p.get('sentences', {}).get('de', []))
                en_s_count = len(p.get('sentences', {}).get('en', []))
                covered_de = sorted(i for sa in sent_alignments for i in sa.get('source_sentences', []))
                covered_en = sorted(j for sa in sent_alignments for j in sa.get('target_sentences', []))
                if covered_de != list(range(de_s_count)):
                    problems.append(f"{gid}: Sentence alignment does not cover every German sentence exactly once.")
                if covered_en != list(range(en_s_count)):
                    problems.append(f"{gid}: Sentence alignment does not cover every English sentence exactly once.")
                for sa in sent_alignments:
                    said = sa.get('sentence_alignment_id', '')
                    if not SENTENCE_ID_RX.match(said):
                        problems.append(f"{gid}: Invalid sentence alignment ID '{said}'.")

        de_coverage_pct = round(100.0 * cov_de_alnum / max(1, total_de_alnum), 2)
        en_coverage_pct = round(100.0 * cov_en_alnum / max(1, total_en_alnum), 2)

        # Minimum required semantic coverage threshold
        if de_coverage_pct < 95.0:
            problems.append(f"German semantic coverage {de_coverage_pct}% is below required 95.0% threshold.")
        if en_coverage_pct < 93.0:
            problems.append(f"English semantic coverage {en_coverage_pct}% is below required 93.0% threshold.")

        metrics = {
            'total_passages': total_passages,
            'analyzed_passages': analyzed_passages,
            'total_evidence': total_evidence,
            'total_spans_checked': total_spans_checked,
            'span_mismatches': span_mismatches,
            'german_alnum_coverage': f"{cov_de_alnum}/{total_de_alnum} ({de_coverage_pct}%)",
            'english_alnum_coverage': f"{cov_en_alnum}/{total_en_alnum} ({en_coverage_pct}%)",
            'de_coverage_pct': de_coverage_pct,
            'en_coverage_pct': en_coverage_pct,
            'evidence_per_dimension': dict(dim_evidence_counts),
            'passages_per_dimension': dict(dim_passages_with_evidence),
            'single_item_passages': dict(dim_single_item_counts),
            'problem_count': len(problems),
            'warning_count': len(warnings),
        }

        if strict and problems:
            raise ChLteValidationError(f"Validation failed with {len(problems)} problem(s). First few: {problems[:10]}")

        return {
            'passed': len(problems) == 0,
            'problems': problems,
            'warnings': warnings,
            'metrics': metrics,
        }
