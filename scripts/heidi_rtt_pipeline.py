#!/usr/bin/env python3
"""
Heidi Translation Analysis — Round-Trip / reverse-translation consistency pipeline (v2)
=====================================================================================

Direction (v2, fixed):
    Human English (Stork) → German original (Spyri) → AI back-translated English
    Compare Human English ↔ AI back-translated English.

  * ONLY the German original is sent to the NMT service; Stork's English is never sent.
  * This is a reverse-translation consistency check against the human English
    translation. The German text is the original; it is NOT treated as a
    translation of English.

Input (immutable): src/assets/data/heidi_part1_side_by_side.json — the only Heidi dataset.
                   Direct semantic scores are recomputed from it with the same method the app uses.
Output:            scripts/heidi_work/heidi_rtt_results.json (research report; the app generates
                   its own RTT in the browser and stores it per reviewer).

Back-translation model : MyMemory public NMT API, langpair de|en (keyless).
Similarity model       : heidi-english-lexical-sim-v1 — mirrored exactly in
                         src/app/heidi-analysis/services/heidi-rtt.service.ts (englishSimilarity)

    tokens = lower-cased [a-z][a-z'’]* ; English stop-words removed ; light suffix stemmer
    S = 100 × (0.45·Jaccard(stems) + 0.30·Dice(char 4-grams of stems)
               + 0.15·Jaccard(stem bigrams) + 0.10·min/max token-length ratio)

    Lexical, not a neural semantic model. Its scale is NOT calibrated against the
    direct semantic heuristic; |direct − RTT| ≥ threshold is reported only as a
    "Potential disagreement — review recommended". Only a SEMANTIC RTT score is
    produced; it is never reused for emotion, imagery, tone, voice or other dimensions.

Eligible groups: alignment status verified or aligned (curated confidence verified/high)
with both texts and a direct semantic score.

Cache key: sha256(group_id | german_text | model | config).

Usage:
    python3 scripts/heidi_rtt_pipeline.py --limit 20       # needs network access to api.mymemory.translated.net
    python3 scripts/heidi_rtt_pipeline.py --evaluate-only  # recompute the report from the cache
Note: MyMemory's anonymous quota is ~5,000 characters/day per IP.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SBS = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_part1_side_by_side.json')
CACHE = os.path.join(HERE, 'heidi_work', 'heidi_rtt_cache_v2.json')
REPORT = os.path.join(HERE, 'heidi_work', 'heidi_rtt_results.json')
sys.path.insert(0, HERE)

TRANSLATION_MODEL = 'MyMemory-NMT de|en'
SIMILARITY_MODEL = 'heidi-english-lexical-sim-v1'
CONFIG = 'v2'
JOIN = '\n\n'

EN_STOP = set("""a about after again all am an and any are as at be because been before being both but by can could did do does
doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself
just me more most my myself no nor not now of off on once only or other our ours out over own same she should so some such than that the
their theirs them themselves then there these they this those through to too under until up very was we were what when where which while
who whom why will with would you your yours yourself said says shall upon oh""".split())
EN_TOKEN = re.compile(r"[a-z][a-z’']*")


def en_stem(w):
    s = w.lower().replace('’', '').replace("'", '')
    for suf in ['ingly', 'edly', 'ing', 'ies', 'ied', 'ed', 'es', 'ly', 's']:
        if len(s) - len(suf) >= 3 and s.endswith(suf):
            s = s[:-len(suf)] + ('y' if suf in ('ies', 'ied') else '')
            break
    return s


def _lexical(sa, sb, la, lb):
    A, B = set(sa), set(sb)
    jac = len(A & B) / len(A | B)

    def grams(stems):
        g = set()
        for s0 in stems:
            s = f'_{s0}_'
            for i in range(max(1, len(s) - 3)):
                g.add(s[i:i + 4])
        return g
    ga, gb = grams(sa), grams(sb)
    dice = 2 * len(ga & gb) / (len(ga) + len(gb)) if ga and gb else 0.0
    ba, bb = set(zip(sa, sa[1:])), set(zip(sb, sb[1:]))
    big = len(ba & bb) / len(ba | bb) if (ba or bb) else jac
    lr = min(la, lb) / max(la, lb)
    return round(1000 * (0.45 * jac + 0.30 * dice + 0.15 * big + 0.10 * lr)) / 10


def english_similarity(a, b):
    ta, tb = EN_TOKEN.findall(a.lower()), EN_TOKEN.findall(b.lower())
    if not ta or not tb:
        return None
    fa = [t for t in ta if t not in EN_STOP] or ta
    fb = [t for t in tb if t not in EN_STOP] or tb
    return _lexical([en_stem(t) for t in fa], [en_stem(t) for t in fb], len(ta), len(tb))

DE_STOP = set("""aber alle allem allen aller alles als also am an ander andere auch auf aus bei bin bis bist da damit dann
das dass daß dem den denn der des dessen dich die dies diese diesem diesen dieser dieses dir doch dort du durch ein eine
einem einen einer eines er es etwas euch euer eure für hatte hatten hat habe haben hier ich ihm ihn ihnen ihr ihre im in
ins ist ja jetzt kann kein keine man mich mir mit muss nach nicht noch nun nur ob oder ohne sein seine sich sie sind so
um und uns unter vom von vor war waren was weil wenn wer wie wieder wir wird wo zu zum zur sehr schon""".split())


def cistem(word):
    """CISTEM stemmer, case-insensitive variant (reference implementation logic)."""
    if not word:
        return word
    w = word.lower().replace('ü', 'u').replace('ö', 'o').replace('ä', 'a').replace('ß', 'ss')
    w = re.sub(r'^ge(.{4,})', r'\1', w)
    w = w.replace('sch', '$').replace('ei', '%').replace('ie', '&')
    w = re.sub(r'(.)\1', r'\1*', w)
    while len(w) > 3:
        if len(w) > 5:
            w2 = re.sub(r'e[mr]$', '', w)
            if w2 != w:
                w = w2
                continue
            w2 = re.sub(r'nd$', '', w)
            if w2 != w:
                w = w2
                continue
        w2 = re.sub(r't$', '', w)
        if w2 != w:
            w = w2
            continue
        w2 = re.sub(r'[esn]$', '', w)
        if w2 != w:
            w = w2
            continue
        break
    w = re.sub(r'(.)\*', r'\1\1', w)
    return w.replace('&', 'ie').replace('%', 'ei').replace('$', 'sch')


TOKEN = re.compile(r'[a-zäöüß]+')


def german_similarity(a, b):
    ta = TOKEN.findall(a.lower())
    tb = TOKEN.findall(b.lower())
    if not ta or not tb:
        return None
    sa = [cistem(t) for t in ta if t not in DE_STOP] or [cistem(t) for t in ta]
    sb = [cistem(t) for t in tb if t not in DE_STOP] or [cistem(t) for t in tb]
    A, B = set(sa), set(sb)
    jac = len(A & B) / len(A | B)

    def grams(stems):
        g = set()
        for s in stems:
            s = f'_{s}_'
            for i in range(max(1, len(s) - 3)):
                g.add(s[i:i + 4])
        return g
    ga, gb = grams(sa), grams(sb)
    dice = 2 * len(ga & gb) / (len(ga) + len(gb)) if ga and gb else 0.0
    ba, bb = set(zip(sa, sa[1:])), set(zip(sb, sb[1:]))
    big = len(ba & bb) / len(ba | bb) if (ba or bb) else jac
    lr = min(len(ta), len(tb)) / max(len(ta), len(tb))
    return round(100 * (0.45 * jac + 0.30 * dice + 0.15 * big + 0.10 * lr), 1)


def cache_key(pid, de):
    return hashlib.sha256(f'{pid}|{de}|{TRANSLATION_MODEL}|{CONFIG}'.encode('utf-8')).hexdigest()


def mymemory_de_en(text):
    # MyMemory limits a single query to 500 bytes; translate sentence chunks.
    chunks, cur = [], ''
    for sent in re.split(r'(?<=[.!?])\s+', text):
        if len((cur + ' ' + sent).encode('utf-8')) > 450 and cur:
            chunks.append(cur)
            cur = sent
        else:
            cur = (cur + ' ' + sent).strip()
    if cur:
        chunks.append(cur)
    out = []
    for c in chunks:
        url = 'https://api.mymemory.translated.net/get?' + urllib.parse.urlencode({'q': c, 'langpair': 'de|en'})
        with urllib.request.urlopen(url, timeout=30) as r:
            j = json.loads(r.read().decode('utf-8'))
        if j.get('responseStatus') != 200:
            raise RuntimeError(j.get('responseDetails') or 'MyMemory error')
        out.append(j['responseData']['translatedText'])
        time.sleep(0.5)
    return ' '.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--threshold', type=float, default=15.0)
    ap.add_argument('--evaluate-only', action='store_true')
    a = ap.parse_args()
    from heidi_lexicon import Bilex
    import heidi_build_dataset as A
    bilex = Bilex()
    sbs = json.load(open(SBS, encoding='utf-8'))
    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    eligible = []
    for ch in sbs['chapters']:
        for r in ch['rows']:
            en = JOIN.join(p['text'] for p in r['en'])
            de = JOIN.join(p['text'] for p in r['de'])
            if r['confidence'] in ('verified', 'high') and en and de:
                eligible.append({'passage_id': r['id'], 'english_text': en, 'german_text': de,
                                 'direct': A.a_semantic(bilex, de, en)[1]})
    done = 0
    failures = []
    if not a.evaluate_only:
        for p in eligible:
            if a.limit and done >= a.limit:
                break
            k = cache_key(p['passage_id'], p['german_text'])
            if k in cache:
                continue
            try:
                bt = mymemory_de_en(p['german_text'])          # German original ONLY
            except Exception as e:  # noqa: BLE001
                failures.append({'passage_id': p['passage_id'], 'error': str(e)})
                print('FAILED', p['passage_id'], e)
                if 'QUOTA' in str(e).upper() or 'LIMIT' in str(e).upper():
                    break
                continue
            cache[k] = {'passage_id': p['passage_id'], 'back_translated_english': bt, 'translation_model': TRANSLATION_MODEL,
                        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds')}
            done += 1
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    results = []
    for p in eligible:
        k = cache_key(p['passage_id'], p['german_text'])
        if k not in cache:
            continue
        c = cache[k]
        rtt = english_similarity(p['english_text'], c['back_translated_english'])
        direct = p['direct']
        dis = round(abs(direct - rtt), 1) if (rtt is not None and direct is not None) else None
        results.append({'passage_id': p['passage_id'], 'input_hash': k, 'back_translated_english': c['back_translated_english'],
                        'translation_model': c['translation_model'], 'similarity_model': SIMILARITY_MODEL,
                        'generated_at': c['generated_at'], 'direct_semantic_score': direct, 'rtt_semantic_score': rtt,
                        'disagreement': dis, 'status': None if dis is None else ('disagreement' if dis >= a.threshold else 'agreement')})
    report = {
        'project_id': 'heidi', 'schema': 'heidi-rtt-v2',
        'direction': 'en_human (Stork) -> de_original (Spyri) -> en_ai (back-translation); compare en_human <-> en_ai',
        'label': 'Reverse-translation consistency check against the human English translation',
        'dimensions_evaluated': ['semantic'],
        'translation_model': TRANSLATION_MODEL, 'similarity_model': SIMILARITY_MODEL,
        'disagreement_threshold': a.threshold,
        'eligible_passages': len(eligible), 'completed': len(results),
        'disagreements': sum(1 for r in results if r['status'] == 'disagreement'),
        'failures': failures, 'results': results,
        'calibration_note': 'Similarity scale not calibrated against the direct semantic heuristic or expert judgements; above-threshold differences are potential disagreements for review only.',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }
    json.dump(report, open(REPORT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"RTT completed: {len(results)} of {len(eligible)} eligible passages; disagreements: {report['disagreements']}")


if __name__ == '__main__':
    sys.exit(main())
