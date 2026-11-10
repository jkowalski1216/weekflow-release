// All settings come from environment variables (or a .env file next to package.json).
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Minimal .env loader so the app runs the same with systemd, Docker or `npm start`.
(function loadDotEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
})();

const bool = (v, d) => (v === undefined || v === "" ? d : /^(1|true|yes|on)$/i.test(v));
const int = (v, d) => (v === undefined || v === "" || isNaN(+v) ? d : parseInt(v, 10));

module.exports = {
  ROOT,
  host: process.env.HOST || "0.0.0.0",
  port: int(process.env.PORT, 8080),
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || "data"),
  // Let new people create accounts. Turn off once your users are signed up.
  allowSignup: bool(process.env.ALLOW_SIGNUP, true),
  // Optional: people must enter this code to sign up.
  inviteCode: process.env.INVITE_CODE || "",
  // Set to 1 when WeekFlow runs behind a reverse proxy (Caddy, nginx) on the same machine.
  trustProxy: int(process.env.TRUST_PROXY, 0),
  // "auto" = secure cookies whenever the request came in over HTTPS.
  cookieSecure: (process.env.COOKIE_SECURE || "auto").toLowerCase(),
  sessionDays: int(process.env.SESSION_DAYS, 30),
  maxTasksPerUser: int(process.env.MAX_TASKS_PER_USER, 20000),
  appName: process.env.APP_NAME || "WeekFlow"
};
