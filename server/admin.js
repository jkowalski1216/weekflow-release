#!/usr/bin/env node
// Admin commands for whoever runs the server. Run from the project folder:
//   npm run admin -- users                       list accounts
//   npm run admin -- reset-password <email>      set a new password (prints a temporary one)
//   npm run admin -- delete-user <email>         remove an account and all its tasks
//   npm run admin -- backup [file]               safe copy of the database while running
const path = require("path");
const crypto = require("crypto");
const { db, backupTo } = require("./db");
const { hashPassword } = require("./auth");
const config = require("./config");

const [cmd, arg] = process.argv.slice(2);
const fmt = (ms) => new Date(ms).toISOString().replace("T", " ").slice(0, 16);

(async () => {
  if (cmd === "users") {
    const rows = db.prepare(`SELECT u.email, u.name, u.created_at,
      (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id AND t.deleted = 0) AS tasks FROM users u ORDER BY u.created_at`).all();
    if (!rows.length) return console.log("No accounts yet.");
    console.table(rows.map((r) => ({ email: r.email, name: r.name, tasks: r.tasks, created: fmt(r.created_at) })));
  } else if (cmd === "reset-password" && arg) {
    const u = db.prepare("SELECT id FROM users WHERE email = ?").get(arg.toLowerCase());
    if (!u) { console.error("No account with that email."); process.exit(1); }
    const temp = crypto.randomBytes(9).toString("base64url");
    db.prepare("UPDATE users SET pass_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(temp), Date.now(), u.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    console.log("Temporary password for " + arg + ": " + temp);
    console.log("Give it to them privately and ask them to change it in Settings → Account.");
  } else if (cmd === "delete-user" && arg) {
    const r = db.prepare("DELETE FROM users WHERE email = ?").run(arg.toLowerCase());
    console.log(r.changes ? "Deleted " + arg + " and all their tasks." : "No account with that email.");
  } else if (cmd === "backup") {
    const file = path.resolve(arg || path.join(config.dataDir, "backups", "weekflow-" + new Date().toISOString().slice(0, 10) + ".db"));
    require("fs").mkdirSync(path.dirname(file), { recursive: true });
    if (require("fs").existsSync(file)) require("fs").unlinkSync(file);
    backupTo(file);
    console.log("Backup written to " + file);
  } else {
    console.log("Commands: users | reset-password <email> | delete-user <email> | backup [file]");
    process.exit(cmd ? 1 : 0);
  }
})();
