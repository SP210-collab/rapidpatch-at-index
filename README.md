# The Rapidpatch AT Pothole Index

**Live URL:** https://sp210-collab.github.io/rapidpatch-at-index/

Public dashboard tracking Auckland Transport's pothole response times against its own published promise (95% of arterial-road potholes repaired within 24 hours; all other sealed-road potholes within 5 days).

Built on independent LGOIMA-sourced data. Quarterly refresh cycle.

## Status

- ✅ **Dashboard scaffold:** built and deployed (placeholder data shown until LGOIMA delivery)
- ✅ **Data ingestion pipeline:** tested end-to-end with 6,000 synthetic rows
- ⏳ **First real dataset:** awaiting AT response to LGOIMA request CAS-PR0R8-Y6J2N5 (expected 2026-06-06)
- 📅 **Launch press cycle:** see `../strategy/2026-05-13-market-angles/02-AT-pothole-index-launch-plan.md`

## When the LGOIMA data arrives

```bash
# 1. Save AT's CSV here (whatever AT calls it)
cp /path/to/at-lgoima-2026-q2.csv ./

# 2. Run the converter
python update-data.py at-lgoima-2026-q2.csv

# 3. Verify output looks reasonable
#    Console summary shows: rows, suburb count, compliance %, worst/best suburb

# 4. Commit and push
git add data.js
git commit -m "Refresh AT data — 2026 Q2"
git push origin main

# 5. Wait 60-120 seconds for GitHub Pages to redeploy
```

The dashboard at https://sp210-collab.github.io/rapidpatch-at-index/ will pick up the new data automatically.

## Testing the pipeline before June 6

You can verify the entire pipeline works with synthetic data:

```bash
# Generate 6,000 realistic synthetic AT rows
python generate_test_data.py > test-data.csv

# Process them
python update-data.py test-data.csv -o test-data.js

# Inspect the output before risking real-data run
head test-data.js
```

Expected outcome with synthetic data:
- ~92-94% arterial 24h compliance (just under AT's 95% target)
- ~80-83% overall promise compliance
- 20 suburbs ranked
- 5,000 map dots written
- 1.1 MB output JSON

If your synthetic test passes, the real-data run on June 6 will work the same way.

## File layout

```
.
├── index.html              # Dashboard HTML + brand styling
├── data.js                 # Live data (placeholder until June 6)
├── update-data.py          # Converts AT's CSV → data.js
├── generate_test_data.py   # Synthetic data generator for testing
└── README.md               # This file
```

## Robust to column-name variations

`update-data.py` auto-detects column names via a `COLUMN_ALIASES` dictionary. We don't yet know exactly how AT will deliver, but the script accepts many common variations:

| Standard | Accepted aliases |
|---|---|
| `reported_at` | `date_reported`, `request_date`, `received_at`, `logged_at`, `report_date` |
| `closed_at` | `date_closed`, `completed_at`, `resolved_at`, `fixed_at` |
| `suburb` | `locality`, `area`, `neighbourhood` |
| `road_class` | `road_type`, `classification`, `carriageway` |
| `lat`/`lng` | `latitude`/`longitude`, `wgs84_lat`/`wgs84_lng`, `x`/`y` |

If AT delivers with completely different column names, edit `COLUMN_ALIASES` in `update-data.py` to add the new variants.

## Datetime parsing fallbacks

The script handles 12 datetime formats including:
- ISO 8601: `2025-09-16T07:08:00`, `...Z` and `...&plusmn;HH:MM`
- NZ standard: `16/09/2025 07:08`, `16-09-2025`
- US: `09/16/2025`
- Date-only: `2025-09-16`

If AT uses a non-standard format, add it to the `parse_dt()` function.

## Quality checks

The script reports:
- Rows with missing reported_at (= can't compute response time)
- Rows still open or missing closed_at (= "very_late" classification)
- Rows with missing geo (= excluded from map but still counted in stats)
- Rows with unknown suburb (= excluded from leaderboard but still counted)

If any of these counts seem unusually high (>10% of rows), inspect the input CSV before pushing.

## Methodology (for press)

- **AT promise targets:** 95% on arterials within 24 hours; 100% on other sealed roads within 5 days. Source: [AT Pothole Promise](https://at.govt.nz/about-us/street-maintenance/our-pothole-promise)
- **Compliance:** time from "reported_at" to "closed_at" in AT's logs ≤ the promise window.
- **Classifications:**
  - `on_time`: within promise
  - `late`: 1-14 days past promise
  - `very_late`: more than 14 days past promise, OR still open
- **Suburb leaderboard:** suburbs with ≥5 closed reports are ranked. Median response time used (not mean) to dampen outliers.
- **Map dot cap:** 5,000 dots maximum for browser performance. Set higher via direct edit if needed (consider Leaflet marker clustering for >5K).

## Press contacts

If a journalist links here:
- Steve Parker, Founder, Rapidpatch
- fix@rapidpatch.co.nz · 027 737 2858

## Licence

The dashboard code is MIT licensed. The underlying data is supplied by Auckland Transport under LGOIMA and is in the public domain.
