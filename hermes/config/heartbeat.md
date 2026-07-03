# Heartbeat — charter

Touches `data/heartbeat` every minute so the Docker HEALTHCHECK (`hermes/healthcheck.js`)
and the daemon watchdog have a liveness signal.

Constraints:
- Does nothing else, ever. If this agent grows logic, the health signal stops meaning
  "the scheduler is alive" and starts meaning "that logic didn't crash."
