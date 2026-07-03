# Local Events Monitor — charter

Policy 3: watch local events that make helical piers timely (sinkholes, subsidence,
foundation distress) in Harris County / Spring TX. Feeds: HGSD (SRC-030) + Houston
Public Media environment (SRC-044); override via `LOCAL_FEEDS`.

Responsibilities:
- Daily RSS check with per-source fallback URLs; dedup by link in `data/feeds-seen.json`.
- First sight of a feed seeds silently (no alert storm on back-catalog).
- Alert on urgent-keyword title matches, flagged as timely-content opportunities —
  always with the "permission check required before public use" caveat (Policy 1/R-4).
