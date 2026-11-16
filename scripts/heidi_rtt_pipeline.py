#!/usr/bin/env python3
"""
Heidi Translation Analysis v1.0 — Round-Trip Translation (RTT) pipeline
======================================================================

Direction (fixed):  German original  →  Stork's English (human)  →  AI German
  * ONLY the English human translation is sent to the NMT service.
  * The original German is never sent; it is used solely as the evaluation
    reference.

Back-translation model : MyMemory public NMT API, langpair en|de (keyless;
                         the same provider the Hamlet v1.5 RTT uses, in the
                         opposite direction).  https://mymemory.translated.net
Similarity model       : heidi-german-lexical-sim-v1 (defined below and mirrored
                         exactly in src/app/heidi-analysis/services/heidi-rtt.service.ts)

    tokens  = lower-cased word tokens; German stop-words removed
    stems   = CISTEM stemmer (Weissweiler & Fraser 2017, case-insensitive)
    S = 100 × (0.45·Jaccard(stems) + 0.30·Dice(char 4-grams of stems)
               + 0.15·Jaccard(stem bigrams) + 0.10·min/max token-length ratio)

    This is a lexical-morphological similarity, NOT a neural semantic model:
    neural sentence encoders (e.g. multilingual MiniLM) could not be downloaded
    in the build environment. Its scale has NOT been calibrated against the
    direct semantic heuristic or against Hamlet; disagreements are therefore
    a triage signal for expert review, not a verdict.

Disagreement = |direct_semantic_score − rtt_semantic_score|, flagged at ≥ 15
(configurable with --threshold).

Cache key: sha256(passage_id | english_text | model | config).

Usage:
    python3 scripts/heidi_rtt_pipeline.py --limit 20            # needs network access to api.mymemory.translated.net
    python3 scripts/heidi_rtt_pipeline.py --evaluate-only       # recompute report from cache
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
DATA = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_aligned_chapters_1_14.json')
CACHE = os.path.join(HERE, 'heidi_rtt_cache.json')
REPORT = os.path.join(HERE, '..', 'src', 'assets', 'data', 'heidi_rtt_research_evaluation.json')

TRANSLATION_MODEL = 'MyMemory-NMT en|de'
SIMILARITY_MODEL = 'heidi-german-lexical-sim-v1'
CONFIG = 'v1'

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


def cache_key(pid, en):
    return hashlib.sha256(f'{pid}|{en}|{TRANSLATION_MODEL}|{CONFIG}'.encode('utf-8')).hexdigest()


def mymemory_en_de(text):
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
        url = 'https://api.mymemory.translated.net/get?' + urllib.parse.urlencode({'q': c, 'langpair': 'en|de'})
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
    data = json.load(open(DATA, encoding='utf-8'))
    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    eligible = [p for c in data['parts'][0]['chapters'] for p in c['passages']
                if p['alignment']['status'] == 'aligned' and p['english_text'] and p['german_text']]
    done = 0
    failures = []
    if not a.evaluate_only:
        for p in eligible:
            if a.limit and done >= a.limit:
                break
            k = cache_key(p['passage_id'], p['english_text'])
            if k in cache:
                continue
            try:
                bt = mymemory_en_de(p['english_text'])          # English input ONLY
            except Exception as e:  # noqa: BLE001
                failures.append({'passage_id': p['passage_id'], 'error': str(e)})
                print('FAILED', p['passage_id'], e)
                if 'QUOTA' in str(e).upper() or 'LIMIT' in str(e).upper():
                    break
                continue
            cache[k] = {'passage_id': p['passage_id'], 'back_translated_german': bt, 'translation_model': TRANSLATION_MODEL,
                        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds')}
            done += 1
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    results = []
    for p in eligible:
        k = cache_key(p['passage_id'], p['english_text'])
        if k not in cache:
            continue
        c = cache[k]
        rtt = german_similarity(p['german_text'], c['back_translated_german'])
        direct = p['round_trip_verification']['direct_semantic_score']
        dis = round(abs(direct - rtt), 1) if (rtt is not None and direct is not None) else None
        results.append({'passage_id': p['passage_id'], 'input_hash': k, 'back_translated_german': c['back_translated_german'],
                        'translation_model': c['translation_model'], 'similarity_model': SIMILARITY_MODEL,
                        'generated_at': c['generated_at'], 'direct_semantic_score': direct, 'rtt_semantic_score': rtt,
                        'disagreement': dis, 'status': None if dis is None else ('disagreement' if dis >= a.threshold else 'agreement')})
    report = {
        'project_id': 'heidi', 'direction': 'de_original -> en_human (Stork) -> de_ai (back-translation)',
        'translation_model': TRANSLATION_MODEL, 'similarity_model': SIMILARITY_MODEL,
        'disagreement_threshold': a.threshold,
        'eligible_passages': len(eligible), 'completed': len(results),
        'disagreements': sum(1 for r in results if r['status'] == 'disagreement'),
        'failures': failures, 'results': results,
        'calibration_note': 'Similarity scale not calibrated against the direct semantic heuristic; treat disagreements as review triage only.',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }
    json.dump(report, open(REPORT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"RTT completed: {len(results)} of {len(eligible)} eligible passages; disagreements: {report['disagreements']}")


if __name__ == '__main__':
    sys.exit(main())
