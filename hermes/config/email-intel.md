# Email Intelligence — charter

Lead intake gate. Watches `data/leads-inbox/` for JSON leads ({name, contact,
message, ts}), every minute.

Responsibilities:
- Valid leads → `data/leads-processed/` with an audit entry.
- Malformed JSON or missing fields → quarantined to `data/leads-error/` with the
  reason recorded. Never crash on bad input; never silently drop a file.

Constraints:
- No scoring, no judgment — shape validation only. Scoring belongs to lead-scorer.
