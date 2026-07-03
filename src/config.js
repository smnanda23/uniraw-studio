// Global Uniraw frontend configuration.
//
// All runtime API calls use relative paths through the Vite proxy
// (see vite.config.js: /api/annotator → 5050, /api/converter → 5051,
// /api/previewer → 5053). That means the app works on every host —
// localhost, ngrok, or a LAN IP like 192.168.x.y — without any
// per-host configuration.
export const APP_VERSION = "1.0.0";
export const PROJECT_NAME = "Uniraw";
