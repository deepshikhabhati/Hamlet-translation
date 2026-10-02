import json
import os
import sys
import argparse
import time

try:
    from tqdm import tqdm
except ImportError:
    print("Please install tqdm: pip install tqdm")
    sys.exit(1)

try:
    import openai
    from openai import OpenAI
except ImportError:
    print("Please install openai: pip install openai")
    sys.exit(1)

def translate_text(text, context=False, speaker=None, api_key=None):
    if not text or not text.strip():
        return ""
        
    if not api_key:
        # Fallback to mock translation if no API key is provided
        prefix = "[Mock Context German]" if context else "[Mock AI German]"
        return f"{prefix} {text}"
        
    client = OpenAI(api_key=api_key)
    
    system_msg = "You are a professional literary translator translating Shakespeare's Hamlet from English to German."
    if context:
        system_msg += f" The speaker is {speaker if speaker else 'unknown'}. Ensure the tone is dramatically appropriate, poetic, and contextually fits the character."
        
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": text}
            ],
            temperature=0.3
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"\nError during translation: {e}")
        return None

def process_dialogues_file(filepath, api_key):
    print(f"Processing dialogues file: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    english_dialogues = data.get('dialogues', {}).get('english', [])
    
    changes_made = 0
    for d in tqdm(english_dialogues, desc="Translating dialogues"):
        text = d.get('text', '')
        speaker = d.get('speaker', '')
        translations = d.get('translations', {})
        
        # AI German
        ai_german = translations.get('ai_german', {})
        if ai_german.get('status') == 'pending_api' or not ai_german.get('text'):
            translated = translate_text(text, context=False, api_key=api_key)
            if translated:
                ai_german['text'] = translated
                ai_german['status'] = 'completed_auto'
                changes_made += 1
                
        # Context AI German
        context_ai_german = translations.get('context_ai_german', {})
        if context_ai_german.get('status') == 'pending_api' or not context_ai_german.get('text'):
            translated = translate_text(text, context=True, speaker=speaker, api_key=api_key)
            if translated:
                context_ai_german['text'] = translated
                context_ai_german['status'] = 'completed_auto'
                changes_made += 1
                
        # To avoid hitting API rate limits if using real API
        if api_key and changes_made % 10 == 0:
            time.sleep(1)

    if changes_made > 0:
        print(f"Saving {changes_made} updates to {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    else:
        print("No changes needed.")

def process_ui_file(filepath, api_key):
    print(f"Processing UI file: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    passages = data.get('passages', [])
    
    changes_made = 0
    for p in tqdm(passages, desc="Translating UI passages"):
        texts = p.get('texts', {})
        status = p.get('generation_status', {})
        english_text = texts.get('english', '')
        speaker = p.get('speaker', '')
        
        # AI German
        if status.get('ai_german') == 'pending_api' or not texts.get('ai_german'):
            translated = translate_text(english_text, context=False, api_key=api_key)
            if translated:
                texts['ai_german'] = translated
                status['ai_german'] = 'completed_auto'
                changes_made += 1
                
        # Context AI German
        if status.get('context_ai_german') == 'pending_api' or not texts.get('context_ai_german'):
            translated = translate_text(english_text, context=True, speaker=speaker, api_key=api_key)
            if translated:
                texts['context_ai_german'] = translated
                status['context_ai_german'] = 'completed_auto'
                changes_made += 1
                
        # Rate limit
        if api_key and changes_made % 10 == 0:
            time.sleep(1)

    if changes_made > 0:
        print(f"Saving {changes_made} updates to {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    else:
        print("No changes needed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Translate Hamlet JSON data to German using OpenAI.")
    parser.add_argument("--dialogues", default="src/assets/data/hamlet_all_dialogues_complete.json", help="Path to dialogues JSON")
    parser.add_argument("--ui", default="src/assets/data/hamlet_full_books_ui_complete.json", help="Path to UI passages JSON")
    
    args = parser.parse_args()
    api_key = os.environ.get('OPENAI_API_KEY', '')

    
    if not api_key:
        print("WARNING: OPENAI_API_KEY environment variable not set. Using mock translations.")
        
    if os.path.exists(args.dialogues):
        process_dialogues_file(args.dialogues, api_key)
    else:
        print(f"File not found: {args.dialogues}")
        
    if os.path.exists(args.ui):
        process_ui_file(args.ui, api_key)
    else:
        print(f"File not found: {args.ui}")
