#!/usr/bin/env python3
"""
Unit and Integration Tests for Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE)
===================================================================================================

Run with:
  python3 scripts/test_ch_lte_pipeline.py
"""

import json
import os
import sys
import unittest
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from ch_lte_scoring import (
    load_rubric,
    normalize_dimension_key,
    get_dimension_meta,
    get_preservation_credit,
    get_addition_penalty,
    score_dimension,
)
from ch_lte_validator import ChLteValidator
import ch_lte_pipeline as pipeline

RUBRIC = load_rubric()
SBS_PATH = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_part1_side_by_side.json')
OUT_PATH = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_literary_analysis.json')


def make_ev(dim, cat, w=1, status='located', conf='medium', de_span=None, en_span=None, expl='test'):
    return {
        'evidence_id': f'HEIDI-CH01-A001-{pipeline.CODES.get(dim, "SEM")}-001',
        'dimension': dim,
        'category': cat,
        'weight': w,
        'span_status': status,
        'confidence': conf,
        'source_span': de_span,
        'target_span': en_span,
        'explanation': expl,
        'requires_expert_review': cat == 'uncertain',
    }


class TestChLteScoring(unittest.TestCase):
    def test_canonical_dimension_normalization(self):
        self.assertEqual(normalize_dimension_key('sem', RUBRIC), 'semantic')
        self.assertEqual(normalize_dimension_key('metaphor_imagery', RUBRIC), 'imagery')
        self.assertEqual(normalize_dimension_key('character_voice', RUBRIC), 'voice')
        self.assertEqual(normalize_dimension_key('cultural_archaic', RUBRIC), 'cultural')
        self.assertEqual(normalize_dimension_key('omissions_additions', RUBRIC), 'omissions')
        self.assertEqual(normalize_dimension_key('wpl', RUBRIC), 'wordplay')

    def test_feature_presence_dimension_without_evidence_is_na_never_zero(self):
        for dim in ('emotion', 'imagery', 'cultural', 'wordplay'):
            res = score_dimension(dim, [], na_reason='No feature', has_dialogue=True, rubric=RUBRIC)
            self.assertEqual(res['applicability'], 'not_applicable')
            self.assertEqual(res['status'], 'not_applicable')
            self.assertIsNone(res['score'], f"{dim} score must be null, never 0")

    def test_baseline_dimension_without_evidence_is_not_evaluated_never_zero(self):
        res = score_dimension('semantic', [], na_reason=None, has_dialogue=True, rubric=RUBRIC)
        self.assertEqual(res['applicability'], 'not_evaluated')
        self.assertEqual(res['status'], 'not_evaluated')
        self.assertIsNone(res['score'], "Semantic without evidence must have null score")

    def test_voice_in_narration_is_not_applicable_never_zero(self):
        res = score_dimension('voice', [], na_reason=None, has_dialogue=False, rubric=RUBRIC)
        self.assertEqual(res['applicability'], 'not_applicable')
        self.assertIsNone(res['score'])
        self.assertIn('dialogue', res['explanation'].lower())

    def test_only_uncertain_evidence_gives_uncertain_status_no_score(self):
        ev = make_ev('imagery', 'uncertain', w=1)
        res = score_dimension('imagery', [ev], na_reason=None, has_dialogue=True, rubric=RUBRIC)
        self.assertEqual(res['applicability'], 'uncertain')
        self.assertIsNone(res['score'])
        self.assertTrue(res['requires_expert_review'])

    def test_rubric_preservation_credits(self):
        evs = [
            make_ev('semantic', 'preserved', w=2),  # 2 * 1.0 = 2.0
            make_ev('semantic', 'changed', w=1),    # 1 * 0.6 = 0.6
            make_ev('semantic', 'lost', w=1),       # 1 * 0.0 = 0.0
        ]
        res = score_dimension('semantic', evs, na_reason=None, has_dialogue=True, rubric=RUBRIC)
        self.assertEqual(res['applicability'], 'evaluated')
        # total_weight = 4, weighted_credit = 2.6 -> 2.6 / 4 * 100 = 65
        self.assertEqual(res['score'], 65)

    def test_omissions_deduction_formula(self):
        evs = [
            make_ev('omissions', 'lost', w=2),   # penalty: 8 * 2 = 16
            make_ev('omissions', 'added', w=1),  # penalty: 3 * 1 = 3
        ]
        res = score_dimension('omissions', evs, na_reason=None, has_dialogue=True, rubric=RUBRIC)
        self.assertEqual(res['applicability'], 'evaluated')
        # 100 - 16 - 3 = 81
        self.assertEqual(res['score'], 81)


class TestBidirectionalVerification(unittest.TestCase):
    def setUp(self):
        self.bilex = pipeline.Bilex()

    def test_fortkommen_leave_bidirectional_match(self):
        score, desc = pipeline.check_bidirectional_equivalence(
            'aber ich konnte nicht fortkommen',
            'but I could not leave',
            self.bilex
        )
        self.assertGreaterEqual(score, 0.35, "fortkommen <-> leave must achieve high alignment score")
        self.assertIsNotNone(desc)

    def test_care_of_rooms_bidirectional_match(self):
        score, desc = pipeline.check_bidirectional_equivalence(
            'ich habe ihre Zimmer... und sie besorgt',
            'and I took care of their rooms',
            self.bilex
        )
        self.assertGreaterEqual(score, 0.35, "Zimmer besorgt <-> took care of their rooms must align")

    def test_no_false_lost_added_in_ch01_a013_simulation(self):
        de_s = [{'start': 0, 'end': 32, 'text': 'aber ich konnte nicht fortkommen'}]
        en_s = [{'start': 0, 'end': 21, 'text': 'but I could not leave'}]
        per_dim = defaultdict(list)
        evidence = []
        al = {'links': [(0, 0, 1.0)]}

        pipeline.assess_unassessed_clauses_ch_lte(
            'ch01-a013',
            'aber ich konnte nicht fortkommen',
            'but I could not leave',
            de_s, en_s, al, self.bilex, per_dim, evidence, {'items': []}
        )

        categories = [e['category'] for e in per_dim['semantic']]
        self.assertIn('preserved', categories)
        self.assertNotIn('lost', categories, "aber ich konnte nicht fortkommen must NOT be classified as Lost")
        self.assertNotIn('added', categories, "but I could not leave must NOT be classified as Added")


class TestPilotPassagesValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not os.path.exists(OUT_PATH):
            raise unittest.SkipTest(f"Output file {OUT_PATH} does not exist yet")
        with open(OUT_PATH, 'r', encoding='utf-8') as f:
            cls.data = json.load(f)
        with open(SBS_PATH, 'r', encoding='utf-8') as f:
            cls.sbs = json.load(f)
        cls.validator = ChLteValidator(RUBRIC)

    def test_pilot_passages_exist_and_analyzed(self):
        passages = self.data.get('passages', {})
        for gid in ('ch01-a001', 'ch01-a002', 'ch01-a013', 'ch01-a028'):
            self.assertIn(gid, passages, f"Pilot passage {gid} missing")
            self.assertEqual(passages[gid]['status'], 'analyzed', f"Passage {gid} not analyzed")

    def test_ch01_a013_bidirectional_preservation(self):
        p = self.data['passages']['ch01-a013']
        evidence = p.get('evidence', [])

        # Verify 'aber ich konnte nicht fortkommen' <-> 'but I could not leave'
        fortkommen_ev = [
            e for e in evidence
            if e.get('source_phrase') and 'fortkommen' in e['source_phrase']
        ]
        self.assertTrue(fortkommen_ev, "ch01-a013 must have evidence for 'aber ich konnte nicht fortkommen'")
        self.assertEqual(fortkommen_ev[0]['category'], 'preserved', "fortkommen clause must be Preserved")
        self.assertEqual(fortkommen_ev[0]['target_phrase'], 'but I could not leave')

        # Verify semantic score is realistic (> 65)
        sem_score = p['dimensions']['semantic']['score']
        self.assertIsNotNone(sem_score)
        self.assertGreaterEqual(sem_score, 70, f"ch01-a013 semantic score {sem_score} should reflect strong preservation")

    def test_all_spans_match_exact_text(self):
        rows = {r['id']: r for ch in self.sbs['chapters'] for r in ch['rows']}
        passages = self.data.get('passages', {})

        for gid in ('ch01-a001', 'ch01-a002', 'ch01-a013', 'ch01-a028'):
            p = passages.get(gid)
            if not p or p.get('status') != 'analyzed':
                continue
            de_text = '\n\n'.join(x['text'] for x in rows[gid]['de'])
            en_text = '\n\n'.join(x['text'] for x in rows[gid]['en'])

            for e in p.get('evidence', []):
                eid = e.get('evidence_id')
                s_span = e.get('source_span')
                t_span = e.get('target_span')
                if s_span:
                    actual = de_text[s_span['start']:s_span['end']]
                    self.assertEqual(actual, s_span['text'], f"Span mismatch in DE for {gid} {eid}")
                if t_span:
                    actual = en_text[t_span['start']:t_span['end']]
                    self.assertEqual(actual, t_span['text'], f"Span mismatch in EN for {gid} {eid}")


if __name__ == '__main__':
    unittest.main(verbosity=2)
