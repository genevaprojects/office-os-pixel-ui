function normalizeStatus(status){ return String(status || '').toLowerCase(); }
function color(status){
  const s = normalizeStatus(status);
  if (s === 'ok' || s === 'done') return 'green';
  if (['scheduled','running','in_progress','queued','ready'].includes(s)) return 'yellow';
  return 'red';
}
function friendlyStatus(status){
  const s = normalizeStatus(status);
  if (s === 'ok' || s === 'done') return 'Good';
  if (['scheduled','running','in_progress','queued','ready'].includes(s)) return 'In progress';
  return 'Needs action';
}
function relTime(ms){
  if(!ms) return 'n/a';
  const diff = ms - Date.now();
  const min = Math.round(Math.abs(diff)/60000);
  if(min < 1) return 'now';
  if(min < 60) return diff >= 0 ? `in ${min}m` : `${min}m ago`;
  const hr = Math.round(min/60);
  return diff >= 0 ? `in ${hr}h` : `${hr}h ago`;
}
function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function renderHero(d){
  const monitors = d.monitors || [];
  const bad = monitors.filter(m => color(m.status) === 'red').length;
  const warn = monitors.filter(m => color(m.status) === 'yellow').length;
  let text = 'System status: Healthy office flow.';
  if (bad > 0) text = `System status: ${bad} area(s) need attention.`;
  else if (warn > 0) text = `System status: ${warn} flow(s) actively running.`;
  document.getElementById('hero').textContent = text;
}

function renderSummary(d){
  const workers = d.workers || [];
  const monitors = d.monitors || [];
  const backlog = d.backlog || [];
  const healthy = monitors.filter(m => ['ok','done'].includes(normalizeStatus(m.status))).length;
  const running = workers.filter(w => normalizeStatus(w.status) === 'running').length;
  const p1 = backlog.filter(t => String(t.priority || '').toUpperCase() === 'P1').length;
  const el = document.getElementById('summary');
  el.innerHTML = [
    ['Jobs healthy', `${healthy}/${monitors.length || 0}`],
    ['People working now', `${running}`],
    ['Urgent tasks (P1)', `${p1}`],
    ['Alerts', `${d.alertCount ?? 0}`]
  ].map(([t,v]) => `<div class="summary-card"><div class="summary-title">${t}</div><div class="summary-value">${v}</div></div>`).join('');
}

function renderWorkers(items){
  const map = {
    research: document.getElementById('worker-research'),
    builder: document.getElementById('worker-builder'),
    social: document.getElementById('worker-social'),
    executor: document.getElementById('worker-executor')
  };

  Object.values(map).forEach(el => {
    if (el) el.innerHTML = '<div class="meta">Waiting for worker status...</div>';
  });

  items.forEach(w => {
    const key = String(w.name || '').toLowerCase();
    const target = map[key];
    if (!target) return;
    const role = key;
    target.innerHTML = `
      <div class="worker-head">
        <div class="pixel-char ${role} ${color(w.status)}">
          <span class="status-dot ${color(w.status)}"></span>
          <span class="pixel-prop"></span>
        </div>
        <div class="worker-name">${esc(w.name)}</div>
      </div>
      <div class="worker-meta"><span>Status</span><span>${friendlyStatus(w.status)}</span></div>
      <div class="worker-meta"><span>Next run</span><span>${relTime(w.nextRunAtMs)}</span></div>
    `;
  });
}

function renderMonitors(items){
  const el = document.getElementById('monitors');
  if (!items.length) { el.innerHTML = '<article class="card"><div class="meta">No job monitor data yet.</div></article>'; return; }
  el.innerHTML = items.map(m => `
    <article class="card">
      <div class="title">${esc(m.name)}</div>
      <div class="meta row"><span>Health</span><span>${friendlyStatus(m.status)}</span></div>
      <div class="meta row"><span>Next run</span><span>${relTime(m.nextRunAtMs)}</span></div>
    </article>`).join('');
}

function renderBacklog(items){
  const sorted = [...items].sort((a,b)=>{
    const pa=String(a.priority||'').toUpperCase(), pb=String(b.priority||'').toUpperCase();
    if(pa===pb) return 0; if(pa==='P1') return -1; if(pb==='P1') return 1; return pa.localeCompare(pb);
  });
  const el = document.getElementById('backlog');
  if(!sorted.length){ el.innerHTML='<article class="card"><div class="meta">No tasks listed.</div></article>'; return; }
  el.innerHTML = sorted.map(t=>`<article class="card"><div class="title">${esc(t.id)} — ${esc(t.title)}</div><div class="meta row"><span>Priority: ${esc(t.priority||'-')}</span><span>Owner: ${esc(t.owner||'-')}</span></div><div class="meta">Status: ${esc(t.status||'-')}</div></article>`).join('');
}

function renderShip(items){
  const el = document.getElementById('ship');
  if(!items.length){ el.innerHTML='<article class="card"><div class="meta">No completed items yet.</div></article>'; return; }
  el.innerHTML = items.map(s=>`<article class="card"><div class="title">${esc(s.taskId||'-')} — ${esc(s.artifact||'-')}</div><div class="meta row"><span>Owner: ${esc(s.owner||'-')}</span><span>${friendlyStatus(s.status||'-')}</span></div><div class="meta">Completed: ${esc(s.time||'-')}</div></article>`).join('');
}

function resolveApiUrl(){
  const q=new URLSearchParams(window.location.search); const fromQuery=q.get('api');
  if(fromQuery) return {url:fromQuery, mode:'query endpoint'};
  const fromStorage=window.localStorage.getItem('OFFICE_OS_API_URL');
  if(fromStorage) return {url:fromStorage, mode:'saved endpoint'};
  if(window.OFFICE_OS_API_URL) return {url:window.OFFICE_OS_API_URL, mode:'config endpoint'};
  return {url:'./mock/state.json', mode:'mock demo data'};
}

async function fetchState(){
  const src=resolveApiUrl();
  const res=await fetch(src.url,{cache:'no-store'});
  if(!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data=await res.json(); data.__sourceMode=src.mode; return data;
}

function renderAll(d){
  document.getElementById('now').textContent = new Date(d.now || Date.now()).toLocaleString();
  document.getElementById('api-mode').textContent = `Data source: ${d.__sourceMode || 'unknown'}`;
  renderHero(d); renderSummary(d); renderWorkers(d.workers||[]); renderMonitors(d.monitors||[]); renderBacklog(d.backlog||[]); renderShip((d.ship||[]).slice(0,20));
}

async function tick(){
  try{ renderAll(await fetchState()); }
  catch(err){ console.error(err); renderAll({now:new Date().toISOString(),workers:[],monitors:[],backlog:[],ship:[],alertCount:0,__sourceMode:'error'}); }
}

tick();
setInterval(tick, window.OFFICE_OS_REFRESH_MS || 30000);
