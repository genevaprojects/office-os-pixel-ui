const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4321;
const ROOT = '/root/.openclaw/workspace';
const OFFICE_OS = path.join(ROOT, 'office_os');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}
function readText(file, fallback = '') {
  try { return fs.readFileSync(file, 'utf-8'); } catch { return fallback; }
}
function parseShipLog(md) {
  return md.split('\n').filter(l => /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+\|/.test(l)).map(line => {
    const p = line.split('|').map(x => x.trim());
    return { time: p[0], owner: p[1], taskId: p[2], artifact: p[3], path: p[4], status: p[5] };
  }).reverse();
}
function cronJobs() {
  try {
    const out = execSync('openclaw cron list', { encoding: 'utf-8' });
    return (JSON.parse(out).jobs || []);
  } catch { return []; }
}

app.get('/api/state', (_req, res) => {
  const state = readJson(path.join(OFFICE_OS, 'STATE.json'), {});
  const backlog = readJson(path.join(OFFICE_OS, 'BACKLOG.json'), []);
  const alerts = readJson(path.join(OFFICE_OS, 'ALERT_STATE.json'), { issues: {} });
  const decisions = readText(path.join(OFFICE_OS, 'DECISION_QUEUE.md'), '');
  const ship = parseShipLog(readText(path.join(OFFICE_OS, 'SHIP_LOG.md'), ''));
  const jobs = cronJobs();

  const workers = ['Research', 'Builder', 'Social', 'Executor'].map(name => {
    const j = jobs.find(x => (x.name || '').toLowerCase().includes(`worker loop (${name.toLowerCase()}`));
    return {
      name,
      status: j?.state?.lastStatus || 'scheduled',
      nextRunAtMs: j?.state?.nextRunAtMs || null,
      running: !!j?.state?.runningAtMs
    };
  });

  const topBacklog = backlog
    .filter(t => ['READY','QUEUED','TODO'].includes(String(t.status || '').toUpperCase()))
    .slice(0, 10);

  const monitorJobs = jobs.slice(0, 12).map(j => ({
    name: j.name,
    status: j.state?.lastStatus || 'scheduled',
    nextRunAtMs: j.state?.nextRunAtMs || null,
    errors: j.state?.consecutiveErrors || 0
  }));

  res.json({
    now: new Date().toISOString(),
    workers,
    monitors: monitorJobs,
    backlog: topBacklog,
    ship: ship.slice(0, 14),
    alertCount: Object.keys(alerts.issues || {}).length,
    decisions: decisions.split('\n').filter(l => l.includes('**Decision:**')).length
  });
});

app.use('/', express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`Office OS Pixel UI running at http://localhost:${PORT}`));
