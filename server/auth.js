// Passwords, sessions and sign-in rate limits.
const crypto = require("crypto");
const { db } = require("./db");
const config = require("./config");

const COOKIE = "wf_session";

// ---------- passwords (scrypt, built into Node) ----------
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, SCRYPT.keylen, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}
function verifyPassword(pw, stored) {
  try {
    const [alg, N, r, p, salt, key] = String(stored).split("$");
    if (alg !== "scrypt") return false;
    const want = Buffer.from(key, "base64");
    const got = crypto.scryptSync(pw, Buffer.from(salt, "base64"), want.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  } catch { return false; }
}
// Spend the same time on unknown emails so sign-in doesn't reveal which accounts exist.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString("hex"));

function passwordProblem(pw) {
  if (typeof pw !== "string" || pw.length < 8) return "Use at least 8 characters for your password.";
  if (pw.length > 200) return "That password is too long. Use 200 characters or fewer.";
  return null;
}

// ---------- sessions ----------
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const q = {
  insert: db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)"),
  find: db.prepare(`SELECT s.token_hash, s.expires_at, u.id, u.email, u.name, u.created_at
                    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`),
  extend: db.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?"),
  remove: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  removeOthers: db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?"),
  sweep: db.prepare("DELETE FROM sessions WHERE expires_at < ?")
};
const DAY = 24 * 60 * 60 * 1000;

function isSecure(req) {
  if (config.cookieSecure === "true") return true;
  if (config.cookieSecure === "false") return false;
  return req.secure;
}
function setCookie(req, res, token, maxAgeMs) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isSecure(req), path: "/", maxAge: maxAgeMs });
}

function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  q.insert.run(sha(token), userId, now, now + config.sessionDays * DAY, String(req.get("user-agent") || "").slice(0, 200));
  setCookie(req, res, token, config.sessionDays * DAY);
}
function endSession(req, res) {
  const token = readCookie(req);
  if (token) q.remove.run(sha(token));
  res.clearCookie(COOKIE, { path: "/" });
}
function endOtherSessions(req, userId) { const token = readCookie(req); if (token) q.removeOthers.run(userId, sha(token)); }

function readCookie(req) {
  const raw = req.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) { const i = part.indexOf("="); if (i > 0 && part.slice(0, i) === COOKIE) return decodeURIComponent(part.slice(i + 1)); }
  return null;
}

// Attaches req.user when the session cookie is valid. Sessions slide forward while in use.
function loadUser(req, res, next) {
  const token = readCookie(req);
  if (token) {
    const row = q.find.get(sha(token));
    if (row && row.expires_at > Date.now()) {
      req.user = { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
      req.sessionHash = row.token_hash;
      if (row.expires_at - Date.now() < (config.sessionDays * DAY) / 2) {
        q.extend.run(Date.now() + config.sessionDays * DAY, row.token_hash);
        setCookie(req, res, token, config.sessionDays * DAY);
      }
    } else if (row) q.remove.run(sha(token));
  }
  next();
}
function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "signed_out", message: "Your session ended. Sign in again." });
  next();
}
setInterval(() => q.sweep.run(Date.now()), 60 * 60 * 1000).unref();

// ---------- rate limits (in memory, per IP and per email) ----------
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n++;
  return b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 10 * 60 * 1000).unref();

module.exports = { hashPassword, verifyPassword, DUMMY_HASH, passwordProblem, startSession, endSession, endOtherSessions, loadUser, requireUser, limited, COOKIE };
