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


def sent(text_list):
    out, pos = [], 0
    for t in text_list:
        out.append({'start': pos, 'end': pos + len(t), 'text': t, 'paragraph_id': 'x'})
        pos += len(t) + 1
    return out


def span_ev(cat, de=None, en=None, dim='semantic', expl='x'):
    return {'evidence_id': 'E', 'dimension': dim, 'category': cat, 'source_span': de, 'target_span': en, 'explanation': expl}


class Sentences(unittest.TestCase):
    def test_auto_groups_support_n_to_m_and_cover_every_sentence(self):
        g = P.auto_sentence_groups(3, 3, [(0, 0), (0, 1), (1, 1), (2, 2)])
        self.assertEqual(sorted(i for x in g for i in x['de']), [0, 1, 2])
        self.assertEqual(sorted(j for x in g for j in x['en']), [0, 1, 2])
        self.assertIn({'de': [0, 1], 'en': [0, 1]}, g)

    def test_unlinked_sentences_stand_alone(self):
        g = P.auto_sentence_groups(2, 1, [(0, 0)])
        self.assertIn({'de': [1], 'en': []}, g)

    def test_no_evidence_is_unassessed_not_preserved(self):
        de, en = sent(['Ein Satz.']), sent(['A sentence.'])
        lab, _, _ = P.derive_label({'de': [0], 'en': [0]}, de, en, [])
        self.assertEqual(lab, 'unassessed')

    def test_partial_loss_is_changed_not_lost(self):
        de, en = sent(['Das große rote Tuch um und um gebunden.']), sent(['A large red shawl.'])
        ev = [span_ev('lost', de={'start': 22, 'end': 38})]
        lab, ids, _ = P.derive_label({'de': [0], 'en': [0]}, de, en, ev)
        self.assertEqual(lab, 'changed')

    def test_unmatched_german_sentence_with_loss_evidence_is_lost(self):
        de, en = sent(['Er war Soldat in Neapel.']), sent([])
        ev = [span_ev('lost', de={'start': 0, 'end': 24})]
        self.assertEqual(P.derive_label({'de': [0], 'en': []}, de, en, ev)[0], 'lost')

    def test_unmatched_sentence_without_evidence_is_uncertain(self):
        de, en = sent(['Er war Soldat.']), sent([])
        self.assertEqual(P.derive_label({'de': [0], 'en': []}, de, en, [])[0], 'uncertain')

    def test_explicit_assessment_must_cover_every_sentence(self):
        de, en = sent(['A.', 'B.']), sent(['a.'])
        al = {'links': [[0, 0, 1.0]]}
        recs, probs = P.build_sentence_layer('ch01-a999', de, en, al, [], {'groups': [([0], [0], 'P', 'ok')]})
        self.assertTrue(probs)
        self.assertEqual(sorted(i for r in recs for i in r['source_sentences']), [0, 1])   # falls back to automatic groups

    def test_lost_group_cannot_have_english(self):
        de, en = sent(['A.']), sent(['a.'])
        _, probs = P.build_sentence_layer('ch01-a999', de, en, {'links': []}, [], {'groups': [([0], [0], 'L', 'x')]})
        self.assertTrue(any('Lost' in p for p in probs))

    def test_expert_reviewed_assessment_is_kept_and_marked(self):
        de, en = sent(['A.']), sent(['a.'])
        recs, _ = P.build_sentence_layer('ch01-a999', de, en, {'links': []}, [],
                                         {'groups': [([0], [0], 'C', 'expert')], 'expert_reviewed': True})
        self.assertEqual(recs[0]['review_status'], 'expert_reviewed')
        self.assertEqual(recs[0]['classification'], 'changed')


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

    def test_every_sentence_is_accounted_for_and_spans_match_text(self):
        src = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'data', 'heidi_part1_side_by_side.json'), encoding='utf-8'))
        rows = {r['id']: r for ch in src['chapters'] for r in ch['rows']}
        for gid, p in self.d['passages'].items():
            if p['status'] != 'analyzed':
                self.assertNotIn('sentence_alignments', p)
                continue
            de = '\n\n'.join(x['text'] for x in rows[gid]['de'])
            en = '\n\n'.join(x['text'] for x in rows[gid]['en'])
            recs = p['sentence_alignments']
            self.assertEqual(sorted(i for r in recs for i in r['source_sentences']), list(range(len(p['sentences']['de']))), gid)
            self.assertEqual(sorted(j for r in recs for j in r['target_sentences']), list(range(len(p['sentences']['en']))), gid)
            for r in recs:
                self.assertRegex(r['sentence_alignment_id'], r'^HEIDI-CH\d\d-A\d{3}-SA\d{2}$')
                for sp in r['source_spans']:
                    self.assertEqual(de[sp['start']:sp['end']], sp['text'])
                for sp in r['target_spans']:
                    self.assertEqual(en[sp['start']:sp['end']], sp['text'])
                if r['classification'] == 'lost':
                    self.assertEqual(r['target_sentences'], [])
                if r['classification'] == 'added':
                    self.assertEqual(r['source_sentences'], [])
                if r['basis'] == 'unassessed':
                    self.assertIsNone(r['provenance'])

    def test_chapter_1_is_fully_sentence_assessed(self):
        for gid, p in self.d['passages'].items():
            if gid.startswith('ch01') and p['status'] == 'analyzed':
                self.assertTrue(all(r['basis'] == 'assessed' for r in p['sentence_alignments']), gid)


if __name__ == '__main__':
    unittest.main(verbosity=1)
