// End-to-end API tests: run with `npm test`. Uses a throwaway data folder.
const test = require("node:test");
const assert = require("node:assert");
const os = require("os");
const fs = require("fs");
const path = require("path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-test-"));
process.env.DATA_DIR = dir;
process.env.ALLOW_SIGNUP = "true";
process.env.INVITE_CODE = "";
const app = require("../server/server");

let server, base;
test.before(async () => { await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); }); base = "http://127.0.0.1:" + server.address().port; });
test.after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

function client() {
  let cookie = "";
  return async (method, url, body, extra = {}) => {
    const res = await fetch(base + url, { method, headers: { "content-type": "application/json", "x-weekflow": "1", ...(cookie ? { cookie } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
    const sc = res.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
    let json = null; try { json = await res.json(); } catch {}
    return { status: res.status, json };
  };
}

test("sign up, sign in, and stay signed in", async () => {
  const a = client();
  let r = await a("POST", "/api/auth/signup", { email: "Alex@Example.com", password: "short", name: "Alex" });
  assert.equal(r.status, 400); assert.equal(r.json.field, "password");
  r = await a("POST", "/api/auth/signup", { email: "Alex@Example.com", password: "correct horse", name: "Alex" });
  assert.equal(r.status, 201); assert.equal(r.json.user.email, "alex@example.com");
  r = await a("GET", "/api/me"); assert.equal(r.status, 200); assert.equal(r.json.user.name, "Alex");
  r = await client()("POST", "/api/auth/signup", { email: "alex@example.com", password: "another one" }); assert.equal(r.status, 409);
  const b = client();
  r = await b("POST", "/api/auth/login", { email: "alex@example.com", password: "wrong pass" }); assert.equal(r.status, 401);
  r = await b("POST", "/api/auth/login", { email: "ALEX@example.com", password: "correct horse" }); assert.equal(r.status, 200);
  r = await b("POST", "/api/auth/logout"); assert.equal(r.status, 200);
  r = await b("GET", "/api/me"); assert.equal(r.status, 401);
});

test("writes without the WeekFlow header or from another site are blocked", async () => {
  const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(res.status, 403);
  const res2 = await fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-weekflow": "1", origin: "https://evil.example" }, body: "{}" });
  assert.equal(res2.status, 403);
});

test("sync saves tasks, returns only changes, and keeps users apart", async () => {
  const a = client(), b = client();
  await a("POST", "/api/auth/signup", { email: "sam@example.com", password: "password123" });
  await b("POST", "/api/auth/signup", { email: "kim@example.com", password: "password456" });
  let r = await a("POST", "/api/sync", { tasks: [{ id: "t1", data: { title: "Plan week", status: "open" } }, { id: "t2", data: { title: "Gym", status: "open" } }], doc: { profile: { name: "Sam" } } });
  assert.equal(r.status, 200);
  const c1 = r.json.cursor;
  r = await a("GET", "/api/sync?since=0");
  assert.equal(r.json.tasks.length, 2); assert.equal(r.json.doc.profile.name, "Sam");
  r = await a("POST", "/api/sync", { tasks: [{ id: "t1", data: { title: "Plan week", status: "done" } }, { id: "t2", deleted: true }] });
  r = await a("GET", "/api/sync?since=" + c1);
  assert.equal(r.json.tasks.length, 2); assert.equal(r.json.doc, null);
  assert.deepEqual(r.json.tasks.find((t) => t.id === "t2"), { id: "t2", deleted: true });
  assert.equal(r.json.tasks.find((t) => t.id === "t1").data.status, "done");
  // Kim sees none of Sam's tasks, and the same task id is a separate task for Kim.
  r = await b("GET", "/api/sync?since=0"); assert.equal(r.json.tasks.length, 0);
  await b("POST", "/api/sync", { tasks: [{ id: "t1", data: { title: "Kim's task" } }] });
  r = await a("GET", "/api/sync?since=0"); assert.equal(r.json.tasks.find((t) => t.id === "t1").data.title, "Plan week");
  // Bad input is rejected
  r = await a("POST", "/api/sync", { tasks: [{ id: "../x", data: {} }] }); assert.equal(r.status, 400);
  r = await client()("GET", "/api/sync?since=0"); assert.equal(r.status, 401);
});

test("change password signs out other devices; delete account removes data", async () => {
  const a = client(), other = client();
  await a("POST", "/api/auth/signup", { email: "lee@example.com", password: "firstpass1" });
  await other("POST", "/api/auth/login", { email: "lee@example.com", password: "firstpass1" });
  let r = await a("POST", "/api/account/password", { current: "nope", next: "secondpass2" }); assert.equal(r.status, 400);
  r = await a("POST", "/api/account/password", { current: "firstpass1", next: "secondpass2" }); assert.equal(r.status, 200);
  r = await other("GET", "/api/me"); assert.equal(r.status, 401);
  r = await a("GET", "/api/me"); assert.equal(r.status, 200);
  await a("POST", "/api/sync", { tasks: [{ id: "x", data: { title: "bye" } }] });
  r = await a("DELETE", "/api/account", { password: "secondpass2" }); assert.equal(r.status, 200);
  r = await client()("POST", "/api/auth/login", { email: "lee@example.com", password: "secondpass2" }); assert.equal(r.status, 401);
});

test("security headers and the app page are served", async () => {
  const res = await fetch(base + "/some/page");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
});
