// Parity check: TypeScript in-browser scorer vs the Python reference (scripts/heidi_build_v2.py output).
// Usage: node scripts/heidi_scoring_parity.mjs <python_analysis_v2.json>
// Bundles src/app/heidi-analysis/scoring/heidi-scoring.ts with esbuild and compares every group.
import { buildSync } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(process.env.TMPDIR || '/tmp', 'heidi-scoring.bundle.mjs');
buildSync({ entryPoints: [path.join(root, 'src/app/heidi-analysis/scoring/heidi-scoring.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { scoreSideBySide } = await import(pathToFileURL(out).href);
const sbs = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/data/heidi_part1_side_by_side.json'), 'utf8'));
const t0 = Date.now();
const groups = scoreSideBySide(sbs);
const ms = Date.now() - t0;
const ref = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).groups;
const spanKey = s => s ? `${s.start}-${s.end}-${s.text}` : null;
let diffs = 0, checked = 0;
const report = [];
groups.forEach((g, i) => {
  const r = ref[i];
  const fail = (what, a, b) => { diffs++; if (report.length < 25) report.push(`${g.group_id} ${what}: ts=${JSON.stringify(a)} py=${JSON.stringify(b)}`); };
  if (g.group_id !== r.group_id) fail('id', g.group_id, r.group_id);
  for (const k of ['passage_type', 'speaker', 'speaker_conflict']) if (g[k] !== r[k]) fail(k, g[k], r[k]);
  if (g.alignment.status !== r.alignment.status) fail('status', g.alignment.status, r.alignment.status);
  if (g.analysis.direct_semantic_score !== r.analysis.direct_semantic_score) fail('direct', g.analysis.direct_semantic_score, r.analysis.direct_semantic_score);
  for (const [dk, rd] of Object.entries(r.analysis.dimensions || {})) {
    const td = g.analysis.dimensions[dk];
    checked++;
    if (!td) { fail(dk + ' missing', null, rd.status); continue; }
    if (td.status !== rd.status) fail(dk + '.status', td.status, rd.status);
    if (td.score !== rd.score) fail(dk + '.score', td.score, rd.score);
    if (td.confidence !== rd.confidence) fail(dk + '.confidence', td.confidence, rd.confidence);
    for (const side of ['evidence_de', 'evidence_en']) {
      const a = td[side].map(spanKey).join('|'), b = rd[side].map(spanKey).join('|');
      if (a !== b) fail(`${dk}.${side}`, a, b);
    }
    const pa = td.phrase_evidence.map(e => `${e.id}:${e.kind}:${spanKey(e.de)}:${spanKey(e.en)}:${e.confidence}`).join('|');
    const pb = rd.phrase_evidence.map(e => `${e.id}:${e.kind}:${spanKey(e.de)}:${spanKey(e.en)}:${e.confidence}`).join('|');
    if (pa !== pb) fail(`${dk}.phrase_evidence`, pa.slice(0, 300), pb.slice(0, 300));
  }
});
console.log(`groups ${groups.length} (ref ${ref.length}); dimension assessments compared ${checked}; differences ${diffs}; scoring time ${ms} ms`);
report.forEach(l => console.log('  ' + l));
process.exit(diffs ? 1 : 0);
