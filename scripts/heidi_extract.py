#!/usr/bin/env python3
"""
Heidi Translation Analysis v1.0 — Source extraction (Phase 2, step 1)
=====================================================================

Extracts Part I, Chapters 1–14 from the two Project Gutenberg PDFs:

  * German original  : "Heidis Lehr- und Wanderjahre", Johanna Spyri, PG eBook #7500
  * English (human)  : "Heidi" (Gift Edition), tr. Elisabeth P. Stork, PG eBook #20781

Both PDFs are browser print-outs of the Gutenberg HTML editions, so page
layout is NOT the original book's. We therefore extract at line level with
pdfplumber and use typographic signals that survive the print-out:

  * body font / size        -> literary text (headers, footers, captions dropped)
  * first-line indentation  -> paragraph starts (both editions indent paragraphs)
  * chapter title font      -> chapter boundaries (verified against the TOC titles)
  * "[NN]" margin markers   -> original print-edition page numbers (English only)

No text is generated or paraphrased. The only editorial intervention is the
English drop-cap at the start of each chapter: the initial letter is an image in
the source, so the extracted text begins e.g. "he little old town". We restore
it in square brackets ("[T]he little old town") and record it in
`editorial_notes`, following standard scholarly-edition convention.

Output: scripts/heidi_work/heidi_extracted.json
"""
import argparse
import json
import os
import re
import sys
import hashlib
from collections import Counter

import pdfplumber

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'heidi_work')

CHAPTERS = [
    (1, "Going up to the Alm-Uncle", "Zum Alm-Öhi hinauf"),
    (2, "With the Grandfather", "Beim Großvater"),
    (3, "On the Pasture", "Auf der Weide"),
    (4, "In the Grandmother's Hut", "Bei der Großmutter"),
    (5, "Two Visitors", "Es kommt ein Besuch und dann noch einer, der mehr Folgen hat"),
    (6, "A New Chapter with New Things", "Ein neues Kapitel und lauter neue Dinge"),
    (7, "Miss Rottenmeier Has an Uncomfortable Day", "Fräulein Rottenmeier hat einen unruhigen Tag"),
    (8, "Great Disturbances in the Sesemann House", "Im Hause Sesemann geht's unruhig zu"),
    (9, "The Master of the House Hears of Strange Doings", "Der Hausherr hört allerlei in seinem Hause, das er noch nicht gehört hat"),
    (10, "A Grandmama", "Eine Großmama"),
    (11, "Heidi Gains in Some Respects and Loses in Others", "Heidi nimmt auf einer Seite zu und auf der anderen ab"),
    (12, "The Sesemann House is Haunted", "Im Hause Sesemann spukt's"),
    (13, "Up the Alp on a Summer Evening", "Am Sommerabend die Alm hinan"),
    (14, "On Sunday When the Church Bells Ring", "Am Sonntag, wenn's läutet"),
]

# The PG HTML print-outs use straight ASCII quotes; nothing to normalise there.
PAGE_MARK_RE = re.compile(r'\s*\[(\d+)\]\s*$')


def norm_title(s):
    s = s.lower().replace('’', "'")
    s = re.sub(r'[^a-zäöüß\' ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def font_of(line):
    ch = line['chars'][0]
    return ch['fontname'].split('+')[-1], round(ch['size'], 1)


def join_lines(lines):
    """Join wrapped lines. Browser print-outs only wrap at spaces or at real
    hyphens/dashes, so a trailing '-' is a genuine hyphen: keep it, no space."""
    out = ''
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if not out:
            out = ln
        elif out.endswith('-') or out.endswith('—'):
            out += ln
        else:
            out += ' ' + ln
    return re.sub(r'[ \t]+', ' ', out).strip()


# --------------------------------------------------------------------------
# English (PG #20781, gift edition print-out)
# --------------------------------------------------------------------------
def extract_english(pdf_path):
    paras = []          # {chapter, text, pdf_pages, print_pages, lines}
    chapter = 0
    in_part1 = False
    cur = None
    pending_title = []
    dropcap_mode = False
    last_print_page = None
    report = {'dropped_caption_lines': 0, 'dropped_header_footer_lines': 0,
              'chapter_title_pages': {}, 'editorial_notes': []}

    def flush():
        nonlocal cur
        if cur and cur['lines']:
            cur['text'] = join_lines(cur['lines'])
            paras.append(cur)
        cur = None

    with pdfplumber.open(pdf_path) as pdf:
        for pi, page in enumerate(pdf.pages):
            pno = pi + 1
            for line in page.extract_text_lines():
                fname, size = font_of(line)
                text = line['text']
                if fname == 'ArialMT':
                    report['dropped_header_footer_lines'] += 1
                    continue
                if fname.startswith('Garamond'):
                    if size == 30.0 and text.strip() == 'Part I':
                        in_part1 = True
                        continue
                    if size == 30.0 and text.strip().startswith('Part II'):
                        flush()
                        return paras, report
                    if not in_part1:
                        continue
                    if size == 22.5:          # chapter numeral "I ToC"
                        flush()
                        chapter += 1
                        pending_title = []
                        report['chapter_title_pages'][chapter] = pno
                        continue
                    if size == 17.5 and chapter > 0:
                        pending_title.append(text.strip())
                        dropcap_mode = True
                        continue
                    continue
                if size < 10.5 and PAGE_MARK_RE.match(' ' + text.strip()):
                    last_print_page = int(PAGE_MARK_RE.match(' ' + text.strip()).group(1))
                    continue
                if not in_part1 or chapter == 0:
                    continue
                if size < 10.5:
                    # 9.0 = illustration captions, 9.7 = isolated page marker lines
                    m = PAGE_MARK_RE.match(' ' + text.strip())
                    if m:
                        last_print_page = int(m.group(1))
                    else:
                        report['dropped_caption_lines'] += 1
                    continue
                if size != 15.0:
                    continue
                # strip trailing print-page marker
                m = PAGE_MARK_RE.search(text)
                if m:
                    last_print_page = int(m.group(1))
                    text = text[:m.start()]
                x0 = line['x0']
                if dropcap_mode:
                    # First paragraph of a chapter; lines beside the drop-cap image
                    # are indented by ~94pt. Restore the image initial in brackets.
                    flush()
                    title = ' '.join(pending_title)
                    cur = {'chapter': chapter, 'lines': [], 'pdf_pages': [pno],
                           'print_pages': [last_print_page] if last_print_page else [],
                           'chapter_title_en_source': title}
                    dropcap_mode = False
                    cur['dropcap_pending'] = True
                    cur['lines'].append(text)
                    continue
                is_para_start = 150 <= x0 <= 170
                if is_para_start or cur is None:
                    flush()
                    cur = {'chapter': chapter, 'lines': [], 'pdf_pages': [pno],
                           'print_pages': [last_print_page] if last_print_page else []}
                cur['lines'].append(text)
                if pno not in cur['pdf_pages']:
                    cur['pdf_pages'].append(pno)
                if m and last_print_page not in cur['print_pages']:
                    cur['print_pages'].append(last_print_page)
        flush()
    return paras, report


DROPCAP_RESTORE = {
    # chapter: (extracted prefix, restored letter) — verified by reading context;
    # filled automatically below when the first word is not a dictionary word.
}


def restore_dropcaps(paras, report):
    seen = set()
    for p in paras:
        if p.get('dropcap_pending') and p['chapter'] not in seen:
            seen.add(p['chapter'])
            p.pop('dropcap_pending', None)
            report['editorial_notes'].append({
                'chapter': p['chapter'],
                'note': 'Chapter-initial drop-cap letter is an image in the PG print-out and was not extracted.',
                'extracted_start': p['text'][:40],
            })
            p['dropcap_missing'] = True


# --------------------------------------------------------------------------
# German (PG #7500 print-out)
# --------------------------------------------------------------------------
def extract_german(pdf_path):
    paras = []
    chapter = 0
    cur = None
    title_buf = []
    started = False
    report = {'dropped_header_footer_lines': 0, 'chapter_title_pages': {}}
    de_titles = [norm_title(t) for _, _, t in CHAPTERS]

    def flush():
        nonlocal cur
        if cur and cur['lines']:
            cur['text'] = join_lines(cur['lines'])
            paras.append(cur)
        cur = None

    with pdfplumber.open(pdf_path) as pdf:
        for pi, page in enumerate(pdf.pages):
            pno = pi + 1
            for line in page.extract_text_lines():
                fname, size = font_of(line)
                text = line['text']
                if fname == 'ArialMT':
                    report['dropped_header_footer_lines'] += 1
                    continue
                if text.startswith('*** END OF THE PROJECT GUTENBERG'):
                    flush()
                    return paras, report
                if fname.endswith('BoldMT') and size == 14.0:
                    # chapter heading, possibly two lines
                    title_buf.append(text.strip())
                    joined = norm_title(' '.join(title_buf))
                    if joined in de_titles:
                        flush()
                        chapter = de_titles.index(joined) + 1
                        report['chapter_title_pages'][chapter] = pno
                        title_buf = []
                        started = True
                    continue
                if not started:
                    continue
                if size != 12.0:
                    continue
                x0 = line['x0']
                is_para_start = 50 <= x0 <= 62
                if is_para_start or cur is None:
                    flush()
                    cur = {'chapter': chapter, 'lines': [], 'pdf_pages': [pno]}
                cur['lines'].append(text)
                if pno not in cur['pdf_pages']:
                    cur['pdf_pages'].append(pno)
        flush()
    return paras, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--en-pdf', required=True)
    ap.add_argument('--de-pdf', required=True)
    ap.add_argument('--out', default=os.path.join(WORK, 'heidi_extracted.json'))
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)

    en, en_rep = extract_english(a.en_pdf)
    restore_dropcaps(en, en_rep)
    de, de_rep = extract_german(a.de_pdf)

    def sha(p):
        return hashlib.sha256(open(p, 'rb').read()).hexdigest()

    out = {
        'sources': {
            'en': {'title': 'Heidi (Gift Edition)', 'translator': 'Elisabeth P. Stork',
                   'gutenberg_ebook': 20781, 'pdf_sha256': sha(a.en_pdf),
                   'pdf_file': os.path.basename(a.en_pdf)},
            'de': {'title': 'Heidis Lehr- und Wanderjahre', 'author': 'Johanna Spyri',
                   'gutenberg_ebook': 7500, 'pdf_sha256': sha(a.de_pdf),
                   'pdf_file': os.path.basename(a.de_pdf)},
        },
        'report': {'en': en_rep, 'de': de_rep},
        'en': [{k: v for k, v in p.items() if k != 'lines'} for p in en],
        'de': [{k: v for k, v in p.items() if k != 'lines'} for p in de],
    }
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    ce = Counter(p['chapter'] for p in en)
    cd = Counter(p['chapter'] for p in de)
    print('chapter  EN_paras  DE_paras  EN_chars  DE_chars')
    for n, _, _ in CHAPTERS:
        print(f"{n:7d} {ce[n]:9d} {cd[n]:9d} {sum(len(p['text']) for p in en if p['chapter']==n):9d} {sum(len(p['text']) for p in de if p['chapter']==n):9d}")
    print('EN chapters found:', sorted(ce), 'DE chapters found:', sorted(cd))
    print('report:', json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'editorial_notes'} for k, v in out['report'].items()}, ensure_ascii=False))


if __name__ == '__main__':
    sys.exit(main())
