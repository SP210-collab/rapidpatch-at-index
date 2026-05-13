// ============================================================
// AT Pothole Index — data
// ============================================================
// PLACEHOLDER until LGOIMA delivery (expected 2026-06-06).
//
// When real data arrives, replace this file with the processed
// CSV converted to the JSON shape below. See update-data.py
// for the conversion script template.
// ============================================================

window.AT_INDEX_DATA = {
  // Date the underlying AT data was extracted.
  // Replace this on each quarterly refresh.
  dataDate: "[placeholder — pending LGOIMA delivery]",

  // Headline stats shown in the four hero cards.
  headline: {
    totalReported: "—",
    arterialCompliance: "—",
    overallCompliance: "—",
    avgResponse: "—",
  },

  // Suburb leaderboard. Top 20 by report volume.
  // Sort: worst-compliance-first (most newsworthy).
  // Replace this list once the real AT data is processed.
  suburbs: [
    // EXAMPLE SHAPE (commented out until real data lands):
    // { name: "Manurewa", reported: 412, avgHours: 38.2, compliance: 71 },
    // { name: "Henderson", reported: 387, avgHours: 32.1, compliance: 78 },
    // ...
  ],

  // All individual pothole reports as map dots.
  // Each = { lat, lng, suburb, reported, repaired, responseHours, compliance }
  // compliance: "on_time" | "late" | "very_late"
  holes: [
    // EXAMPLE SHAPE (commented out until real data lands):
    // { lat: -36.8772, lng: 174.7625, suburb: "Mt Eden", reported: "2026-03-12", repaired: "2026-03-13", responseHours: 22, compliance: "on_time" },
  ],

  // Findings narrative — write this AFTER processing the data.
  // Each finding = one paragraph, journalist-ready, citation-friendly.
  findings: null,
};
