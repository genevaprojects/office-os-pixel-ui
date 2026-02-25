#!/usr/bin/env python3
import json, re, subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/root/.openclaw/workspace')
OFFICE = ROOT / 'office_os'
OUT = ROOT / 'office_os_pixel_ui' / 'live' / 'state.json'
OUT.parent.mkdir(parents=True, exist_ok=True)

def load_json(p, default):
    try:
        return json.loads(Path(p).read_text())
    except Exception:
        return default

def parse_ship(md_text):
    items = []
    for line in md_text.splitlines():
        if re.match(r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+\|', line):
            parts = [x.strip() for x in line.split('|')]
            if len(parts) >= 6:
                items.append({
                    'time': parts[0], 'owner': parts[1], 'taskId': parts[2],
                    'artifact': parts[3], 'path': parts[4], 'status': parts[5]
                })
    return list(reversed(items))

# parse CLI table fallback
UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

def parse_cron_table(raw):
    jobs = []
    for line in raw.splitlines():
        line = line.rstrip()
        if not line or line.startswith('Config warnings') or line.startswith('│') or line.startswith('◇'):
            continue
        cols = re.split(r'\s{2,}', line.strip())
        if not cols:
            continue
        if UUID_RE.match(cols[0]):
            # expected: id, name, schedule, next, last, status, target, agent
            job = {
                'id': cols[0],
                'name': cols[1] if len(cols) > 1 else cols[0],
                'status': (cols[5] if len(cols) > 5 else 'scheduled').lower(),
                'next': cols[3] if len(cols) > 3 else 'n/a'
            }
            jobs.append(job)
    return jobs

def build():
    backlog = load_json(OFFICE / 'BACKLOG.json', [])
    alerts = load_json(OFFICE / 'ALERT_STATE.json', {'issues': {}})
    ship = parse_ship((OFFICE / 'SHIP_LOG.md').read_text() if (OFFICE / 'SHIP_LOG.md').exists() else '')

    # cron jobs
    try:
        raw = subprocess.check_output(['openclaw', 'cron', 'list'], text=True, stderr=subprocess.STDOUT)
    except Exception as e:
        raw = ''
    cron_jobs = parse_cron_table(raw)

    worker_names = ['Research','Builder','Social','Executor']
    owner_map = {k: [] for k in ['RESEARCH','BUILDER','SOCIAL','EXECUTOR']}
    for t in backlog:
        owner = str(t.get('owner', '')).upper()
        if owner in owner_map and str(t.get('status','')).upper() == 'IN_PROGRESS':
            owner_map[owner].append(t)

    workers = []
    for wn in worker_names:
        owner_key = wn.upper()
        inprog = owner_map.get(owner_key, [])
        m = next((j for j in cron_jobs if f'worker loop ({wn.lower()}' in j['name'].lower()), None)
        status = 'running' if inprog else (m['status'] if m else 'scheduled')
        workers.append({
            'name': wn,
            'status': status,
            'nextRunAtMs': None,
            'running': bool(inprog)
        })

    monitors = []
    if cron_jobs:
        for j in cron_jobs[:12]:
            monitors.append({
                'name': j['name'],
                'status': j['status'],
                'nextRunAtMs': None,
                'errors': 0
            })
    else:
        for w in workers:
            monitors.append({
                'name': f"Worker Loop ({w['name']})",
                'status': w['status'],
                'nextRunAtMs': None,
                'errors': 0
            })

    ready = [t for t in backlog if str(t.get('status','')).upper() in {'READY','QUEUED','TODO','IN_PROGRESS'}]
    ready.sort(key=lambda t: (str(t.get('priority','P9')), t.get('id','')))

    out = {
        'now': datetime.now(timezone.utc).isoformat(),
        'workers': workers,
        'monitors': monitors,
        'backlog': ready[:20],
        'ship': ship[:25],
        'alertCount': len((alerts or {}).get('issues', {})),
        'decisions': 0
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f'Wrote {OUT}')

if __name__ == '__main__':
    build()
