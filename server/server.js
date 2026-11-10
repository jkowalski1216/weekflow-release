// WeekFlow web server: serves the app in web/ and the JSON API under /api.
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const config = require("./config");
const { db, tick, tx } = require("./db");
const auth = require("./auth");

const app = express();
app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", config.trustProxy);

// ---------- security headers ----------
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000");
  next();
});

app.use(express.json({ limit: "4mb" }));
app.use(auth.loadUser);

// ---------- cross-site protection for the API ----------
// Every write must carry X-WeekFlow: 1 (browsers won't add custom headers cross-site)
// and, when the browser sends an Origin, it must match this site.
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  if (req.get("x-weekflow") !== "1") return res.status(403).json({ error: "bad_request", message: "Request blocked." });
  const origin = req.get("origin");
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { host = null; }
    if (host !== req.get("host")) return res.status(403).json({ error: "bad_origin", message: "Request blocked." });
  }
  next();
});

const ip = (req) => req.ip || req.socket.remoteAddress || "unknown";
const now = () => Date.now();
const cleanEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e) && e.length <= 254;
const cleanName = (n) => String(n || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 60);
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at ?? u.createdAt });

const Q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT * FROM users WHERE id = ?"),
  insertUser: db.prepare("INSERT INTO users (id, email, name, pass_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"),
  setPass: db.prepare("UPDATE users SET pass_hash = ?, updated_at = ? WHERE id = ?"),
  setName: db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?"),
  deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
  taskCount: db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND deleted = 0"),
  tasksSince: db.prepare("SELECT id, data, deleted, updated_at FROM tasks WHERE user_id = ? AND updated_at > ? ORDER BY updated_at"),
  taskExists: db.prepare("SELECT 1 FROM tasks WHERE user_id = ? AND id = ?"),
  upsertTask: db.prepare(`INSERT INTO tasks (user_id, id, data, deleted, updated_at) VALUES (?, ?, ?, ?, ?)
                          ON CONFLICT(user_id, id) DO UPDATE SET data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at`),
  getDoc: db.prepare("SELECT doc, updated_at FROM user_docs WHERE user_id = ?"),
  putDoc: db.prepare(`INSERT INTO user_docs (user_id, doc, updated_at) VALUES (?, ?, ?)
                      ON CONFLICT(user_id) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at`)
};

// ---------- health ----------
app.get("/api/health", (req, res) => res.json({ ok: true, app: config.appName }));
app.get("/api/config", (req, res) => res.json({ allowSignup: config.allowSignup, inviteRequired: !!config.inviteCode, appName: config.appName }));

// ---------- accounts ----------
app.post("/api/auth/signup", (req, res) => {
  if (auth.limited("signup:" + ip(req), 10, 60 * 60 * 1000)) return res.status(429).json({ error: "rate_limited", message: "Too many sign-ups from this network. Try again in an hour." });
  if (!config.allowSignup) return res.status(403).json({ error: "signup_closed", message: "New sign-ups are turned off. Ask the person who runs this WeekFlow for an account." });
  const { password, invite } = req.body || {};
  const email = cleanEmail(req.body && req.body.email);
  const name = cleanName(req.body && req.body.name);
  if (config.inviteCode) {
    const a = Buffer.from(String(invite || "")), b = Buffer.from(config.inviteCode);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: "bad_invite", field: "invite", message: "That invite code isn't right. Check it with the person who invited you." });
  }
  if (!validEmail(email)) return res.status(400).json({ error: "bad_email", field: "email", message: "Enter a valid email address, like name@example.com." });
  const problem = auth.passwordProblem(password);
  if (problem) return res.status(400).json({ error: "weak_password", field: "password", message: problem });
  if (Q.userByEmail.get(email)) return res.status(409).json({ error: "email_taken", field: "email", message: "There's already an account with that email. Sign in instead." });
  const id = "u_" + crypto.randomBytes(12).toString("base64url");
  const t = now();
  Q.insertUser.run(id, email, name, auth.hashPassword(password), t, t);
  auth.startSession(req, res, id);
  res.status(201).json({ user: publicUser(Q.userById.get(id)) });
});

app.post("/api/auth/login", (req, res) => {
  const email = cleanEmail(req.body && req.body.email);
  const password = String((req.body && req.body.password) || "");
  if (auth.limited("login-ip:" + ip(req), 30, 15 * 60 * 1000) || auth.limited("login-email:" + email, 10, 15 * 60 * 1000))
    return res.status(429).json({ error: "rate_limited", message: "Too many sign-in attempts. Wait 15 minutes and try again." });
  const user = Q.userByEmail.get(email);
  const ok = auth.verifyPassword(password, user ? user.pass_hash : auth.DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: "bad_login", message: "That email and password don't match. Check them and try again." });
  auth.startSession(req, res, user.id);
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => { auth.endSession(req, res); res.json({ ok: true }); });

app.get("/api/me", auth.requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch("/api/me", auth.requireUser, (req, res) => {
  const name = cleanName(req.body && req.body.name);
  Q.setName.run(name, now(), req.user.id);
  res.json({ user: publicUser(Q.userById.get(req.user.id)) });
});

app.post("/api/account/password", auth.requireUser, (req, res) => {
  const { current, next } = req.body || {};
  if (auth.limited("pw:" + req.user.id, 10, 15 * 60 * 1000)) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Wait 15 minutes and try again." });
  const user = Q.userById.get(req.user.id);
  if (!auth.verifyPassword(String(current || ""), user.pass_hash)) return res.status(400).json({ error: "bad_password", field: "current", message: "Your current password isn't right." });
  const problem = auth.passwordProblem(next);
  if (problem) return res.status(400).json({ error: "weak_password", field: "next", message: problem });
  Q.setPass.run(auth.hashPassword(next), now(), user.id);
  auth.endOtherSessions(req, user.id);
  res.json({ ok: true, message: "Password changed. Other devices were signed out." });
});

app.delete("/api/account", auth.requireUser, (req, res) => {
  const user = Q.userById.get(req.user.id);
  if (!auth.verifyPassword(String((req.body && req.body.password) || ""), user.pass_hash)) return res.status(400).json({ error: "bad_password", field: "password", message: "That password isn't right." });
  Q.deleteUser.run(user.id); // sessions, tasks and settings go with it (ON DELETE CASCADE)
  res.clearCookie(auth.COOKIE, { path: "/" });
  res.json({ ok: true });
});

// ---------- sync ----------
// GET  /api/sync?since=N  -> everything that changed after server time N (0 = everything)
// POST /api/sync           -> { tasks: [{ id, data, deleted }], doc } ; last write wins per task
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TASK_BYTES = 32 * 1024;
const MAX_DOC_BYTES = 256 * 1024;

app.get("/api/sync", auth.requireUser, (req, res) => {
  const since = Math.max(0, parseInt(req.query.since, 10) || 0);
  const rows = Q.tasksSince.all(req.user.id, since);
  const docRow = Q.getDoc.get(req.user.id);
  let cursor = since;
  const tasks = rows.map((r) => { cursor = Math.max(cursor, r.updated_at); return r.deleted ? { id: r.id, deleted: true } : { id: r.id, data: JSON.parse(r.data) }; });
  let doc = null;
  if (docRow && docRow.updated_at > since) { doc = JSON.parse(docRow.doc); cursor = Math.max(cursor, docRow.updated_at); }
  res.json({ cursor, tasks, doc, full: since === 0 });
});

app.post("/api/sync", auth.requireUser, (req, res) => {
  const body = req.body || {};
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  if (tasks.length > 5000) return res.status(413).json({ error: "too_many", message: "Too many changes in one go. Try again." });
  for (const t of tasks) {
    if (!t || typeof t.id !== "string" || !ID_RE.test(t.id)) return res.status(400).json({ error: "bad_task", message: "A task had an invalid id." });
    if (!t.deleted) {
      if (!t.data || typeof t.data !== "object" || Array.isArray(t.data)) return res.status(400).json({ error: "bad_task", message: "A task was missing its details." });
      if (Buffer.byteLength(JSON.stringify(t.data)) > MAX_TASK_BYTES) return res.status(413).json({ error: "task_too_big", message: "A task is too large to save. Shorten its notes." });
    }
  }
  let docJson = null;
  if (body.doc != null) {
    if (typeof body.doc !== "object" || Array.isArray(body.doc)) return res.status(400).json({ error: "bad_doc", message: "Settings were in the wrong format." });
    docJson = JSON.stringify(body.doc);
    if (Buffer.byteLength(docJson) > MAX_DOC_BYTES) return res.status(413).json({ error: "doc_too_big", message: "Settings are too large to save." });
  }
  const creating = tasks.filter((t) => !t.deleted && !Q.taskExists.get(req.user.id, t.id)).length;
  if (creating && Q.taskCount.get(req.user.id).n + creating > config.maxTasksPerUser)
    return res.status(413).json({ error: "task_limit", message: "You've reached the task limit for this account. Delete old tasks to add more." });

  let cursor = 0;
  tx(() => {
    for (const t of tasks) {
      const stamp = tick();
      const data = t.deleted ? "{}" : JSON.stringify({ ...t.data, id: t.id });
      Q.upsertTask.run(req.user.id, t.id, data, t.deleted ? 1 : 0, stamp);
      cursor = stamp;
    }
    if (docJson) { const stamp = tick(); Q.putDoc.run(req.user.id, docJson, stamp); cursor = stamp; }
  });
  res.json({ ok: true, cursor, saved: tasks.length });
});

// Unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: "not_found", message: "That doesn't exist." }));

// ---------- the web app ----------
app.use(express.static(path.join(config.ROOT, "web"), { index: "index.html", maxAge: "1h", setHeaders: (res, file) => { if (file.endsWith("index.html") || file.endsWith(".webmanifest")) res.set("Cache-Control", "no-cache"); } }));
app.use((req, res) => res.sendFile(path.join(config.ROOT, "web", "index.html")));

// ---------- errors ----------
app.use((err, req, res, _next) => {
  if (err && err.type === "entity.too.large") return res.status(413).json({ error: "too_big", message: "That request was too large." });
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "bad_json", message: "The request was in the wrong format." });
  console.error(err);
  res.status(500).json({ error: "server_error", message: "Something went wrong on the server. Try again." });
});

if (require.main === module) {
  const server = app.listen(config.port, config.host, () => {
    console.log(`${config.appName} is running on http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`);
    console.log(`Data folder: ${config.dataDir} · Sign-ups ${config.allowSignup ? "open" : "closed"}${config.inviteCode ? " (invite code required)" : ""}`);
  });
  const stop = () => { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

module.exports = app;
