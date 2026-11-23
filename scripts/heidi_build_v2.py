#!/usr/bin/env python3
"""
Heidi Translation Analysis — derived analysis v2 (built on the curated alignment file)
=====================================================================================

Input (immutable, never modified):
    src/assets/data/heidi_part1_side_by_side.json
        14 chapters, English/German paragraphs with stable IDs (en-CC-PPP / de-CC-PPP)
        and alignment groups (chCC-aGGG). Chapter 1 is 'verified'; chapters 2–14 are
        'automatic' with per-group confidence high / medium / low / unmatched.
Optional input:
    scripts/heidi_work/heidi_extracted.json   (PDF page references, from heidi_extract.py)

Output (derived, separate file):
    src/assets/data/heidi_part1_analysis_v2.json

Per alignment group the output stores passage type / speaker, PDF page references,
alignment status (mapped from the curated confidence, never upgraded), and — only for
groups whose alignment is 'verified' or automatic 'high' — provisional automated
heuristic scores with phrase evidence (method automated_heuristic_v1, see
heidi_build_dataset.py for the definition of each dimension).

Evidence spans are offsets into the *displayed* group text: the group's paragraphs
joined with "\\n\\n" in file order. Every span is re-validated against that text and
additionally anchored to its paragraph ID (paragraph-relative offsets). Spans that
cannot be located are dropped from highlighting and listed under `unlocated`.

No RTT is produced here: back-translation needs network access to an NMT service
(see scripts/heidi_rtt_pipeline.py and the in-app "Generate Back-Translation" action).
"""
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from heidi_lexicon import Bilex  # noqa: E402
from heidi_align import detect_speaker, passage_type, SPEAKERS  # noqa: E402
import heidi_build_dataset as A  # noqa: E402

SRC = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_part1_side_by_side.json')
EXT = os.path.join(HERE, 'heidi_work', 'heidi_extracted.json')
# Reference output only (the app computes the same analysis in the browser — see scripts/heidi_scoring_parity.mjs)
OUT = os.environ.get('HEIDI_V2_OUT', os.path.join(HERE, 'heidi_work', 'heidi_part1_analysis_v2.reference.json'))
JOIN = '\n\n'
SPEAKER_LABEL = {c: l for c, l, _, _ in SPEAKERS}

STATUS_MAP = {'verified': 'verified', 'high': 'aligned', 'medium': 'needs_review', 'low': 'low_confidence'}
SCORED = {'verified', 'aligned'}


def norm(t):
    t = re.sub(r'^\[[A-Z]\]', '', t)
    return re.sub(r'\W+', ' ', t).strip().lower()


def page_index(ext, lang):
    idx = {}
    for p in ext.get(lang, []):
        idx.setdefault(p['chapter'], []).append((norm(p['text']), p['pdf_pages']))
    return idx


def find_pages(idx, chapter, text):
    n = norm(text)
    key = n[:80]
    for cand, pages in idx.get(chapter, []):
        if cand == n or (key and key in cand) or (cand[:80] and cand[:80] in n):
            return pages
    return []


def anchor(span, para_ids, para_texts):
    """Map a span on the joined text to (paragraph id, paragraph-relative offsets)."""
    pos = 0
    for pid, txt in zip(para_ids, para_texts):
        end = pos + len(txt)
        if span['start'] >= pos and span['end'] <= end:
            return {'paragraph_id': pid, 'start': span['start'] - pos, 'end': span['end'] - pos}
        pos = end + len(JOIN)
    return None


def main():
    src = json.load(open(SRC, encoding='utf-8'))
    ext = json.load(open(EXT, encoding='utf-8')) if os.path.exists(EXT) else {'en': [], 'de': []}
    pidx_en, pidx_de = page_index(ext, 'en'), page_index(ext, 'de')
    bilex = Bilex()
    groups = []
    totals = Counter()
    unlocated_total = 0
    for ch in src['chapters']:
        num = ch['number']
        en_all = sum(len(p['text']) for r in ch['rows'] for p in r['en'])
        de_all = sum(len(p['text']) for r in ch['rows'] for p in r['de'])
        ratio = en_all / max(1, de_all)
        for seq, r in enumerate(ch['rows'], start=1):
            en_ids = [p['id'] for p in r['en']]
            de_ids = [p['id'] for p in r['de']]
            en_txts = [p['text'] for p in r['en']]
            de_txts = [p['text'] for p in r['de']]
            en = JOIN.join(en_txts) or None
            de = JOIN.join(de_txts) or None
            conf = r['confidence']
            if not en or not de:
                status = 'unmatched_de' if de and not en else 'unmatched_en'
            else:
                status = STATUS_MAP.get(conf, 'needs_review')
            ptype = passage_type(de or en)
            if en and de and passage_type(en) != ptype:
                ptype = 'mixed' if 'narration' in (ptype, passage_type(en)) else ptype
            spk_de = detect_speaker(de, 'de') if de and ptype != 'narration' else None
            spk_en = detect_speaker(en, 'en') if en and ptype != 'narration' else None
            speaker = spk_de if spk_de and (spk_de == spk_en or not spk_en) else (spk_en if not spk_de else None)
            g = {
                'group_id': r['id'],
                'chapter_id': ch['id'],
                'chapter_number': num,
                'sequence': seq,
                'en_paragraph_ids': en_ids,
                'de_paragraph_ids': de_ids,
                'paragraph_types': sorted({p['type'] for p in r['en'] + r['de']}),
                'passage_type': ptype,
                'speaker': speaker,
                'speaker_label': SPEAKER_LABEL.get(speaker) if speaker else None,
                'speaker_conflict': bool(spk_de and spk_en and spk_de != spk_en),
                'alignment': {
                    'source_confidence': conf,
                    'chapter_alignment_status': ch['alignment_status'],
                    'status': status,
                    'bead': f'{len(de_ids)}:{len(en_ids)}',
                    'note': r.get('note'),
                    'source_pages_en': sorted({pg for t in en_txts for pg in find_pages(pidx_en, num, t)}),
                    'source_pages_de': sorted({pg for t in de_txts for pg in find_pages(pidx_de, num, t)}),
                },
                'analysis': None,
                'unlocated_evidence': [],
            }
            totals[status] += 1
            if status in SCORED:
                sem, sem_score = A.a_semantic(bilex, de, en)
                dims = {
                    'semantic': sem,
                    'emotion': A.a_emotion(de, en),
                    'imagery': A.a_imagery(de, en),
                    'tone': A.a_tone(de, en),
                    'voice': A.a_voice(de, en, spk_de, spk_en),
                    'cultural': A.a_cultural(de, en),
                    'omissions': A.a_omissions(bilex, de, en, ratio),
                    'wordplay': A.na('Wordplay is not detected automatically; requires expert assessment.', status='not_assessed'),
                }
                # validate + anchor every span against the displayed text
                for dk, dv in dims.items():
                    for side, text, ids, txts in (('de', de, de_ids, de_txts), ('en', en, en_ids, en_txts)):
                        keep = []
                        for s in dv['evidence_' + side]:
                            if text[s['start']:s['end']] == s['text']:
                                s['anchor'] = anchor(s, ids, txts)
                                keep.append(s)
                            else:
                                g['unlocated_evidence'].append({'dimension': dk, 'side': side, 'text': s['text']})
                        dv['evidence_' + side] = keep
                    for ev in dv['phrase_evidence']:
                        ev['id'] = f"{r['id']}:{dk}:{ev['id']}"
                        for side, text, ids, txts in (('de', de, de_ids, de_txts), ('en', en, en_ids, en_txts)):
                            s = ev.get(side)
                            if s and text[s['start']:s['end']] != s['text']:
                                g['unlocated_evidence'].append({'dimension': dk, 'side': side, 'text': s['text'], 'evidence_id': ev['id']})
                                ev[side] = None
                                ev['unlocated'] = True
                            elif s:
                                s['anchor'] = anchor(s, ids, txts)
                g['analysis'] = {'status': 'automated_provisional', 'method': A.METHOD, 'dimensions': dims,
                                 'direct_semantic_score': sem_score}
            else:
                g['analysis'] = {
                    'status': 'blocked_alignment_review' if en and de else 'not_applicable_unmatched',
                    'method': None, 'dimensions': {}, 'direct_semantic_score': None,
                    'note': ('Scores withheld until the alignment is verified by an expert.' if en and de
                             else 'Unmatched passage: no counterpart in the other language (possible omission/addition).'),
                }
            unlocated_total += len(g['unlocated_evidence'])
            groups.append(g)

    out = {
        'project_id': 'heidi',
        'schema': 'heidi-derived-analysis-v2',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'alignment_source': {
            'file': 'heidi_part1_side_by_side.json',
            'title': src['meta']['title'],
            'counts_declared': src['meta']['counts'],
            'counts_found': {'alignment_groups': len(groups)},
            'verified_chapters': src['meta']['verified_chapters'],
            'translator_note': ('The source file names the translator as "Helen B. Dole (1915)"; Project Gutenberg eBook #20781 '
                                'and its title page credit Elisabeth P. Stork. The text matches the Stork edition, so the app labels it as Stork.'),
        },
        'display_joiner': JOIN,
        'status_mapping': {**STATUS_MAP, 'unmatched/empty side': 'unmatched_en | unmatched_de'},
        'analysis_method': A.METHOD + ' — provisional automated heuristics (dictionary coverage, emotion/imagery/culture lexicons); '
                           'scored only for verified or automatic high-confidence groups; not expert-validated.',
        'rtt': 'Not included. Generated at runtime (German → AI English, compared with Stork\'s English).',
        'totals': dict(totals),
        'unlocated_evidence_total': unlocated_total,
        'groups': groups,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('groups', len(groups), dict(totals), 'unlocated', unlocated_total, 'bytes', os.path.getsize(OUT))
    nopage = sum(1 for g in groups if g['en_paragraph_ids'] and not g['alignment']['source_pages_en'])
    print('groups without EN page refs:', nopage)


if __name__ == '__main__':
    main()
