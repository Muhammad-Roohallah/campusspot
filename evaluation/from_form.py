#!/usr/bin/env python3
"""Turn the Google Form responses (CSV export) into tasks.csv, participants.csv and comments.csv for analyze.py.

Usage: python3 from_form.py responses.csv [output folder]
Reads the results code (the column whose title starts with CODE), decodes every task result, and maps the
other columns by their code prefix (SUS1..SUS10, TLX1..TLX6, P1..P7, NAV1..NAV2, H3, DRIVES, LIB, SURVEY, DEVICE).
TLX answers are 0 to 10 in the form and are stored on a 0 to 100 scale.
A participant who submitted twice keeps the latest response."""
import base64, csv, json, re, sys, pathlib

src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '.')
rows = list(csv.DictReader(open(src, newline='', encoding='utf-8-sig')))
TLX = ['mental', 'physical', 'temporal', 'performance', 'effort', 'frustration']

def col(row, prefix):
    for k, v in row.items():
        if k and re.match(r'^' + re.escape(prefix) + r'\b', k.strip()): return (v or '').strip()
    return ''

def decode(code):
    body = code.strip().replace('CS1.', '', 1).replace('-', '+').replace('_', '/')
    body += '=' * (-len(body) % 4)
    return json.loads(base64.b64decode(body).decode('utf-8'))

latest, problems = {}, []
for n, row in enumerate(rows, 2):
    try: rep = decode(col(row, 'CODE'))
    except Exception: problems.append(f'row {n}: no readable results code, skipped'); continue
    if rep['p'] in latest: problems.append(f'{rep["p"]} submitted twice, keeping the later one (row {n})')
    latest[rep['p']] = (rep, row)

tasks, people, comments = [], [], []
for pid, (rep, row) in latest.items():
    for t in rep['r']:
        tasks.append(dict(participant=pid, task=t['i'], success=t['o'], time_s=round(t['m'] / 1000, 1), errors='', hints='', seq=t['q'],
                          taps=t['t'], screens=t['s'], gave_up=t['g'], answer=t.get('a', ''), steps=t.get('st', ''), notes=t.get('n', '')))
    if len(rep['r']) < 6: problems.append(f'{pid}: only {len(rep["r"])} of 6 tasks in the code')
    h3 = col(row, 'H3')
    p = dict(participant=pid, role='student', drives={'Yes, usually': 'yes', 'Sometimes': 'sometimes', 'No': 'no'}.get(col(row, 'DRIVES'), ''),
             library_use=col(row, 'LIB').lower(), from_survey={'Yes': 'yes', 'No': 'no'}.get(col(row, 'SURVEY'), 'unsure'),
             device=col(row, 'DEVICE'), screen_width=rep.get('w', ''), tasks_done=len(rep['r']),
             h3_choice='A' if h3.startswith('Version A') else 'B' if h3.startswith('Version B') else ('none' if h3 else ''), h3_first='A')
    for i in range(1, 11): p[f'sus{i}'] = col(row, f'SUS{i}')
    for i, k in enumerate(TLX, 1):
        v = col(row, f'TLX{i}'); p[f'tlx_{k}'] = '' if v == '' else int(float(v) * 10)
    for i in range(1, 8): p[f'p{i}'] = col(row, f'P{i}')
    for i in (1, 2): p[f'nav{i}'] = col(row, f'NAV{i}')
    people.append(p)
    for q in ['H3WHY', 'OPEN1', 'OPEN2', 'OPEN3', 'OPEN4', 'OPEN5']:
        if col(row, q): comments.append(dict(participant=pid, question=q, text=col(row, q)))

def write(name, data, cols):
    with open(out / name, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for r in data: w.writerow({c: r.get(c, '') for c in cols})

write('tasks.csv', tasks, ['participant', 'task', 'success', 'time_s', 'errors', 'hints', 'seq', 'taps', 'screens', 'gave_up', 'answer', 'steps', 'notes'])
write('participants.csv', people, ['participant', 'role', 'drives', 'library_use', 'from_survey', 'device', 'screen_width', 'tasks_done']
      + [f'sus{i}' for i in range(1, 11)] + [f'tlx_{k}' for k in TLX] + [f'p{i}' for i in range(1, 8)] + ['nav1', 'nav2', 'h3_choice', 'h3_first'])
write('comments.csv', comments, ['participant', 'question', 'text'])
print(f'{len(people)} participants, {len(tasks)} task rows, {len(comments)} comments written to {out}')
for p in problems: print('note:', p)
