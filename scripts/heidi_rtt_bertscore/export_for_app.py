"""Convert heidi_rtt_scored.json (output of score_heidi_rtt.py) into src/assets/data/heidi_rtt_bertscore.json for the app.
Only rows that were actually scored are exported; nothing is filled in for the rest.

    python export_for_app.py heidi_rtt_scored.json
"""
import json, os, sys

src = json.load(open(sys.argv[1], encoding='utf-8'))
out = {}
for ch in src['chapters']:
    for r in ch['rows']:
        b = r.get('rtt_bertscore') or {}
        if 'f1_x100' in b:
            out[r['id']] = {'f1_x100': b['f1_x100'], 'model': b.get('model') or b.get('bertscore_model') or 'unknown', 'chunked': bool(b.get('chunked'))}
dest = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'data', 'heidi_rtt_bertscore.json')
json.dump({'metric': 'BERTScore F1 x100 (AI English from the German original vs Stork English); not a validated preservation score',
           'results': out}, open(dest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(out)} scored passage(s) written to {dest}')
