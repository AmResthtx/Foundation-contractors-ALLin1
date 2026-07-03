# Lead Scorer — charter

Policy 7: score based on urgency signals; hot leads dispatch within 24h; all scoring
logged with reasoning.

Responsibilities:
- Score `data/leads-processed/` leads 0–100 via Anthropic (rubric in
  `hermes/research/prompts/index.js`); rule-based keyword fallback when no API key.
- Score ≥ 70 = HOT → immediate alert + 24h reminder file in `data/leads-reminders/`.
- Every score written to `data/leads-scored/` with its reasoning.

Constraints:
- A score without recorded reasoning is a fidelity-audit failure (Policy 7), even if
  the number is right.
