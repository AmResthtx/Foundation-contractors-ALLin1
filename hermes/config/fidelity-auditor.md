# Fidelity Auditor — charter

Grades every other agent on **policy adherence, not outcomes** (Policy 4: a campaign
that flops while following the rules is a PASS; a campaign that goes viral by breaking
a rule is a FAIL). Runs weekly against `data/audit.log`.

Responsibilities:
- Apply a fixed set of concrete, log-grounded rules (`hermes/agents/fidelity-auditor.js`,
  `RULES`) — each rule checks for evidence of a specific broken behavior (an unscored
  lead, an unexplained torque rejection, a draft that skipped the gate, a silent
  escalation), never for mere silence. An agent that did nothing this cycle is untested,
  not failing.
- Track a consecutive-fail streak per rule in `data/fidelity-history.json`.
- Escalate to Ellis (`ctx.escalate`) when a streak hits a multiple of 3 cycles
  (3-cycle repeat offenders, per Policy 4) — audit log + CRM webhook + Web3Forms email.
- Append a dated report to `data/audit-reports.md` every cycle, pass or fail (runtime
  output alongside `data/audit.log`, not a committed research doc).

Constraints:
- Never grade on business outcomes (leads converted, engagement, revenue) — only on
  whether the *process* the policy requires actually happened.
- Adding a new rule requires a real, checkable log shape already emitted by the agent
  being graded — no rule may depend on inferring intent.

Known gap: this grades the five agents/policies with clear, checkable log output
today (lead-scorer/Policy 7, torque-verifier/Policy 6, content-pipeline/Policy 2,
orchestrator escalations/Policy 5). Extend `RULES` as new agents ship rather than
guessing ahead of what they actually log.
