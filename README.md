# Office OS Pixel Art Frontend (Static Deploy Ready)

Retro pixel-art office simulator dashboard for Office OS.

## Includes
- Worker status (Research/Builder/Social/Executor) as pixel desk workers
- Cron health shown on in-game monitor cards
- SHIP_LOG as bulletin board
- BACKLOG as wall task board
- Green/yellow/red real-time status lights
- Cozy retro office styling + pixel font + muted office palette

## Static Hosting (Netlify / Cloudflare Pages)
`public/` is now fully self-contained and deployable as a static site.

### Data source options
1. **Configurable API endpoint (recommended)**
   - Set `window.OFFICE_OS_API_URL` in `public/config.js`
   - Or use query override: `?api=https://your-api/state.json`
   - Or set in browser localStorage: `OFFICE_OS_API_URL`

2. **Static mock JSON fallback**
   - If no API URL is configured, app loads `public/mock/state.json`
   - You can update this file via cron/build hook for periodic refresh

## Required JSON schema
The endpoint should return:

```json
{
  "now": "2026-02-25T16:39:00.000Z",
  "workers": [{"name":"Research","status":"ok","nextRunAtMs":1772000100000}],
  "monitors": [{"name":"Worker Loop","status":"ok","nextRunAtMs":1772000100000,"errors":0}],
  "backlog": [{"id":"P1-001","title":"Task","priority":"P1","owner":"Builder","status":"READY"}],
  "ship": [{"time":"2026-02-25 16:00","owner":"Builder","taskId":"P1-001","artifact":"file.md","status":"done"}],
  "alertCount": 0,
  "decisions": 1
}
```

## Local run
```bash
cd /root/.openclaw/workspace/office_os_pixel_ui
npm install
npm run start
```
Open: http://localhost:4321

## Static deployment
- Deploy `office_os_pixel_ui/public` as the publish directory on Netlify or Cloudflare Pages.
- No Node server is required for static deployment.
