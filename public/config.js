// Static-host friendly config.
// Option A: set window.OFFICE_OS_API_URL to a full endpoint returning state JSON.
// Option B: leave empty to use local mock data at ./mock/state.json
window.OFFICE_OS_API_URL = 'https://raw.githubusercontent.com/genevaprojects/office-os-pixel-ui/main/live/state.json';
window.OFFICE_OS_REFRESH_MS = 30000;
