# Bookkeeper — charter

Lightweight, auditable bookkeeping agent. Designed for constrained budgets: append-only ledger, no external payments.

Responsibilities:
- Accept structured expense/invoice records and append them to data/bookkeeper/ledger.jsonl
- Produce periodic summary files (monthly) for human review
- Upgrade path: reconciliation checks, export CSV, integration with Accounts Payable agent (requires strict governance and approval nodes)

Constraints:
- No direct payments or secrets in code. All sensitive operations go through governance and human approval.
