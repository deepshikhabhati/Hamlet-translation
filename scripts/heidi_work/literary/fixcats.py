"""Normalise one-sided categories in an assessment file: C/P with only a German phrase -> L,
C/P with only an English phrase -> A, L with an English phrase -> C. Prints what changed."""
import ast, sys, re
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
d = ast.literal_eval(s)
changes = 0
for gid, v in d.items():
    new = []
    for it in v['items']:
        it = list(it)
        dk, ck, w, de, en = it[:5]
        if ck in ('C', 'P') and de and not en: it[1] = 'L'; changes += 1; print(gid, dk, ck, '-> L')
        elif ck in ('C', 'P') and en and not de: it[1] = 'A'; changes += 1; print(gid, dk, ck, '-> A')
        elif ck == 'L' and en and de: it[1] = 'C'; changes += 1; print(gid, dk, 'L -> C')
        elif ck == 'A' and en and de: it[1] = 'C'; changes += 1; print(gid, dk, 'A -> C')
        new.append(tuple(it))
    v['items'] = new
hdr = s[:s.index('{\n')]
with open(p, 'w', encoding='utf-8') as f:
    f.write(hdr + '{\n')
    for k, v in d.items():
        extra = ''.join(f"{x!r}: {v[x]!r}, " for x in v if x not in ('items', 'na'))
        f.write(f"{k!r}: {{{extra}'items': [\n")
        for it in v['items']:
            f.write(' ' + repr(tuple(it)) + ',\n')
        f.write(f"], 'na': {v.get('na', {})!r}}},\n\n")
    f.write('}\n')
print(changes, 'changes')
