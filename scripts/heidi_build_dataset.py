#!/usr/bin/env python3
"""
Heidi Translation Analysis v1.0 — dataset builder + automated heuristic analysis
================================================================================

Input : scripts/heidi_work/heidi_extracted.json, scripts/heidi_work/heidi_alignment.json
Output: src/assets/data/heidi_aligned_chapters_1_14.json

Every passage carries the *extracted* source text only (never paraphrase).
Literary dimension scores are produced ONLY for passages whose alignment status
is `aligned` (automatic, not yet expert-verified). They are labelled

    method = "automated_heuristic_v1"    (provisional: true)

and are never presented as expert or model-assisted assessments. Passages with
`needs_review`, `low_confidence` or unmatched alignment get
analysis.status = "blocked_alignment_review" and no scores.

Heuristic definitions (all scores 0–100, higher = better preservation):

semantic        Bidirectional dictionary coverage (Ding de-en) of content words,
                mapped linearly: coverage 0.10 -> 0, 0.60 -> 100 (clamped).
emotion         Emotion-lexicon profile (joy, sadness, fear, anger, affection,
                surprise) + exclamation density, DE vs EN; 100 x (1 - normalised
                L1 distance). not_applicable when neither side has any signal.
imagery         Share of German nature/imagery terms whose English equivalent
                appears in the translation. not_applicable when none present.
tone            Agreement of exclamation/question counts, diminutive rendering
                (-chen/-lein/-li vs "little"/"small"/"dear") and formal address.
voice           Direct-speech structure (quotation count), attributed speaker
                identity, sentence-count ratio.
cultural        Swiss-Alpine / period culture terms classified retained /
                adapted / omitted; 100 x (retained + 0.75 adapted)/found.
                not_applicable when none present.
omissions       Sentence-level: German sentences with (almost) no dictionary
                support in the English text => possible omissions; English
                sentences with none in the German => possible additions.
                100 x (1 - unsupported content-word share).
wordplay        Not assessed automatically (no reliable detector); status
                "not_assessed" with null score — never 0.
"""
import hashlib
import json
import math
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from heidi_lexicon import Bilex, de_content, en_content, en_stem, de_stem  # noqa: E402
from heidi_align import detect_speaker, passage_type, SPEAKERS  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'heidi_work')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_aligned_chapters_1_14.json')

from heidi_extract import CHAPTERS  # noqa: E402

SPEAKER_LABEL = {c: l for c, l, _, _ in SPEAKERS}
METHOD = 'automated_heuristic_v1'

# ------------------------------------------------------------------ lexicons
EMO_DE = {
    'joy': r'freu|fröhlich|glücklich|jubel|jauchz|lach|gelach|vergnüg|selig|herrlich|wonne|lustig|munter|heiter',
    'sadness': r'traurig|weint|weinen|weinte|geweint|tränen|kummer|jammer|elend|betrübt|schluchz|heimweh|leid\b|leiden|klag|seufz',
    'fear': r'angst|furcht|fürcht|erschr|schreck|zitter|grau|gespenst|bang',
    'anger': r'zorn|zornig|böse|ärger|wütend|wut\b|grimm|unwill|schelt|entrüst|empör',
    'affection': r'lieb|zärtlich|herzlich|freundlich|streichel|umarm|küss',
    'surprise': r'staun|erstaun|verwunder|überrasch|verblüff',
}
EMO_EN = {
    'joy': r'joy|happ|glad|merr|delight|laugh|pleased|pleasure|jubil|cheer|bliss|rejoic',
    'sadness': r'sad|weep|wept|tears|sorrow|grief|miser|sob|sigh|homesick|unhapp|lament|mourn',
    'fear': r'fear|afraid|fright|terrif|tremb|ghost|dread|scare|alarm',
    'anger': r'anger|angr|wrath|furious|rage|cross\b|indignan|scold|annoy|vex',
    'affection': r'lov|dear\b|tender|kindly|caress|embrac|kiss|fond',
    'surprise': r'astonish|amaz|surpris|wonder|marvel',
}
# imagery: german regex -> english regex
IMAGERY = [
    (r'sonne|sonnig', r'sun'), (r'himmel', r'sky|heaven'), (r'berg|gebirg|höhen', r'mountain|height|peak|hill|alp'),
    (r'schnee', r'snow'), (r'blume|blüm', r'flower|blossom'), (r'tanne', r'fir'), (r'wind|sturm', r'wind|storm|gale'),
    (r'feuer|flamm|glut|glüh', r'fire|flame|glow|blaz'), (r'gold', r'gold'), (r'rosen|rosig', r'rose|rosy|pink'),
    (r'abendrot|abendschein|abendschimmer', r'evening|sunset|glow'), (r'stern', r'star'), (r'wiese|weide', r'meadow|pasture|grass'),
    (r'fels', r'rock|crag|cliff'), (r'tal\b|täler', r'valley'), (r'wolke', r'cloud'), (r'vogel|vögel|raubvogel', r'bird|eagle|hawk'),
    (r'baum|bäume', r'tree'), (r'gras', r'grass'), (r'mond', r'moon'), (r'licht|leucht|schimmer|glanz|glänz', r'light|shin|gleam|sparkl|glitter|bright'),
    (r'enzian', r'gentian'), (r'primel|schlüsselblum', r'primrose|cowslip'), (r'rauschen|rausch', r'rustl|roar|murmur'),
]
CULTURE = [
    # german regex, retained regex, adapted regex, label
    (r'\bAlm\b|Alm-|Almhütte|Alpe?n?\b', r'\bAlm\b|Alm-', r'\bAlps?\b|mountain|pasture', 'Alm (Alpine pasture)'),
    (r'Öhi', r'Öhi', r'Uncle', 'Öhi (Swiss "uncle")'),
    (r'Dörfli', r'Dörfli', r'village|hamlet', 'Dörfli (dialect diminutive "little village")'),
    (r'Geiß|Geißen|Geißenpeter|Geißbub', r'Geiß', r'goat', 'Geiß (dialect "goat")'),
    (r'Maienfeld', r'Maienfeld', r'Mayenfeld', 'Maienfeld (place name)'),
    (r'Domleschg', r'Domleschg', r'Domleschg', 'Domleschg (valley)'),
    (r'Pfäfers|Ragaz', r'Pfäfers|Ragaz', r'Pfaffers|baths', 'Ragaz / Pfäfers (spa)'),
    (r'Sennhütte|Senn\b|Senne', r'Senn', r'herdsman|dairy|cheese', 'Senn (Alpine dairyman)'),
    (r'Käse', r'Käse', r'cheese', 'Käse (Alpine cheese)'),
    (r'Heuboden|Heu\b', r'Heu', r'hay|loft', 'Heuboden (hayloft)'),
    (r'Fräulein', r'Fräulein', r'Miss|lady|governess', 'Fräulein (form of address)'),
    (r'Kandidat', r'Kandidat', r'tutor|candidate', 'Herr Kandidat (theology candidate / tutor)'),
    (r'Batzen|Rappen|Gulden|Taler|Franken|Kreuzer', r'Batzen|Rappen|Gulden|Taler|Franken', r'penn|coin|money|cent|dollar', 'Swiss coinage'),
    (r'Base\b', r'Base\b', r'aunt|cousin|Deta', 'Base (dialect "aunt")'),
    (r'Pfarrer', r'Pfarrer', r'pastor|minister|clergyman|parson', 'Pfarrer (village pastor)'),
    (r'Kirche|Glocke|Geläut|läut', r'Kirche|Glocke', r'church|bell', 'Church bells / Sunday'),
    (r'Gebet|beten|betet|Lieder?buch|Gesangbuch', r'Gebet', r'pray|hymn|song|book', 'Prayer / hymn book'),
    (r'Herrschaft', r'Herrschaft', r'master|famil|people|employer', 'Herrschaft (employers)'),
    (r'Abc', r'ABC|Abc', r'alphabet|letters|ABC', 'Abc (spelling book)'),
]
DIMINUTIVE_RE = re.compile(r'\b[A-ZÄÖÜ][a-zäöüß]{2,}(?:chen|lein|li)\b')
DIM_EN_RE = re.compile(r'\b(?:little|small|tiny|wee|dear)\b', re.I)
FORMAL_RE = re.compile(r'(?<=[a-zäöüß,] )(?:Sie|Ihnen|Ihr|Ihre)\b')
SENT_SPLIT = re.compile(r'(?<=[.!?;:])["\']?\s+(?=["\'„]?[A-ZÄÖÜ])')


def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))


def spans(text, rx, flags=re.I, limit=6):
    out = []
    for m in re.finditer(rx, text, flags):
        # expand to word boundaries
        s, e = m.start(), m.end()
        while s > 0 and text[s - 1].isalpha():
            s -= 1
        while e < len(text) and (text[e].isalpha() or text[e] == '-'):
            e += 1
        out.append({'start': s, 'end': e, 'text': text[s:e]})
        if len(out) >= limit:
            break
    return out


def find_word(text, word):
    m = re.search(r'\b' + re.escape(word) + r'\b', text, re.I)
    if not m:
        m = re.search(re.escape(word), text, re.I)
    return {'start': m.start(), 'end': m.end(), 'text': text[m.start():m.end()]} if m else None


def dim(score, explanation, de_sp, en_sp, conf, status='scored', evidence=None):
    return {
        'status': status,
        'score': None if score is None else int(round(score)),
        'explanation': explanation,
        'evidence_de': de_sp,
        'evidence_en': en_sp,
        'phrase_evidence': evidence or [],
        'method': METHOD,
        'provisional': True,
        'confidence': conf,
        'review_status': 'unreviewed',
    }


def na(explanation, status='not_applicable'):
    d = dim(None, explanation, [], [], None, status=status)
    return d


# ------------------------------------------------------------------ analysers
def a_semantic(bilex, de, en):
    dc, ec, pairs = bilex.coverage(de, en)
    cov = (dc + ec) / 2
    score = clamp((cov - 0.10) / 0.50 * 100)
    ev = []
    seen = set()
    for dw, ew in pairs:
        if dw in seen:
            continue
        seen.add(dw)
        ds, es = find_word(de, dw), find_word(en, ew)
        if ds and es:
            ev.append({'id': f'sem-{len(ev)+1}', 'de': ds, 'en': es, 'kind': 'lexical_correspondence',
                       'explanation': f'Dictionary correspondence: "{ds["text"]}" ↔ "{es["text"]}"', 'confidence': 'medium'})
        if len(ev) >= 8:
            break
    conf = 'medium' if len(de_content(de)) >= 12 else 'low'
    return dim(score, f'Dictionary coverage: {dc:.0%} of German content words and {ec:.0%} of English content words have a lexical counterpart.',
               [e['de'] for e in ev], [e['en'] for e in ev], conf, evidence=ev), round(score)


def emo_profile(text, lex):
    prof = Counter()
    sp = []
    for cat, rx in lex.items():
        found = spans(text, r'\b(?:' + rx + r')\w*', limit=10)
        prof[cat] += len(found)
        sp.extend({**s, 'category': cat} for s in found)
    return prof, sp


def a_emotion(de, en):
    pd, sd = emo_profile(de, EMO_DE)
    pe, se = emo_profile(en, EMO_EN)
    exd, exe = de.count('!'), en.count('!')
    if sum(pd.values()) + sum(pe.values()) + exd + exe < 2:
        return na('Insufficient emotional signal (fewer than two emotion-lexicon terms / exclamations across both texts).')
    cats = set(pd) | set(pe)
    td, te = max(1, sum(pd.values())), max(1, sum(pe.values()))
    l1 = sum(abs(pd[c] / td - pe[c] / te) for c in cats) / 2 if (sum(pd.values()) and sum(pe.values())) else 1.0
    intensity = 1 - abs(exd - exe) / max(1, exd + exe)
    presence = 1.0 if (sum(pd.values()) > 0) == (sum(pe.values()) > 0) else 0.0
    score = 100 * (0.5 * (1 - l1) + 0.25 * intensity + 0.25 * presence)
    shifts = [c for c in cats if (pd[c] > 0) != (pe[c] > 0)]
    expl = (f'German emotion profile {dict(pd)} vs English {dict(pe)}; exclamations {exd} vs {exe}.'
            + (f' Category shift: {", ".join(shifts)}.' if shifts else ''))
    conf = 'medium' if (sum(pd.values()) + sum(pe.values())) >= 3 else 'low'
    d = dim(score, expl, sd[:6], se[:6], conf)
    d['shift_categories'] = shifts
    return d


def a_imagery(de, en):
    found, kept, ev = 0, 0, []
    for drx, erx in IMAGERY:
        ds = spans(de, r'\b(?:' + drx + r')\w*', limit=1)
        if not ds:
            continue
        found += 1
        es = spans(en, r'\b(?:' + erx + r')\w*', limit=1)
        if es:
            kept += 1
        ev.append({'id': f'img-{len(ev)+1}', 'de': ds[0], 'en': es[0] if es else None,
                   'kind': 'imagery_preserved' if es else 'imagery_not_rendered',
                   'explanation': (f'Image "{ds[0]["text"]}" rendered as "{es[0]["text"]}"' if es
                                   else f'Image "{ds[0]["text"]}" has no detected English counterpart'),
                   'confidence': 'low'})
    if not found:
        return na('No nature/imagery terms from the imagery lexicon in the German passage.')
    score = 100 * kept / found
    return dim(score, f'{kept} of {found} German imagery terms have an English counterpart.',
               [e['de'] for e in ev], [e['en'] for e in ev if e['en']], 'medium' if found >= 3 else 'low', evidence=ev)


def a_tone(de, en):
    exd, exe = de.count('!'), en.count('!')
    qd, qe = de.count('?'), en.count('?')
    dims_de = [m for m in DIMINUTIVE_RE.finditer(de) if not m.group(0).startswith(('Mädchen',))]
    dims_en = list(DIM_EN_RE.finditer(en))
    formal_de = list(FORMAL_RE.finditer(de))
    parts = [1 - abs(exd - exe) / max(1, exd + exe), 1 - abs(qd - qe) / max(1, qd + qe)]
    notes = [f'exclamations {exd}/{exe}', f'questions {qd}/{qe}']
    if dims_de:
        parts.append(min(1.0, len(dims_en) / len(dims_de)))
        notes.append(f'diminutives {len(dims_de)} → "little"-type markers {len(dims_en)}')
    score = 100 * sum(parts) / len(parts)
    de_sp = [{'start': m.start(), 'end': m.end(), 'text': m.group(0)} for m in dims_de[:4]] + \
            [{'start': m.start(), 'end': m.end(), 'text': m.group(0)} for m in formal_de[:2]]
    en_sp = [{'start': m.start(), 'end': m.end(), 'text': m.group(0)} for m in dims_en[:4]]
    if formal_de:
        notes.append(f'formal address (Sie/Ihnen) ×{len(formal_de)} — English has no T/V distinction')
    return dim(score, 'German/English: ' + '; '.join(notes) + '.', de_sp, en_sp, 'low')


def a_voice(de, en, spk_de, spk_en):
    qd = de.count('"') + de.count('„')
    qe = en.count('"')
    parts = [1 - abs(qd - qe) / max(1, qd + qe)]
    notes = [f'quotation marks {qd}/{qe}']
    if spk_de and spk_en:
        # compare attribution only when BOTH texts name the speaker explicitly
        parts.append(1.0 if spk_de == spk_en else 0.0)
        notes.append(f'speaker {SPEAKER_LABEL.get(spk_de)} / {SPEAKER_LABEL.get(spk_en)}')
    elif spk_de or spk_en:
        notes.append(f'speaker named only in {"German" if spk_de else "English"} ({SPEAKER_LABEL.get(spk_de or spk_en)})')
    sd = len(SENT_SPLIT.split(de.strip()))
    se = len(SENT_SPLIT.split(en.strip()))
    parts.append(min(sd, se) / max(sd, se))
    notes.append(f'sentences {sd}/{se}')
    score = 100 * sum(parts) / len(parts)
    de_sp = spans(de, r'"[^"]{1,80}"', flags=0, limit=3)
    en_sp = spans(en, r'"[^"]{1,80}"', flags=0, limit=3)
    return dim(score, 'German/English: ' + '; '.join(notes) + '.', de_sp, en_sp, 'low')


def a_cultural(de, en):
    found, value, ev = 0, 0.0, []
    for drx, keep_rx, adapt_rx, label in CULTURE:
        ds = spans(de, drx, flags=0, limit=1)
        if not ds:
            continue
        found += 1
        ks = spans(en, keep_rx, flags=0, limit=1)
        as_ = spans(en, adapt_rx, flags=re.I, limit=1)
        if ks:
            kind, val, es = 'retained', 1.0, ks[0]
        elif as_:
            kind, val, es = 'adapted', 0.75, as_[0]
        else:
            kind, val, es = 'omitted', 0.0, None
        value += val
        ev.append({'id': f'cul-{len(ev)+1}', 'de': ds[0], 'en': es, 'kind': f'cultural_{kind}', 'label': label,
                   'explanation': f'{label}: {kind}' + (f' as "{es["text"]}"' if es else ' (no English counterpart detected)'),
                   'confidence': 'low' if kind == 'omitted' else 'medium'})
    if not found:
        return na('No Swiss-Alpine / period culture terms from the culture lexicon in the German passage.')
    score = 100 * value / found
    kinds = Counter(e['kind'].split('_')[1] for e in ev)
    return dim(score, f'{found} culture-specific term(s): ' + ', '.join(f'{v} {k}' for k, v in kinds.items()) + '.',
               [e['de'] for e in ev], [e['en'] for e in ev if e['en']], 'medium', evidence=ev)


def sentences_with_offsets(text):
    out, pos = [], 0
    for s in SENT_SPLIT.split(text):
        i = text.find(s, pos)
        out.append((i, i + len(s), s))
        pos = i + len(s)
    return out


def a_omissions(bilex, de, en, ratio_ch):
    om, ad, ev = [], [], []
    unsupported, total = 0, 0
    for s, e, sent in sentences_with_offsets(de):
        cw = de_content(sent)
        total += len(cw)
        if len(cw) < 5:
            continue
        dc, _, _ = bilex.coverage(sent, en)
        if dc < 0.12:
            unsupported += len(cw)
            om.append({'start': s, 'end': e, 'text': sent})
    tot_en, uns_en = 0, 0
    for s, e, sent in sentences_with_offsets(en):
        cw = en_content(sent)
        tot_en += len(cw)
        if len(cw) < 5:
            continue
        _, ec, _ = bilex.coverage(de, sent)
        if ec < 0.12:
            uns_en += len(cw)
            ad.append({'start': s, 'end': e, 'text': sent})
    share = (unsupported + uns_en) / max(1, total + tot_en)
    ratio = (len(en) / max(1, len(de))) / ratio_ch
    score = 100 * (1 - share) * (0.7 + 0.3 * math.exp(-(math.log(ratio) ** 2) / (2 * 0.5 ** 2)))
    for o in om[:4]:
        ev.append({'id': f'om-{len(ev)+1}', 'de': o, 'en': None, 'kind': 'possible_omission',
                   'explanation': 'German sentence with almost no dictionary support in the English passage (possible omission or free rendering).',
                   'confidence': 'low'})
    for a in ad[:4]:
        ev.append({'id': f'om-{len(ev)+1}', 'de': None, 'en': a, 'kind': 'possible_addition',
                   'explanation': 'English sentence with almost no dictionary support in the German passage (possible addition or free rendering).',
                   'confidence': 'low'})
    d = dim(score, f'{len(om)} possible omission(s), {len(ad)} possible addition(s); length ratio {ratio:.2f}× the chapter norm.',
            om[:4], ad[:4], 'low', evidence=ev)
    d['possible_omissions'] = len(om)
    d['possible_additions'] = len(ad)
    d['length_ratio_vs_chapter'] = round(ratio, 3)
    return d


# ------------------------------------------------------------------ build
def main():
    ext = json.load(open(os.path.join(WORK, 'heidi_extracted.json'), encoding='utf-8'))
    al = json.load(open(os.path.join(WORK, 'heidi_alignment.json'), encoding='utf-8'))
    bilex = Bilex()
    DROPCAP = {1: 'T', 2: 'A', 3: 'H', 4: 'N', 5: 'T', 6: 'I', 7: 'W', 8: 'A', 9: 'A', 10: 'T', 11: 'T', 12: 'F', 13: 'M', 14: 'H'}
    editorial = []

    chapters = []
    totals = Counter()
    for (num, t_en, t_de), cal in zip(CHAPTERS, al['chapters']):
        assert cal['chapter'] == num
        de_p = [p for p in ext['de'] if p['chapter'] == num]
        en_p = [p for p in ext['en'] if p['chapter'] == num]
        # restore drop-cap initials (editorial, bracketed)
        for p in en_p:
            if p.get('dropcap_missing'):
                p['text'] = f'[{DROPCAP[num]}]' + p['text']
                editorial.append({'chapter': num, 'type': 'dropcap_restored',
                                  'note': f'Chapter-initial letter "{DROPCAP[num]}" is an image in the PG print-out; restored in square brackets.'})
        # source offsets within the chapter's canonical text (paragraphs joined by "\n\n")
        def offsets(ps):
            o, pos = [], 0
            for p in ps:
                o.append((pos, pos + len(p['text'])))
                pos += len(p['text']) + 2
            return o
        off_de, off_en = offsets(de_p), offsets(en_p)
        passages = []
        for seq, b in enumerate(cal['beads'], start=1):
            pid = f'HEIDI-P1-C{num:02d}-P{seq:04d}'
            de_txt = '\n\n'.join(de_p[i]['text'] for i in b['de_idx']) or None
            en_txt = '\n\n'.join(en_p[j]['text'] for j in b['en_idx']) or None
            ptype = passage_type(de_txt or en_txt)
            if de_txt and en_txt:
                t_en_type = passage_type(en_txt)
                if ptype != t_en_type:
                    ptype = 'mixed' if 'narration' in (ptype, t_en_type) else ptype
            spk_de = detect_speaker(de_txt, 'de') if de_txt and ptype != 'narration' else None
            spk_en = detect_speaker(en_txt, 'en') if en_txt and ptype != 'narration' else None
            speaker = spk_de if spk_de and (spk_de == spk_en or not spk_en) else (spk_en if not spk_de else None)
            pages_de = sorted({pg for i in b['de_idx'] for pg in de_p[i]['pdf_pages']})
            pages_en = sorted({pg for j in b['en_idx'] for pg in en_p[j]['pdf_pages']})
            print_en = sorted({pg for j in b['en_idx'] for pg in en_p[j].get('print_pages', []) if pg})
            status = b['status']
            passage = {
                'passage_id': pid,
                'part_id': 'P1',
                'chapter_id': f'P1-C{num:02d}',
                'section_id': None,
                'sequence': seq,
                'passage_type': ptype,
                'speaker': speaker,
                'speaker_label': SPEAKER_LABEL.get(speaker) if speaker else None,
                'speaker_conflict': bool(spk_de and spk_en and spk_de != spk_en),
                'german_text': de_txt,
                'english_text': en_txt,
                'source': {
                    'de_paragraph_indices': b['de_idx'],
                    'en_paragraph_indices': b['en_idx'],
                    'de_offsets': [list(off_de[i]) for i in b['de_idx']],
                    'en_offsets': [list(off_en[j]) for j in b['en_idx']],
                },
                'alignment': {
                    'status': status,
                    'bead': b['bead'],
                    'confidence': b['confidence'],
                    'components': b['components'],
                    'structurally_supported': b.get('structurally_supported', False),
                    'method': al['method'],
                    'source_pages_de': pages_de,
                    'source_pages_en': pages_en,
                    'print_pages_en': print_en,
                },
                'analysis': None,
                'round_trip_verification': {
                    'status': 'not_run', 'back_translated_german': None, 'translation_model': None,
                    'similarity_model': None, 'direct_semantic_score': None, 'rtt_semantic_score': None,
                    'disagreement': None, 'requires_expert_review': False, 'generated_at': None, 'input_hash': None,
                },
                'expert_review': {'status': 'pending'},
            }
            totals[status] += 1
            if status == 'aligned' and de_txt and en_txt:
                sem, sem_score = a_semantic(bilex, de_txt, en_txt)
                dims = {
                    'semantic': sem,
                    'emotion': a_emotion(de_txt, en_txt),
                    'imagery': a_imagery(de_txt, en_txt),
                    'tone': a_tone(de_txt, en_txt),
                    'voice': a_voice(de_txt, en_txt, spk_de, spk_en),
                    'cultural': a_cultural(de_txt, en_txt),
                    'omissions': a_omissions(bilex, de_txt, en_txt, cal['ratio_en_de_chars']),
                    'wordplay': na('Wordplay is not detected automatically; requires expert assessment.', status='not_assessed'),
                }
                passage['analysis'] = {'status': 'automated_provisional', 'method': METHOD, 'dimensions': dims}
                passage['round_trip_verification']['direct_semantic_score'] = sem_score
            else:
                passage['analysis'] = {
                    'status': 'blocked_alignment_review' if de_txt and en_txt else 'not_applicable_unmatched',
                    'method': None, 'dimensions': {},
                    'note': ('Scores withheld until the alignment is verified by an expert.' if de_txt and en_txt
                             else 'Unmatched passage: no counterpart detected in the other language (possible omission/addition).'),
                }
            passages.append(passage)
        chapters.append({
            'chapter_id': f'P1-C{num:02d}', 'chapter_number': num, 'title_en': t_en, 'title_de': t_de,
            'editorial_sections': None,
            'source_paragraphs': {'de': len(de_p), 'en': len(en_p)},
            'chapter_char_ratio_en_de': cal['ratio_en_de_chars'],
            'passages': passages,
        })

    data = {
        'project_id': 'heidi', 'version': '1.0',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'author': 'Johanna Spyri', 'original_language': 'de', 'translation_language': 'en',
        'translator': 'Elisabeth P. Stork',
        'sources': ext['sources'],
        'scope': {'part': 1, 'chapter_start': 1, 'chapter_end': 14},
        'methods': {
            'extraction': 'pdfplumber line-level extraction; body-font filter; first-line-indent paragraphing (scripts/heidi_extract.py)',
            'alignment': al['method'] + ' (scripts/heidi_align.py): Ding de-en lexical coverage + Gale–Church length + name/number/speech anchors; monotonic DP per chapter',
            'analysis': METHOD + ' (scripts/heidi_build_dataset.py) — provisional automated heuristics, computed only for automatically aligned pairs; not expert-validated',
            'rtt': 'English → German via MyMemory public NMT API (keyless) at runtime; German similarity = heidi-german-lexical-sim-v1 (see heidi-rtt.service.ts)',
        },
        'editorial_notes': editorial,
        'parts': [{'part_id': 'P1', 'title_en': "Heidi's Years of Learning and Travel",
                   'title_de': 'Heidis Lehr- und Wanderjahre', 'chapters': chapters}],
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('passages:', sum(len(c['passages']) for c in chapters), dict(totals), 'bytes:', os.path.getsize(OUT))


if __name__ == '__main__':
    main()
