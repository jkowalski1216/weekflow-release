// SQLite storage. One file (data/weekflow.db) holds every account and task.
const fs = require("fs");
const path = require("path");
// Uses SQLite built into Node.js (node:sqlite), so there's nothing to compile on install.
const { DatabaseSync } = require("node:sqlite");
const config = require("./config");

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dataDir, "weekflow.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

// Run fn inside one transaction: all of its writes land, or none do.
function tx(fn) {
  db.exec("BEGIN IMMEDIATE");
  try { const r = fn(); db.exec("COMMIT"); return r; }
  catch (e) { try { db.exec("ROLLBACK"); } catch (_) { /* already rolled back */ } throw e; }
}

const MIGRATIONS = [
  `CREATE TABLE users (
     id          TEXT PRIMARY KEY,
     email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
     name        TEXT NOT NULL DEFAULT '',
     pass_hash   TEXT NOT NULL,
     created_at  INTEGER NOT NULL,
     updated_at  INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash  TEXT PRIMARY KEY,
     user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at  INTEGER NOT NULL,
     expires_at  INTEGER NOT NULL,
     user_agent  TEXT NOT NULL DEFAULT ''
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   -- One row per task. data is the task as JSON; updated_at is a server timestamp
   -- used to send each device only what changed since it last synced.
   CREATE TABLE tasks (
     user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     id          TEXT NOT NULL,
     data        TEXT NOT NULL,
     deleted     INTEGER NOT NULL DEFAULT 0,
     updated_at  INTEGER NOT NULL,
     PRIMARY KEY (user_id, id)
   );
   CREATE INDEX tasks_sync ON tasks(user_id, updated_at);
   -- Everything else a person keeps: settings, categories, profile, app bookkeeping.
   CREATE TABLE user_docs (
     user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     doc         TEXT NOT NULL,
     updated_at  INTEGER NOT NULL
   );`
];

(function migrate() {
  const v = db.prepare("PRAGMA user_version").get().user_version;
  for (let i = v; i < MIGRATIONS.length; i++) tx(() => { db.exec(MIGRATIONS[i]); db.exec("PRAGMA user_version = " + (i + 1)); });
})();

// Server clock that never repeats or goes backwards, so "changed since" is exact.
let last = Math.max(
  db.prepare("SELECT COALESCE(MAX(updated_at), 0) AS m FROM tasks").get().m,
  db.prepare("SELECT COALESCE(MAX(updated_at), 0) AS m FROM user_docs").get().m
);
function tick() { const n = Math.max(Date.now(), last + 1); last = n; return n; }

// Consistent copy of the whole database, safe while the server is running.
function backupTo(file) { db.exec("VACUUM INTO '" + String(file).replace(/'/g, "''") + "'"); }

module.exports = { db, tick, tx, backupTo };
