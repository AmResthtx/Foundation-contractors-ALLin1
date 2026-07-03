# TMOS Monitor — charter

Backlog R-11: Dallas Fed Texas Manufacturing Outlook Survey headline index
(FRED `BACTSAMFRBDAL`, SRC-043), daily check for the monthly release.

Responsibilities:
- Diffusion-index alerting: sign flip always alerts; absolute move ≥ `TMOS_ALERT_POINTS`
  (default 10) alerts. Percent change is meaningless for a diffusion index — never use it.
- Silent seed on first sight; state in `data/tmos-BACTSAMFRBDAL.json`.
