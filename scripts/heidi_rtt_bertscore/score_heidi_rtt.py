#!/usr/bin/env python3
"""Score independent German->English translations against human English with BERTScore.

Requires: pip install -r requirements.txt
Outputs a NEW JSON (original unchanged) and a flat CSV.
"""
from __future__ import annotations
import argparse
import csv
import json
import os
import re
import sys
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', required=True, help='heidi_part1_side_by_side(1).json')
    p.add_argument('--ai-json', help='Existing AI English: {"ch01-a001": "...", ...}')
    p.add_argument('--generate', action='store_true', help='Generate and cache German->English with OpenAI')
    p.add_argument('--cache', default='ai_translations_cache.json')
    p.add_argument('--output', default='heidi_rtt_scored.json')
    p.add_argument('--csv', default='heidi_rtt_scores.csv')
    p.add_argument('--chapter', type=int, help='Restrict to this chapter')
    p.add_argument('--limit', type=int, default=0, help='Max rows for a trial; 0=all')
    p.add_argument('--model', default='roberta-large', help='BERTScore encoder; roberta-base is lighter')
    p.add_argument('--batch-size', type=int, default=8)
    p.add_argument('--max-words', type=int, default=140, help='Long passages chunked at sentence boundaries')
    p.add_argument('--openai-model', default='gpt-4.1-mini', help='Model used ONLY for German->English translation')
    return p.parse_args()


def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def save_json(p, data):
    path=Path(p)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp=path.with_name(path.name+'.tmp')
    with open(temp,'w',encoding='utf-8') as f:
        json.dump(data,f,ensure_ascii=False,indent=2)
    temp.replace(path)


def merge_paragraphs(items):
    return '\n\n'.join(x.get('text','').strip() for x in items if x.get('text','').strip())


def chunks(text, max_words):
    """Chunk approximately by sentences to avoid the encoder token limit.
    A chunk is NOT a linguistic/proposition alignment and does not create highlights.
    """
    text=' '.join(text.split())
    if not text:
        return []
    # Sentence split; abbreviation boundaries may be imperfect.
    sentences=re.split(r'(?<=[.!?])\s+(?=["“„\'A-ZÄÖÜ0-9])',text)
    output=[]; block=[]; count=0
    for s in sentences:
        words=s.split()
        if count and count+len(words)>max_words:
            output.append(' '.join(block)); block=[]; count=0
        while len(words)>max_words:
            if block:
                output.append(' '.join(block)); block=[]; count=0
            output.append(' '.join(words[:max_words])); words=words[max_words:]
        if words:
            block.append(' '.join(words)); count+=len(words)
    if block: output.append(' '.join(block))
    return output


def get_ai_translation(german, row_id, cache, args, client):
    saved=cache.get(row_id)
    if isinstance(saved,str) and saved.strip():
        return saved.strip()
    if not args.generate:
        return None
    response=client.chat.completions.create(
        model=args.openai_model,
        temperature=0,
        messages=[
            {'role':'system','content':(
                'Translate the German literary passage into natural, accurate English. '
                'Preserve all propositions, details, imagery and speaker perspective. '
                'Do not summarize, omit, explain, embellish, or add commentary. '
                'Return only the English translation.')},
            {'role':'user','content':german}
        ]
    )
    translated=(response.choices[0].message.content or '').strip()
    if not translated:
        raise RuntimeError('AI translation was empty for '+row_id)
    cache[row_id]=translated
    save_json(args.cache, cache)  # persistent cache supports restart
    return translated


def score_pair(scorer, candidate, reference, max_words, batch_size):
    """BERTScore P/R/F1. For long paragraphs, optimize chunk assignment.

    Candidate = generated AI English; reference = human English.
    BERTScore precision reflects AI candidate tokens, recall reflects the human reference.
    For long passages scores are pooled across matched chunks and penalize unmatched chunks.
    """
    import numpy as np
    from scipy.optimize import linear_sum_assignment
    c=chunks(candidate,max_words)
    r=chunks(reference,max_words)
    if not c or not r:
        return {'precision':0.,'recall':0.,'f1':0.,'chunked':bool(c or r),
                'ai_chunks':len(c),'human_chunks':len(r),'matching':[]}
    if len(c)==1 and len(r)==1:
        p,rc,f=scorer.score(c,r,batch_size=batch_size,verbose=False)
        return {'precision':round(float(p[0]),6),'recall':round(float(rc[0]),6),
                'f1':round(float(f[0]),6),'chunked':False,'ai_chunks':1,
                'human_chunks':1,'matching':[[0,0]]}
    # Compare each AI chunk to every human chunk. Handles reordered chunks.
    candidates=[ci for ci in c for _ in r]
    references=r*len(c)
    ps,rs,fs=scorer.score(candidates,references,batch_size=batch_size,verbose=False)
    P=ps.cpu().numpy().reshape(len(c),len(r))
    R=rs.cpu().numpy().reshape(len(c),len(r))
    F=fs.cpu().numpy().reshape(len(c),len(r))
    # Bipartite matching (one-to-one). Missing chunks score 0. Some split/merge
    # passages need a more sophisticated many-to-many alignment algorithm.
    ii,jj=linear_sum_assignment(-F)
    matched=list(zip(ii.tolist(),jj.tolist()))
    # Weight matched portions by chunk length, normalize by entire side lengths.
    c_lens=np.array([len(x.split()) for x in c],dtype=float)
    r_lens=np.array([len(x.split()) for x in r],dtype=float)
    prec=sum(float(P[i,j])*c_lens[i] for i,j in matched)/sum(c_lens)
    rec=sum(float(R[i,j])*r_lens[j] for i,j in matched)/sum(r_lens)
    f1=2*prec*rec/(prec+rec) if prec+rec else 0.0
    return {'precision':round(float(prec),6),'recall':round(float(rec),6),
            'f1':round(float(f1),6),'chunked':True,'ai_chunks':len(c),
            'human_chunks':len(r),'matching':[[i,j] for i,j in matched]}


def main():
    args=parse_args()
    if not Path(args.input).is_file():
        sys.exit(f'Input not found: {args.input}')
    if not args.ai_json and not args.generate and not Path(args.cache).exists():
        sys.exit('No AI English translations. Pass --ai-json EXISTING.json or --generate (OPENAI_API_KEY required).')
    if args.ai_json and not Path(args.ai_json).is_file():
        sys.exit(f'AI translations file not found: {args.ai_json}')
    source=load_json(args.input)
    if 'chapters' not in source:
        sys.exit('Expected top-level "chapters" list.')
    cache=load_json(args.cache) if Path(args.cache).exists() else {}
    if args.ai_json:
        supplied=load_json(args.ai_json)
        # Additional translations override cached ones, then persist the cache.
        if not isinstance(supplied,dict): sys.exit('--ai-json must contain a JSON object keyed by row ID')
        cache.update({k:v for k,v in supplied.items() if isinstance(v,str) and v.strip()})
        save_json(args.cache,cache)
    client=None
    if args.generate:
        if not os.getenv('OPENAI_API_KEY'):
            sys.exit('Set OPENAI_API_KEY before using --generate')
        from openai import OpenAI
        client=OpenAI()
    chosen=[]
    for ch in source['chapters']:
        if args.chapter and ch['number']!=args.chapter: continue
        for row in ch.get('rows',[]):
            chosen.append((ch,row))
    if args.limit: chosen=chosen[:args.limit]
    if not chosen: sys.exit('No alignment rows selected.')
    # Generate translations BEFORE loading large BERTScore model.
    to_score=[]
    for k,(ch,row) in enumerate(chosen,1):
        en=merge_paragraphs(row.get('en',[]))
        de=merge_paragraphs(row.get('de',[]))
        ai=get_ai_translation(de,row['id'],cache,args,client) if en and de else None
        if not ai:
            row['rtt_bertscore']={'status':'missing_ai_translation' if en and de else 'missing_source_text'}
            print(f'[{k}/{len(chosen)}] {row["id"]}: no AI translation; skipped')
            continue
        to_score.append((ch,row,en,de,ai))
    if not to_score:
        save_json(args.output,source)
        sys.exit('No scorable rows; provide AI translations or use --generate.')
    from bert_score import BERTScorer
    print('Loading BERTScore model:',args.model,flush=True)
    scorer=BERTScorer(model_type=args.model,lang='en',rescale_with_baseline=False)
    flat=[]
    for k,(ch,row,en,de,ai) in enumerate(to_score,1):
        scores=score_pair(scorer,ai,en,args.max_words,args.batch_size)
        row['rtt_bertscore']={
            'status':'scored',
            'method':'BERTScore (English AI candidate vs English human reference)',
            'model':args.model,
            'precision':scores['precision'],
            'recall':scores['recall'],
            'f1':scores['f1'],
            'f1_x100':round(scores['f1']*100,2),
            'note':'Raw model similarity x100, NOT a calibrated preservation percentage.',
            'chunked':scores['chunked'],
            'ai_chunks':scores['ai_chunks'],
            'human_chunks':scores['human_chunks'],
            'chunk_matching':scores['matching'],
            'ai_back_translation_en':ai
        }
        flat.append({'chapter':ch['number'],'row_id':row['id'],
                     'alignment_confidence':row.get('confidence',''),
                     'precision':scores['precision'],'recall':scores['recall'],
                     'f1':scores['f1'],'f1_x100':round(scores['f1']*100,2),
                     'chunked':scores['chunked']})
        print(f'[{k}/{len(to_score)}] {row["id"]}: F1={scores["f1"]:.4f} ({scores["f1"]*100:.2f} raw x100)',flush=True)
        save_json(args.output,source)
    csv_path=Path(args.csv);csv_path.parent.mkdir(parents=True,exist_ok=True)
    with csv_path.open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(flat[0]))
        writer.writeheader();writer.writerows(flat)
    if flat:
        # Unweighted group mean and word-weighted mean are not interchangeable.
        print('Mean across scored groups (unweighted):',round(sum(x['f1_x100'] for x in flat)/len(flat),2))
    print('Saved:',args.output,'and',args.csv)

if __name__=='__main__':
    main()
