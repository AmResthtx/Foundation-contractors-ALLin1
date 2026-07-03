// agents-orchestrator: minimal coordinator that demonstrates delegation patterns
module.exports = {
  name: 'agents-orchestrator',
  intervalMs: 1000 * 60 * 30,
  staleAfterMs: 1000 * 60 * 60 * 24,
  run(ctx) {
    // Lightweight: scan for work items and delegate by writing to agent inbox folders.
    try {
      const fs = require('fs');
      const path = require('path');
      const todo = path.join(process.cwd(), 'data', 'orchestrator-todo');
      if (!fs.existsSync(todo)) return ctx.log({ agent: module.exports.name, message: 'no tasks' });
      const items = fs.readdirSync(todo).filter(f => f.endsWith('.json'));
      for (const it of items) {
        const full = path.join(todo, it);
        const obj = JSON.parse(fs.readFileSync(full, 'utf8'));
        // simple routing: if item.type == 'lead' -> write to data/leads-inbox
        if (obj.type === 'lead') {
          const dest = path.join(process.cwd(), 'data', 'leads-inbox', it);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.renameSync(full, dest);
          ctx.log({ agent: module.exports.name, action: 'routed', to: 'leads-inbox', item: it });
        } else {
          ctx.log({ agent: module.exports.name, action: 'unknown_task', item: it });
        }
      }
    } catch (e) {
      ctx.log({ agent: module.exports.name, error: String(e) });
    }
  }
};
