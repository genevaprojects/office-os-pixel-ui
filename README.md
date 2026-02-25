# Office OS Pixel Art Frontend (HTML/CSS/JS)

Retro pixel-art office simulator dashboard for Office OS.

## Includes
- Worker status (Research/Builder/Social/Executor) as pixel desk workers
- Cron health shown on in-game monitor cards
- SHIP_LOG as bulletin board
- BACKLOG as wall task board
- Green/yellow/red real-time status lights
- Cozy retro office styling + pixel font + muted office palette

## Data
Live data is pulled from:
- `/root/.openclaw/workspace/office_os/STATE.json`
- `/root/.openclaw/workspace/office_os/BACKLOG.json`
- `/root/.openclaw/workspace/office_os/SHIP_LOG.md`
- `/root/.openclaw/workspace/office_os/DECISION_QUEUE.md`
- `/root/.openclaw/workspace/office_os/ALERT_STATE.json`
- `openclaw cron list`

## Run
```bash
cd /root/.openclaw/workspace/office_os_pixel_ui
npm install
npm run start
```
Open: http://localhost:4321
