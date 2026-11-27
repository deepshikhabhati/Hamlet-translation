# Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE) Methodology

## 1. Overview and Core Philosophy

The **Context-Aware Hierarchical Literary Translation Evaluation (CH-LTE)** framework is a systematic, evidence-based methodology designed to evaluate literary translations with deep contextual awareness, hierarchical alignment, and rigorous bidirectional verification.

Unlike naive string-matching or purely lexical translation evaluation algorithms, CH-LTE evaluates literary translation as an organic, multi-layered artistic process. It ensures:
1. **Source Primacy**: The author's original text serves as the authoritative ground truth (in Heidi: Johanna Spyri's 1880/1881 German original).
2. **Attribution Precision**: The exact human translation edition is identified and verified (in Heidi: Elisabeth P. Stork, 1915, J. B. Lippincott Company, Project Gutenberg #20781; distinct from Helen B. Dole's translation).
3. **Multi-Scale Context**: Passages are not evaluated as isolated sentence fragments. The evaluation integrates chapter themes, preceding and succeeding narrative context, dialogue speaker/listener dynamics, and cultural/regional realia.
4. **Mandatory Bidirectional Verification**: Before any clause or phrase is classified as "Lost" (omitted) or "Added" (interpolated), the algorithm performs an exhaustive bidirectional check across the passage to verify whether the meaning is preserved in altered syntax, shifted word order, or condensed clauses.
5. **Eight Independent Literary Dimensions**: Complete separation of semantic baseline fidelity from stylistic, emotional, figurative, and cultural features.
6. **Continuous Inline Highlighting**: Highlights appear naturally within the flowing paragraph text without intrusive sentence-number buttons (`S1, S2, S3...`) or disruptive bounding boxes.

---

## 2. Text Corpus and Edition Attribution

| Field | Authoritative Source | Human Translation |
| :--- | :--- | :--- |
| **Language** | German (`de`) | English (`en`) |
| **Author / Translator** | Johanna Spyri | Elisabeth P. Stork |
| **Publication Date** | 1880 / 1881 | 1915 |
| **Publisher / Source** | F. A. Perthes (Gotha) | J. B. Lippincott Company (Philadelphia), PG #20781 |
| **Integrity Constraint** | Immutable source (`heidi_part1_side_by_side.json`) | Immutable target (`heidi_part1_side_by_side.json`) |

---

## 3. The Three Layers of Context Extraction

CH-LTE extracts three tiers of context for every passage:

### Tier 1: Narrative and Structural Hierarchy
- **Chapter Title & Theme**: Establishes thematic expectations (e.g., Chapter 1: "Up the Mountain to the Alm-Uncle").
- **Passage Positioning**: Preceding passage preview ($Row_{i-1}$) and succeeding passage preview ($Row_{i+1}$) provide continuity, ensuring that cross-passage narrative references or lingering thoughts are contextualized.
- **Narrative vs. Dialogue Mode**: Explicitly distinguishes narrator description from direct character speech (`"`, `„`, `“`).

### Tier 2: Discourse and Character Persona Context
- **Speaker Attribution**: Identifies speakers (e.g., Dete, Barbel, Grandfather/Alm-Uncle, Heidi, Peter).
- **Interpersonal Register**:
  - Dete's defensive, opportunistic, and boastful tone vs. Barbel's moral reproach and village curiosity.
  - Grandfather's austere, taciturn hermit voice vs. Heidi's childlike wonder and sensory directness.
- **Dialogue Constraints**: Character Voice is evaluated strictly when dialogue is present; in purely narrative passages, Character Voice is marked `not_applicable` (never numerical 0).

### Tier 3: Alpine and Historical Realia Context
- **Toponyms**: Maienfeld, Dörfli, Bad Ragaz, Falknis, Schesaplana, Frankfurt.
- **Pastoral and Agricultural Economy**: Geiß, Geißenpeter, Alp-Öhi, Senn, Sennhütte, Alpheu, Käsekessel, Molken.
- **Material Culture & Currency**: Gulden, Rappen, Franken, Thaler, Kuckucksuhr, Herrgottswinkel.
- **Regional Idioms & Dialect**: *es nimmt mich wunder* (I wonder / am amazed), *extraguten Dienst* (grand service), *auf meinem Gang* (on my corridor).

---

## 4. Hierarchical Bilingual Alignment Pipeline

Evaluation proceeds from top-level discourse to exact character spans:

```
┌────────────────────────────────────────────────────────┐
│               Passage Alignment Group                  │
│       (Johanna Spyri German ↔ Elisabeth Stork English) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Level 1: Sentence Alignment (1:1, 1:N, N:1, N:M)      │
│  - Order-independent lexical and positioning scoring   │
│  - Sentence boundary segmentation                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Level 2: Clause-Level Semantic Segmentation           │
│  - Coordination, subordination, and punctuation splits │
│  - Mandatory Bidirectional Verification Matcher        │
│  - Phrasal synonym & modal/negation alignment          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Level 3: Phrase-Level Evidence Spans                  │
│  - Verbatim substring extraction                       │
│  - Exact character span verification (text[s:e] == ph) │
│  - 8-Dimension Rubric Scoring                          │
└────────────────────────────────────────────────────────┘
```

### 4.1. Sentence Alignment
Each German sentence is mapped to one or more English sentences using lexical similarity and relative positioning priors. Supported mappings include:
- `1:1`: Single sentence translated into a single sentence.
- `1:N`: One complex German sentence split into multiple English sentences.
- `N:1`: Multiple concise German sentences merged into a compound English sentence.
- `N:M`: Complex sentence restructuring across narrative boundaries.

### 4.2. Clause Alignment
Sentences are segmented into syntactic clauses using punctuation delimiters (`,`, `;`, `:`, `—`, `–`) and coordinate conjunctions (`und`, `aber`, `denn`, `and`, `but`).

### 4.3. Phrase-Level Spans
Every evidence unit locates the exact substring within the full passage text:
- `source_span`: `{"start": int, "end": int, "text": str}`
- `target_span`: `{"start": int, "end": int, "text": str}`
- **Invariant**: `text[start:end] == phrase` must hold 100% of the time.

---

## 5. Mandatory Bidirectional Verification Engine

A critical flaw in legacy translation evaluation pipelines was the generation of **false Lost/Added pairs**. When an original German phrase and its English translation used differing vocabulary or syntax (such as modal verbs or idiomatic expressions), naive lexical matchers failed to link them. Consequently, the German phrase was marked `Lost` and the English phrase was marked `Added`, artificially crashing semantic preservation scores.

### 5.1. The Bidirectional Verification Rule
Before any candidate clause is classified as `Lost` or `Added`:
1. **Phrasal Synonym & Idiom Check**: Candidate clauses are tested against a comprehensive literary equivalence table (e.g., `fortkommen` $\leftrightarrow$ `leave`, `konnte nicht` $\leftrightarrow$ `could not`, `ihre Zimmer... besorgt` $\leftrightarrow$ `took care of their rooms`).
2. **Cross-Sentence Search**: If an unaligned clause does not match within its immediate sentence link, the matcher searches across all remaining unaligned clauses in the entire passage.
3. **Subsumption / Condensation Test**: If a German clause's meaning is already encapsulated within an aligned English clause (e.g., active room care), it is aligned as `Preserved` rather than declared lost.
4. **Bidirectional Regression Guard**: If a German clause and an English clause contain semantically corresponding keywords, the validator rejects any attempt to classify them as separate `Lost` and `Added` items and enforces a unified `Preserved` or `Changed` item.

### 5.2. Example: Dete's Frankfurt Dialogue (`ch01-a013`)

| Original German | Stork English Translation | Legacy Flawed Classification | CH-LTE Verified Classification |
| :--- | :--- | :--- | :--- |
| `aber ich konnte nicht fortkommen` | `but I could not leave` | German: Lost, English: Added (Score: 47) | **Preserved (1.0 Credit, Green Highlight)** |
| `ich habe ihre Zimmer... und sie besorgt` | `and I took care of their rooms` | Partial Loss & Addition | **Preserved (1.0 Credit, Green Highlight)** |
| `da bekomm ich einen extraguten Dienst` | `I am going to a splendid house` | Extragut lost, Splendid added | **Changed (0.6 Credit, Nuance shift)** |
| `auf meinem Gang gehabt` | *(omitted)* | Unassessed | **Lost (Omission penalty applied)** |
| *(absent in German)* | `As they got to like me` | Unassessed | **Added (Explanatory addition recorded)** |

---

## 6. Eight Independent Literary Dimensions

| Dimension | Canonical Key | Legacy Key | Dimension Type | Dialogue Required? | Applicable Text Feature |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Semantic** | `semantic` | `sem` | Baseline | No | Core denotative meaning and actions |
| **Emotion** | `emotion` | `emo` | Feature-Presence | No | Emotional charge (joy, grief, fear, anger) |
| **Imagery** | `imagery` | `metaphor_imagery` | Feature-Presence | No | Similes, sensory imagery, Alpine visual metaphors |
| **Tone** | `tone` | `ton` | Baseline | No | Narrative register, formality, diminutives |
| **Character Voice** | `voice` | `character_voice` | Feature-Presence | **Yes** | Speech cadence, idiolect, dialogue persona |
| **Cultural / Archaic** | `cultural` | `cultural_archaic` | Feature-Presence | No | Alpine toponyms, realia, historical currency |
| **Omissions / Additions**| `omissions` | `omissions_additions` | Baseline | No | Structural completeness; omission deductions |
| **Wordplay** | `wordplay` | `wpl` | Feature-Presence | No | Puns, rhymes, phonetic wordplay |

### 6.1. Dimension Statuses (Non-Zero Principle)
To prevent mathematical distortions where non-evaluated features lower passage averages, CH-LTE defines five distinct statuses:
- `evaluated`: Supported by explicit textual evidence. Score is a valid integer `0`–`100`.
- `not_applicable`: The literary feature does not occur in the source passage (e.g. no dialogue for Character Voice; no wordplay in serious narrative). **Score is strictly `null` (never numerical 0)**.
- `not_evaluated`: Baseline dimension not assessed. **Score is strictly `null` (never numerical 0)**.
- `uncertain`: Ambiguous textual correspondence flagged for human expert review. **Score is strictly `null` (never numerical 0)**.
- `alignment_disputed`: Source and target passages do not correspond. **Score is strictly `null` (never numerical 0)**.

---

## 7. Weighted Literary Scoring Rubric

### 7.1. Preservation Credits (Weights 1, 2, 3)
Features receive an importance weight:
- $w = 1$: Minor narrative or lexical detail.
- $w = 2$: Moderate descriptive or dialogue unit.
- $w = 3$: Major plot action, central metaphor, or defining character utterance.

Preservation credits:
- **Preserved**: $1.0$ credit.
- **Changed (Minor nuance shift)**: $0.8$ credit.
- **Changed (Moderate shift / paraphrase)**: $0.6$ credit.
- **Changed (Major semantic drift)**: $0.3$ credit.
- **Lost**: $0.0$ credit.
- **Added**: $0.0$ credit (evaluated via separate addition penalty).

### 7.2. Scoring Formula for Baseline & Feature Dimensions
For all dimensions except Omissions:
$$\text{Base Score} = \text{round}\left(100 \times \frac{\sum_{i \in \text{Scored}} w_i \times \text{Credit}_i}{\sum_{i \in \text{Scored}} w_i}\right)$$

$$\text{Final Score} = \max\left(0, \min\left(100, \text{Base Score} - \sum_{j \in \text{Added}} \text{Penalty}_j\right)\right)$$

### 7.3. Omissions Deduction Formula
Because an aligned literary passage is presumed complete unless omitted:
$$\text{Omissions Score} = \max\left(0, 100 - \sum \text{Deduction}\right)$$
Where:
- $\text{Lost Phrase}: 8 \times w$
- $\text{Changed / Condensed Phrase}: 4 \times w$
- $\text{Gratuitous Added Phrase}: 3 \times w$
- $\text{Preserved Phrase}: 0$

---

## 8. Continuous Inline Paragraph Highlighting

### 8.1. UI / UX Principles
1. **Flowing Paragraphs**: The original paragraphs appear continuous and unfragmented, preserving the author's typographic layout.
2. **No Sentence Buttons**: All legacy sentence differentiation buttons (`S1`, `S2`, `S3`, `S4`, `S5`, `S6`, `S7`) and surrounding rectangular outlines are eliminated.
3. **Evidence-Driven Coloring**:
   - **Green** (`rgba(34, 197, 94, 0.22)`): Preserved phrasing.
   - **Amber / Orange** (`rgba(249, 115, 22, 0.22)`): Phrasing or stylistic shift.
   - **Red** (`rgba(239, 68, 68, 0.22)`): Lost German phrasing (source only).
   - **Purple** (`rgba(168, 85, 247, 0.22)`): Added English phrasing (target only).
   - **Gold** (`rgba(234, 179, 8, 0.22)`): Uncertain phrasing flagged for expert review.
4. **No Blanket Coloring**: An entire sentence is never colored simply because one word or clause within it was modified. Unassessed text remains clean and uncolored.

---

## 9. Reusability for Hamlet and Other Literary Corpora

The CH-LTE pipeline architecture is fully modular and reusable for Shakespeare's *Hamlet* and other translation analyses:
1. `scripts/config/ch_lte_rubric_v1.json` defines dimension metadata, alias normalization, and scoring rules without hardcoding text titles.
2. `scripts/ch_lte_scoring.py` provides pure functional scoring agnostic to source language.
3. `scripts/ch_lte_validator.py` executes 10 automated quality gates on any bilingual dataset matching the schema.
4. `scripts/ch_lte_pipeline.py` provides CLI switches (`--pilot`, `--all`, `--validate`) to process arbitrary side-by-side literary corpora.
