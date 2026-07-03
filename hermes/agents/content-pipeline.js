const fs = require('fs');
const path = require('path');
const { callAnthropic } = require('../lib/anthropic');

module.exports = {
  name: 'content-pipeline',
  intervalMs: 1000 * 60 * 60 * 6, // every 6 hours by default
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  async run(ctx) {
    try {
      const researchDir = path.join(__dirname, '..', 'research');
      const draftsLog = path.join(process.cwd(), 'data', 'drafts.log');
      const torqueVerifiedDir = path.join(process.cwd(), 'data', 'torque-logs', 'verified');
      const leadsScoredDir = path.join(process.cwd(), 'data', 'leads-scored');

      // Trigger conditions: new verified torque logs or new scored leads
      const torqueFiles = fs.existsSync(torqueVerifiedDir) ? fs.readdirSync(torqueVerifiedDir).filter(f => f.endsWith('.json')) : [];
      const leadFiles = fs.existsSync(leadsScoredDir) ? fs.readdirSync(leadsScoredDir).filter(f => f.endsWith('.json')) : [];
      if (torqueFiles.length === 0 && leadFiles.length === 0) {
        ctx.log({ agent: module.exports.name, message: 'no trigger found; nothing to draft' });
        return;
      }

      // Build a draft (one per run). Use Anthropic if available, otherwise a safe placeholder.
      let draftText = '';
      let sources = [];
      const prompts = require('../research/prompts');
      const promptTemplate = prompts['drafting'] || 'Write a short social draft about the following: {{context}}';

      // Collect context from the most recent lead or torque file
      let context = '';
      if (leadFiles.length > 0) {
        const f = leadFiles[leadFiles.length - 1];
        const obj = JSON.parse(fs.readFileSync(path.join(leadsScoredDir, f), 'utf8'));
        context = `Lead: ${obj.name} - ${obj.message}`;
        if (Array.isArray(obj.sources)) sources = obj.sources;
      } else if (torqueFiles.length > 0) {
        const f = torqueFiles[torqueFiles.length - 1];
        const obj = JSON.parse(fs.readFileSync(path.join(torqueVerifiedDir, f), 'utf8'));
        context = `Project torque record for pile manufactured by ${obj.pile_manufacturer} with actual torque ${obj.actual_installation_torque}`;
        if (Array.isArray(obj.sources)) sources = obj.sources;
      }

      // Draft generation
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          draftText = await callAnthropic(promptTemplate.replace('{{context}}', context));
        } catch (e) {
          ctx.log({ agent: module.exports.name, error: 'anthropic_error', reason: String(e) });
          draftText = `DRAFT (fallback): ${context}`;
        }
      } else {
        // local placeholder draft
        draftText = `DRAFT (placeholder): ${context}`;
      }

      // Enforce Policy 2: every factual claim must carry SRC-### tokens; check sources exist.
      // For simplicity, extract SRC-### tokens from draftText and validate against hermes/research/sources.md
      const claimSrcs = [];
      const re = /SRC-\d+/g;
      let m;
      while ((m = re.exec(draftText)) !== null) claimSrcs.push(m[0]);

      const gov = require('./automation-governance');
      const validation = gov.validateSources(claimSrcs);
      const auditId = gov.generateAuditId();

      if (validation.blocked && validation.blocked.length > 0) {
        // gate fail
        const entry = { audit_id: auditId, type: 'social_draft', platform: 'unknown', text: draftText, sources: claimSrcs, gate: 'blocked_prj', blocked: validation.blocked };
        fs.appendFileSync(draftsLog, JSON.stringify(entry) + '\n', 'utf8');
        ctx.log({ agent: module.exports.name, action: 'gate_fail', auditId, blocked: validation.blocked });
        return;
      }
      if (validation.missing && validation.missing.length > 0) {
        const entry = { audit_id: auditId, type: 'social_draft', platform: 'unknown', text: draftText, sources: claimSrcs, gate: 'missing_src', missing: validation.missing };
        fs.appendFileSync(draftsLog, JSON.stringify(entry) + '\n', 'utf8');
        ctx.log({ agent: module.exports.name, action: 'gate_fail_missing_src', auditId, missing: validation.missing });
        return;
      }

      // structural claims -> engineer review
      const civ = require('./civil-engineer');
      const engineer_review_required = civ.isStructuralClaim(draftText);

      // contradiction stress-test
      let contradiction = false;
      if (process.env.KB_STRESS_TEST_MODE === 'true') {
        const rc = require('./reality-checker');
        // naive: gather first 500 chars from research index file as citedText (or empty)
        let citedText = '';
        try { citedText = fs.readFileSync(path.join(researchDir, 'sources.md'), 'utf8').slice(0,2000); } catch (_) { citedText = ''; }
        const res = await rc.critiqueAgainstKb(draftText, citedText, ctx);
        if (res && res.pass === false) contradiction = true;
      }

      const result = { audit_id: auditId, platform: 'unknown', text: draftText, sources: claimSrcs, engineer_review_required, contradiction };
      fs.appendFileSync(draftsLog, JSON.stringify(result) + '\n', 'utf8');
      ctx.log({ agent: module.exports.name, action: 'draft_created', auditId, engineer_review_required, contradiction });

      // Post to CRM webhook
      const crm = process.env.CRM_WEBHOOK_URL || 'http://localhost:4000/webhook';
      try {
        const res = await fetch(crm, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'social_draft', platform: 'unknown', text: draftText, sources: claimSrcs, audit_id: auditId }) });
        if (!res.ok) ctx.log({ agent: module.exports.name, warning: 'crm_post_non_ok', status: res.status });
        else ctx.log({ agent: module.exports.name, action: 'crm_post_ok', status: res.status });
      } catch (e) {
        // webhook might be down; write a placeholder file to data/crm-outbox
        const outDir = path.join(process.cwd(), 'data', 'crm-outbox');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, `${auditId}.json`), JSON.stringify({ type: 'social_draft', platform: 'unknown', text: draftText, sources: claimSrcs, audit_id: auditId }, null, 2), 'utf8');
        ctx.log({ agent: module.exports.name, action: 'crm_post_failed_stored_outbox', auditId, reason: String(e) });
      }

    } catch (err) {
      ctx.log({ agent: module.exports.name, error: String(err) });
    }
  }
};
