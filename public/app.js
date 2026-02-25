function normalizeStatus(status){
  return String(status || '').toLowerCase();
}

function color(status){
  const s = normalizeStatus(status);
  if (s === 'ok' || s === 'done') return 'green';
  if (s === 'scheduled' || s === 'running' || s === 'in_progress' || s === 'queued' || s === 'ready') return 'yellow';
  return 'red';
}

function friendlyStatus(status){
  const s = normalizeStatus(status);
  if (s === 'ok' || s === 'done') return 'Good';
  if (s === 'scheduled' || s === 'running' || s === 'in_progress' || s === 'queued' || s === 'ready') return 'In progress';
  return 'Needs action';
}

function relTime(ms){
  if(!ms) return 'n/a';
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return diff >= 0 ? `in ${min}m` : `${min}m ago`;
  const hr = Math.round(min / 60);
  return diff >= 0 ? `in ${hr}h` : `${hr}h ago`;
}

function esc(v){
  return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function renderHero(d){
  const monitors = d.monitors || [];
  const bad = monitors.filter(m => color(m.status) === 'red').length;
  const warn = monitors.filter(m => color(m.status) === 'yellow').length;

  let title = 'System status: Healthy';
  let sub = 'Everything looks stable. Keep monitoring.';
  if (bad > 0) {
    title = 'System status: Needs attention';
    sub = `${bad} job(s) need action right now.`;
  } else if (warn > 0) {
    title = 'System status: Active';
    sub = `${warn} job(s) currently running/scheduled.`;
  }

  document.getElementById('hero').innerHTML = `
    <h2 class="hero-title">${title}</h2>
    <p class="hero-sub">${sub}</p>
  `;
}

function renderSummary(d){
  const workers = d.workers || [];
  const monitors = d.monitors || [];
  const backlog = d.backlog || [];
  const healthyJobs = monitors.filter(m => ['ok','done'].includes(normalizeStatus(m.status))).length;
  const runningWorkers = workers.filter(w => normalizeStatus(w.status) === 'running').length;
  const p1Open = backlog.filter(t => String(t.priority || '').toUpperCase() === 'P1').length;

  const el = document.getElementById('summary');
  el.innerHTML = [
    ['Jobs healthy', `${healthyJobs}/${monitors.length || 0}`],
    ['People working now', `${runningWorkers}`],
    ['Urgent tasks (P1)', `${p1Open}`],
    ['Alerts', `${d.alertCount ?? 0}`]
  ].map(([title, value]) => `
    <div class="summary-card">
      <div class="summary-title">${title}</div>
      <div class="summary-value">${value}</div>
    </div>
  `).join('');
}

function renderWorkers(items){
  const el = document.getElementById('workers');
  if (!items.length) {
    el.innerHTML = '<article class="card"><div class="meta">No worker data available yet.</div></article>';
    return;
  }
  el.innerHTML = items.map(w => `
    <article class="card worker">
      <div class="sprite"></div>
      <div class="content">
        <div class="title"><span class="light ${color(w.status)}"></span>${esc(w.name)}</div>
        <div class="meta row"><span>Current state</span><span>${friendlyStatus(w.status)}</span></div>
        <div class="meta row"><span>Next run</span><span>${relTime(w.nextRunAtMs)}</span></div>
      </div>
    </article>
  `).join('');
}

function renderMonitors(items){
  const el = document.getElementById('monitors');
  if (!items.length) {
    el.innerHTML = '<article class="card"><div class="meta">No job monitor data available yet.</div></article>';
    return;
  }
  el.innerHTML = items.map(m => `
    <article class="card">
      <div class="title"><span class="light ${color(m.status)}"></span>${esc(m.name)}</div>
      <div class="meta row"><span>Health</span><span>${friendlyStatus(m.status)}</span></div>
      <div class="meta row"><span>Next run</span><span>${relTime(m.nextRunAtMs)}</span></div>
    </article>
  `).join('');
}

function renderBacklog(items){
  const sorted = [...items].sort((a, b) => {
    const pa = String(a.priority || '').toUpperCase();
    const pb = String(b.priority || '').toUpperCase();
    if (pa === pb) return 0;
    if (pa === 'P1') return -1;
    if (pb === 'P1') return 1;
    return pa.localeCompare(pb);
  });

  const el = document.getElementById('backlog');
  if (!sorted.length) {
    el.innerHTML = '<article class="card"><div class="meta">No tasks currently listed.</div></article>';
    return;
  }

  el.innerHTML = sorted.map(t => `
    <article class="card">
      <div class="title">${esc(t.id)} — ${esc(t.title)}</div>
      <div class="meta row"><span>Priority: ${esc(t.priority || '-')}</span><span>Owner: ${esc(t.owner || '-')}</span></div>
      <div class="meta">Status: ${esc(t.status || '-')}</div>
    </article>
  `).join('');
}

function renderShip(items){
  const el = document.getElementById('ship');
  if (!items.length) {
    el.innerHTML = '<article class="card"><div class="meta">No completed items yet.</div></article>';
    return;
  }

  el.innerHTML = items.map(s => `
    <article class="card">
      <div class="title">${esc(s.taskId || '-')} — ${esc(s.artifact || '-')}</div>
      <div class="meta row"><span>Owner: ${esc(s.owner || '-')}</span><span>${friendlyStatus(s.status || '-')}</span></div>
      <div class="meta">Completed: ${esc(s.time || '-')}</div>
    </article>
  `).join('');
}

function resolveApiUrl(){
  const q = new URLSearchParams(window.location.search);
  const fromQuery = q.get('api');
  if(fromQuery) return { url: fromQuery, mode: 'query endpoint' };

  const fromStorage = window.localStorage.getItem('OFFICE_OS_API_URL');
  if(fromStorage) return { url: fromStorage, mode: 'saved endpoint' };

  if(window.OFFICE_OS_API_URL) return { url: window.OFFICE_OS_API_URL, mode: 'config endpoint' };

  return { url: './mock/state.json', mode: 'mock demo data' };
}

async function fetchState(){
  const src = resolveApiUrl();
  const res = await fetch(src.url, { cache: 'no-store' });
  if(!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();
  data.__sourceMode = src.mode;
  return data;
}

function renderAll(d){
  document.getElementById('now').textContent = new Date(d.now || Date.now()).toLocaleString();
  document.getElementById('api-mode').textContent = `Data source: ${d.__sourceMode || 'unknown'}`;

  renderHero(d);
  renderSummary(d);
  renderWorkers(d.workers || []);
  renderMonitors(d.monitors || []);
  renderBacklog(d.backlog || []);
  renderShip((d.ship || []).slice(0, 20));
}

async function tick(){
  try{
    const d = await fetchState();
    renderAll(d);
  }catch(err){
    console.error(err);
    renderAll({
      now: new Date().toISOString(),
      workers: [], monitors: [], backlog: [], ship: [],
      alertCount: 0, __sourceMode: 'error'
    });
  }
}

tick();
setInterval(tick, window.OFFICE_OS_REFRESH_MS || 30000);
