# Agents Orchestrator — charter

Lightweight task router: reads `data/orchestrator-todo/` every 30 minutes and moves
typed work items to the owning agent's intake folder (currently: `lead` →
`data/leads-inbox/`).

Constraints:
- Routing only — it never performs another agent's work, only delivers it. New routes
  require the receiving agent to already exist and have an intake folder.
- Unknown task types are logged, not guessed at.
