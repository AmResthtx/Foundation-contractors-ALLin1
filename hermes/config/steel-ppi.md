# Steel PPI Monitor — charter

Policy 3: track only the steel price series that affect our procurement.
FRED `WPU101704` (hot-rolled bars/plates/structural shapes) and `PCU33123312`
(steel product mfg from purchased steel), daily, via the keyless fredgraph.csv endpoint.

Responsibilities:
- Log each new monthly observation; state per series in `data/ppi-<id>.json`.
- Alert (`CRM_WEBHOOK_URL`) when a month-over-month move ≥ `PPI_ALERT_PCT` (default 5%).

Constraints:
- Series list changes require a matching update to `hermes/research/steel-alloys.md`
  (SRC-020/021) — never track a series the KB can't explain.
