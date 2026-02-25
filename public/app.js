function color(status){
  const s = String(status || '').toLowerCase();
  if (s === 'ok' || s === 'done') return 'green';
  if (s === 'scheduled' || s === 'running' || s === 'in_progress' || s === 'queued' || s === 'ready') return 'yellow';
  return 'red';
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
  return String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function renderSummary(d){
  const workers = d.workers || [];
  const monitors = d.monitors || [];
  const backlog = d.backlog || [];
  const healthyJobs = monitors.filter(m => ['ok','done'].includes(String(m.status || '').toLowerCase())).length;
  const runningWorkers = workers.filter(w => String(w.status || '').toLowerCase() === 'running').length;
  const p1Open = backlog.filter(t => String(t.priority || '').toUpperCase() === 'P1').length;

  const el = document.getElementById('summary');
  el.innerHTML = [
    ['Healthy jobs', `${healthyJobs}/${monitors.length || 0}`],
    ['Workers running', `${runningWorkers}`],
    ['P1 open', `${p1Open}`],
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
  el.innerHTML = items.map(w => `
    <article class="card worker">
      <div class="sprite"></div>
      <div class="content">
        <div class="title"><span class="light ${color(w.status)}"></span>${esc(w.name)}</div>
        <div class="meta row"><span>Status</span><span>${esc(w.status || 'unknown')}</span></div>
        <div class="meta row"><span>Next run</span><span>${relTime(w.nextRunAtMs)}</span></div>
      </div>
    </article>
  `).join('');
}

function renderMonitors(items){
  const el = document.getElementById('monitors');
  el.innerHTML = items.map(m => `
    <article class="card">
      <div class="title"><span class="light ${color(m.status)}"></span>${esc(m.name)}</div>
      <div class="meta row"><span>Status</span><span>${esc(m.status || 'unknown')}</span></div>
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
  el.innerHTML = sorted.map(t => `
    <article class="card">
      <div class="title">${esc(t.id)} — ${esc(t.title)}</div>
      <div class="meta row"><span>${esc(t.priority || '-')}</span><span>${esc(t.owner || '-')}</span></div>
      <div class="meta">${esc(t.status || '-')}</div>
    </article>
  `).join('');
}

function renderShip(items){
  const el = document.getElementById('ship');
  el.innerHTML = items.map(s => `
    <article class="card">
      <div class="title">${esc(s.taskId || '-')} — ${esc(s.artifact || '-')}</div>
      <div class="meta row"><span>${esc(s.owner || '-')}</span><span>${esc(s.status || '-')}</span></div>
      <div class="meta">${esc(s.time || '-')}</div>
    </article>
  `).join('');
}

function resolveApiUrl(){
  const q = new URLSearchParams(window.location.search);
  const fromQuery = q.get('api');
  if(fromQuery) return { url: fromQuery, mode: 'query' };

  const fromStorage = window.localStorage.getItem('OFFICE_OS_API_URL');
  if(fromStorage) return { url: fromStorage, mode: 'localStorage' };

  if(window.OFFICE_OS_API_URL) return { url: window.OFFICE_OS_API_URL, mode: 'config' };

  return { url: './mock/state.json', mode: 'mock' };
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
