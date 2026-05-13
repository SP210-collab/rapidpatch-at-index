"""AT Pothole Index — data processing script.

Run after the LGOIMA delivery arrives:

    python update-data.py path/to/at-lgoima-response.csv

This produces data.js with the processed dashboard data.

Expected input CSV columns (AT-typical layout, adjust if AT delivers differently):
    defect_id, road_name, suburb, lat, lng, road_class, reported_at, closed_at, status

Outputs:
    data.js — drop-in replacement for the current placeholder file
"""

import sys, json, csv, os
from datetime import datetime
from collections import defaultdict
from statistics import mean, median


# AT promise targets
ARTERIAL_PROMISE_HOURS = 24
OTHER_PROMISE_HOURS = 24 * 5   # 5 days


def parse_dt(s):
    """Parse an AT datetime. Adjust format if AT delivers differently."""
    if not s or s.strip() in ("", "null", "NULL", "-"):
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    print(f"WARN: could not parse datetime '{s}'", file=sys.stderr)
    return None


def compliance_class(response_hours, road_class):
    promise = ARTERIAL_PROMISE_HOURS if road_class == "arterial" else OTHER_PROMISE_HOURS
    if response_hours is None:
        return "very_late"
    if response_hours <= promise:
        return "on_time"
    if response_hours <= promise + 24 * 14:
        return "late"
    return "very_late"


def main(csv_path):
    rows = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            reported = parse_dt(r.get("reported_at") or r.get("date_reported") or "")
            closed = parse_dt(r.get("closed_at") or r.get("date_closed") or "")
            response_hours = ((closed - reported).total_seconds() / 3600) if (reported and closed) else None
            road_class = (r.get("road_class") or "other").strip().lower()
            if road_class not in ("arterial", "other"):
                road_class = "other"
            suburb = (r.get("suburb") or "Unknown").strip()
            try:
                lat = float(r.get("lat") or 0)
                lng = float(r.get("lng") or 0)
            except ValueError:
                lat = lng = 0
            rows.append({
                "suburb": suburb,
                "road_class": road_class,
                "lat": lat,
                "lng": lng,
                "reported_at": reported,
                "closed_at": closed,
                "response_hours": response_hours,
                "compliance": compliance_class(response_hours, road_class),
            })

    # === Headline stats ===
    total = len(rows)
    arterial = [r for r in rows if r["road_class"] == "arterial" and r["response_hours"] is not None]
    arterial_compliant = sum(1 for r in arterial if r["response_hours"] <= ARTERIAL_PROMISE_HOURS)
    arterial_pct = (arterial_compliant / len(arterial) * 100) if arterial else 0

    all_closed = [r for r in rows if r["response_hours"] is not None]
    overall_compliant = sum(1 for r in all_closed if r["compliance"] == "on_time")
    overall_pct = (overall_compliant / len(all_closed) * 100) if all_closed else 0

    avg_hours = mean(r["response_hours"] for r in all_closed) if all_closed else 0

    # === Suburb leaderboard ===
    by_suburb = defaultdict(list)
    for r in rows:
        if r["suburb"] != "Unknown":
            by_suburb[r["suburb"]].append(r)

    suburbs = []
    for name, srows in by_suburb.items():
        closed = [r for r in srows if r["response_hours"] is not None]
        if len(closed) < 5:
            continue   # ignore suburbs with too few reports for meaningful stats
        compliance = sum(1 for r in closed if r["compliance"] == "on_time") / len(closed) * 100
        suburbs.append({
            "name": name,
            "reported": len(srows),
            "avgHours": round(median(r["response_hours"] for r in closed), 1),
            "compliance": round(compliance, 1),
        })

    # Sort: most newsworthy first = worst-compliance, then highest-volume
    suburbs.sort(key=lambda s: (s["compliance"], -s["reported"]))
    suburbs = suburbs[:20]

    # === Map dots — sample if huge ===
    holes = []
    for r in rows[:5000]:   # cap for browser performance; over 5k consider clustering
        if r["lat"] == 0 or r["lng"] == 0:
            continue
        holes.append({
            "lat": r["lat"],
            "lng": r["lng"],
            "suburb": r["suburb"],
            "reported": r["reported_at"].strftime("%Y-%m-%d") if r["reported_at"] else "?",
            "repaired": r["closed_at"].strftime("%Y-%m-%d") if r["closed_at"] else None,
            "responseHours": round(r["response_hours"], 1) if r["response_hours"] is not None else "open",
            "compliance": r["compliance"],
        })

    # === Findings narrative — auto-skeleton ===
    worst = suburbs[0] if suburbs else None
    best = suburbs[-1] if suburbs else None

    findings_html = (
        f'<h3>Headline finding</h3>'
        f'<p>Across the {total:,} potholes Auckland Transport logged during this 12-month window, '
        f'AT met its own promise on <strong>{round(overall_pct, 1)}%</strong> of reports. '
        f'On arterial roads (where the promise is 24 hours), compliance was <strong>{round(arterial_pct, 1)}%</strong> '
        f'against AT&apos;s stated 95% target.</p>'
    )
    if worst and best:
        findings_html += (
            f'<h3>Geographic disparity</h3>'
            f'<p><strong>{worst["name"]}</strong> ranks lowest with only <strong>{worst["compliance"]}%</strong> '
            f'of potholes repaired within promise, vs <strong>{best["name"]}</strong> at <strong>{best["compliance"]}%</strong>. '
            f'The median response time across all suburbs is {round(median([s["avgHours"] for s in suburbs]),1)} hours.</p>'
        )
    findings_html += (
        '<h3>What we&apos;ll watch next quarter</h3>'
        '<p>We re-submit the LGOIMA request quarterly. Look for: '
        '(1) whether AT&apos;s overall compliance trends up or down; '
        '(2) whether the worst-performing suburbs stay constant or rotate; '
        '(3) whether the new $500M Pothole Prevention Fund (allocated 2024) shows visible improvement in 2026-2027.</p>'
    )

    # === Write data.js ===
    data = {
        "dataDate": datetime.now().strftime("%Y-%m-%d"),
        "headline": {
            "totalReported": f"{total:,}",
            "arterialCompliance": f"{round(arterial_pct, 1)}%",
            "overallCompliance": f"{round(overall_pct, 1)}%",
            "avgResponse": f"{round(avg_hours, 1)}h",
        },
        "suburbs": suburbs,
        "holes": holes,
        "findings": findings_html,
    }
    out = f"window.AT_INDEX_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open("data.js", "w", encoding="utf-8") as f:
        f.write(out)
    print(f"✓ wrote data.js — {total:,} rows processed, {len(suburbs)} suburbs ranked, {len(holes)} map dots")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update-data.py path/to/at-lgoima-response.csv")
        sys.exit(1)
    main(sys.argv[1])
