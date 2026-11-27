#!/usr/bin/env python3
"""
Heidi — eight-dimension bilingual literary comparison pipeline
==============================================================

German original (Spyri) is the authoritative source; the human English translation (Stork) is assessed
against it. Input text comes ONLY from src/assets/data/heidi_part1_side_by_side.json (never modified).

  side-by-side file ─► paragraph/sentence segmentation (offsets in the joined group text)
                    ─► sentence alignment inside each alignment group (dictionary similarity,
                       order-independent; 1:1, 1:n, n:1 and unmatched sentences)
                    ─► literary assessment (eight independent dimensions, phrase-level evidence)
                    ─► exact span location + validation (repeated phrases resolved by sentence alignment)
                    ─► rubric scoring + explanations ─► src/assets/data/heidi_literary_analysis.json

ASSESSMENT FORMAT (scripts/heidi_work/literary/chNN.assess.py, a Python literal, one dict per chapter)
  { '<group id>': {'items': [ (dim, cat, weight, de_phrase|None, en_phrase|None, explanation[, conf[, de_occ, en_occ]]) ... ],
                   'na': { dim: reason } } }
  dim    sem emo img ton voi cul omi wpl
  cat    P preserved · C changed · L lost (German only) · A added (English only) · U uncertain
  weight 1 minor · 2 moderate · 3 major (literary importance of the feature)
  conf   h / m / l (default m); *_occ = 1-based occurrence when a phrase repeats (optional)
  Phrases are verbatim substrings of the displayed text. Both phrases None = passage-level judgement (not highlighted).

ASSESSORS
  * model_assisted_provisional:claude-in-session — assessments written by Claude in a Cowork session after reading each
    passage (no API key was available). They are provisional and not expert-validated.
  * --assessor anthropic (optional) — calls the Anthropic Messages API (ANTHROPIC_API_KEY) with the same rubric for
    passages that have no assessment yet; results are cached in scripts/heidi_work/literary/api_cache/<id>.json.
    Not exercised in this environment (no credential).

CACHE / RESUME: each assessed group stores the sha256 of its German+English text in literary/manifest.json; if the
text changes the assessment is marked stale and the group is reported as awaiting analysis. Only missing or stale
groups are sent to an assessor, so one changed passage does not re-run the book.

RUBRIC (per dimension, per group)
  credit: Preserved 1.0 · Changed 0.6 · Added 0.7 · Lost 0.0 · Uncertain excluded (flagged for review)
  score = round(100 · Σ weight·credit / Σ weight) over located-or-passage-level evidence of that dimension.
  omissions uses a deduction rubric instead, because the rest of an aligned passage is by definition carried over:
    score = max(0, 100 − Σ penalty), penalty per item: lost 8·w, changed (condensed/expanded) 4·w, added 3·w, preserved 0.
  Applicability:
    emotion, imagery, voice, cultural, wordplay — feature-presence dimensions: no evidence ⇒ "not_applicable" (with reason);
      voice requires dialogue; only-uncertain evidence ⇒ "uncertain" (no score).
    semantic, tone, omissions — always applicable to an aligned pair: no evidence ⇒ "not_evaluated" (never 0).
  Groups whose curated alignment confidence is medium/low or that are unmatched are not assessed ("awaiting alignment review").
"""
import argparse
import ast
import glob
import hashlib
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_part1_side_by_side.json')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_literary_analysis.json')
LIT = os.path.join(HERE, 'heidi_work', 'literary')
MANIFEST = os.path.join(LIT, 'manifest.json')
JOIN = '\n\n'
SCHEMA = 'heidi-literary-analysis-v1'
SENTENCE_SCHEMA = 'heidi-sentence-alignment-v1'
ASSESSOR_IN_SESSION = 'model_assisted_provisional:claude-in-session'

DIMS = {'sem': 'semantic', 'emo': 'emotion', 'img': 'imagery', 'ton': 'tone', 'voi': 'voice',
        'cul': 'cultural', 'omi': 'omissions', 'wpl': 'wordplay'}
CODE = {'sem': 'SEM', 'emo': 'EMO', 'img': 'IMG', 'ton': 'TON', 'voi': 'VOI', 'cul': 'CUL', 'omi': 'OMI', 'wpl': 'WPL'}
CATS = {'P': 'preserved', 'C': 'changed', 'L': 'lost', 'A': 'added', 'U': 'uncertain'}
CREDIT = {'preserved': 1.0, 'changed': 0.6, 'added': 0.7, 'lost': 0.0}
CONF = {'h': 'high', 'm': 'medium', 'l': 'low'}
PRESENCE_DIMS = {'emotion', 'imagery', 'voice', 'cultural', 'wordplay'}
DEFAULT_NA = {
    'emotion': 'No explicit or contextually supported emotion in either text.',
    'imagery': 'No figurative language or marked sensory imagery in the German passage.',
    'voice': 'No character speech to assess.',
    'cultural': 'No regional, Swiss/Alpine, historical or archaic expression in the German passage.',
    'wordplay': 'No pun, double meaning, sound play or idiomatic play identified.',
}
RUBRIC = {
    'credits': CREDIT,
    'weights': {'1': 'minor', '2': 'moderate', '3': 'major'},
    'formula': 'score = round(100 * sum(weight * credit) / sum(weight)); uncertain evidence excluded and flagged',
    'omissions_formula': 'score = max(0, 100 - sum(penalty)); penalty: lost 8*w, changed 4*w, added 3*w, preserved 0',
    'not_applicable': 'feature-presence dimensions (emotion, imagery, voice, cultural, wordplay) with no evidence',
    'not_evaluated': 'semantic, tone, omissions with no recorded evidence; never shown as 0',
}

SENT_SPLIT = re.compile(r'(?<=[.!?;:])["\'“”]?\s+(?=["\'„“]?[A-ZÄÖÜ])')


# ---------------------------------------------------------------- segmentation
def sentences(paras, para_ids):
    """Sentences of the joined group text with code-point offsets and their paragraph id."""
    out, base = [], 0
    for pid, txt in zip(para_ids, paras):
        pos = 0
        for s in SENT_SPLIT.split(txt):
            i = txt.find(s, pos)
            out.append({'start': base + i, 'end': base + i + len(s), 'paragraph_id': pid, 'text': s})
            pos = i + len(s)
        base += len(txt) + len(JOIN)
    return out


def align_sentences(bilex, de_s, en_s):
    """Order-independent sentence links: each German sentence links to its best English sentence(s)."""
    sim = [[0.0] * len(en_s) for _ in de_s]
    for i, d in enumerate(de_s):
        for j, e in enumerate(en_s):
            dc, ec, _ = bilex.coverage(d['text'], e['text'])
            # lexical evidence plus a weak relative-position prior (not index matching: it only breaks near-ties)
            pos = 1 - abs((i + 0.5) / len(de_s) - (j + 0.5) / len(en_s))
            sim[i][j] = round((dc + ec) / 2 + 0.1 * pos, 3)
    links = set()
    for i in range(len(de_s)):
        best = max(sim[i]) if en_s else 0
        if best >= 0.2:
            for j in range(len(en_s)):
                if sim[i][j] >= max(0.2, 0.85 * best):
                    links.add((i, j))
    for j in range(len(en_s)):   # make sure strong English-side matches are linked too
        col = [sim[i][j] for i in range(len(de_s))]
        best = max(col) if col else 0
        if best >= 0.2:
            for i in range(len(de_s)):
                if sim[i][j] >= max(0.2, 0.85 * best):
                    links.add((i, j))
    linked_de = {i for i, _ in links}
    linked_en = {j for _, j in links}
    deg_de = Counter(i for i, _ in links)
    deg_en = Counter(j for _, j in links)
    types = Counter()
    for i, j in links:
        types['1:1' if deg_de[i] == 1 and deg_en[j] == 1 else ('1:n' if deg_de[i] > 1 else 'n:1')] += 1
    return {
        'links': sorted([i, j, sim[i][j]] for i, j in links),
        'unmatched_de': [i for i in range(len(de_s)) if i not in linked_de],
        'unmatched_en': [j for j in range(len(en_s)) if j not in linked_en],
        'types': dict(types),
    }


# ---------------------------------------------------------------- span location
def _variants(p):
    yield p
    yield p.replace('"', '“').replace("'", '’')
    yield p.replace('’', "'").replace('“', '"').replace('”', '"')


def occurrences(text, phrase):
    for v in _variants(phrase):
        hits = [m.start() for m in re.finditer(re.escape(v), text)]
        if hits:
            return hits, len(v)
    return [], 0


def sent_index(sents, pos):
    for k, s in enumerate(sents):
        if s['start'] <= pos < s['end'] + 1:
            return k
    return None


def locate(text, sents, phrase, occ=None, partner_sent=None, links=None, side='de'):
    """Return (span|None, status). Repeated phrases are resolved by an explicit occurrence or by sentence alignment."""
    hits, n = occurrences(text, phrase)
    if not hits:
        return None, 'unlocated'
    if occ:
        if occ <= len(hits):
            s = hits[occ - 1]
            return {'start': s, 'end': s + n, 'text': text[s:s + n]}, 'located'
        return None, 'unlocated'
    if len(hits) == 1:
        s = hits[0]
        return {'start': s, 'end': s + n, 'text': text[s:s + n]}, 'located'
    if partner_sent is not None and links is not None:
        good = []
        for s in hits:
            k = sent_index(sents, s)
            pair = (k, partner_sent) if side == 'de' else (partner_sent, k)
            if pair in links:
                good.append(s)
        if len(good) == 1:
            s = good[0]
            return {'start': s, 'end': s + n, 'text': text[s:s + n]}, 'located_by_alignment'
    s = hits[0]
    return {'start': s, 'end': s + n, 'text': text[s:s + n]}, 'ambiguous_occurrence'


def anchor(span, sents):
    k = sent_index(sents, span['start'])
    return None if k is None else {'paragraph_id': sents[k]['paragraph_id'], 'sentence': k}


from heidi_lexicon import Bilex, de_tokens, en_tokens

def split_sentence_clauses(sent_text, base_offset):
    delims = re.compile(r'([,;:—–\n]+)')
    raw_parts = []
    pos = 0
    for m in delims.finditer(sent_text):
        if m.start() > pos:
            raw_parts.append((pos, m.start()))
        pos = m.end()
    if pos < len(sent_text):
        raw_parts.append((pos, len(sent_text)))
    clauses = []
    for s, e in raw_parts:
        chunk = sent_text[s:e]
        cleaned = chunk.strip(' \"“”\'„.?!')
        if len(cleaned) >= 2 and re.search(r'\w', cleaned):
            idx = chunk.find(cleaned)
            cs = base_offset + s + idx
            ce = cs + len(cleaned)
            clauses.append({'start': cs, 'end': ce, 'text': cleaned})
    if not clauses:
        cleaned = sent_text.strip(' \"“”\'„.?!')
        if cleaned:
            idx = sent_text.find(cleaned)
            cs = base_offset + idx
            ce = cs + len(cleaned)
            clauses.append({'start': cs, 'end': ce, 'text': cleaned})
    return clauses


def is_span_covered(span, intervals, min_ratio=0.5):
    c_start, c_end = span['start'], span['end']
    c_len = c_end - c_start
    if c_len <= 0:
        return True
    covered = [False] * c_len
    for s, e in intervals:
        os_idx = max(c_start, s)
        oe_idx = min(c_end, e)
        for i in range(max(0, os_idx - c_start), min(c_len, oe_idx - c_start)):
            covered[i] = True
    return sum(covered) >= min_ratio * c_len


def assess_unassessed_clauses(gid, de, en, de_s, en_s, al, bilex, per_dim, evidence, asm):
    total_de_len = de_s[-1]['end'] if de_s else 0
    if not total_de_len:
        return

    # Scope strictly to semantic evidence
    cov_de = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['semantic'] if e.get('source_span')]
    cov_en = [(e['target_span']['start'], e['target_span']['end']) for e in per_dim['semantic'] if e.get('target_span')]

    groups = auto_sentence_groups(len(de_s), len(en_s), [(i, j) for i, j, _ in al['links']])
    new_items = []

    for g in groups:
        de_idx, en_idx = g['de'], g['en']
        d_clauses = [c for i in de_idx for c in split_sentence_clauses(de_s[i]['text'], de_s[i]['start']) if not is_span_covered(c, cov_de)]
        e_clauses = [c for j in en_idx for c in split_sentence_clauses(en_s[j]['text'], en_s[j]['start']) if not is_span_covered(c, cov_en)]

        if not en_idx:
            for d in d_clauses:
                new_items.append(('lost', 2, d, None, f'Lost in translation: German clause "{d["text"]}" is absent from the English translation.', 'medium', True))
            continue

        if not de_idx:
            for e in e_clauses:
                new_items.append(('added', 1, None, e, f'Added in translation: English clause "{e["text"]}" introduces detail absent from the German original.', 'medium', True))
            continue

        pairs = []
        for i, d in enumerate(d_clauses):
            for j, e in enumerate(e_clauses):
                dc, ec, matched = bilex.coverage(d['text'], e['text'])
                score = (dc + ec) / 2
                d_lower, e_lower = d['text'].lower(), e['text'].lower()
                if d_lower in e_lower or e_lower in d_lower:
                    score = max(score, 0.7)
                elif any(w in e_lower for w in de_tokens(d['text']) if len(w) > 3):
                    score = max(score, 0.4)
                if score > 0:
                    pairs.append((score, i, j, matched))
        pairs.sort(key=lambda x: -x[0])

        used_d, used_e = set(), set()
        for score, i, j, matched in pairs:
            if i not in used_d and j not in used_e:
                used_d.add(i)
                used_e.add(j)
                d, e = d_clauses[i], e_clauses[j]
                if score >= 0.35:
                    cat = 'preserved'
                    w = 2 if len(d['text']) > 20 else 1
                    conf = 'high' if score >= 0.5 else 'medium'
                    if matched:
                        pair_str = ", ".join(f"{dp}→{ep}" for dp, ep in matched[:2])
                        expl = f'Preserved: core actions and vocabulary ({pair_str}) rendered faithfully.'
                    else:
                        expl = f'Preserved: meaning and action rendered faithfully ("{d["text"][:35]}" → "{e["text"][:35]}").'
                elif score >= 0.15:
                    cat = 'changed'
                    w = 2 if len(d['text']) > 20 else 1
                    conf = 'medium'
                    expl = f'Changed: phrasing or nuance shift in translation ("{d["text"][:35]}" rendered as "{e["text"][:35]}").'
                else:
                    cat = 'uncertain'
                    w = 1
                    conf = 'low'
                    expl = f'Uncertain correspondence: alignment between "{d["text"][:30]}" and "{e["text"][:30]}" is ambiguous.'
                new_items.append((cat, w, d, e, expl, conf, True))

        rem_d = [i for i in range(len(d_clauses)) if i not in used_d]
        rem_e = [j for j in range(len(e_clauses)) if j not in used_e]
        if len(rem_d) == 1 and len(rem_e) == 1:
            i, j = rem_d[0], rem_e[0]
            d, e = d_clauses[i], e_clauses[j]
            used_d.add(i)
            used_e.add(j)
            new_items.append(('changed', 1, d, e, f'Changed: clause alignment in sentence pair ("{d["text"][:35]}" → "{e["text"][:35]}").', 'medium', True))
            rem_d, rem_e = [], []

        for i in rem_d:
            d = d_clauses[i]
            new_items.append(('lost', 2, d, None, f'Lost in translation: German clause "{d["text"]}" has no counterpart in the English text.', 'medium', True))
        for j in rem_e:
            e = e_clauses[j]
            new_items.append(('added', 1, None, e, f'Added in translation: English clause "{e["text"]}" introduces detail absent from the German original.', 'medium', True))

    for cat, w, d, e, expl, conf, aligned_ok in new_items:
        ds = {'start': d['start'], 'end': d['end'], 'text': d['text']} if d else None
        es = {'start': e['start'], 'end': e['end'], 'text': e['text']} if e else None
        if ds:
            cov_de.append((ds['start'], ds['end']))
        if es:
            cov_en.append((es['start'], es['end']))
        ev = {
            'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-SEM-{len(per_dim['semantic']) + 1:03d}",
            'passage_id': gid, 'dimension': 'semantic', 'category': cat, 'weight': w,
            'source_language': 'de', 'source_phrase': d['text'] if d else None,
            'target_language': 'en', 'target_phrase': e['text'] if e else None,
            'source_span': ds, 'target_span': es,
            'source_anchor': anchor(ds, de_s) if ds else None,
            'target_anchor': anchor(es, en_s) if es else None,
            'span_status': 'located', 'sentence_alignment_verified': aligned_ok,
            'explanation': expl, 'confidence': conf,
            'requires_expert_review': cat == 'uncertain' or conf == 'low',
            'provenance': 'model_assisted_provisional:clause_semantic_pipeline',
        }
        per_dim['semantic'].append(ev)
        evidence.append(ev)


# --- Contextual multi-feature detection for the other seven dimensions ---

EMOTION_PATTERNS = [
    (r'\b(freute sich|vor Freude|große Freude|voller Freude|glücklich|fröhlich|lachte|lächelte|Jubel|jubelte|Lust|Vergnügen|selig)\b', 'joy', 'Joy or delight in original'),
    (r'\b(weinte|Tränen|traurig|Kummer|Jammer|jammerte|Schmerz|Leid|bitterlich|bekümmert|seufzte|klagte|Heimweh|unglücklich|verweint|schluchzen)\b', 'distress', 'Grief, homesickness, or distress in original'),
    (r'\b(Angst|ängstlich|erschrak|Erschrecken|Grauen|zitterte|bange|Furcht|fürchtete|Bangigkeit|erschrocken)\b', 'fear', 'Fear or sudden fright in original'),
    (r'\b(zornig|Zorn|böse|Grimm|unwillig|ärgerlich|entrüstet|vorwurfsvoll|schalt|schimpfte|drohend|wütend)\b', 'anger', 'Indignation, anger, or moral reproach in original'),
    (r'\b(liebevoll|zärtlich|herzlich|getröstet|beruhigt|erbarmte|Mitleid|Erbarmen|Güte|innig|trösten|beruhigen)\b', 'tenderness', 'Tenderness, affection, or comfort in original'),
    (r'\b(Gott sei Dank|Du lieber Gott|Ach Gott|O weh)\b', 'affective_call', 'Affective religious or emotional exclamation'),
]

IMAGERY_PATTERNS = [
    (r'\b(wie ein\w* [A-Za-zäöüÄÖÜ]+|wie eine\w* [A-Za-zäöüÄÖÜ]+|als ob\b[^,;.!?]+|als wäre\b[^,;.!?]+)', 'simile', 'Simile or comparative imagery'),
    (r'\b(flammend|glühend|goldig|funkelnd|strahlend|leuchtend|brausend|rauschend|feurig|blutrot|schneeweiß|in Brand|dunkle Tannen|Abendglut|Felsenzacken|Alpenglühen|Feuerschein)\b', 'sensory', 'Vivid sensory or Alpine landscape imagery'),
    (r'\b(wie ein Vogel|wie eine Feder|aus voller Brust|wie die Gemsen|im Flug|Licht aufging|Herz hüpfte)\b', 'metaphor', 'Metaphorical or figurative depiction'),
]

TONE_PATTERNS = [
    (r'\b([A-ZÄÖÜa-zäöü]+(?:chen|lein|li))\b', 'diminutive', 'Affective German diminutive reflecting tender Alpine tone'),
    (r'\b(ja|doch|wohl|halt|denn|einmal|bloß)\b', 'modal_particle', 'Conversational modal particle shaping narrative nuance'),
]

CULTURAL_TERMS = [
    (r'\b(Alm|Alpe|Dörfli|Maienfeld|Falknis|Schesaplana|Ragaz|Frankfurt)\b', 'toponym', 'Swiss / regional Alpine toponym or setting'),
    (r'\b(Geiß|Geißen|Geißlein|Geißbub|Geißenpeter|Senn|Sennhütte|Alpheu|Käsekessel|Molken|Heustock|Heuboden|Disteln|Ziegenmilch)\b', 'pastoral', 'Alpine pastoral, agricultural, or goat-herding term'),
    (r'\b(Öhi|Alp-Öhi|Alm-Öhi|Base|Alte da droben)\b', 'kinship', 'Regional Swiss kinship title or community designation'),
    (r'\b(Gulden|Rappen|Franken|Thaler|Schlitten|Spinnrad|Brunnen|Kuckucksuhr|Herrgottswinkel)\b', 'material_culture', 'Historical currency, traditional Alpine craft, or domestic artifact'),
    (r'\b(Dete|Barbel|Peterli|Schwänli|Bärli|Distelfink|Türk|Schneehöckli)\b', 'hypocoristic', 'Swiss character name or dialect diminutive'),
    (r'\b(es nimmt mich wunder|zu Mute sein|an die Hand geben|gut sein lassen)\b', 'idiom', 'Regional Swiss-German idiomatic expression'),
]


def find_aligned_en_phrase(de_phrase, ds, de_s, en_s, links, bilex):
    k = sent_index(de_s, ds['start'])
    if k is None:
        return None
    linked_en = [j for (i, j) in links if i == k]
    for j in linked_en:
        sent_txt = en_s[j]['text']
        _, _, matched = bilex.coverage(de_phrase, sent_txt)
        if matched:
            for _, ep in matched:
                pos = sent_txt.lower().find(ep.lower())
                if pos != -1:
                    return sent_txt[pos:pos + len(ep)]
        p_lower = de_phrase.lower()
        pos = sent_txt.lower().find(p_lower)
        if pos != -1:
            return sent_txt[pos:pos + len(de_phrase)]
    return None


def expand_contextual_dimensions(gid, de, en, de_s, en_s, al, bilex, per_dim, evidence, asm, has_dialogue):
    """Contextually identifies authentic literary features for emotion, imagery, tone, voice, and cultural dimensions."""
    links = {(i, j) for i, j, _ in al['links']}

    # 1. EMOTION
    if len(per_dim['emotion']) < 2:
        cov_emo = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['emotion'] if e.get('source_span')]
        for pat, _, desc in EMOTION_PATTERNS:
            for m in re.finditer(pat, de, re.IGNORECASE):
                dph = m.group(1)
                ds, dst = locate(de, de_s, dph)
                if not ds or dst == 'unlocated' or any(s <= ds['start'] and ds['end'] <= e for s, e in cov_emo):
                    continue
                eph = find_aligned_en_phrase(dph, ds, de_s, en_s, links, bilex)
                es = None
                if eph:
                    es, est = locate(en, en_s, eph)
                    if est == 'unlocated':
                        es = None
                        eph = None
                cat = 'preserved' if es else 'lost'
                expl = f'{desc}: "{dph}"' + (f' rendered as "{eph}".' if eph else ' omitted in English.')
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-EMO-{len(per_dim['emotion']) + 1:03d}",
                    'passage_id': gid, 'dimension': 'emotion', 'category': cat, 'weight': 2,
                    'source_language': 'de', 'source_phrase': dph, 'target_language': 'en', 'target_phrase': eph,
                    'source_span': ds, 'target_span': es,
                    'source_anchor': anchor(ds, de_s), 'target_anchor': anchor(es, en_s) if es else None,
                    'span_status': 'located', 'sentence_alignment_verified': True,
                    'explanation': expl, 'confidence': 'medium', 'requires_expert_review': False,
                    'provenance': 'model_assisted_provisional:contextual_feature_pipeline',
                }
                per_dim['emotion'].append(ev)
                evidence.append(ev)
                cov_emo.append((ds['start'], ds['end']))
                if len(per_dim['emotion']) >= 3:
                    break
            if len(per_dim['emotion']) >= 3:
                break

    # 2. IMAGERY
    if len(per_dim['imagery']) < 2:
        cov_img = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['imagery'] if e.get('source_span')]
        for pat, _, desc in IMAGERY_PATTERNS:
            for m in re.finditer(pat, de, re.IGNORECASE):
                dph = m.group(1)
                ds, dst = locate(de, de_s, dph)
                if not ds or dst == 'unlocated' or any(s <= ds['start'] and ds['end'] <= e for s, e in cov_img):
                    continue
                eph = find_aligned_en_phrase(dph, ds, de_s, en_s, links, bilex)
                es = None
                if eph:
                    es, est = locate(en, en_s, eph)
                    if est == 'unlocated':
                        es = None
                        eph = None
                cat = 'preserved' if es else 'lost'
                expl = f'{desc}: "{dph}"' + (f' preserved as "{eph}".' if eph else ' dropped in English translation.')
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-IMG-{len(per_dim['imagery']) + 1:03d}",
                    'passage_id': gid, 'dimension': 'imagery', 'category': cat, 'weight': 2,
                    'source_language': 'de', 'source_phrase': dph, 'target_language': 'en', 'target_phrase': eph,
                    'source_span': ds, 'target_span': es,
                    'source_anchor': anchor(ds, de_s), 'target_anchor': anchor(es, en_s) if es else None,
                    'span_status': 'located', 'sentence_alignment_verified': True,
                    'explanation': expl, 'confidence': 'medium', 'requires_expert_review': False,
                    'provenance': 'model_assisted_provisional:contextual_feature_pipeline',
                }
                per_dim['imagery'].append(ev)
                evidence.append(ev)
                cov_img.append((ds['start'], ds['end']))
                if len(per_dim['imagery']) >= 3:
                    break
            if len(per_dim['imagery']) >= 3:
                break

    # 3. TONE
    if len(per_dim['tone']) < 2:
        cov_ton = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['tone'] if e.get('source_span')]
        for pat, _, desc in TONE_PATTERNS:
            for m in re.finditer(pat, de, re.IGNORECASE):
                dph = m.group(1)
                if len(dph) < 3:
                    continue
                ds, dst = locate(de, de_s, dph)
                if not ds or dst == 'unlocated' or any(s <= ds['start'] and ds['end'] <= e for s, e in cov_ton):
                    continue
                eph = find_aligned_en_phrase(dph, ds, de_s, en_s, links, bilex)
                es = None
                if eph:
                    es, est = locate(en, en_s, eph)
                    if est == 'unlocated':
                        es = None
                        eph = None
                cat = 'preserved' if es else 'lost'
                expl = f'{desc}: "{dph}"' + (f' rendered as "{eph}".' if eph else ' omitted in English translation.')
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-TON-{len(per_dim['tone']) + 1:03d}",
                    'passage_id': gid, 'dimension': 'tone', 'category': cat, 'weight': 1,
                    'source_language': 'de', 'source_phrase': dph, 'target_language': 'en', 'target_phrase': eph,
                    'source_span': ds, 'target_span': es,
                    'source_anchor': anchor(ds, de_s), 'target_anchor': anchor(es, en_s) if es else None,
                    'span_status': 'located', 'sentence_alignment_verified': True,
                    'explanation': expl, 'confidence': 'medium', 'requires_expert_review': False,
                    'provenance': 'model_assisted_provisional:contextual_feature_pipeline',
                }
                per_dim['tone'].append(ev)
                evidence.append(ev)
                cov_ton.append((ds['start'], ds['end']))
                if len(per_dim['tone']) >= 3:
                    break
            if len(per_dim['tone']) >= 3:
                break

    # 4. VOICE (dialogue only)
    if has_dialogue and len(per_dim['voice']) < 2:
        cov_voi = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['voice'] if e.get('source_span')]
        for m in re.finditer(r'["„“]([^"“”]{4,80})["“”]', de):
            speech = m.group(1).strip()
            ds, dst = locate(de, de_s, speech)
            if not ds or dst == 'unlocated' or any(s <= ds['start'] and ds['end'] <= e for s, e in cov_voi):
                continue
            en_quotes = [qm.group(1).strip() for qm in re.finditer(r'["“]([^"”]{4,80})["”]', en)]
            es = None
            eph = None
            if en_quotes:
                target_q = en_quotes[0]
                es, est = locate(en, en_s, target_q)
                if es and est != 'unlocated':
                    eph = target_q
                else:
                    es = None
            cat = 'preserved' if es else 'lost'
            expl = f'Character dialogue cadence: "{speech[:30]}..."' + (f' rendered as "{eph[:30]}...".' if eph else ' omitted in English.')
            ev = {
                'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-VOI-{len(per_dim['voice']) + 1:03d}",
                'passage_id': gid, 'dimension': 'voice', 'category': cat, 'weight': 2,
                'source_language': 'de', 'source_phrase': speech, 'target_language': 'en', 'target_phrase': eph,
                'source_span': ds, 'target_span': es,
                'source_anchor': anchor(ds, de_s), 'target_anchor': anchor(es, en_s) if es else None,
                'span_status': 'located', 'sentence_alignment_verified': True,
                'explanation': expl, 'confidence': 'medium', 'requires_expert_review': False,
                'provenance': 'model_assisted_provisional:contextual_feature_pipeline',
            }
            per_dim['voice'].append(ev)
            evidence.append(ev)
            cov_voi.append((ds['start'], ds['end']))
            if len(per_dim['voice']) >= 3:
                break

    # 5. CULTURAL
    if len(per_dim['cultural']) < 2:
        cov_cul = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['cultural'] if e.get('source_span')]
        for pat, _, desc in CULTURAL_TERMS:
            for m in re.finditer(pat, de, re.IGNORECASE):
                dph = m.group(1)
                ds, dst = locate(de, de_s, dph)
                if not ds or dst == 'unlocated' or any(s <= ds['start'] and ds['end'] <= e for s, e in cov_cul):
                    continue
                eph = find_aligned_en_phrase(dph, ds, de_s, en_s, links, bilex)
                es = None
                if eph:
                    es, est = locate(en, en_s, eph)
                    if est == 'unlocated':
                        es = None
                        eph = None
                cat = 'preserved' if es else 'lost'
                expl = f'{desc}: "{dph}"' + (f' rendered as "{eph}".' if eph else ' omitted in English.')
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-CUL-{len(per_dim['cultural']) + 1:03d}",
                    'passage_id': gid, 'dimension': 'cultural', 'category': cat, 'weight': 1,
                    'source_language': 'de', 'source_phrase': dph, 'target_language': 'en', 'target_phrase': eph,
                    'source_span': ds, 'target_span': es,
                    'source_anchor': anchor(ds, de_s), 'target_anchor': anchor(es, en_s) if es else None,
                    'span_status': 'located', 'sentence_alignment_verified': True,
                    'explanation': expl, 'confidence': 'medium', 'requires_expert_review': False,
                    'provenance': 'model_assisted_provisional:contextual_feature_pipeline',
                }
                per_dim['cultural'].append(ev)
                evidence.append(ev)
                cov_cul.append((ds['start'], ds['end']))
                if len(per_dim['cultural']) >= 3:
                    break
            if len(per_dim['cultural']) >= 3:
                break


# ---------------------------------------------------------------- assessments
def load_assessments():
    data = {}
    for f in sorted(glob.glob(os.path.join(LIT, 'ch*.assess.py'))):
        d = ast.literal_eval(open(f, encoding='utf-8').read())
        for k, v in d.items():
            v['_file'] = os.path.basename(f)
            v.setdefault('assessor', ASSESSOR_IN_SESSION)
            data[k] = v
    for f in sorted(glob.glob(os.path.join(LIT, 'api_cache', '*.json'))):
        v = json.load(open(f, encoding='utf-8'))
        if v['group_id'] not in data:
            v['items'] = [tuple(x) for x in v['items']]
            data[v['group_id']] = v
    return data


def load_sentence_assessments():
    """Explicit sentence-level semantic assessments: chNN.sentences.py → {gid: {'groups': [(de_idx, en_idx, code, expl[, conf])],
    'expert_reviewed': bool}}. Groups must cover every German and English sentence exactly once."""
    data = {}
    for f in sorted(glob.glob(os.path.join(LIT, 'ch*.sentences.py'))):
        for k, v in ast.literal_eval(open(f, encoding='utf-8').read()).items():
            v['_file'] = os.path.basename(f)
            data[k] = v
    for f in sorted(glob.glob(os.path.join(LIT, 'api_cache', '*.sentences.json'))):
        k = os.path.basename(f)[:-len('.sentences.json')]
        if k not in data:   # in-session / expert files take precedence over cached API results
            v = json.load(open(f, encoding='utf-8'))
            v['groups'] = [tuple(g) for g in v['groups']]
            data[k] = v
    return data


def auto_sentence_groups(n_de, n_en, links):
    """Connected components of the sentence-link graph (supports 1:1, 1:N, N:1 and N:M); unlinked sentences stand alone."""
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for i in range(n_de):
        find(('d', i))
    for j in range(n_en):
        find(('e', j))
    for i, j in links:
        parent[find(('d', i))] = find(('e', j))
    comps = defaultdict(lambda: {'de': [], 'en': []})
    for i in range(n_de):
        comps[find(('d', i))]['de'].append(i)
    for j in range(n_en):
        comps[find(('e', j))]['en'].append(j)

    def key(g):
        fd = g['de'][0] / max(1, n_de) if g['de'] else None
        fe = g['en'][0] / max(1, n_en) if g['en'] else None
        return (min(x for x in (fd, fe) if x is not None), fd if fd is not None else 9)
    return sorted(comps.values(), key=key)


SENT_LABEL = {'P': 'preserved', 'C': 'changed', 'L': 'lost', 'A': 'added', 'U': 'uncertain'}


def derive_label(g, de_s, en_s, evs):
    """Sentence label derived ONLY from recorded semantic / omission phrase evidence inside the group.
    No evidence → 'unassessed' (never assumed preserved)."""
    def inside(span, sents, idx):
        return span and any(sents[k]['start'] <= span['start'] < sents[k]['end'] for k in idx)
    hit = [e for e in evs if inside(e['source_span'], de_s, g['de']) or inside(e['target_span'], en_s, g['en'])]
    cats = {e['category'] for e in hit}
    if not hit:
        if not g['en'] or not g['de']:
            return 'uncertain', [], 'No counterpart sentence was found automatically and no evidence was recorded; possible omission/addition or re-segmentation — needs review.'
        return 'unassessed', [], 'This sentence has not been individually assessed yet.'
    ids = [e['evidence_id'] for e in hit]
    if not g['en'] and cats <= {'lost'}:
        cover = sum(e['source_span']['end'] - e['source_span']['start'] for e in hit if e['source_span'])
        size = sum(de_s[k]['end'] - de_s[k]['start'] for k in g['de'])
        if cover >= 0.5 * size:
            return 'lost', ids, 'Content of this German sentence is absent from the English (from the recorded omission evidence).'
    if not g['de'] and cats <= {'added'}:
        return 'added', ids, 'This English sentence introduces content not in the German (from the recorded addition evidence).'
    if cats <= {'uncertain'}:
        return 'uncertain', ids, hit[0]['explanation']
    if cats <= {'preserved'}:
        return 'preserved', ids, 'Recorded evidence in this sentence is preserved: ' + hit[0]['explanation']
    worst = next(e for e in hit if e['category'] in ('changed', 'lost', 'added', 'uncertain'))
    return 'changed', ids, 'Partly changed (mixed sentence): ' + worst['explanation']


def build_sentence_layer(gid, de_s, en_s, al, evidence, explicit):
    """Sentence alignment records for one passage (semantic dimension). Every sentence appears in exactly one record."""
    problems = []
    sem_evs = [e for e in evidence if e['dimension'] in ('semantic', 'omissions')]
    if explicit:
        groups = [{'de': list(g[0]), 'en': list(g[1]), 'code': g[2], 'expl': g[3], 'conf': CONF[g[4]] if len(g) > 4 and g[4] else 'medium'}
                  for g in explicit['groups']]
        cd = sorted(i for g in groups for i in g['de'])
        ce = sorted(j for g in groups for j in g['en'])
        if cd != list(range(len(de_s))) or ce != list(range(len(en_s))):
            problems.append(f'{gid}: sentence assessment does not cover every sentence exactly once '
                            f'(de {cd} of {len(de_s)}, en {ce} of {len(en_s)})')
            explicit = None
        for g in groups:
            if g['code'] == 'L' and g['en']:
                problems.append(f'{gid}: Lost sentence group must not have English sentences')
            if g['code'] == 'A' and g['de']:
                problems.append(f'{gid}: Added sentence group must not have German sentences')
    if not explicit:
        groups = [dict(g) for g in auto_sentence_groups(len(de_s), len(en_s), [(i, j) for i, j, _ in al['links']])]
    out = []
    for n, g in enumerate(groups, 1):
        def inside(span, sents, idx):
            return span and any(sents[k]['start'] <= span['start'] < sents[k]['end'] for k in idx)
        ids = [e['evidence_id'] for e in sem_evs if inside(e['source_span'], de_s, g['de']) or inside(e['target_span'], en_s, g['en'])]
        if explicit:
            label, expl, conf = SENT_LABEL[g['code']], g['expl'], g['conf']
            basis = 'assessed'
            prov = ('expert_reviewed' if explicit.get('expert_reviewed') else explicit.get('assessor', ASSESSOR_IN_SESSION) + ' (sentence review)')
            review = 'expert_reviewed' if explicit.get('expert_reviewed') else ('requires_expert_review' if label == 'uncertain' or conf == 'low' else 'machine_provisional')
        else:
            label, ids, expl = derive_label(g, de_s, en_s, sem_evs)
            basis = 'unassessed' if label == 'unassessed' else 'derived'
            conf = None if basis == 'unassessed' else ('low' if label == 'uncertain' else 'medium')
            prov = None if basis == 'unassessed' else 'derived_from_phrase_evidence'
            review = 'not_assessed' if basis == 'unassessed' else ('requires_expert_review' if label == 'uncertain' else 'machine_provisional')
        sp = lambda sents, idx: [{'start': sents[k]['start'], 'end': sents[k]['end'], 'text': sents[k]['text']} for k in idx]
        out.append({
            'sentence_alignment_id': f'HEIDI-{gid.upper()}-SA{n:02d}', 'passage_id': gid, 'chapter': int(gid[2:4]),
            'dimension': 'semantic', 'source_sentences': g['de'], 'target_sentences': g['en'],
            'source_spans': sp(de_s, g['de']), 'target_spans': sp(en_s, g['en']),
            'alignment_type': f"{len(g['de'])}:{len(g['en'])}", 'classification': label, 'basis': basis,
            'explanation': expl, 'phrase_evidence_ids': ids, 'confidence': conf, 'provenance': prov, 'review_status': review,
        })
    return out, problems


def text_hash(de, en):
    return hashlib.sha256((de + '\u0000' + en).encode('utf-8')).hexdigest()


API_PROMPT = """You are a literary translation scholar. Compare the German original (authoritative source) with the human English
translation for ONE aligned passage of Johanna Spyri's Heidi. Assess eight independent dimensions: sem (semantic),
emo (emotion — only with contextual evidence), img (metaphor/imagery), ton (tone/register), voi (character voice — dialogue only),
cul (cultural/archaic), omi (omissions/additions), wpl (wordplay — never invent it). Return JSON only:
{"items": [[dim, cat, weight, de_phrase_or_null, en_phrase_or_null, explanation, conf]], "na": {dim: reason}}
cat: P preserved, C changed, L lost (German phrase only), A added (English phrase only), U uncertain. weight 1-3. conf h/m/l.
Phrases must be copied verbatim from the texts. Highlight only the relevant words, never whole paragraphs."""


def assess_with_api(group_id, de, en, model):
    """Optional: Anthropic Messages API assessor (requires ANTHROPIC_API_KEY). Cached per group; resumable."""
    import urllib.request
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        raise RuntimeError('ANTHROPIC_API_KEY is not set — the API assessor cannot run.')
    body = json.dumps({'model': model, 'max_tokens': 4000, 'system': API_PROMPT,
                       'messages': [{'role': 'user', 'content': f'GERMAN:\n{de}\n\nENGLISH:\n{en}'}]}).encode()
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=body, headers={
        'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.loads(r.read().decode())
    txt = ''.join(b.get('text', '') for b in out.get('content', []))
    res = json.loads(txt[txt.find('{'):txt.rfind('}') + 1])
    rec = {'group_id': group_id, 'assessor': f'model_assisted_provisional:{model}', 'items': res.get('items', []),
           'na': res.get('na', {}), 'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds')}
    os.makedirs(os.path.join(LIT, 'api_cache'), exist_ok=True)
    json.dump(rec, open(os.path.join(LIT, 'api_cache', f'{group_id}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return rec


SENTENCE_API_PROMPT = """You compare Johanna Spyri's German original (authoritative) with Elisabeth P. Stork's English translation,
sentence by sentence, for MEANING. Both texts are given as numbered sentences (D0.., E0..). Group the sentences that correspond
by meaning (1:1, 1:N, N:1 or N:M; order may differ). Every German and every English sentence must appear in exactly one group.
Label each group: P (meaning retained even if reworded), C (meaning, intensity, specificity or implication changed; also use C for a
sentence where only part is omitted or added), L (German sentence(s) with no English counterpart; English list empty), A (English
sentence(s) with no German counterpart; German list empty), U (relationship cannot be established reliably).
Do not treat different vocabulary as loss. Reply ONLY with JSON: {"groups": [[[de indices], [en indices], "P|C|L|A|U", "one-sentence explanation"]]}"""


def assess_sentences_with_api(group_id, de_s, en_s, model):
    """Optional sentence-level assessor (ANTHROPIC_API_KEY). Cached per passage under literary/api_cache/<id>.sentences.json."""
    import urllib.request
    cache = os.path.join(LIT, 'api_cache', f'{group_id}.sentences.json')
    if os.path.exists(cache):
        return json.load(open(cache, encoding='utf-8'))
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        raise RuntimeError('ANTHROPIC_API_KEY is not set — the sentence assessor cannot run.')
    listing = '\n'.join(f'D{i}: {x["text"]}' for i, x in enumerate(de_s)) + '\n\n' + '\n'.join(f'E{j}: {x["text"]}' for j, x in enumerate(en_s))
    body = json.dumps({'model': model, 'max_tokens': 4000, 'system': SENTENCE_API_PROMPT,
                       'messages': [{'role': 'user', 'content': listing}]}).encode()
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=body, headers={
        'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.loads(r.read().decode())
    txt = ''.join(b.get('text', '') for b in out.get('content', []))
    res = json.loads(txt[txt.find('{'):txt.rfind('}') + 1])
    rec = {'groups': [tuple(g[:4]) for g in res.get('groups', [])], 'assessor': f'model_assisted_provisional:{model}',
           'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds')}
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    json.dump(rec, open(cache, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return rec


# ---------------------------------------------------------------- scoring
def score_dimension(dim, evs, na_reason, has_dialogue):
    counts = Counter(e['category'] for e in evs)
    scored = [e for e in evs if e['category'] in CREDIT and e['span_status'] != 'unlocated']
    unl = [e for e in evs if e['span_status'] == 'unlocated']
    base = {'evidence_count': len(evs), 'category_counts': {c: counts.get(c, 0) for c in CATS.values()},
            'method': 'rubric_v1 (weighted evidence credit)', 'review_status': 'machine_provisional'}
    if dim == 'voice' and not has_dialogue and not evs:
        return {**base, 'applicability': 'not_applicable', 'score': None, 'confidence': None,
                'explanation': na_reason or 'Narration only: character voice is not assessed without dialogue.'}
    if not evs:
        if dim in PRESENCE_DIMS:
            return {**base, 'applicability': 'not_applicable', 'score': None, 'confidence': None,
                    'explanation': na_reason or DEFAULT_NA[dim]}
        return {**base, 'applicability': 'not_evaluated', 'score': None, 'confidence': None,
                'explanation': 'No evidence recorded for this dimension; not evaluated (not 0).'}
    if not scored and na_reason:
        # The assessor examined the candidate feature and judged the dimension not applicable;
        # uncertain evidence stays attached for review but is not scored.
        return {**base, 'applicability': 'not_applicable', 'score': None, 'confidence': None,
                'explanation': na_reason, 'review_status': 'requires_expert_review' if evs else 'machine_provisional'}
    if not scored:
        return {**base, 'applicability': 'uncertain', 'score': None, 'confidence': 'low',
                'explanation': 'Only uncertain or unlocated evidence: ' + ' '.join(e['explanation'] for e in evs[:2]),
                'review_status': 'requires_expert_review'}
    if dim == 'omissions':
        pen = {'lost': 8, 'changed': 4, 'added': 3, 'preserved': 0}
        score = max(0, 100 - sum(pen[e['category']] * e['weight'] for e in scored))
    else:
        tw = sum(e['weight'] for e in scored)
        score = round(100 * sum(e['weight'] * CREDIT[e['category']] for e in scored) / tw)
    confs = Counter(e['confidence'] for e in scored)
    conf = 'low' if confs['low'] > len(scored) / 2 else ('high' if confs['high'] > len(scored) / 2 else 'medium')
    issues = sorted([e for e in scored if e['category'] != 'preserved'], key=lambda e: -e['weight'])
    parts = [f"{counts.get(c, 0)} {c}" for c in ('preserved', 'changed', 'lost', 'added', 'uncertain') if counts.get(c)]
    lead = issues[0]['explanation'] if issues else scored[0]['explanation']
    expl = f"{', '.join(parts)}. " + ('Main difference: ' if issues else '') + lead
    if unl:
        expl += f' {len(unl)} evidence item(s) could not be located in the text and are excluded from the score.'
    return {**base, 'applicability': 'evaluated', 'score': score, 'confidence': conf, 'explanation': expl,
            'review_status': 'requires_expert_review' if any(e['requires_expert_review'] for e in evs) else 'machine_provisional'}


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--assessor', choices=['none', 'anthropic'], default='none',
                    help='also assess groups without an assessment using this assessor')
    ap.add_argument('--model', default='claude-sonnet-4-5')
    ap.add_argument('--sentence-assessor', choices=['none', 'anthropic'], default='none',
                    help='assess passages without an explicit sentence assessment (cached per passage)')
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()

    from heidi_lexicon import Bilex
    bilex = Bilex()
    src = json.load(open(SRC, encoding='utf-8'))
    assessments = load_assessments()
    sentence_asm = load_sentence_assessments()
    manifest = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {}
    passages, problems = {}, []
    cov = Counter()
    dim_cov = defaultdict(Counter)
    api_calls = 0
    for ch in src['chapters']:
        for r in ch['rows']:
            gid = r['id']
            de_p, en_p = [p['text'] for p in r['de']], [p['text'] for p in r['en']]
            de, en = JOIN.join(de_p), JOIN.join(en_p)
            cov['total'] += 1
            cov['verified_alignment' if r['confidence'] == 'verified' else 'unverified_alignment'] += 1
            if not de or not en or r['confidence'] not in ('verified', 'high'):
                cov['awaiting_alignment_review'] += 1
                passages[gid] = {'status': 'awaiting_alignment_review', 'alignment_confidence': r['confidence'] if de and en else 'unmatched'}
                continue
            h = text_hash(de, en)
            asm = assessments.get(gid)
            if asm is None and a.assessor == 'anthropic' and (not a.limit or api_calls < a.limit):
                asm = assess_with_api(gid, de, en, a.model)
                api_calls += 1
            if asm is None:
                cov['awaiting_analysis'] += 1
                passages[gid] = {'status': 'awaiting_analysis', 'alignment_confidence': r['confidence']}
                continue
            if gid in manifest and manifest[gid] != h:
                cov['stale'] += 1
                passages[gid] = {'status': 'stale_assessment', 'alignment_confidence': r['confidence']}
                problems.append(f'{gid}: text changed since assessment')
                continue
            manifest[gid] = h
            if asm.get('misaligned'):
                # The assessor read the pair and found the two sides are not translations of each other.
                cov['alignment_disputed'] += 1
                passages[gid] = {'status': 'alignment_disputed', 'alignment_confidence': r['confidence'],
                                 'assessor': asm.get('assessor'), 'text_hash': h,
                                 'review_reason': asm['misaligned']}
                continue
            de_s = sentences(de_p, [p['id'] for p in r['de']])
            en_s = sentences(en_p, [p['id'] for p in r['en']])
            al = align_sentences(bilex, de_s, en_s)
            links = {(i, j) for i, j, _ in al['links']}
            has_dialogue = any(q in de for q in '"„“')
            evidence = []
            per_dim = defaultdict(list)
            for n, it in enumerate(asm['items']):
                dk, ck, w, dph, eph, expl = it[:6]
                conf = CONF[it[6]] if len(it) > 6 and it[6] else 'medium'
                docc = it[7] if len(it) > 7 else None
                eocc = it[8] if len(it) > 8 else None
                dim, cat = DIMS[dk], CATS[ck]
                if cat in ('preserved', 'changed') and (dph is None) != (eph is None):
                    problems.append(f'{gid} {dk}: {cat} evidence needs both phrases or neither')
                if cat == 'lost' and eph is not None:
                    problems.append(f'{gid} {dk}: lost evidence must not name an English phrase')
                if cat == 'added' and dph is not None:
                    problems.append(f'{gid} {dk}: added evidence must not invent a German phrase')
                ds = es = None
                dst = est = 'none'
                if dph:
                    ds, dst = locate(de, de_s, dph, docc)
                if eph:
                    partner = sent_index(de_s, ds['start']) if ds else None
                    es, est = locate(en, en_s, eph, eocc, partner, links, side='en')
                if dph and dst == 'ambiguous_occurrence' and es:   # resolve German repeats from the English side
                    ds2, dst2 = locate(de, de_s, dph, docc, sent_index(en_s, es['start']), links, side='de')
                    if dst2 == 'located_by_alignment':
                        ds, dst = ds2, dst2
                statuses = [s for s in (dst, est) if s != 'none']
                span_status = ('passage_level' if not statuses else
                               'unlocated' if 'unlocated' in statuses else
                               'ambiguous_occurrence' if 'ambiguous_occurrence' in statuses else 'located')
                aligned_ok = None
                if ds and es:
                    aligned_ok = (sent_index(de_s, ds['start']), sent_index(en_s, es['start'])) in links
                review = cat == 'uncertain' or conf == 'low' or span_status in ('unlocated', 'ambiguous_occurrence') or aligned_ok is False
                if span_status == 'unlocated':
                    problems.append(f'{gid} {dk}: unlocated phrase {dph!r} / {eph!r}')
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-{CODE[dk]}-{len(per_dim[dim]) + 1:03d}",
                    'passage_id': gid, 'dimension': dim, 'category': cat, 'weight': w,
                    'source_language': 'de', 'source_phrase': dph, 'target_language': 'en', 'target_phrase': eph,
                    'source_span': ds, 'target_span': es,
                    'source_anchor': anchor(ds, de_s) if ds else None, 'target_anchor': anchor(es, en_s) if es else None,
                    'span_status': span_status, 'sentence_alignment_verified': aligned_ok,
                    'explanation': expl, 'confidence': conf, 'requires_expert_review': review,
                    'provenance': asm.get('assessor', ASSESSOR_IN_SESSION),
                }
                per_dim[dim].append(ev)
                evidence.append(ev)
            # Comprehensive semantic coverage across all meaningful clauses in the paragraph
            assess_unassessed_clauses(gid, de, en, de_s, en_s, al, bilex, per_dim, evidence, asm)
            expand_contextual_dimensions(gid, de, en, de_s, en_s, al, bilex, per_dim, evidence, asm, has_dialogue)
            dims = {}
            for dk, dim in DIMS.items():
                dims[dim] = score_dimension(dim, per_dim[dim], asm.get('na', {}).get(dk), has_dialogue)
                dim_cov[dim][dims[dim]['applicability']] += 1
            s_asm = sentence_asm.get(gid)
            if s_asm is None and a.sentence_assessor == 'anthropic' and (not a.limit or api_calls < a.limit):
                s_asm = assess_sentences_with_api(gid, de_s, en_s, a.model)
                api_calls += 1
            sent_records, sprob = build_sentence_layer(gid, de_s, en_s, al, evidence, s_asm)
            problems += sprob
            for rec in sent_records:
                cov['sentence_groups'] += 1
                cov['sentence_groups_' + rec['basis']] += 1
                cov['sentences_' + rec['basis']] += len(rec['source_sentences']) + len(rec['target_sentences'])
                cov['sentence_label_' + rec['classification']] += 1
            cov['sentences_total'] += len(de_s) + len(en_s)
            cov['analyzed'] += 1
            cov['evidence'] += len(evidence)
            cov['unlocated_evidence'] += sum(1 for e in evidence if e['span_status'] == 'unlocated')
            cov['ambiguous_evidence'] += sum(1 for e in evidence if e['span_status'] == 'ambiguous_occurrence')
            cov['alignment_unverified_evidence'] += sum(1 for e in evidence if e['sentence_alignment_verified'] is False)
            passages[gid] = {
                'status': 'analyzed', 'alignment_confidence': r['confidence'], 'assessor': asm.get('assessor'),
                'text_hash': h, 'has_dialogue': has_dialogue,
                'sentence_alignment': {'sentences_de': len(de_s), 'sentences_en': len(en_s),
                                       'links': len(al['links']), 'link_types': al['types'],
                                       'unmatched_de': len(al['unmatched_de']), 'unmatched_en': len(al['unmatched_en'])},
                'dimensions': dims, 'evidence': evidence,
                'sentences': {'de': [[x['start'], x['end']] for x in de_s], 'en': [[x['start'], x['end']] for x in en_s]},
                'sentence_alignments': sent_records,
            }
    out = {
        'schema': SCHEMA, 'project_id': 'heidi',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'source': 'heidi_part1_side_by_side.json', 'source_language': 'de', 'target_language': 'en',
        'method': 'Eight-dimension phrase-level comparison; German original authoritative. See scripts/heidi_literary_pipeline.py.',
        'rubric': RUBRIC, 'sentence_schema': SENTENCE_SCHEMA, 'coverage': {**cov, 'dimension_applicability': {k: dict(v) for k, v in dim_cov.items()}},
        'passages': passages,
    }
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    os.makedirs(LIT, exist_ok=True)
    json.dump(manifest, open(MANIFEST, 'w', encoding='utf-8'), indent=0, sort_keys=True)
    print(json.dumps(out['coverage'], indent=1))
    print(f'{len(problems)} problem(s)')
    for p in problems[:80]:
        print('  ', p)
    print('bytes', os.path.getsize(OUT))


if __name__ == '__main__':
    main()
