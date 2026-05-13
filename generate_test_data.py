"""Generate synthetic AT pothole response data for end-to-end pipeline testing.

Run BEFORE the LGOIMA delivery arrives to validate that:
- update-data.py runs without errors
- data.js produces a valid dashboard
- the visualisation renders correctly with realistic numbers

Usage:
    python generate_test_data.py > test-data.csv
    python update-data.py test-data.csv

The output CSV mimics what AT is likely to deliver — based on AT's public
documentation of their Report-It logs and similar council LGOIMA responses.

If AT delivers data in a different column layout, update-data.py auto-detects
common alternate column names — but you may need to rename here if the columns
diverge significantly.
"""
import csv, random, sys
from datetime import datetime, timedelta

# Auckland suburbs with approximate centroid lat/lng for realistic geo-distribution
SUBURBS = [
    ("Albany",         -36.7273, 174.7019, "other"),
    ("Avondale",       -36.8970, 174.6987, "other"),
    ("Birkenhead",     -36.8181, 174.7320, "other"),
    ("Botany Downs",   -36.9255, 174.9120, "other"),
    ("Browns Bay",     -36.7187, 174.7488, "other"),
    ("Devonport",      -36.8331, 174.7956, "other"),
    ("Ellerslie",      -36.8970, 174.8160, "other"),
    ("Epsom",          -36.8920, 174.7800, "other"),
    ("Glen Eden",      -36.9123, 174.6500, "other"),
    ("Glen Innes",     -36.8770, 174.8500, "other"),
    ("Glenfield",      -36.7798, 174.7240, "other"),
    ("Greenlane",      -36.8920, 174.7950, "other"),
    ("Grey Lynn",      -36.8650, 174.7400, "other"),
    ("Henderson",      -36.8786, 174.6259, "other"),
    ("Howick",         -36.8930, 174.9290, "other"),
    ("Manukau",        -36.9930, 174.8800, "arterial"),
    ("Manurewa",       -37.0190, 174.9020, "other"),
    ("Mangere",        -36.9572, 174.7920, "other"),
    ("Mt Albert",      -36.8830, 174.7100, "other"),
    ("Mt Eden",        -36.8772, 174.7625, "arterial"),  # Dominion Rd is arterial
    ("Mt Roskill",     -36.9070, 174.7340, "other"),
    ("Mt Wellington",  -36.9020, 174.8420, "arterial"),
    ("New Lynn",       -36.9082, 174.6873, "other"),
    ("Newmarket",      -36.8704, 174.7770, "arterial"),
    ("North Harbour",  -36.7470, 174.7220, "other"),
    ("Onehunga",       -36.9242, 174.7900, "arterial"),
    ("Orakei",         -36.8550, 174.8200, "other"),
    ("Otahuhu",        -36.9447, 174.8336, "arterial"),
    ("Pakuranga",      -36.8990, 174.9015, "other"),
    ("Panmure",        -36.8920, 174.8420, "arterial"),
    ("Papakura",       -37.0660, 174.9430, "arterial"),
    ("Papatoetoe",     -36.9700, 174.8530, "other"),
    ("Parnell",        -36.8597, 174.7800, "arterial"),
    ("Penrose",        -36.9100, 174.8120, "arterial"),
    ("Point Chevalier",-36.8540, 174.7110, "other"),
    ("Ponsonby",       -36.8540, 174.7430, "arterial"),
    ("Remuera",        -36.8819, 174.8013, "other"),
    ("Royal Oak",      -36.9075, 174.7720, "other"),
    ("Sandringham",    -36.8870, 174.7470, "other"),
    ("St Heliers",     -36.8520, 174.8700, "other"),
    ("Takapuna",       -36.7895, 174.7700, "arterial"),
    ("Three Kings",    -36.9000, 174.7570, "other"),
    ("Titirangi",      -36.9359, 174.6543, "other"),
    ("Westmere",       -36.8580, 174.7340, "other"),
]

# Compliance characteristics — different suburbs perform differently in our test
# Modelling: arterials achieve ~93% within 24h, others ~78% within 5 days
def make_response_hours(road_class):
    if road_class == "arterial":
        # 93% within 24h, 5% 24-72h, 2% over 72h
        r = random.random()
        if r < 0.93: return random.uniform(0.5, 24)
        if r < 0.98: return random.uniform(24, 72)
        return random.uniform(72, 14 * 24)
    else:
        # 78% within 120h (5d), 17% 5-14d, 5% over 14d
        r = random.random()
        if r < 0.78: return random.uniform(2, 120)
        if r < 0.95: return random.uniform(120, 14 * 24)
        return random.uniform(14 * 24, 30 * 24)


def make_row(idx, base_date):
    suburb, lat, lng, road_class = random.choice(SUBURBS)
    # Jitter the geo a bit so dots don't all stack on suburb centroid
    lat_j = lat + random.uniform(-0.012, 0.012)
    lng_j = lng + random.uniform(-0.015, 0.015)
    reported_at = base_date + timedelta(
        days=random.randint(0, 364),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    response_h = make_response_hours(road_class)
    closed_at = reported_at + timedelta(hours=response_h)
    # ~3% are still open
    if random.random() < 0.03:
        closed_at_str = ""
    else:
        closed_at_str = closed_at.strftime("%Y-%m-%d %H:%M:%S")
    return {
        "defect_id": f"AT-{2025}-{idx:06d}",
        "road_name": random.choice([
            "Great North Rd", "Dominion Rd", "Mt Albert Rd", "Manukau Rd",
            "Pakuranga Rd", "New North Rd", "Sandringham Rd", "Onewa Rd",
            "Lake Rd", "Khyber Pass Rd", "Karangahape Rd", "Symonds St",
        ]) if road_class == "arterial" else f"{suburb} side road {random.randint(1,40)}",
        "suburb": suburb,
        "lat": round(lat_j, 5),
        "lng": round(lng_j, 5),
        "road_class": road_class,
        "reported_at": reported_at.strftime("%Y-%m-%d %H:%M:%S"),
        "closed_at": closed_at_str,
        "status": "closed" if closed_at_str else "open",
    }


def main():
    random.seed(42)  # reproducible test data
    n = 6000  # realistic 12-month volume for AT (~6,000-8,000 potholes/year)
    base = datetime(2025, 5, 14)  # 12 months prior to "today"
    writer = csv.DictWriter(sys.stdout, fieldnames=[
        "defect_id", "road_name", "suburb", "lat", "lng",
        "road_class", "reported_at", "closed_at", "status",
    ])
    writer.writeheader()
    for i in range(n):
        writer.writerow(make_row(i, base))


if __name__ == "__main__":
    main()
