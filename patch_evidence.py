import json

def strip_evidence(file_path):
    print(f"Loading {file_path}...")
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    if 'passages' in data:
        for p in data['passages']:
            for alignment in p.get('phrase_alignments', []):
                for target_key, target_data in alignment.get('targets', {}).items():
                    if 'evidence' in target_data:
                        for ev in target_data['evidence']:
                            ev.pop('explanation', None)
                            ev.pop('rules', None)
                            ev.pop('source_features', None)
                            ev.pop('target_features', None)

    if 'scenes' in data:
        for s in data['scenes']:
            for alignment in s.get('phrase_alignments', []):
                for target_key, target_data in alignment.get('targets', {}).items():
                    if 'evidence' in target_data:
                        for ev in target_data['evidence']:
                            ev.pop('explanation', None)
                            ev.pop('rules', None)
                            ev.pop('source_features', None)
                            ev.pop('target_features', None)
            
            for group in s.get('dialogue_phrase_groups', []):
                for alignment in group.get('phrase_alignments', []):
                    for target_key, target_data in alignment.get('targets', {}).items():
                        if 'evidence' in target_data:
                            for ev in target_data['evidence']:
                                ev.pop('explanation', None)
                                ev.pop('rules', None)
                                ev.pop('source_features', None)
                                ev.pop('target_features', None)

    out_path = file_path
    print(f"Writing {out_path}...")
    with open(out_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

strip_evidence('src/assets/data/hamlet_all_phrase_and_scene_evidence.json')
strip_evidence('src/assets/data/hamlet_full_books_ui_all_phrase_evidence.json')
print("Done!")
