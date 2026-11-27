#!/usr/bin/env python3
"""
Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE) — Scoring Engine
===================================================================================

Implements the weighted literary scoring algorithm defined in scripts/config/ch_lte_rubric_v1.json.
Evaluates eight independent dimensions from verified literary evidence:
  - semantic (baseline)
  - emotion (feature-presence)
  - metaphor_imagery / imagery (feature-presence)
  - tone (baseline)
  - character_voice / voice (feature-presence, requires dialogue)
  - cultural_archaic / cultural (feature-presence)
  - omissions_additions / omissions (baseline)
  - wordplay (feature-presence)

Statuses:
  - evaluated: numerical score (0-100) supported by evidence
  - not_applicable: feature absent from passage (score: null, NEVER 0)
  - not_evaluated: dimension not assessed (score: null, NEVER 0)
  - uncertain: evidence exists but unresolved; flagged for expert review (score: null, NEVER 0)
  - alignment_disputed: misaligned pair; excluded from scoring
"""

import json
import os
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_RUBRIC_PATH = os.path.join(HERE, 'config', 'ch_lte_rubric_v1.json')

_CACHED_RUBRIC: Optional[Dict[str, Any]] = None


def load_rubric(path: Optional[str] = None) -> Dict[str, Any]:
    global _CACHED_RUBRIC
    rubric_path = path or DEFAULT_RUBRIC_PATH
    if _CACHED_RUBRIC and path is None:
        return _CACHED_RUBRIC
    if not os.path.exists(rubric_path):
        raise FileNotFoundError(f"Rubric configuration file not found at {rubric_path}")
    with open(rubric_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if path is None:
        _CACHED_RUBRIC = data
    return data


def normalize_dimension_key(key: str, rubric: Optional[Dict[str, Any]] = None) -> str:
    """Normalizes any dimension alias or short code to its canonical key."""
    r = rubric or load_rubric()
    alias_map = r.get('dimension_alias_map', {})
    return alias_map.get(key, key)


def get_dimension_meta(dim_key: str, rubric: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    r = rubric or load_rubric()
    norm = normalize_dimension_key(dim_key, r)
    dims = r.get('canonical_dimensions', {})
    if norm in dims:
        return dims[norm]
    # Check if key is alias
    for k, v in dims.items():
        if v.get('canonical_key') == norm or v.get('short_key') == norm:
            return v
    return {'code': 'GEN', 'short_key': norm[:3], 'canonical_key': norm, 'type': 'baseline', 'default_weight': 2}


def get_preservation_credit(item: Dict[str, Any], rubric: Optional[Dict[str, Any]] = None) -> float:
    r = rubric or load_rubric()
    cat = item.get('category', '').lower()
    credits = r.get('preservation_credits', {})
    if cat == 'preserved':
        return float(credits.get('preserved', 1.0))
    elif cat == 'changed':
        changed_credits = credits.get('changed', {})
        if isinstance(changed_credits, dict):
            severity = (item.get('severity') or 'moderate').lower()
            return float(changed_credits.get(severity, changed_credits.get('default', 0.6)))
        return float(changed_credits)
    elif cat in ('lost', 'added'):
        return 0.0
    return 0.0


def get_addition_penalty(item: Dict[str, Any], rubric: Optional[Dict[str, Any]] = None) -> float:
    r = rubric or load_rubric()
    if item.get('category') != 'added':
        return 0.0
    penalties = r.get('addition_penalties', {})
    severity = (item.get('severity') or 'moderate').lower()
    penalty_per_w = penalties.get(severity, penalties.get('default', 3))
    w = int(item.get('weight', 1))
    return float(penalty_per_w * w)


def score_dimension(
    dim_key: str,
    evidence_items: List[Dict[str, Any]],
    na_reason: Optional[str] = None,
    has_dialogue: bool = True,
    rubric: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes a weighted literary score and assessment metadata for one dimension.
    Distinguishes evaluated, not_applicable, not_evaluated, and uncertain.
    Never returns numerical 0 for non-evaluated or not-applicable dimensions.
    """
    r = rubric or load_rubric()
    norm_dim = normalize_dimension_key(dim_key, r)
    meta = get_dimension_meta(norm_dim, r)
    dim_type = meta.get('type', 'baseline')
    requires_dialogue = meta.get('requires_dialogue', False)
    default_na = meta.get('default_na_reason', 'Feature absent in passage.')

    counts = Counter(e.get('category') for e in evidence_items)
    category_counts = {
        'preserved': counts.get('preserved', 0),
        'changed': counts.get('changed', 0),
        'lost': counts.get('lost', 0),
        'added': counts.get('added', 0),
        'uncertain': counts.get('uncertain', 0),
    }

    base_response = {
        'dimension': norm_dim,
        'evidence_count': len(evidence_items),
        'evidence_counts': category_counts,
        'category_counts': category_counts,
        'rubric_version': r.get('rubric_version', 'ch-lte-v1'),
        'method': f"CH-LTE Rubric ({r.get('rubric_version', 'ch-lte-v1')})",
        'assessment_method': 'contextual_model_assisted',
    }

    # Voice in narration (no dialogue)
    if requires_dialogue and not has_dialogue and not evidence_items:
        return {
            **base_response,
            'status': 'not_applicable',
            'applicability': 'not_applicable',
            'score': None,
            'confidence': None,
            'feature_coverage': 0.0,
            'requires_expert_review': False,
            'explanation': na_reason or default_na,
        }

    # Empty evidence handling
    if not evidence_items:
        if dim_type == 'feature_presence':
            return {
                **base_response,
                'status': 'not_applicable',
                'applicability': 'not_applicable',
                'score': None,
                'confidence': None,
                'feature_coverage': 0.0,
                'requires_expert_review': False,
                'explanation': na_reason or default_na,
            }
        else:
            return {
                **base_response,
                'status': 'not_evaluated',
                'applicability': 'not_evaluated',
                'score': None,
                'confidence': None,
                'feature_coverage': 0.0,
                'requires_expert_review': False,
                'explanation': 'No evidence recorded for this dimension; not evaluated (never 0).',
            }

    # Scorable items (exclude unlocated and uncertain from preservation denominator)
    scored_items = [
        e for e in evidence_items
        if e.get('category') in ('preserved', 'changed', 'lost') and e.get('span_status') != 'unlocated'
    ]
    unlocated_items = [e for e in evidence_items if e.get('span_status') == 'unlocated']
    added_items = [e for e in evidence_items if e.get('category') == 'added']
    uncertain_items = [e for e in evidence_items if e.get('category') == 'uncertain']

    # If na_reason was specified and no scorable source features exist
    if not scored_items and not added_items and na_reason:
        return {
            **base_response,
            'status': 'not_applicable',
            'applicability': 'not_applicable',
            'score': None,
            'confidence': None,
            'feature_coverage': 0.0,
            'requires_expert_review': bool(uncertain_items),
            'explanation': na_reason,
        }

    # If only uncertain evidence exists
    if not scored_items and not added_items and uncertain_items:
        first_expl = uncertain_items[0].get('explanation', 'Uncertain evidence.')
        return {
            **base_response,
            'status': 'uncertain',
            'applicability': 'uncertain',
            'score': None,
            'confidence': 'low',
            'feature_coverage': 0.0,
            'requires_expert_review': True,
            'explanation': f'Only uncertain evidence recorded: {first_expl}',
        }

    # Omissions dimension uses deduction formula
    if norm_dim == 'omissions':
        deductions = r.get('omissions_deduction', {})
        lost_pen = deductions.get('lost_penalty_per_weight', 8)
        changed_pen = deductions.get('changed_penalty_per_weight', 4)
        added_pen = deductions.get('added_penalty_per_weight', 3)

        total_penalty = 0
        for e in scored_items:
            cat = e.get('category')
            w = int(e.get('weight', 1))
            if cat == 'lost':
                total_penalty += lost_pen * w
            elif cat == 'changed':
                total_penalty += changed_pen * w
        for e in added_items:
            w = int(e.get('weight', 1))
            total_penalty += added_pen * w

        final_score = max(0, 100 - total_penalty)
        base_preservation_score = final_score
        addition_penalty = sum(added_pen * int(e.get('weight', 1)) for e in added_items)
    else:
        # Standard 7 dimensions: preservation credit formula with separate addition penalty
        if scored_items:
            total_weight = sum(int(e.get('weight', 1)) for e in scored_items)
            weighted_credit = sum(int(e.get('weight', 1)) * get_preservation_credit(e, r) for e in scored_items)
            base_preservation_score = round(100.0 * weighted_credit / total_weight)
        else:
            # Only additions in this dimension
            base_preservation_score = 100

        addition_penalty = sum(get_addition_penalty(e, r) for e in added_items)
        final_score = max(0, min(100, round(base_preservation_score - addition_penalty)))

    # Confidence aggregation
    confs = Counter(e.get('confidence', 'medium') for e in evidence_items)
    if confs['low'] > len(evidence_items) / 2:
        conf = 'low'
    elif confs['high'] > len(evidence_items) / 2:
        conf = 'high'
    else:
        conf = 'medium'

    # Build concise human explanation
    counts_summary = [f"{counts[c]} {c}" for c in ('preserved', 'changed', 'lost', 'added', 'uncertain') if counts.get(c)]
    lead_issues = sorted([e for e in scored_items if e.get('category') != 'preserved'] + added_items, key=lambda x: -int(x.get('weight', 1)))
    lead_expl = lead_issues[0].get('explanation') if lead_issues else (scored_items[0].get('explanation') if scored_items else 'All evaluated features preserved.')
    explanation = f"{', '.join(counts_summary)}. {lead_expl}"
    if unlocated_items:
        explanation += f" ({len(unlocated_items)} unlocated item(s) excluded from score)."

    requires_review = any(e.get('requires_expert_review', False) for e in evidence_items) or bool(uncertain_items) or conf == 'low'

    return {
        **base_response,
        'status': 'evaluated',
        'applicability': 'evaluated',
        'score': final_score,
        'base_preservation_score': base_preservation_score,
        'addition_penalty': addition_penalty,
        'confidence': conf,
        'feature_coverage': 1.0,
        'requires_expert_review': requires_review,
        'explanation': explanation,
    }


def calculate_chapter_averages(passages: List[Dict[str, Any]], rubric: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Computes dimension averages for a chapter.
    Excludes non-numeric (null, N/A, not_evaluated, uncertain, disputed) assessments from the average.
    """
    r = rubric or load_rubric()
    dims = r.get('canonical_dimensions', {})
    scores_by_dim = {k: [] for k in dims}

    for p in passages:
        if p.get('status') != 'analyzed':
            continue
        p_dims = p.get('dimensions', {})
        for dk in dims:
            dim_data = p_dims.get(dk)
            if dim_data and dim_data.get('status') == 'evaluated' and dim_data.get('score') is not None:
                scores_by_dim[dk].append(dim_data['score'])

    averages = {}
    for dk, scores in scores_by_dim.items():
        averages[dk] = {
            'evaluated_count': len(scores),
            'average_score': round(sum(scores) / len(scores), 1) if scores else None,
        }
    return averages
