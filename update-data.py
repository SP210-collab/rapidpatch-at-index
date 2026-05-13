"""AT Pothole Index — data processing script.

Run after the LGOIMA delivery arrives:

    python update-data.py path/to/at-lgoima-response.csv

This produces data.js with the processed dashboard data.

The script auto-detects common column-name variations because we don't yet
know exactly how AT will deliver the CSV. Adjust the COLUMN_ALIASES dict
below if AT delivers with completely unexpected column names.

Outputs:
    data.js — drop-in replacement for the current placeholder file
    Console summary of rows processed, suburbs ranked, dots generated,
    and a quality report (parse failures, missing geo, etc.).
"""

import sys, json, csv, os, argparse
from datetime import datetime
from collections import defaultdict, Counter
from statistics import mean, median


# AT promise targets (from at.govt.nz/about-us/street-maintenance/our-pothole-promise)
ARTERIAL_PROMISE_HOURS = 24
OTHER_PROMISE_HOURS = 24 * 5   # 5 days

# Auto-detect column names — AT might use different conventions
COLUMN_ALIASES = {
    "reported_at": ["reported_at", "date_reported", "reportedat", "report_date", "request_date", "received_at", "logged_at", "created_at", "reportdate"],
    "closed_at":   ["closed_at", "date_closed", "closedat", "completed_at", "resolved_at", "closeddate", "completiondate", "fixed_at"],
    "suburb":      ["suburb", "locality", "area", "neighbourhood", "subarea"],
    "road_class":  ["road_class", "road_type", "roadclass", "road_classification", "route_class", "carriageway"],
    "road_name":   ["road_name", "street", "road", "roadname", "thoroughfare"],
    "lat":         ["lat", "latitude", "y", "wgs84_lat", "coord_y"],
    "lng":         ["lng", "lon", "long", "longitude", "x", "wgs84_lng", "coord_x"],
    "defect_id":   ["defect_id", "id", "case_id", "request_id", "defectid", "ticket_id"],
    "status":      ["status", "state", "current_status"],
}

# Arterial road class indicators (case-insensitive substring match)
ARTERIAL_INDICATORS = ["arterial", "principal", "primary", "state highway", "sh", "main"]


def detect_columns(fieldnames):
    """Map standard names to whatever the input CSV uses."""
    mapping = {}
    fieldnames_lower = {f.lower().strip(): f for f in fieldnames}
    for canonical, candidates in COLUMN_ALIASES.items():
        for cand in candidates:
            if cand in fieldnames_lower:
                mapping[canonical] = fieldnames_lower[cand]
                break
    return mapping


def parse_dt(s):
    """Parse an AT datetime. Multiple format fallbacks."""
    if not s or s.strip() in ("", "null", "NULL", "-", "N/A", "n/a"):
        return None
    s = s.strip()
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def classify_road(raw_class, road_name=""):
    """Determine 'arterial' or 'other' from road_class field, falling back to road name heuristics."""
    rc = (raw_class or "").strip().lower()
    if rc == "arterial":
        return "arterial"
    if rc == "other":
        return "other"
    # Check substring indicators
    for indicator in ARTERIAL_INDICATORS:
        if indicator in rc:
            return "arterial"
    # Fall back to road name patterns (common arterial keywords)
    rn = (road_name or "").strip().lower()
    if any(k in rn for k in ["highway", "motorway", "expressway"]):
        return "arterial"
    return "other"


def compliance_class(response_hours, road_class):
    promise = ARTERIAL_PROMISE_HOURS if road_class == "arterial" else OTHER_PROMISE_HOURS
    if response_hours is None:
        return "very_late"
    if response_hours <= promise:
        return "on_time"
    if response_hours <= promise + 24 * 14:
        return "late"
    return "very_late"


def main(csv_path, output_path="data.js", min_suburb_volume=5):
    rows = []
    quality = Counter()
    suburb_class_observed = defaultdict(Counter)  # diagnostics

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        col_map = detect_columns(reader.fieldnames or [])

        # Bail loudly if essential columns are missing
        for required in ["suburb", "reported_at", "closed_at"]:
            if required not in col_map:
                print(f"ERROR: required column '{required}' not found.", file=sys.stderr)
                print(f"  Input columns: {reader.fieldnames}", file=sys.stderr)
                print(f"  Looked for: {COLUMN_ALIASES[required]}", file=sys.stderr)
                print(f"  Action: edit COLUMN_ALIASES in update-data.py to match.", file=sys.stderr)
                sys.exit(2)

        print(f"Detected column mapping:")
        for k, v in col_map.items():
            print(f"  {k:14s} -> {v}")
        print()

        for r in reader:
            reported = parse_dt(r.get(col_map.get("reported_at", ""), ""))
            closed = parse_dt(r.get(col_map.get("closed_at", ""), ""))
            response_hours = ((closed - reported).total_seconds() / 3600) if (reported and closed) else None
            road_class = classify_road(
                r.get(col_map.get("road_class", ""), ""),
                r.get(col_map.get("road_name", ""), ""),
            )
            suburb = (r.get(col_map.get("suburb", ""), "") or "Unknown").strip()
            try:
                lat = float(r.get(col_map.get("lat", ""), "") or 0)
                lng = float(r.get(col_map.get("lng", ""), "") or 0)
            except ValueError:
                lat = lng = 0

            # Quality checks
            if not reported:
                quality["missing_reported_at"] += 1
            if not closed:
                quality["still_open_or_missing_closed_at"] += 1
            if lat == 0 or lng == 0:
                quality["missing_geo"] += 1
            if suburb == "Unknown":
                quality["unknown_suburb"] += 1
            suburb_class_observed[suburb][road_class] += 1

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

    quality["total_rows"] = len(rows)

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
        if len(closed) < min_suburb_volume:
            continue
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

    # === Map dots ===
    holes = []
    for r in rows[:5000]:
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
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(out)

    # === Summary ===
    print(f"== Processing complete ==")
    print(f"Output: {output_path}  ({os.path.getsize(output_path):,} bytes)")
    print(f"Rows processed:           {quality['total_rows']:,}")
    print(f"  with missing reported:  {quality['missing_reported_at']:,}")
    print(f"  open or missing closed: {quality['still_open_or_missing_closed_at']:,}")
    print(f"  with missing geo:       {quality['missing_geo']:,}")
    print(f"  with unknown suburb:    {quality['unknown_suburb']:,}")
    print(f"Suburbs ranked (>= {min_suburb_volume} reports): {len(suburbs)}")
    print(f"Map dots written:         {len(holes):,}")
    print()
    print(f"== Headline stats ==")
    print(f"Total potholes:           {total:,}")
    print(f"Arterial 24h compliance:  {round(arterial_pct, 1)}%  (AT target: 95%)")
    print(f"Overall promise compliance: {round(overall_pct, 1)}%")
    print(f"Mean response:            {round(avg_hours, 1)}h")
    print()
    if worst and best:
        print(f"Worst suburb:  {worst['name']:20s} {worst['compliance']:.1f}% on time ({worst['reported']} reports)")
        print(f"Best suburb:   {best['name']:20s} {best['compliance']:.1f}% on time ({best['reported']} reports)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path", help="AT LGOIMA CSV file")
    ap.add_argument("-o", "--output", default="data.js", help="Output JS file (default: data.js)")
    ap.add_argument("--min-suburb-volume", type=int, default=5, help="Minimum reports per suburb to include in leaderboard (default: 5)")
    args = ap.parse_args()
    main(args.csv_path, args.output, args.min_suburb_volume)
