#!/usr/bin/env python3
"""
Heidi Translation Analysis v1.0 — bilingual passage alignment (Phase 2, step 2)
==============================================================================

Input : scripts/heidi_work/heidi_extracted.json   (from heidi_extract.py)
Output: scripts/heidi_work/heidi_alignment.json

Method (documented in the dataset as `alignment.method`):

  "monotonic-dp-lexical-length-anchor-v1"

  * Alignment is performed independently inside each chapter, so a passage can
    never be aligned across a chapter boundary.
  * Units are source paragraphs. A dynamic program finds the best *monotonic*
    sequence of "beads" (German paragraphs : English paragraphs) with types
    1:1, 1:2, 2:1, 1:3, 3:1, 2:2, 1:4, 4:1 and 1:0 / 0:1 (unmatched).
  * Bead similarity combines
      - lexical translation coverage (Ding de-en dictionary, Snowball stems,
        German compound fallback; bidirectional, hunalign-style)       w=0.60
      - Gale–Church style length agreement (log-ratio vs chapter mean) w=0.25
      - anchors: proper names, numbers, direct-speech & ?/! structure  w=0.15
  * No neural model is used (the HuggingFace hub is not reachable from the
    build environment); the method is therefore fully reproducible offline.

Confidence = bead similarity, plus a penalty when the bead is a large merge.
Status:
    aligned        confidence >= 0.55
    needs_review   0.35 <= confidence < 0.55, or a 2:2 / 1:4 / 4:1 bead
    low_confidence confidence < 0.35
    unmatched_de / unmatched_en  for 1:0 and 0:1 beads
"""
import json
import math
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from heidi_lexicon import Bilex, de_content, en_content, en_stem, NAME_EQUIV  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'heidi_work')

# (german paras, english paras, prior penalty). Penalties play the role of
# -log P(bead type) in Gale & Church (1993): 1:1 is strongly preferred and
# merges are chosen only when they explain the text clearly better.
BEADS = [(1, 1, 0.0), (1, 2, 0.22), (2, 1, 0.22), (1, 3, 0.42), (3, 1, 0.42),
         (2, 2, 0.60), (1, 4, 0.62), (4, 1, 0.62)]
SKIP_VALUE = -0.30
BAND = 18

# canonical name anchors: canonical id -> (german regex, english regex)
ANCHORS = {
    'heidi': (r'\bHeidi', r'\bHeidi'), 'dete': (r'\bDete\b', r'\bDeta\b'), 'peter': (r'Peter', r'\bPeter\b'),
    'barbel': (r'\bBarbel', r'\bBarbel'), 'uncle': (r'Öhi', r'\bUncle\b'), 'grandfather': (r'Großvater', r'[Gg]randfather'),
    'grandmother': (r'Großmutter', r'[Gg]randmother'), 'grandmama': (r'Großmama', r'[Gg]randmama'),
    'clara': (r'\bKlara|\bKlärchen', r'\bClara'), 'sesemann': (r'Sesemann', r'Sesemann'),
    'rottenmeier': (r'Rottenmeier', r'Rottenmeier'), 'sebastian': (r'Sebastian', r'Sebastian'),
    'tinette': (r'Tinette', r'Tinette'), 'johann': (r'\bJohann\b', r'\bJohn\b'), 'frankfurt': (r'Frankfurt', r'Frankfurt'),
    'doctor': (r'Doktor', r'[Dd]octor'), 'pastor': (r'Pfarrer', r'[Pp]astor'), 'tutor': (r'Kandidat', r'[Tt]utor'),
    'brigitte': (r'Brigitte', r'Brigida|Brigitte'), 'schwaenli': (r'Schwänli', r'Little Swan|Schwänli|Snowflake'),
    'baerli': (r'Bärli', r'Little Bear|Bärli'), 'maienfeld': (r'Maienfeld', r'Mayenfeld'), 'ragaz': (r'Ragaz', r'Ragaz'),
    'goats': (r'Geiß|Ziege', r'\bgoats?\b'), 'cat': (r'Katze|Kätzchen', r'\b(?:cats?|kittens?)\b'),
    'bread': (r'Brot|Brötchen', r'\b(?:bread|rolls?)\b'), 'cheese': (r'Käse', r'\bcheese'),
    'snow': (r'Schnee', r'\bsnow'), 'fire': (r'Feuer', r'\bfire'), 'bell': (r'Glocke|läut', r'\bbells?\b|\bring'),
}
NUM_DE = {'eins': 1, 'ein': None, 'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5, 'sechs': 6, 'sieben': 7, 'acht': 8,
          'neun': 9, 'zehn': 10, 'elf': 11, 'zwölf': 12, 'hundert': 100}
NUM_EN = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
          'ten': 10, 'eleven': 11, 'twelve': 12, 'hundred': 100}

# ---------------------------------------------------------------- speakers
SPEAKERS = [
    # canonical, label, german patterns, english patterns
    ('heidi', 'Heidi', [r'Heidi'], [r'Heidi']),
    ('dete', 'Dete / Deta', [r'Dete'], [r'Deta']),
    ('peter', 'Peter', [r'Peter', r'Geißenpeter'], [r'Peter']),
    ('grandfather', 'Grandfather (Alm-Uncle)', [r'Großvater', r'Öhi', r'Alte'], [r'grandfather', r'Uncle', r'old man']),
    ('grandmother', "Peter's grandmother", [r'Großmutter', r'Blinde'], [r'grandmother', r'blind']),
    ('brigitte', "Peter's mother (Brigitte)", [r'Brigitte', r'Mutter'], [r'Brigida', r'mother']),
    ('barbel', 'Barbel', [r'Barbel'], [r'Barbel']),
    ('clara', 'Clara', [r'Klara', r'Klärchen'], [r'Clara']),
    ('rottenmeier', 'Miss Rottenmeier', [r'Rottenmeier', r'Dame'], [r'Rottenmeier', r'lady']),
    ('sebastian', 'Sebastian', [r'Sebastian'], [r'Sebastian']),
    ('tinette', 'Tinette', [r'Tinette'], [r'Tinette']),
    ('sesemann', 'Mr. Sesemann', [r'Sesemann', r'Hausherr', r'Vater'], [r'Sesemann', r'father', r'master']),
    ('grandmama', 'Grandmama (Mrs. Sesemann)', [r'Großmama'], [r'grandmama']),
    ('doctor', 'The doctor', [r'Doktor'], [r'doctor']),
    ('tutor', 'The tutor', [r'Kandidat'], [r'tutor']),
    ('pastor', 'The pastor', [r'Pfarrer'], [r'pastor']),
    ('johann', 'Johann', [r'Johann'], [r'John']),
]
SPEECH_VERBS_DE = r'(?:fragte|sagte|rief|entgegnete|versicherte|erwiderte|meinte|antwortete|erklärte|schrie|bemerkte|fuhr|flüsterte|jammerte|begann|befahl|ermunterte|wiederholte|berichtete|seufzte|schluchzte|stotterte|murmelte|brummte|lachte|setzte)'
SPEECH_VERBS_EN = r'(?:said|asked|cried|replied|answered|called|exclaimed|shouted|whispered|continued|added|began|remarked|declared|assured|repeated|explained|retorted|sobbed|screamed|commanded|ordered|inquired|urged|demanded|murmured|laughed|stammered|sighed|returned)'


def detect_speaker(text, lang):
    """Return canonical speaker id for paragraphs starting with direct speech,
    only when a speech verb is attributed to a known character within the
    paragraph. Otherwise None (never guessed)."""
    verbs = SPEECH_VERBS_DE if lang == 'de' else SPEECH_VERBS_EN
    window = text[:400]
    for cid, _label, de_pats, en_pats in SPEAKERS:
        pats = de_pats if lang == 'de' else en_pats
        for p in pats:
            if lang == 'de':
                rx = rf'{verbs}\s+(?:jetzt\s+|nun\s+|da\s+|wieder\s+)?(?:die\s+|der\s+|das\s+)?(?:\w+\s+)?{p}'
            else:
                rx = rf'(?:{verbs}\s+(?:the\s+)?(?:\w+\s+)?{p}|{p}\w*\s+{verbs})'
            if re.search(rx, window):
                return cid
    return None


def passage_type(text):
    t = text.lstrip()
    has_quote = '"' in text or '„' in text or '“' in text
    if t.startswith('"') or t.startswith('„') or t.startswith('“') or t.startswith("'"):
        return 'dialogue'
    if has_quote:
        return 'mixed'
    return 'narration'


# ---------------------------------------------------------------- features
class Para:
    __slots__ = ('text', 'nchar', 'de_tr', 'en_stems', 'anchors', 'nums', 'q', 'ex', 'quotes', 'ncontent')

    def __init__(self, text, lang, bilex):
        self.text = text
        self.nchar = len(text)
        self.anchors = set()
        for k, (dp, ep) in ANCHORS.items():
            if re.search(dp if lang == 'de' else ep, text):
                self.anchors.add(k)
        toks = re.findall(r'\w+', text.lower())
        nm = NUM_DE if lang == 'de' else NUM_EN
        self.nums = {nm[t] for t in toks if nm.get(t)} | {int(x) for x in re.findall(r'\b\d+\b', text)}
        self.q = text.count('?')
        self.ex = text.count('!')
        self.quotes = text.count('"') + text.count('„') + text.count('“')
        if lang == 'de':
            cw = de_content(text)
            self.de_tr = [(w, bilex.translations(w) | {en_stem(w)} | ({w} if w[0].isalpha() else set())) for w in cw]
            self.ncontent = len(cw)
            self.en_stems = None
        else:
            cw = en_content(text)
            self.en_stems = [en_stem(w) for w in cw]
            self.ncontent = len(cw)
            self.de_tr = None


def lexical(de_ps, en_ps):
    en_set = set()
    for p in en_ps:
        en_set.update(p.en_stems)
    total_de = sum(p.ncontent for p in de_ps)
    total_en = sum(p.ncontent for p in en_ps)
    if not total_de or not total_en:
        return 0.0
    hit = 0
    used = set()
    for p in de_ps:
        for _w, tr in p.de_tr:
            inter = tr & en_set
            if inter:
                hit += 1
                used |= inter
    hit_en = sum(1 for p in en_ps for s in p.en_stems if s in used)
    a, b = hit / total_de, hit_en / total_en
    return (a + b) / 2


def length_score(de_ps, en_ps, ratio):
    ld = sum(p.nchar for p in de_ps)
    le = sum(p.nchar for p in en_ps)
    if not ld or not le:
        return 0.0
    r = le / (ld * ratio)
    return math.exp(-(math.log(r) ** 2) / (2 * 0.38 ** 2))


def anchor_score(de_ps, en_ps):
    ad = set().union(*[p.anchors for p in de_ps])
    ae = set().union(*[p.anchors for p in en_ps])
    nd = set().union(*[p.nums for p in de_ps])
    ne = set().union(*[p.nums for p in en_ps])
    parts = []
    if ad or ae:
        parts.append(len(ad & ae) / len(ad | ae))
    if nd or ne:
        parts.append(len(nd & ne) / len(nd | ne))
    qd, qe = sum(p.quotes for p in de_ps) > 0, sum(p.quotes for p in en_ps) > 0
    parts.append(1.0 if qd == qe else 0.0)
    sd = sum(p.q for p in de_ps) + sum(p.ex for p in de_ps)
    se = sum(p.q for p in en_ps) + sum(p.ex for p in en_ps)
    parts.append(1.0 - abs(sd - se) / max(1, sd + se))
    return sum(parts) / len(parts)


def bead_similarity(de_ps, en_ps, ratio):
    lx = lexical(de_ps, en_ps)
    ln = length_score(de_ps, en_ps, ratio)
    an = anchor_score(de_ps, en_ps)
    # lexical coverage of ~0.45 is already a strong match for literary prose;
    # rescale so that it spans the 0..1 range used by the other signals.
    lx_scaled = min(1.0, lx / 0.45)
    return (0.80 * lx_scaled + 0.20 * an) * (0.45 + 0.55 * ln), {'lexical': round(lx, 4), 'length': round(ln, 4), 'anchors': round(an, 4)}


def align_chapter(de, en, ratio):
    m, n = len(de), len(en)
    NEG = -1e18
    best = [[NEG] * (n + 1) for _ in range(m + 1)]
    back = [[None] * (n + 1) for _ in range(m + 1)]
    best[0][0] = 0.0
    for i in range(m + 1):
        center = i * n / max(1, m)
        jlo = max(0, int(center) - BAND)
        jhi = min(n, int(center) + BAND)
        for j in range(jlo, jhi + 1):
            cur = best[i][j]
            if cur == NEG:
                continue
            for a, b, pen in BEADS:
                if i + a > m or j + b > n:
                    continue
                sim, _ = bead_similarity(de[i:i + a], en[j:j + b], ratio)
                val = cur + sim - pen
                if val > best[i + a][j + b]:
                    best[i + a][j + b] = val
                    back[i + a][j + b] = (a, b)
            if i + 1 <= m and cur + SKIP_VALUE > best[i + 1][j]:
                best[i + 1][j] = cur + SKIP_VALUE
                back[i + 1][j] = (1, 0)
            if j + 1 <= n and cur + SKIP_VALUE > best[i][j + 1]:
                best[i][j + 1] = cur + SKIP_VALUE
                back[i][j + 1] = (0, 1)
    if best[m][n] == NEG:
        raise RuntimeError('alignment failed: band too narrow')
    beads = []
    i, j = m, n
    while i > 0 or j > 0:
        a, b = back[i][j]
        beads.append((i - a, a, j - b, b))
        i, j = i - a, j - b
    beads.reverse()
    return beads


def classify(conf, a, b):
    if a == 0:
        return 'unmatched_en'
    if b == 0:
        return 'unmatched_de'
    if conf < 0.35:
        return 'low_confidence'
    if conf < 0.55 or (a >= 2 and b >= 2) or a >= 4 or b >= 4:
        return 'needs_review'
    return 'aligned'


def main():
    src = json.load(open(os.path.join(WORK, 'heidi_extracted.json'), encoding='utf-8'))
    bilex = Bilex()
    out_ch = []
    for ch in range(1, 15):
        de_raw = [p for p in src['de'] if p['chapter'] == ch]
        en_raw = [p for p in src['en'] if p['chapter'] == ch]
        de = [Para(p['text'], 'de', bilex) for p in de_raw]
        en = [Para(p['text'], 'en', bilex) for p in en_raw]
        ratio = sum(p.nchar for p in en) / sum(p.nchar for p in de)
        beads = align_chapter(de, en, ratio)
        rows = []
        for (i, a, j, b) in beads:
            if a and b:
                sim, comp = bead_similarity(de[i:i + a], en[j:j + b], ratio)
                # margin: does this German group match a *neighbouring* English
                # group (shifted by one paragraph) equally well?  If so, the
                # pairing is ambiguous.
                lx = comp['lexical']
                alts = []
                for dj in (-1, 1):
                    if 0 <= j + dj and j + dj + b <= len(en):
                        alts.append(lexical(de[i:i + a], en[j + dj:j + dj + b]))
                for di in (-1, 1):
                    if 0 <= i + di and i + di + a <= len(de):
                        alts.append(lexical(de[i + di:i + di + a], en[j:j + b]))
                alt = max(alts) if alts else 0.0
                margin = lx - alt
                comp['neighbour_lexical'] = round(alt, 4)
                comp['margin'] = round(margin, 4)
                m_score = 1 / (1 + math.exp(-margin * 18))
                size_pen = 0.04 * max(0, a + b - 2)
                conf = max(0.0, min(1.0, 0.55 * sim + 0.45 * m_score - size_pen))
            else:
                conf, comp = 0.0, {}
            rows.append({
                'de_idx': list(range(i, i + a)), 'en_idx': list(range(j, j + b)),
                'bead': f'{a}:{b}', 'confidence': round(conf, 4), 'components': comp,
                'status': classify(conf, a, b),
            })
        # Structural support: a low-confidence 1:1 bead sitting between two
        # 'aligned' beads is most likely a correct pairing of short or freely
        # rendered paragraphs (e.g. '"Yes."' vs '"Gerade dasselbe", gab dieser
        # zur Antwort.'). Escalate it to needs_review rather than low_confidence;
        # its numeric confidence is left unchanged.
        for k in range(1, len(rows) - 1):
            r = rows[k]
            if r['status'] == 'low_confidence' and r['bead'] == '1:1' \
                    and rows[k - 1]['status'] == 'aligned' and rows[k + 1]['status'] == 'aligned':
                r['status'] = 'needs_review'
                r['structurally_supported'] = True
        out_ch.append({'chapter': ch, 'ratio_en_de_chars': round(ratio, 4), 'beads': rows,
                       'de_count': len(de), 'en_count': len(en)})
        st = Counter(r['status'] for r in rows)
        bt = Counter(r['bead'] for r in rows)
        print(f'ch{ch:2d} de={len(de):3d} en={len(en):3d} beads={len(rows):3d} '
              f'mean_conf={sum(r["confidence"] for r in rows)/len(rows):.3f} {dict(st)} {dict(bt)}')
    json.dump({'method': 'monotonic-dp-lexical-length-anchor-v1', 'chapters': out_ch},
              open(os.path.join(WORK, 'heidi_alignment.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
