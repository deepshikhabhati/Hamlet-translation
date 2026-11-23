"""Tests for scripts/heidi_literary_pipeline.py (run: python3 scripts/test_heidi_literary_pipeline.py)."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import heidi_literary_pipeline as P  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'data', 'heidi_literary_analysis.json')


def ev(cat, w=1, status='located', conf='medium'):
    return {'category': cat, 'weight': w, 'span_status': status, 'confidence': conf,
            'explanation': 'x', 'requires_expert_review': cat == 'uncertain'}


class Scoring(unittest.TestCase):
    def test_presence_dimension_without_evidence_is_na_not_zero(self):
        for d in ('emotion', 'imagery', 'cultural', 'wordplay'):
            r = P.score_dimension(d, [], None, True)
            self.assertEqual(r['applicability'], 'not_applicable')
            self.assertIsNone(r['score'])

    def test_semantic_without_evidence_is_not_evaluated(self):
        r = P.score_dimension('semantic', [], None, True)
        self.assertEqual(r['applicability'], 'not_evaluated')
        self.assertIsNone(r['score'])

    def test_voice_in_narration_is_na(self):
        r = P.score_dimension('voice', [], None, False)
        self.assertEqual(r['applicability'], 'not_applicable')

    def test_only_uncertain_evidence_gives_no_score(self):
        r = P.score_dimension('imagery', [ev('uncertain')], None, True)
        self.assertEqual(r['applicability'], 'uncertain')
        self.assertIsNone(r['score'])

    def test_na_reason_with_uncertain_evidence_is_na(self):
        r = P.score_dimension('emotion', [ev('uncertain')], 'heat, not emotion', True)
        self.assertEqual(r['applicability'], 'not_applicable')
        self.assertIsNone(r['score'])

    def test_rubric_credit(self):
        r = P.score_dimension('semantic', [ev('preserved', 2), ev('changed', 1), ev('lost', 1)], None, True)
        self.assertEqual(r['score'], round(100 * (2 * 1.0 + 0.6) / 4))

    def test_omissions_penalty(self):
        r = P.score_dimension('omissions', [ev('lost', 2), ev('added', 1)], None, True)
        self.assertEqual(r['score'], 100 - 16 - 3)

    def test_unlocated_evidence_is_excluded_from_score(self):
        r = P.score_dimension('semantic', [ev('preserved'), ev('lost', 3, 'unlocated')], None, True)
        self.assertEqual(r['score'], 100)
        self.assertIn('could not be located', r['explanation'])

    def test_no_100_without_support(self):
        r = P.score_dimension('semantic', [ev('preserved'), ev('changed')], None, True)
        self.assertLess(r['score'], 100)


class Output(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = json.load(open(OUT, encoding='utf-8'))

    def test_schema_and_coverage(self):
        self.assertEqual(self.d['schema'], 'heidi-literary-analysis-v1')
        c = self.d['coverage']
        self.assertEqual(c['total'], 581)
        self.assertEqual(c['analyzed'] + c.get('alignment_disputed', 0), 434)
        self.assertEqual(c['unlocated_evidence'], 0)

    def test_evidence_records(self):
        import re
        rx = re.compile(r'^HEIDI-CH\d\d-A\d{3}-(SEM|EMO|IMG|TON|VOI|CUL|OMI|WPL)-\d{3}$')
        seen = set()
        for gid, p in self.d['passages'].items():
            for e in p.get('evidence', []):
                self.assertRegex(e['evidence_id'], rx)
                self.assertNotIn(e['evidence_id'], seen)
                seen.add(e['evidence_id'])
                if e['category'] == 'lost':
                    self.assertIsNone(e['target_phrase'])
                if e['category'] == 'added':
                    self.assertIsNone(e['source_phrase'])
            for k, dim in (p.get('dimensions') or {}).items():
                if dim['applicability'] != 'evaluated':
                    self.assertIsNone(dim['score'], f'{gid} {k}')

    def test_no_text_in_analysis_file(self):
        self.assertNotIn('german_text', json.dumps(self.d['passages']['ch01-a002']))


if __name__ == '__main__':
    unittest.main(verbosity=1)
