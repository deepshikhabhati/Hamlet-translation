#!/usr/bin/env python3
"""
Heidi v1.0 — bilingual lexicon used by the aligner and the heuristic analyser.

Source: Ding German–English dictionary (Frank Richter, TU Chemnitz, GPL),
        version "devel 2023-04-13", as packaged by Debian/Ubuntu `trans-de-en`
        (file /usr/share/trans/de-en).  Install with:
            apt-get download trans-de-en && dpkg-deb -x trans-de-en_*.deb ding

The lexicon maps Snowball-German stems to sets of Snowball-English stems.
It is used only as a *similarity signal* (hunalign-style); it never produces
text shown to the user.
"""
import os
import re
import json
from functools import lru_cache

import snowballstemmer

DE_STEM = snowballstemmer.stemmer('german')
EN_STEM = snowballstemmer.stemmer('english')

DE_STOP = set("""
aber alle allem allen aller alles als also am an ander andere anderem anderen anderer anderes anderm andern anders auch auf aus bei bin bis bist da damit dann das dass daß dasselbe dazu dein deine deinem deinen deiner dem demselben den denn denselben der derer derselbe derselben des desselben dessen dich die dies diese dieselbe dieselben diesem diesen dieser dieses dir doch dort du durch ein eine einem einen einer eines einig einige einigem einigen einiger einiges einmal er es etwas euch euer eure eurem euren eurer ihm ihn ihnen ihr ihre ihrem ihren ihrer ihres im in indem ins ist jede jedem jeden jeder jedes jene jenem jenen jener jenes jetzt kann kein keine keinem keinen keiner keines können könnte machen man manche manchem manchen mancher manches mein meine meinem meinen meiner mich mir mit muss musste nach nicht nichts noch nun nur ob oder ohne sehr sein seine seinem seinen seiner selbst sich sie sind so solche solchem solchen solcher solches soll sollte sondern sonst über um und uns unsere unserem unseren unser unseres unter viel vom von vor während war waren warst was weg weil weiter welche welchem welchen welcher welches wenn werde werden wie wieder will wir wird wirst wo wollen wollte würde würden zu zum zur zwar zwischen ich mich mir wir ihn ihm sie euch dich dir er es hatte hatten hat habe haben wurde wurden ja nein schon gar ganz ganze ganzen eben denn gleich wohl da so mal hier wer ihr's ich's 's
""".split())

EN_STOP = set("""
a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves shall upon unto o oh yes said says
""".split())

TOKEN_RE = re.compile(r"[A-Za-zÄÖÜäöüßéèàâêôûç]+(?:-[A-Za-zÄÖÜäöüßéèàâêôûç]+)*")

DING_DEFAULT = os.environ.get('DING_DE_EN', '/home/claude/ext/ding/x/usr/share/trans/de-en')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'heidi_work', 'ding_stem_lexicon.json')

# Heidi-specific proper-noun / cultural equivalences (German form -> English forms
# used by Stork).  These are *names*, verified against both texts, not translations.
NAME_EQUIV = {
    'heidi': ['heidi'], 'dete': ['deta'], 'peter': ['peter'], 'barbel': ['barbel'],
    'öhi': ['uncle'], 'alm-öhi': ['alm-uncle', 'uncle'], 'alm': ['alm', 'alp', 'mountain', 'pasture'],
    'klara': ['clara'], 'sesemann': ['sesemann'], 'rottenmeier': ['rottenmeier'],
    'sebastian': ['sebastian'], 'tinette': ['tinette'], 'johann': ['john', 'johann'],
    'maienfeld': ['mayenfeld'], 'frankfurt': ['frankfurt'], 'dörfli': ['dörfli', 'village'],
    'ragaz': ['ragaz'], 'pfäfers': ['pfäfers', 'pfaffers'], 'geißenpeter': ['peter', 'goat-peter'],
    'schwänli': ['little', 'swan', 'schwänli'], 'bärli': ['bear', 'bärli'],
    'distelfink': ['finch', 'goldfinch', 'distelfinck'], 'großmutter': ['grandmother'],
    'großmama': ['grandmama', 'grandmother'], 'großvater': ['grandfather'],
    'brigitte': ['brigida', 'brigitte'], 'ursel': ['ursel'], 'klärchen': ['clara', 'clärchen'],
    'falknis': ['falknis'], 'cäsaplana': ['cäsaplana', 'casaplana'], 'kandidat': ['tutor', 'candidate'],
    'doktor': ['doctor'], 'pfarrer': ['pastor', 'minister'], 'geiß': ['goat'], 'geißen': ['goats', 'goat'],
    'fräulein': ['miss'], 'herr': ['mr', 'mister', 'master', 'sir'], 'frau': ['mrs', 'woman'],
}


def de_tokens(text):
    return [t.lower() for t in TOKEN_RE.findall(text)]


def en_tokens(text):
    return [t.lower() for t in TOKEN_RE.findall(text)]


@lru_cache(maxsize=200000)
def de_stem(w):
    return DE_STEM.stemWord(w.lower())


@lru_cache(maxsize=200000)
def en_stem(w):
    return EN_STEM.stemWord(w.lower())


_ANNOT = re.compile(r'\{[^}]*\}|\[[^\]]*\]|\([^)]*\)|<[^>]*>')


def _clean(s):
    return re.sub(r'\s+', ' ', _ANNOT.sub(' ', s)).strip()


def build_lexicon(ding_path=DING_DEFAULT, out=CACHE):
    lex = {}
    with open(ding_path, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or '::' not in line:
                continue
            de, en = line.rstrip('\n').split('::', 1)
            de_parts = de.split('|')
            en_parts = en.split('|')
            for dp, ep in zip(de_parts, en_parts):
                de_alts = [_clean(x) for x in dp.split(';')]
                en_alts = [_clean(x) for x in ep.split(';')]
                en_stems = []
                for e in en_alts:
                    e = re.sub(r'^(to|a|an|the) ', '', e.lower())
                    ws = [w for w in en_tokens(e) if w not in EN_STOP]
                    if 1 <= len(ws) <= 3:
                        for w in ws:
                            st = en_stem(w)
                            if st not in en_stems:
                                en_stems.append(st)
                if not en_stems:
                    continue
                for d in de_alts:
                    d = re.sub(r'^(sich|etw\.?|jdn\.?|jdm\.?) ', '', d)
                    ws = de_tokens(d)
                    if len(ws) != 1:
                        continue
                    s = de_stem(ws[0])
                    if len(s) < 2 or ws[0] in DE_STOP:
                        continue
                    lst = lex.setdefault(s, [])
                    for st in en_stems:
                        if st not in lst:
                            lst.append(st)
    # cap very ambiguous entries to keep the signal informative
    for k, v in NAME_EQUIV.items():
        lst = lex.setdefault(de_stem(k), [])
        for x in v:
            if en_stem(x) not in lst:
                lst.insert(0, en_stem(x))
    # keep the first (most common, per Ding's ordering) senses only
    lex = {k: v[:80] for k, v in lex.items()}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'source': 'Ding de-en (trans-de-en 1.9-7, devel 2023-04-13)', 'entries': lex}, f, ensure_ascii=False)
    return lex


def load_lexicon():
    if os.path.exists(CACHE):
        d = json.load(open(CACHE, encoding='utf-8'))
        return {k: set(v) for k, v in d['entries'].items()}
    return {k: set(v) for k, v in build_lexicon().items()}


def de_content(text):
    return [w for w in de_tokens(text) if w not in DE_STOP and len(w) > 1]


def en_content(text):
    return [w for w in en_tokens(text) if w not in EN_STOP and len(w) > 1]


# Common German strong/irregular verb forms -> infinitive (morphology only).
IRREG = {}
for inf, forms in {
    'gehen': 'ging gingen gegangen geht', 'sehen': 'sah sahen gesehen sieht', 'kommen': 'kam kamen gekommen kommt',
    'stehen': 'stand standen gestanden steht', 'sitzen': 'saß saßen gesessen', 'liegen': 'lag lagen gelegen',
    'nehmen': 'nahm nahmen genommen nimmt', 'geben': 'gab gaben gegeben gibt', 'sprechen': 'sprach sprachen gesprochen spricht',
    'rufen': 'rief riefen gerufen', 'laufen': 'lief liefen gelaufen läuft', 'finden': 'fand fanden gefunden',
    'bringen': 'brachte brachten gebracht', 'denken': 'dachte dachten gedacht', 'wissen': 'wusste wussten gewusst weiß',
    'tun': 'tat taten getan', 'halten': 'hielt hielten gehalten hält', 'lassen': 'ließ ließen gelassen lässt',
    'fallen': 'fiel fielen gefallen fällt', 'schreien': 'schrie schrien geschrien', 'springen': 'sprang sprangen gesprungen',
    'trinken': 'trank tranken getrunken', 'essen': 'aß aßen gegessen isst', 'schlafen': 'schlief schliefen geschlafen schläft',
    'ziehen': 'zog zogen gezogen', 'tragen': 'trug trugen getragen trägt', 'fahren': 'fuhr fuhren gefahren fährt',
    'bleiben': 'blieb blieben geblieben', 'schreiben': 'schrieb schrieben geschrieben', 'lesen': 'las lasen gelesen liest',
    'werfen': 'warf warfen geworfen wirft', 'helfen': 'half halfen geholfen hilft', 'beginnen': 'begann begannen begonnen',
    'singen': 'sang sangen gesungen', 'klingen': 'klang klangen geklungen', 'scheinen': 'schien schienen geschienen',
    'schweigen': 'schwieg schwiegen geschwiegen', 'steigen': 'stieg stiegen gestiegen', 'treten': 'trat traten getreten tritt',
    'vergessen': 'vergaß vergaßen vergisst', 'verstehen': 'verstand verstanden versteht', 'bitten': 'bat baten gebeten',
    'sagen': 'sagte sagten gesagt sagt', 'fragen': 'fragte fragten gefragt fragt', 'antworten': 'antwortete antworteten geantwortet',
    'erzählen': 'erzählte erzählten erzählt', 'weinen': 'weinte weinten geweint', 'lachen': 'lachte lachten gelacht',
    'schauen': 'schaute schauten geschaut', 'hören': 'hörte hörten gehört', 'kennen': 'kannte kannten gekannt',
    'rennen': 'rannte rannten gerannt', 'brennen': 'brannte brannten gebrannt', 'schließen': 'schloss schlossen geschlossen',
    'schießen': 'schoss schossen geschossen', 'fliegen': 'flog flogen geflogen', 'frieren': 'fror froren gefroren',
    'gewinnen': 'gewann gewannen gewonnen', 'heben': 'hob hoben gehoben', 'leiden': 'litt litten gelitten',
    'reiten': 'ritt ritten geritten', 'schneiden': 'schnitt schnitten geschnitten', 'streichen': 'strich strichen gestrichen',
    'greifen': 'griff griffen gegriffen', 'pfeifen': 'pfiff pfiffen gepfiffen', 'bieten': 'bot boten geboten',
    'gießen': 'goss gossen gegossen', 'hängen': 'hing hingen gehangen', 'heißen': 'hieß hießen geheißen heißt',
    'schlagen': 'schlug schlugen geschlagen schlägt', 'waschen': 'wusch wuschen gewaschen', 'wachsen': 'wuchs wuchsen gewachsen',
    'sterben': 'starb starben gestorben stirbt', 'werden': 'wurde wurden geworden wird ward', 'sein': 'war waren gewesen ist',
    'haben': 'hatte hatten gehabt hat', 'können': 'konnte konnten kann', 'müssen': 'musste mussten muss',
    'mögen': 'mochte mochten mag', 'dürfen': 'durfte durften darf', 'wollen': 'wollte wollten will',
    'erschrecken': 'erschrak erschraken erschrocken', 'entgegnen': 'entgegnete entgegneten', 'versichern': 'versicherte versicherten',
    'erwidern': 'erwiderte erwiderten', 'gefallen': 'gefiel gefielen', 'empfangen': 'empfing empfingen',
}.items():
    for f in forms.split():
        IRREG[f] = inf


def de_lookup_keys(w):
    w = w.lower()
    keys = [de_stem(w)]
    if w in IRREG:
        keys.append(de_stem(IRREG[w]))
    for suf in ('test', 'tet', 'ten', 'te', 'et', 't'):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            keys.append(de_stem(w[:-len(suf)] + 'en'))
            break
    if w.startswith('ge') and len(w) > 5 and (w.endswith('t') or w.endswith('en')):
        core = w[2:-1] if w.endswith('t') else w[2:-2]
        keys.append(de_stem(core + 'en'))
    return keys


class Bilex:
    """Bidirectional stem-level translation lookup with German compound fallback."""

    def __init__(self):
        self.de2en = load_lexicon()
        self._comp_cache = {}

    def translations(self, de_word):
        s = de_stem(de_word)
        t = self.de2en.get(s)
        extra = set()
        for k in de_lookup_keys(de_word)[1:]:
            extra |= self.de2en.get(k, set())
        if t or extra:
            return (t or set()) | extra
        if s in self._comp_cache:
            return self._comp_cache[s]
        # German compound fallback: try head (rightmost) component >= 4 chars
        res = set()
        w = de_word.lower()
        for i in range(3, len(w) - 3):
            head = w[i:]
            hs = de_stem(head)
            if hs in self.de2en and len(head) >= 4:
                res = set(self.de2en[hs])
                mod = de_stem(w[:i].rstrip('s'))
                if mod in self.de2en:
                    res |= self.de2en[mod]
                break
        self._comp_cache[s] = res
        return res

    def coverage(self, de_text, en_text):
        """Return (de_cov, en_cov, matched_pairs) — fraction of German content
        words with a dictionary translation present in the English text, and
        fraction of English content words explained by some German word."""
        dw = de_content(de_text)
        ew = en_content(en_text)
        if not dw or not ew:
            return 0.0, 0.0, []
        en_stems = {}
        for w in ew:
            en_stems.setdefault(en_stem(w), w)
        hit_de = 0
        used_en = set()
        pairs = []
        for w in dw:
            tr = self.translations(w)
            inter = tr & en_stems.keys() if tr else set()
            if not inter and w in en_stems:   # identical names / cognates
                inter = {w}
            if not inter:
                es = en_stem(w)
                if es in en_stems and len(w) > 3:
                    inter = {es}
            if inter:
                hit_de += 1
                used_en |= inter
                pairs.append((w, en_stems[sorted(inter)[0]]))
        hit_en = sum(1 for w in ew if en_stem(w) in used_en)
        return hit_de / len(dw), hit_en / len(ew), pairs


if __name__ == '__main__':
    lex = build_lexicon()
    print('lexicon entries:', len(lex))
    b = Bilex()
    print(b.coverage('"Bist du müde, Heidi?", fragte die Begleiterin.', '"Are you tired, Heidi?" Deta asked the child.'))
