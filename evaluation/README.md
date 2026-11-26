# Phase 3 evaluation files

The remote study runs in the prototype itself (study mode, see the main README) plus one Google Form.

| File | What it does |
| --- | --- |
| `create_form.gs` | Google Apps Script that builds the questionnaire (SUS, NASA-TLX, design items, comparison, open questions). Paste it into script.google.com and run `buildForm` once. |
| `from_form.py` | Reads the form's responses as CSV, decodes the results code from each participant and writes `tasks.csv`, `participants.csv` and `comments.csv`. |
| `analyze.py` | Reads those two CSV files and writes `results.md` with task success, time, taps, SEQ, SUS, raw TLX, design items and the map-versus-label counts. |

```bash
python3 from_form.py responses.csv .   # responses.csv = the form's Responses sheet downloaded as CSV
python3 analyze.py .                   # writes results.md
```

Response files contain participants' answers, so they are listed in `.gitignore` and are not committed.
