function color(status){
  const s=String(status||'').toLowerCase();
  if(s==='ok'||s==='done') return 'green';
  if(s==='scheduled'||s==='running'||s==='in_progress') return 'yellow';
  return 'red';
}
function fmt(ms){return ms?new Date(ms).toLocaleString():'n/a'}

function renderWorkers(items){
  const el=document.getElementById('workers');
  el.innerHTML=items.map(w=>`<div class="card worker"><div class="sprite"></div><div><div><span class="light ${color(w.status)}"></span>${w.name}</div><div class="small">status: ${w.status}</div><div class="small">next: ${fmt(w.nextRunAtMs)}</div></div></div>`).join('');
}
function renderMonitors(items){
  const el=document.getElementById('monitors');
  el.innerHTML=items.map(m=>`<div class="card"><div><span class="light ${color(m.status)}"></span>${m.name}</div><div class="small">status: ${m.status}</div><div class="small">next: ${fmt(m.nextRunAtMs)}</div></div>`).join('');
}
function renderBacklog(items){
  const el=document.getElementById('backlog');
  el.innerHTML=items.map(t=>`<div class="card"><div>${t.id} — ${t.title}</div><div class="small">${t.priority} | ${t.owner} | ${t.status}</div></div>`).join('');
}
function renderShip(items){
  const el=document.getElementById('ship');
  el.innerHTML=items.map(s=>`<div class="card"><div>${s.time} | ${s.owner}</div><div class="small">${s.taskId} — ${s.artifact}</div><div class="small">${s.status}</div></div>`).join('');
}

function resolveApiUrl(){
  const q = new URLSearchParams(window.location.search);
  const fromQuery = q.get('api');
  if(fromQuery) return fromQuery;

  const fromStorage = window.localStorage.getItem('OFFICE_OS_API_URL');
  if(fromStorage) return fromStorage;

  if(window.OFFICE_OS_API_URL) return window.OFFICE_OS_API_URL;

  return './mock/state.json';
}

async function fetchState(){
  const apiUrl = resolveApiUrl();
  const res = await fetch(apiUrl, { cache: 'no-store' });
  if(!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

function renderAll(d){
  document.getElementById('now').textContent = new Date(d.now || Date.now()).toLocaleString();
  renderWorkers(d.workers||[]);
  renderMonitors(d.monitors||[]);
  renderBacklog(d.backlog||[]);
  renderShip(d.ship||[]);
}

async function tick(){
  try{
    const d = await fetchState();
    renderAll(d);
  }catch(err){
    console.error(err);
    renderAll({
      now: new Date().toISOString(),
      workers: [], monitors: [], backlog: [], ship: []
    });
  }
}

tick();
setInterval(tick, window.OFFICE_OS_REFRESH_MS || 30000);
