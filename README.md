# The Rapidpatch AT Pothole Index

**Live URL:** https://sp210-collab.github.io/rapidpatch-at-index/

Public dashboard tracking Auckland Transport's pothole response times against its own published promise (95% of arterial-road potholes repaired within 24 hours; all other sealed-road potholes within 5 days).

Built on independent LGOIMA-sourced data. Quarterly refresh cycle.

## Status

- ✅ **Dashboard scaffold:** built and deployed (placeholder data)
- ⏳ **First real dataset:** awaiting AT response to LGOIMA request CAS-PR0R8-Y6J2N5 (expected 2026-06-06)
- 📅 **Launch press cycle:** see `../strategy/2026-05-13-market-angles/02-AT-pothole-index-launch-plan.md`

## Updating with a new dataset

When AT delivers the LGOIMA response (CSV expected):

```bash
# 1. Copy AT's CSV here
cp /path/to/at-lgoima-2026-q2.csv ./

# 2. Run the converter
python update-data.py at-lgoima-2026-q2.csv

# 3. Commit and push
git add data.js
git commit -m "Refresh AT data — 2026 Q2"
git push origin main

# 4. Wait 60-120 seconds for GitHub Pages to redeploy
```

The dashboard will pick up the new data automatically.

## File layout

```
.
├── index.html       # Dashboard HTML + brand styling
├── data.js          # Placeholder data (replaced by update-data.py)
├── update-data.py   # Converts AT's CSV → data.js
└── README.md        # This file
```

## Expected CSV columns from AT

`update-data.py` accepts these column variants:

| Column | Aliases |
|---|---|
| `defect_id` | (used for dedup if present) |
| `road_name` | (informational) |
| `suburb` | suburb |
| `lat` | (for map dot) |
| `lng` | (for map dot) |
| `road_class` | "arterial" or "other" — determines which promise applies |
| `reported_at` | `date_reported` |
| `closed_at` | `date_closed` |
| `status` | (informational; we infer compliance from response time) |

If AT delivers a different column layout, edit `parse_dt()` and the field name fallbacks in `main()`.

## Press contacts

If a journalist links here:
- Steve Parker, Founder, Rapidpatch
- fix@rapidpatch.co.nz · 027 737 2858

## Licence

The dashboard code is MIT licensed. The underlying data is supplied by Auckland Transport under LGOIMA and is in the public domain.
