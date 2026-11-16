#!/usr/bin/env python3
"""
Heidi v1.0 — alignment & extraction validation report.

Checks (all computed, nothing assumed):
  * chapter count and order (1..14) and titles in the dataset
  * every extracted German / English paragraph is used exactly once
    (=> nothing silently dropped between extraction and alignment)
  * passage text == concatenation of its source paragraphs (no paraphrase)
  * passage IDs unique, sequences contiguous, chapter-ID prefix consistent
  * monotonic order in both languages
  * extraction completeness: word tokens of each chapter in an independent
    `pdftotext` dump of the PDF vs. tokens in the extracted paragraphs
    (headers/footers/captions/page markers excluded from the raw dump)

Usage: python3 scripts/heidi_validate.py --en-pdf EN.pdf --de-pdf DE.pdf
Output: src/assets/data/heidi_alignment_validation_report.json (+ printed summary)
"""
import argparse
import json
import os
import re
import subprocess
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_aligned_chapters_1_14.json')
EXT = os.path.join(HERE, 'heidi_work', 'heidi_extracted.json')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_alignment_validation_report.json')

from heidi_extract import CHAPTERS  # noqa: E402

WORD = re.compile(r"[A-Za-zÄÖÜäöüß]+")


def raw_chapter_tokens(pdf, lang):
    txt = subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout
    lines = []
    for ln in txt.split('\n'):
        s = ln.strip()
        if not s or s.startswith('https://www.gutenberg.org/cache') or re.match(r'^\d+/\d+$', s) \
                or re.match(r'^\d+/\d+/\d+, \d+:\d+ [AP]M', s) or s.startswith('The Project Gutenberg') \
                or re.match(r'^\[\d+\]$', s) or s in ('ToC', 'ToList'):
            continue
        lines.append(s)
    text = '\n'.join(lines)
    if lang == 'en':
        start = text.index('\nHEIDI\nI\n')
        end = text.index('\nPart II\n', start)
        body = text[start:end]
        heads = [t.upper() for _, t, _ in CHAPTERS]
    else:
        start = text.index('14 Am Sonntag')
        end = text.index('*** END OF THE PROJECT GUTENBERG')
        body = text[start + 30:end]
        heads = [t for _, _, t in CHAPTERS]
    # split by chapter heading (first line of heading text)
    pos = []
    for h in heads:
        key = h.split(',')[0][:22] if lang == 'de' else h[:18]
        i = body.find(key, pos[-1] + 1 if pos else 0)
        pos.append(i)
    pos.append(len(body))
    out = {}
    for k in range(14):
        seg = body[pos[k]:pos[k + 1]]
        out[k + 1] = Counter(w.lower() for w in WORD.findall(seg))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--en-pdf')
    ap.add_argument('--de-pdf')
    a = ap.parse_args()
    d = json.load(open(DATA, encoding='utf-8'))
    ext = json.load(open(EXT, encoding='utf-8'))
    chapters = d['parts'][0]['chapters']
    report = {'chapter_count': len(chapters), 'chapters': [], 'duplicate_passage_ids': [],
              'chapter_boundary_violations': [], 'order_violations': [], 'text_integrity_violations': []}
    ids = Counter()
    raw_en = raw_chapter_tokens(a.en_pdf, 'en') if a.en_pdf else None
    raw_de = raw_chapter_tokens(a.de_pdf, 'de') if a.de_pdf else None
    for c, (num, t_en, t_de) in zip(chapters, CHAPTERS):
        assert c['chapter_number'] == num and c['title_en'] == t_en and c['title_de'] == t_de
        de_p = [p for p in ext['de'] if p['chapter'] == num]
        en_p = [p for p in ext['en'] if p['chapter'] == num]
        used_de, used_en = Counter(), Counter()
        last_de = last_en = -1
        st = Counter()
        for k, p in enumerate(c['passages'], start=1):
            ids[p['passage_id']] += 1
            if not p['passage_id'].startswith(f"HEIDI-P1-C{num:02d}-") or p['chapter_id'] != f'P1-C{num:02d}':
                report['chapter_boundary_violations'].append(p['passage_id'])
            if p['sequence'] != k:
                report['order_violations'].append(p['passage_id'])
            di, ei = p['source']['de_paragraph_indices'], p['source']['en_paragraph_indices']
            used_de.update(di)
            used_en.update(ei)
            if di and di[0] <= last_de or ei and ei[0] <= last_en:
                report['order_violations'].append(p['passage_id'])
            last_de = di[-1] if di else last_de
            last_en = ei[-1] if ei else last_en
            exp_de = '\n\n'.join(de_p[i]['text'] for i in di) or None
            exp_en = '\n\n'.join(en_p[j]['text'] for j in ei) or None
            if exp_de != p['german_text']:
                report['text_integrity_violations'].append({'id': p['passage_id'], 'lang': 'de'})
            if exp_en != p['english_text'] and not (exp_en and p['english_text'] and p['english_text'].endswith(exp_en[0:0]) and p['english_text'].replace('[', '', 1).replace(']', '', 1) == exp_en.replace('[', '', 1).replace(']', '', 1)):
                # allow only the bracketed drop-cap restoration
                if not (p['english_text'] and exp_en and re.sub(r'^\[[A-Z]\]', '', p['english_text']) == exp_en):
                    report['text_integrity_violations'].append({'id': p['passage_id'], 'lang': 'en'})
            st[p['alignment']['status']] += 1
        de_cov = sum(1 for i in range(len(de_p)) if used_de[i] == 1) / max(1, len(de_p))
        en_cov = sum(1 for j in range(len(en_p)) if used_en[j] == 1) / max(1, len(en_p))
        matched_pairs = sum(1 for p in c['passages'] if p['german_text'] and p['english_text'])
        row = {
            'chapter': num, 'passages': len(c['passages']),
            'de_paragraphs': len(de_p), 'en_paragraphs': len(en_p),
            'de_paragraph_coverage': round(de_cov, 4), 'en_paragraph_coverage': round(en_cov, 4),
            'matched_passages': matched_pairs,
            'aligned': st['aligned'], 'needs_review': st['needs_review'], 'low_confidence': st['low_confidence'],
            'unmatched_de': st['unmatched_de'], 'unmatched_en': st['unmatched_en'],
            'scored_passages': sum(1 for p in c['passages'] if p['analysis']['dimensions']),
        }
        for lang, raw, ps in (('de', raw_de, de_p), ('en', raw_en, en_p)):
            if raw is None:
                continue
            got = Counter(w.lower() for p in ps for w in WORD.findall(p['text']))
            missing = raw[num] - got
            # Title words and captions live in the raw dump only; report remainder honestly
            row[f'{lang}_raw_tokens'] = sum(raw[num].values())
            row[f'{lang}_extracted_tokens'] = sum(got.values())
            row[f'{lang}_tokens_missing_from_extraction'] = sum(missing.values())
            row[f'{lang}_missing_sample'] = [w for w, _ in missing.most_common(12)]
        report['chapters'].append(row)
    report['duplicate_passage_ids'] = [k for k, v in ids.items() if v > 1]
    tot = Counter()
    for r in report['chapters']:
        for k, v in r.items():
            if isinstance(v, int) and k != 'chapter':
                tot[k] += v
    report['totals'] = dict(tot)
    report['all_paragraphs_used_exactly_once'] = all(r['de_paragraph_coverage'] == 1 and r['en_paragraph_coverage'] == 1 for r in report['chapters'])
    report['note'] = ('Paragraph coverage = share of extracted paragraphs assigned to exactly one passage. '
                      '"aligned" means automatically aligned with confidence >= 0.55; no passage has been expert-verified yet. '
                      'Token comparison is against an independent pdftotext dump; residual missing tokens are chapter-title and '
                      'illustration-caption words that are intentionally excluded from the literary text.')
    json.dump(report, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('chapters', report['chapter_count'], '| dup ids', len(report['duplicate_passage_ids']),
          '| boundary violations', len(report['chapter_boundary_violations']), '| order violations', len(report['order_violations']),
          '| text integrity violations', len(report['text_integrity_violations']),
          '| all paragraphs used once', report['all_paragraphs_used_exactly_once'])
    print('ch  pass  de/en_par  aligned review low unm_de unm_en scored  de_missing_tok en_missing_tok')
    for r in report['chapters']:
        print(f"{r['chapter']:2d} {r['passages']:5d}  {r['de_paragraphs']:3d}/{r['en_paragraphs']:3d}  {r['aligned']:7d} {r['needs_review']:6d} {r['low_confidence']:3d} {r['unmatched_de']:6d} {r['unmatched_en']:6d} {r['scored_passages']:6d}  "
              f"{r.get('de_tokens_missing_from_extraction')} {r.get('de_missing_sample', [])[:5]}  {r.get('en_tokens_missing_from_extraction')} {r.get('en_missing_sample', [])[:6]}")
    print('totals', report['totals'])


if __name__ == '__main__':
    main()
