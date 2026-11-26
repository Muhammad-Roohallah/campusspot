#!/usr/bin/env python3
"""CampusSpot Phase 3 analysis. Usage: python3 analyze.py [folder with tasks.csv and participants.csv]
Writes results.md next to the CSV files. Students only; the barista (role=barista) is reported as a single case."""
import csv, statistics as st, sys, pathlib
from collections import defaultdict

d = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
def rows(name):
    with open(d / name, newline='', encoding='utf-8') as f:
        return [r for r in csv.DictReader(f) if r.get('participant', '').strip()]
tasks, people = rows('tasks.csv'), rows('participants.csv')
role = {p['participant']: p.get('role', 'student').strip().lower() for p in people}
def f(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def mean(v): return st.mean(v) if v else float('nan')
def sd(v): return st.stdev(v) if len(v) > 1 else float('nan')
def fmt(x, n=1): return 'n/a' if x != x else f'{x:.{n}f}'

out = []
students = [p for p in people if role[p['participant']] != 'barista']
out.append(f'# CampusSpot Phase 3 results\n\nStudents: n = {len(students)}. Barista rows: {len(people) - len(students)}.\n')
out.append(f"From the Step 1 survey: {sum(1 for p in students if p.get('from_survey','').strip().lower()=='yes')} of {len(students)}.\n")

# Tasks
by = defaultdict(list)
for t in tasks:
    if role.get(t['participant'], 'student') != 'barista': by[t['task']].append(t)
out.append('## Tasks (students)\n\n| Task | n | Success | Gave up | Mean time s (SD) | Median time s | Taps per person | Errors per person | SEQ mean (SD) |\n|---|---|---|---|---|---|---|---|---|')
for k in sorted(by):
    r = by[k]; s = [f(x['success']) for x in r if f(x['success']) is not None]
    tm = [f(x['time_s']) for x in r if f(x['time_s']) is not None]
    er = [f(x['errors']) for x in r if f(x['errors']) is not None]
    tp = [f(x.get('taps')) for x in r if f(x.get('taps')) is not None]
    gu = [f(x.get('gave_up')) for x in r if f(x.get('gave_up')) is not None]
    sq = [f(x['seq']) for x in r if f(x['seq']) is not None]
    out.append(f"| {k} | {len(r)} | {sum(1 for v in s if v>=1)} of {len(s)} ({fmt(100*mean([1 if v>=1 else 0 for v in s]),0)}%) | {int(sum(gu))} | {fmt(mean(tm))} ({fmt(sd(tm))}) | {fmt(st.median(tm) if tm else float('nan'))} | {fmt(mean(tp))} | {fmt(mean(er),2) if er else 'n/a'} | {fmt(mean(sq),2)} ({fmt(sd(sq),2)}) |")
out.append('')

# SUS
def sus(p):
    v = [f(p.get(f'sus{i}')) for i in range(1, 11)]
    if any(x is None for x in v): return None
    return 2.5 * sum((x - 1) if i % 2 == 1 else (5 - x) for i, x in enumerate(v, 1))
ss = [(p['participant'], sus(p)) for p in students if sus(p) is not None]
sv = [s for _, s in ss]
out.append('## SUS (students)\n')
if sv:
    out.append(f"Mean {fmt(mean(sv))}, SD {fmt(sd(sv))}, median {fmt(st.median(sv))}, range {fmt(min(sv))} to {fmt(max(sv))}, n = {len(sv)}. Reference average: 68.\n")
    out.append('| Participant | SUS |\n|---|---|\n' + '\n'.join(f'| {a} | {fmt(b)} |' for a, b in ss) + '\n')
else: out.append('No complete SUS rows yet.\n')

# TLX
keys = ['mental', 'physical', 'temporal', 'performance', 'effort', 'frustration']
out.append('## Raw NASA-TLX (students)\n\n| Item | Mean | SD |\n|---|---|---|')
allv = []
for k in keys:
    v = [f(p.get('tlx_' + k)) for p in students if f(p.get('tlx_' + k)) is not None]
    out.append(f'| {k} | {fmt(mean(v))} | {fmt(sd(v))} |')
per = []
for p in students:
    v = [f(p.get('tlx_' + k)) for k in keys]
    if all(x is not None for x in v): per.append(mean(v))
out.append(f'| overall (mean of six) | {fmt(mean(per))} | {fmt(sd(per))} |\n')

# Project items
out.append('## Project and navigation items (1 to 5)\n\n| Item | Mean | Agree (4 or 5) |\n|---|---|---|')
for k in ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'nav1', 'nav2']:
    v = [f(p.get(k)) for p in students if f(p.get(k)) is not None]
    out.append(f"| {k.upper()} | {fmt(mean(v),2)} | {sum(1 for x in v if x>=4)} of {len(v)} |")
out.append('')

# H3
c = defaultdict(int)
for p in students:
    if p.get('h3_choice', '').strip(): c[p['h3_choice'].strip().upper()] += 1
out.append('## Map versus label (H3)\n\n' + (', '.join(f'{k}: {v}' for k, v in sorted(c.items())) if c else 'No answers yet.') + ' (A = map only, B = map and label.)\n')

# Barista
bt = [t for t in tasks if role.get(t['participant']) == 'barista']
if bt:
    out.append('## Barista (single case)\n\n| Task | Success | Time s | Errors | Hints | SEQ |\n|---|---|---|---|---|---|')
    for t in bt: out.append(f"| {t['task']} | {t['success']} | {t['time_s']} | {t['errors']} | {t['hints']} | {t['seq']} |")
    for p in people:
        if role[p['participant']] == 'barista' and sus(p) is not None: out.append(f"\nBarista SUS: {fmt(sus(p))}")
(d / 'results.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('\n'.join(out))
