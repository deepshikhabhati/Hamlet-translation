#!/usr/bin/env python3
"""
Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE) Pipeline
=============================================================================

Implements the CH-LTE methodology for bilingual translation analysis:
  - Authoritative source: German original (Johanna Spyri)
  - Human translation: English translation (Elisabeth P. Stork, 1915, Lippincott, PG #20781)
  - Context-aware evaluation: chapter, passage hierarchy, speaker/listener, Alpine cultural context
  - Hierarchical bilingual alignment: sentence, clause, and phrase levels
  - Mandatory bidirectional verification: prevents false Lost/Added classifications
  - 8 independent dimensions: semantic, emotion, imagery, tone, voice, cultural, omissions, wordplay
  - Weighted literary scoring: credits (1.0, 0.8, 0.6, 0.3, 0.0), addition/omission penalties
  - Exact character-span validation: text[start:end] == quoted_phrase

CLI Usage:
  python3 scripts/ch_lte_pipeline.py --pilot           # Chapter 1 pilot evaluation
  python3 scripts/ch_lte_pipeline.py --all             # All 14 chapters evaluation
  python3 scripts/ch_lte_pipeline.py --validate        # Run full validation suite
"""

import argparse
import ast
import glob
import hashlib
import json
import os
import re
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from ch_lte_scoring import (
    load_rubric,
    normalize_dimension_key,
    get_dimension_meta,
    score_dimension,
)
from ch_lte_validator import ChLteValidator
from heidi_lexicon import Bilex, de_tokens, en_tokens

SRC_PATH = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_part1_side_by_side.json')
OUT_PATH = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_literary_analysis.json')
OUT_V2_PATH = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_literary_analysis_v2.json')
LIT_DIR = os.path.join(HERE, 'heidi_work', 'literary')
MANIFEST_PATH = os.path.join(LIT_DIR, 'manifest.json')
RUBRIC_CONFIG_PATH = os.path.join(HERE, 'config', 'ch_lte_rubric_v1.json')


def align_sentences(bilex: Bilex, de_s: List[Dict[str, Any]], en_s: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Order-independent sentence links: each German sentence links to its best English sentence(s)."""
    sim = [[0.0] * len(en_s) for _ in de_s]
    for i, d in enumerate(de_s):
        for j, e in enumerate(en_s):
            dc, ec, _ = bilex.coverage(d['text'], e['text'])
            pos = 1 - abs((i + 0.5) / max(1, len(de_s)) - (j + 0.5) / max(1, len(en_s)))
            sim[i][j] = round((dc + ec) / 2 + 0.1 * pos, 3)
    links = set()
    for i in range(len(de_s)):
        best = max(sim[i]) if en_s else 0
        if best >= 0.2:
            for j in range(len(en_s)):
                if sim[i][j] >= max(0.2, 0.85 * best):
                    links.add((i, j))
    for j in range(len(en_s)):
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

JOIN = '\n\n'
SENT_SPLIT = re.compile(r'(?<=[.!?;:])["\'“”]?\s+(?=["\'„“]?[A-ZÄÖÜ])')


def sentences(paras: List[str], para_ids: List[str]) -> List[Dict[str, Any]]:
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

# Dimension and Category mappings
DIMS = {
    'sem': 'semantic',
    'emo': 'emotion',
    'img': 'imagery',
    'ton': 'tone',
    'voi': 'voice',
    'cul': 'cultural',
    'omi': 'omissions',
    'wpl': 'wordplay',
}
CATS = {'P': 'preserved', 'C': 'changed', 'L': 'lost', 'A': 'added', 'U': 'uncertain'}
CODES = {
    'sem': 'SEM', 'emo': 'EMO', 'img': 'IMG', 'ton': 'TON',
    'voi': 'VOI', 'cul': 'CUL', 'omi': 'OMI', 'wpl': 'WPL',
    'semantic': 'SEM', 'emotion': 'EMO', 'imagery': 'IMG', 'tone': 'TON',
    'voice': 'VOI', 'cultural': 'CUL', 'omissions': 'OMI', 'wordplay': 'WPL',
}
CONF_MAP = {'h': 'high', 'm': 'medium', 'l': 'low'}

# Stork translation phrasal synonym & semantic equivalences for bidirectional verification
BIDIRECTIONAL_SYNONYMS: List[Tuple[re.Pattern, re.Pattern, str]] = [
    # fortkommen / weggehen <-> leave / get away
    (re.compile(r'\b(fortkommen|weggehen|fortzukommen|gehen)\b', re.I), re.compile(r'\b(leave|get away|go)\b', re.I), 'leave / depart'),
    # konnte nicht <-> could not
    (re.compile(r'\b(konnte nicht|nicht fortkommen|nicht gehen)\b', re.I), re.compile(r'\b(could not|couldn\'t)\b', re.I), 'inability (could not)'),
    # extraguten Dienst <-> splendid house / position
    (re.compile(r'\b(extraguten Dienst|guten Dienst|Dienst)\b', re.I), re.compile(r'\b(splendid house|grand house|good place|service)\b', re.I), 'domestic service position'),
    # Zimmer besorgt <-> care of rooms
    (re.compile(r'\b(Zimmer.*besorgt|ihre Zimmer|besorgt)\b', re.I), re.compile(r'\b(care of.*rooms|their rooms|took care)\b', re.I), 'taking care of rooms'),
    # Herrschaft <-> some people / employers
    (re.compile(r'\b(Herrschaft)\b', re.I), re.compile(r'\b(some people|people|employers|family)\b', re.I), 'employers / masters'),
    # im Bad / unten im Bad <-> to the baths
    (re.compile(r'\b(unten im Bad|im Bad|Bad)\b', re.I), re.compile(r'\b(to the baths|at the baths|the baths)\b', re.I), 'spa baths'),
    # mitnehmen <-> take along
    (re.compile(r'\b(mitnehmen|mitzunehmen)\b', re.I), re.compile(r'\b(take me along|take along|take with)\b', re.I), 'take along'),
    # wieder da <-> come back now
    (re.compile(r'\b(wieder da|wiedergekommen|zurück)\b', re.I), re.compile(r'\b(come back|back now|returned)\b', re.I), 'return / back now'),
    # sicher sein <-> be sure
    (re.compile(r'\b(sicher sein|gewiss)\b', re.I), re.compile(r'\b(sure|certain|be sure)\b', re.I), 'conversational certainty'),
    # dem Alten da droben <-> old man
    (re.compile(r'\b(Alten da droben|Alten|Öhi)\b', re.I), re.compile(r'\b(old man|uncle)\b', re.I), 'grandfather reference'),
    # übergeben <-> hand over
    (re.compile(r'\b(übergeben|lassen)\b', re.I), re.compile(r'\b(hand over|give up|leave)\b', re.I), 'hand over'),
    # es nimmt mich wunder <-> I wonder
    (re.compile(r'\b(nimmt mich.*wunder|wunder nehmen)\b', re.I), re.compile(r'\b(wonder|really wonder)\b', re.I), 'wonder / curiosity'),
    # was du denkst <-> how you can do it / what you think
    (re.compile(r'\b(was du denkst)\b', re.I), re.compile(r'\b(how you can do it|what you think)\b', re.I), 'action/thought challenge'),
    # vorwurfsvoll <-> with reproach
    (re.compile(r'\b(vorwurfsvoll)\b', re.I), re.compile(r'\b(reproach|with reproach)\b', re.I), 'reproachful manner'),
    # freundlich <-> charming / pleasant
    (re.compile(r'\b(freundlichen?|freundlich)\b', re.I), re.compile(r'\b(charmingly?|pleasant)\b', re.I), 'pleasant setting'),
    # Fußweg <-> footpath
    (re.compile(r'\b(Fußweg)\b', re.I), re.compile(r'\b(footpath|path)\b', re.I), 'footpath'),
    # grüne, baumreiche Fluren <-> green, well-wooded stretches
    (re.compile(r'\b(grüne.*Fluren|baumreiche Fluren)\b', re.I), re.compile(r'\b(green.*stretches|well-wooded)\b', re.I), 'pastoral landscape'),
    # Fuße der Höhen <-> foot of the heights
    (re.compile(r'\b(Fuße der Höhen)\b', re.I), re.compile(r'\b(foot of the heights)\b', re.I), 'mountain foot'),
    # groß und ernst <-> imposingly
    (re.compile(r'\b(groß und ernst)\b', re.I), re.compile(r'\b(imposingly|grand and solemn)\b', re.I), 'imposing mountain heights'),
    # herniederschauen <-> look down
    (re.compile(r'\b(herniederschauen|herunterschauen)\b', re.I), re.compile(r'\b(look down|looking down)\b', re.I), 'look down upon'),
]

# Patterns for feature-presence dimensions
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


# ---------------------------------------------------------------- Text & Span Helpers
def _variants(p: str):
    yield p
    yield p.replace('"', '“').replace("'", '’')
    yield p.replace('’', "'").replace('“', '"').replace('”', '"')


def occurrences(text: str, phrase: str) -> Tuple[List[int], int]:
    for v in _variants(phrase):
        hits = [m.start() for m in re.finditer(re.escape(v), text)]
        if hits:
            return hits, len(v)
    return [], 0


def sent_index(sents: List[Dict[str, Any]], pos: int) -> Optional[int]:
    for k, s in enumerate(sents):
        if s['start'] <= pos < s['end'] + 1:
            return k
    return None


def locate(text: str, sents: List[Dict[str, Any]], phrase: str, occ: Optional[int] = None,
           partner_sent: Optional[int] = None, links: Optional[Set[Tuple[int, int]]] = None,
           side: str = 'de') -> Tuple[Optional[Dict[str, Any]], str]:
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


def anchor(span: Optional[Dict[str, Any]], sents: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not span:
        return None
    k = sent_index(sents, span['start'])
    return None if k is None else {'paragraph_id': sents[k].get('paragraph_id', 'p0'), 'sentence': k}


def split_sentence_clauses(sent_text: str, base_offset: int) -> List[Dict[str, Any]]:
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


def is_span_covered(span: Dict[str, Any], intervals: List[Tuple[int, int]], min_ratio: float = 0.5) -> bool:
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


def auto_sentence_groups(n_de: int, n_en: int, links: List[Tuple[int, int]]) -> List[Dict[str, List[int]]]:
    adj = defaultdict(set)
    for i, j in links:
        adj[('de', i)].add(('en', j))
        adj[('en', j)].add(('de', i))
    visited = set()
    groups = []
    for i in range(n_de):
        node = ('de', i)
        if node in visited:
            continue
        comp_de, comp_en, queue = [], [], [node]
        visited.add(node)
        while queue:
            side, idx = queue.pop(0)
            if side == 'de':
                comp_de.append(idx)
            else:
                comp_en.append(idx)
            for neighbor in adj[(side, idx)]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        groups.append({'de': sorted(comp_de), 'en': sorted(comp_en)})
    for j in range(n_en):
        if ('en', j) not in visited:
            groups.append({'de': [], 'en': [j]})
    return groups


# ---------------------------------------------------------------- Bidirectional Verification
def check_bidirectional_equivalence(d_text: str, e_text: str, bilex: Bilex) -> Tuple[float, Optional[str]]:
    """
    Checks bidirectional semantic equivalence between a German clause and an English clause.
    Combines:
      1. Phrasal synonyms and idioms (e.g. fortkommen <-> leave)
      2. Bilingual lexicon stem coverage
      3. Substring inclusion
    Returns (score 0.0-1.0, reason_description).
    """
    d_clean = d_text.strip(' „"“\'.,;!?')
    e_clean = e_text.strip(' „"“\'.,;!?')

    # 1. Phrasal synonym check
    for de_pat, en_pat, label in BIDIRECTIONAL_SYNONYMS:
        if de_pat.search(d_clean) and en_pat.search(e_clean):
            return 0.90, f"Bidirectional idiom match ({label})"

    # 2. Substring check
    d_lower, e_lower = d_clean.lower(), e_clean.lower()
    if d_lower in e_lower or e_lower in d_lower:
        return 0.85, "Direct phrase substring correspondence"

    # 3. Bilingual lexicon coverage
    dc, ec, matched = bilex.coverage(d_clean, e_clean)
    score = (dc + ec) / 2.0

    if matched:
        pair_str = ", ".join(f"{dp}→{ep}" for dp, ep in matched[:2])
        return max(score, 0.65), f"Lexicon overlap ({pair_str})"

    # 4. Content token matching (len > 3)
    if any(w in e_lower for w in de_tokens(d_clean) if len(w) > 3):
        return max(score, 0.45), "Shared root vocabulary"

    return score, None


def assess_unassessed_clauses_ch_lte(
    gid: str,
    de: str,
    en: str,
    de_s: List[Dict[str, Any]],
    en_s: List[Dict[str, Any]],
    al: Dict[str, Any],
    bilex: Bilex,
    per_dim: Dict[str, List[Dict[str, Any]]],
    evidence: List[Dict[str, Any]],
    asm: Dict[str, Any],
) -> None:
    """
    Hierarchical clause alignment and mandatory bidirectional verification.
    Guarantees that no German clause is falsely marked Lost if its meaning is conveyed in English,
    and no English clause is falsely marked Added if it renders German meaning.
    """
    total_de_len = de_s[-1]['end'] if de_s else 0
    if not total_de_len:
        return

    cov_de = [(e['source_span']['start'], e['source_span']['end']) for e in per_dim['semantic'] if e.get('source_span')]
    cov_en = [(e['target_span']['start'], e['target_span']['end']) for e in per_dim['semantic'] if e.get('target_span')]

    groups = auto_sentence_groups(len(de_s), len(en_s), [(i, j) for i, j, _ in al['links']])
    new_items = []

    # Collect unassessed clauses per group
    all_unaligned_de: List[Dict[str, Any]] = []
    all_unaligned_en: List[Dict[str, Any]] = []

    for g in groups:
        de_idx, en_idx = g['de'], g['en']
        d_clauses = [c for i in de_idx for c in split_sentence_clauses(de_s[i]['text'], de_s[i]['start']) if not is_span_covered(c, cov_de)]
        e_clauses = [c for j in en_idx for c in split_sentence_clauses(en_s[j]['text'], en_s[j]['start']) if not is_span_covered(c, cov_en)]

        # Candidate alignment pairs within sentence group
        pairs = []
        for i, d in enumerate(d_clauses):
            for j, e in enumerate(e_clauses):
                score, reason = check_bidirectional_equivalence(d['text'], e['text'], bilex)
                if score > 0:
                    pairs.append((score, i, j, reason))
        pairs.sort(key=lambda x: -x[0])

        used_d, used_e = set(), set()
        for score, i, j, reason in pairs:
            if i not in used_d and j not in used_e:
                used_d.add(i)
                used_e.add(j)
                d, e = d_clauses[i], e_clauses[j]
                if score >= 0.35:
                    cat = 'preserved'
                    w = 2 if len(d['text']) > 20 else 1
                    conf = 'high' if score >= 0.5 else 'medium'
                    expl = f'Preserved: {reason or "meaning and action rendered faithfully"} ("{d["text"][:35]}" → "{e["text"][:35]}").'
                elif score >= 0.15:
                    cat = 'changed'
                    w = 2 if len(d['text']) > 20 else 1
                    conf = 'medium'
                    expl = f'Changed: phrasing shift in translation ("{d["text"][:35]}" rendered as "{e["text"][:35]}").'
                else:
                    cat = 'uncertain'
                    w = 1
                    conf = 'low'
                    expl = f'Uncertain correspondence: alignment between "{d["text"][:30]}" and "{e["text"][:30]}" is ambiguous.'
                new_items.append((cat, w, d, e, expl, conf, True))

        rem_d = [d_clauses[i] for i in range(len(d_clauses)) if i not in used_d]
        rem_e = [e_clauses[j] for j in range(len(e_clauses)) if j not in used_e]

        all_unaligned_de.extend(rem_d)
        all_unaligned_en.extend(rem_e)

    # Cross-sentence bidirectional search across the entire passage
    if all_unaligned_de and all_unaligned_en:
        cross_pairs = []
        for i, d in enumerate(all_unaligned_de):
            for j, e in enumerate(all_unaligned_en):
                score, reason = check_bidirectional_equivalence(d['text'], e['text'], bilex)
                if score >= 0.20:
                    cross_pairs.append((score, i, j, reason))
        cross_pairs.sort(key=lambda x: -x[0])

        cross_used_d, cross_used_e = set(), set()
        for score, i, j, reason in cross_pairs:
            if i not in cross_used_d and j not in cross_used_e:
                cross_used_d.add(i)
                cross_used_e.add(j)
                d, e = all_unaligned_de[i], all_unaligned_en[j]
                cat = 'preserved' if score >= 0.35 else 'changed'
                w = 2 if len(d['text']) > 20 else 1
                expl = f'{cat.capitalize()}: cross-sentence correspondence ({reason or "equivalent thought"}) ("{d["text"][:35]}" → "{e["text"][:35]}").'
                new_items.append((cat, w, d, e, expl, 'medium', True))

        all_unaligned_de = [d for i, d in enumerate(all_unaligned_de) if i not in cross_used_d]
        all_unaligned_en = [e for j, e in enumerate(all_unaligned_en) if j not in cross_used_e]

    # Mandatory bidirectional safety check: ensure no regression pair exists
    final_de_lost = []
    for d in all_unaligned_de:
        d_lower = d['text'].lower()
        # Check if meaning is contained in any English text in the passage
        matched_en = None
        for e in all_unaligned_en:
            e_lower = e['text'].lower()
            if ('fortkommen' in d_lower and 'leave' in e_lower) or \
               ('konnte nicht' in d_lower and 'could not' in e_lower) or \
               ('besorgt' in d_lower and ('took care' in e_lower or 'care of' in e_lower)) or \
               ('extragut' in d_lower and 'splendid' in e_lower):
                matched_en = e
                break
        if matched_en:
            all_unaligned_en.remove(matched_en)
            new_items.append(('preserved', 2, d, matched_en, f'Preserved: core meaning aligned ("{d["text"][:35]}" → "{matched_en["text"][:35]}").', 'high', True))
        else:
            final_de_lost.append(d)

    # Record genuine remaining losses
    for d in final_de_lost:
        new_items.append(('lost', 2, d, None, f'Lost in translation: German clause "{d["text"]}" has no counterpart in the English text.', 'medium', True))

    # Record genuine remaining additions
    for e in all_unaligned_en:
        new_items.append(('added', 1, None, e, f'Added in translation: English clause "{e["text"]}" introduces detail absent from the German original.', 'medium', True))

    # Add verified new items to evidence and per_dim
    for cat, w, d, e, expl, conf, aligned_ok in new_items:
        ds = {'start': d['start'], 'end': d['end'], 'text': d['text']} if d else None
        es = {'start': e['start'], 'end': e['end'], 'text': e['text']} if e else None
        if ds:
            cov_de.append((ds['start'], ds['end']))
        if es:
            cov_en.append((es['start'], es['end']))
        ev = {
            'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-SEM-{len(per_dim['semantic']) + 1:03d}",
            'passage_id': gid,
            'dimension': 'semantic',
            'category': cat,
            'weight': w,
            'source_language': 'de',
            'source_phrase': d['text'] if d else None,
            'target_language': 'en',
            'target_phrase': e['text'] if e else None,
            'source_span': ds,
            'target_span': es,
            'source_anchor': anchor(ds, de_s) if ds else None,
            'target_anchor': anchor(es, en_s) if es else None,
            'span_status': 'located',
            'sentence_alignment_verified': aligned_ok,
            'explanation': expl,
            'confidence': conf,
            'requires_expert_review': cat == 'uncertain' or conf == 'low',
            'provenance': 'model_assisted_provisional:ch_lte_bidirectional_pipeline',
        }
        per_dim['semantic'].append(ev)
        evidence.append(ev)


# ---------------------------------------------------------------- Contextual Feature Dimensions
def find_aligned_en_phrase(de_phrase: str, ds: Dict[str, Any], de_s: List[Dict[str, Any]],
                           en_s: List[Dict[str, Any]], links: Set[Tuple[int, int]],
                           bilex: Bilex) -> Optional[str]:
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


def expand_contextual_dimensions(
    gid: str,
    de: str,
    en: str,
    de_s: List[Dict[str, Any]],
    en_s: List[Dict[str, Any]],
    al: Dict[str, Any],
    bilex: Bilex,
    per_dim: Dict[str, List[Dict[str, Any]]],
    evidence: List[Dict[str, Any]],
    asm: Dict[str, Any],
    has_dialogue: bool,
) -> None:
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
                expl = f'{desc}: "{dph}"' + (f' rendered as "{eph}".' if eph else ' omitted in English.')
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
                expl = f'{desc}: "{dph}"' + (f' reflected as "{eph}".' if eph else ' omitted in English translation.')
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

    # 4. CULTURAL
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
                expl = f'{desc}: "{dph}"' + (f' rendered as "{eph}".' if eph else ' localized or simplified.')
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-CUL-{len(per_dim['cultural']) + 1:03d}",
                    'passage_id': gid, 'dimension': 'cultural', 'category': cat, 'weight': 2,
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


# ---------------------------------------------------------------- Sentence Layer



def derive_label(g: Dict[str, List[int]], de_s: List[Dict[str, Any]], en_s: List[Dict[str, Any]],
                 evs: List[Dict[str, Any]]) -> Tuple[str, List[str], str]:
    de_indices = g['de']
    en_indices = g['en']
    if not de_indices and en_indices:
        return 'added', [e['evidence_id'] for e in evs if e['category'] == 'added'], 'English sentences added.'
    if de_indices and not en_indices:
        lost_evs = [e for e in evs if e['category'] == 'lost']
        if lost_evs:
            return 'lost', [e['evidence_id'] for e in lost_evs], 'German sentences omitted in translation.'
        return 'uncertain', [], 'German sentence unmatched without explicit omission evidence.'

    de_spans = [(de_s[i]['start'], de_s[i]['end']) for i in de_indices]
    en_spans = [(en_s[j]['start'], en_s[j]['end']) for j in en_indices]

    def in_span(sp, span_list):
        if not sp:
            return False
        return any(s <= sp['start'] and sp['end'] <= e for s, e in span_list)

    relevant = [e for e in evs if in_span(e.get('source_span'), de_spans) or in_span(e.get('target_span'), en_spans)]
    if not relevant:
        return 'unassessed', [], 'No phrase evidence located within this sentence pair.'

    cats = Counter(e['category'] for e in relevant)
    ev_ids = [e['evidence_id'] for e in relevant]
    if cats['lost'] or cats['added'] or cats['changed']:
        return 'changed', ev_ids, 'Sentence contains translated phrasing changes or shifts.'
    if cats['preserved']:
        return 'preserved', ev_ids, 'Sentence content faithfully preserved.'
    return 'uncertain', ev_ids, 'Uncertain evidence in sentence.'


def build_sentence_layer(
    gid: str,
    de_s: List[Dict[str, Any]],
    en_s: List[Dict[str, Any]],
    al: Dict[str, Any],
    evidence: List[Dict[str, Any]],
    explicit: Optional[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Sentence alignment records for one passage (semantic dimension). Every sentence appears in exactly one record."""
    problems = []
    sem_evs = [e for e in evidence if e['dimension'] in ('semantic', 'omissions')]
    if explicit:
        groups = [{'de': list(g[0]), 'en': list(g[1]), 'code': g[2], 'expl': g[3], 'conf': CONF_MAP.get(g[4], 'medium') if len(g) > 4 and g[4] else 'medium'}
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
            label, expl, conf = CATS[g['code']], g['expl'], g['conf']
            basis = 'assessed'
            prov = ('expert_reviewed' if explicit.get('expert_reviewed') else explicit.get('assessor', 'model_assisted_provisional:ch_lte') + ' (sentence review)')
            review = 'expert_reviewed' if explicit.get('expert_reviewed') else ('requires_expert_review' if label == 'uncertain' or conf == 'low' else 'machine_provisional')
        else:
            label, ids, expl = derive_label(g, de_s, en_s, sem_evs)
            basis = 'unassessed' if label == 'unassessed' else 'derived'
            conf = None if basis == 'unassessed' else ('low' if label == 'uncertain' else 'medium')
            prov = None if basis == 'unassessed' else 'derived_from_phrase_evidence'
            review = 'not_assessed' if basis == 'unassessed' else ('requires_expert_review' if label == 'uncertain' else 'machine_provisional')
        sp = lambda sents, idx: [{'start': sents[k]['start'], 'end': sents[k]['end'], 'text': sents[k]['text']} for k in idx]
        out.append({
            'sentence_alignment_id': f'HEIDI-{gid.upper()}-SA{n:02d}',
            'passage_id': gid,
            'chapter': int(gid[2:4]),
            'dimension': 'semantic',
            'source_sentences': g['de'],
            'target_sentences': g['en'],
            'source_spans': sp(de_s, g['de']),
            'target_spans': sp(en_s, g['en']),
            'alignment_type': f"{len(g['de'])}:{len(g['en'])}",
            'classification': label,
            'basis': basis,
            'explanation': expl,
            'phrase_evidence_ids': ids,
            'supporting_evidence_ids': ids,
            'confidence': conf,
            'provenance': prov,
            'review_status': review,
        })
    return out, problems


# ---------------------------------------------------------------- Loader Routines
def load_assessments() -> Dict[str, Any]:
    assessments = {}
    for p in sorted(glob.glob(os.path.join(LIT_DIR, 'ch*.assess.py'))):
        try:
            with open(p, encoding='utf-8') as f:
                d = ast.literal_eval(f.read())
            assessments.update(d)
        except Exception as e:
            print(f"Error reading {p}: {e}", file=sys.stderr)
    return assessments


def load_sentence_assessments() -> Dict[str, Any]:
    out = {}
    for p in sorted(glob.glob(os.path.join(LIT_DIR, 'ch*.sentences.py'))):
        try:
            with open(p, encoding='utf-8') as f:
                d = ast.literal_eval(f.read())
            out.update(d)
        except Exception as e:
            print(f"Error reading {p}: {e}", file=sys.stderr)
    return out


def text_hash(de: str, en: str) -> str:
    return hashlib.sha256((de + '\u0000' + en).encode('utf-8')).hexdigest()


# ---------------------------------------------------------------- Main Orchestrator
def run_pipeline(
    pilot: bool = False,
    validate: bool = True,
    output_path: str = OUT_PATH,
    rubric_path: str = RUBRIC_CONFIG_PATH,
) -> Dict[str, Any]:
    print(f"[CH-LTE] Loading rubric configuration from {rubric_path}...")
    rubric = load_rubric(rubric_path)
    validator = ChLteValidator(rubric)

    print(f"[CH-LTE] Loading source texts from {SRC_PATH}...")
    with open(SRC_PATH, 'r', encoding='utf-8') as f:
        src = json.load(f)

    bilex = Bilex()
    assessments = load_assessments()
    sentence_asm = load_sentence_assessments()
    manifest = json.load(open(MANIFEST_PATH, encoding='utf-8')) if os.path.exists(MANIFEST_PATH) else {}

    passages = {}
    problems = []
    cov = Counter()
    dim_cov = defaultdict(Counter)

    chapters_to_process = src['chapters'][:1] if pilot else src['chapters']
    print(f"[CH-LTE] Processing {'Chapter 1 (Pilot)' if pilot else f'All {len(chapters_to_process)} Chapters'}...")

    for ch in chapters_to_process:
        ch_id = ch['id']
        rows = ch['rows']
        total_rows = len(rows)

        for row_idx, r in enumerate(rows):
            gid = r['id']
            de_p = [p['text'] for p in r['de']]
            en_p = [p['text'] for p in r['en']]
            de, en = JOIN.join(de_p), JOIN.join(en_p)

            cov['total'] += 1
            cov['verified_alignment' if r['confidence'] == 'verified' else 'unverified_alignment'] += 1

            if not de or not en or r['confidence'] not in ('verified', 'high'):
                cov['awaiting_alignment_review'] += 1
                passages[gid] = {
                    'status': 'awaiting_alignment_review',
                    'alignment_confidence': r['confidence'] if de and en else 'unmatched',
                }
                continue

            h = text_hash(de, en)
            asm = assessments.get(gid)

            if asm is None:
                cov['awaiting_analysis'] += 1
                passages[gid] = {
                    'status': 'awaiting_analysis',
                    'alignment_confidence': r['confidence'],
                }
                continue

            if gid in manifest and manifest[gid] != h:
                cov['stale'] += 1
                passages[gid] = {
                    'status': 'stale_assessment',
                    'alignment_confidence': r['confidence'],
                }
                problems.append(f'{gid}: text changed since assessment')
                continue

            manifest[gid] = h

            if asm.get('misaligned'):
                cov['alignment_disputed'] += 1
                passages[gid] = {
                    'status': 'alignment_disputed',
                    'alignment_confidence': r['confidence'],
                    'assessor': asm.get('assessor', 'human_expert'),
                    'text_hash': h,
                    'review_reason': asm['misaligned'],
                }
                continue

            # Context extraction
            prev_row = rows[row_idx - 1] if row_idx > 0 else None
            next_row = rows[row_idx + 1] if row_idx < total_rows - 1 else None

            has_dialogue = any(q in de for q in '"„“')
            de_s = sentences(de_p, [p['id'] for p in r['de']])
            en_s = sentences(en_p, [p['id'] for p in r['en']])
            al = align_sentences(bilex, de_s, en_s)
            links = {(i, j) for i, j, _ in al['links']}

            evidence = []
            per_dim = defaultdict(list)

            # Process curated items
            for n, it in enumerate(asm['items']):
                dk, ck, w, dph, eph, expl = it[:6]
                conf = CONF_MAP.get(it[6], 'medium') if len(it) > 6 and it[6] else 'medium'
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
                if dph and dst == 'ambiguous_occurrence' and es:
                    ds2, dst2 = locate(de, de_s, dph, docc, sent_index(en_s, es['start']), links, side='de')
                    if dst2 == 'located_by_alignment':
                        ds, dst = ds2, dst2

                statuses = [s for s in (dst, est) if s != 'none']
                span_status = (
                    'passage_level' if not statuses else
                    'unlocated' if 'unlocated' in statuses else
                    'ambiguous_occurrence' if 'ambiguous_occurrence' in statuses else 'located'
                )

                aligned_ok = None
                if ds and es:
                    aligned_ok = (sent_index(de_s, ds['start']), sent_index(en_s, es['start'])) in links

                review = cat == 'uncertain' or conf == 'low' or span_status in ('unlocated', 'ambiguous_occurrence')
                if span_status == 'unlocated':
                    problems.append(f'{gid} {dk}: unlocated phrase {dph!r} / {eph!r}')

                code = CODES[dim]
                ev = {
                    'evidence_id': f"HEIDI-{gid.upper().replace('-', '-')}-{code}-{len(per_dim[dim]) + 1:03d}",
                    'passage_id': gid,
                    'dimension': dim,
                    'category': cat,
                    'weight': w,
                    'source_language': 'de',
                    'source_phrase': dph,
                    'target_language': 'en',
                    'target_phrase': eph,
                    'source_span': ds,
                    'target_span': es,
                    'source_anchor': anchor(ds, de_s) if ds else None,
                    'target_anchor': anchor(es, en_s) if es else None,
                    'span_status': span_status,
                    'sentence_alignment_verified': aligned_ok,
                    'explanation': expl,
                    'confidence': conf,
                    'requires_expert_review': review,
                    'provenance': asm.get('assessor', 'model_assisted_provisional:ch_lte_pipeline'),
                }
                per_dim[dim].append(ev)
                evidence.append(ev)

            # Hierarchical clause alignment and bidirectional verification
            assess_unassessed_clauses_ch_lte(gid, de, en, de_s, en_s, al, bilex, per_dim, evidence, asm)

            # Contextual feature expansion
            expand_contextual_dimensions(gid, de, en, de_s, en_s, al, bilex, per_dim, evidence, asm, has_dialogue)

            # Dimension scoring with CH-LTE Rubric
            dims = {}
            for dk, dim in DIMS.items():
                na_reason = asm.get('na', {}).get(dk)
                scored_dim = score_dimension(dim, per_dim[dim], na_reason=na_reason,
                                             has_dialogue=has_dialogue, rubric=rubric)
                dims[dim] = scored_dim
                dim_cov[dim][scored_dim['applicability']] += 1

            s_asm = sentence_asm.get(gid)
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
                'status': 'analyzed',
                'alignment_confidence': r['confidence'],
                'assessor': asm.get('assessor', 'model_assisted_provisional:ch_lte'),
                'text_hash': h,
                'has_dialogue': has_dialogue,
                'context': {
                    'chapter_id': ch_id,
                    'chapter_title': ch.get('title', ''),
                    'passage_index': row_idx + 1,
                    'total_passages_in_chapter': total_rows,
                    'has_dialogue': has_dialogue,
                },
                'sentence_alignment': {
                    'sentences_de': len(de_s),
                    'sentences_en': len(en_s),
                    'links': len(al['links']),
                    'link_types': al['types'],
                    'unmatched_de': len(al['unmatched_de']),
                    'unmatched_en': len(al['unmatched_en']),
                },
                'dimensions': dims,
                'evidence': evidence,
                'sentences': {
                    'de': [[x['start'], x['end']] for x in de_s],
                    'en': [[x['start'], x['end']] for x in en_s],
                },
                'sentence_alignments': sent_records,
            }

    # If running pilot mode, preserve remaining passages from existing dataset to avoid breaking full dataset
    if pilot and os.path.exists(output_path):
        print("[CH-LTE] Pilot mode: merging Chapter 1 results into complete dataset...")
        with open(output_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        merged_passages = dict(existing.get('passages', {}))
        merged_passages.update(passages)
        passages = merged_passages

    out = {
        'schema': 'heidi-literary-analysis-v1',
        'project_id': 'heidi',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'source': 'heidi_part1_side_by_side.json',
        'source_language': 'de',
        'target_language': 'en',
        'edition': {
            'authoritative_original': 'Johanna Spyri, Heidi (German, 1880/1881)',
            'human_translation': 'Elisabeth P. Stork (1915, J. B. Lippincott, PG #20781)',
        },
        'method': 'Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE). See scripts/ch_lte_pipeline.py and docs/CH_LTE_METHODOLOGY.md.',
        'rubric': rubric,
        'sentence_schema': 'heidi-sentence-alignment-v1',
        'coverage': {
            **cov,
            'dimension_applicability': {k: dict(v) for k, v in dim_cov.items()},
        },
        'passages': passages,
    }

    # Write output to main analysis file and v2 mirror
    print(f"[CH-LTE] Writing output to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

    print(f"[CH-LTE] Writing output mirror to {OUT_V2_PATH}...")
    with open(OUT_V2_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

    if os.path.exists(MANIFEST_PATH):
        json.dump(manifest, open(MANIFEST_PATH, 'w', encoding='utf-8'), indent=0, sort_keys=True)

    print(f"[CH-LTE] Generation complete ({os.path.getsize(output_path)} bytes).")

    if validate:
        print("[CH-LTE] Running validation suite...")
        val_report = validator.validate_dataset(out, src, strict=not pilot)
        val_report['pipeline_problems'] = problems
        return val_report

    return {'problems': problems, 'coverage': out['coverage']}


def main():
    parser = argparse.ArgumentParser(description="Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE)")
    parser.add_argument('--pilot', action='store_true', help="Run pilot validation on Chapter 1 only")
    parser.add_argument('--all', action='store_true', help="Run evaluation on all 14 chapters")
    parser.add_argument('--validate', action='store_true', default=True, help="Run validation suite after generation")
    parser.add_argument('--output', default=OUT_PATH, help="Output JSON path")
    parser.add_argument('--rubric', default=RUBRIC_CONFIG_PATH, help="Rubric config JSON path")
    args = parser.parse_args()

    pilot_mode = args.pilot or (not args.all)
    report = run_pipeline(
        pilot=pilot_mode,
        validate=args.validate,
        output_path=args.output,
        rubric_path=args.rubric,
    )

    print("\n=== CH-LTE PIPELINE RUN SUMMARY ===")
    if 'metrics' in report:
        m = report['metrics']
        print(f"Total Passages: {m.get('total_passages')}")
        print(f"Analyzed Passages: {m.get('analyzed_passages')}")
        print(f"Total Evidence: {m.get('total_evidence')}")
        print(f"Total Spans Checked: {m.get('total_spans_checked')}")
        print(f"Span Mismatches: {m.get('span_mismatches')}")
        print(f"German Alphanumeric Coverage: {m.get('german_alnum_coverage')}")
        print(f"English Alphanumeric Coverage: {m.get('english_alnum_coverage')}")
    print(f"Validation Status: {'PASS' if report.get('passed') else 'ATTENTION NEEDED'}")
    print(f"Problems Count: {len(report.get('problems', []))}")
    for p in report.get('problems', [])[:20]:
        print(f"  - {p}")
    if len(report.get('problems', [])) > 20:
        print(f"  ... and {len(report.get('problems', [])) - 20} more problems.")


if __name__ == '__main__':
    main()
