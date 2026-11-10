/* WeekFlow desktop app. All data lives in this computer's local storage. */
(function () {
  "use strict";

  // ---------- icons (static markup only) ----------
  const I = {
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
    grip: '<svg viewBox="0 0 14 18"><circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/><circle cx="4" cy="9" r="1.5"/><circle cx="10" cy="9" r="1.5"/><circle cx="4" cy="14" r="1.5"/><circle cx="10" cy="14" r="1.5"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    list: '<svg viewBox="0 0 24 24"><rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/></svg>',
    done: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    flame: '<svg viewBox="0 0 24 24"><path d="M12 2c1 3.5 5 5.8 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.4-5.2.2 1.7 1 2.8 2.1 3.2C11 8 11.3 5 12 2z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24"><path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/></svg>',
    upcoming: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/></svg>',
    stats: '<svg viewBox="0 0 24 24"><path d="M5 20V11M10 20V5M15 20v-7M20 20V9"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>',
    inbox: '<svg viewBox="0 0 24 24"><path d="M3.5 13l2.6-7.2A2 2 0 0 1 8 4.5h8a2 2 0 0 1 1.9 1.3l2.6 7.2V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 13H8l1.5 2.5h5L16 13h4.5"/></svg>',
    carry: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg>',
    caret: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>',
    reopen: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg>'
  };
  // Status icons drawn inside the status chip.
  const ST_ICON = {
    open: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg>',
    doing: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" style="fill:currentColor"/></svg>',
    hold: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><path d="M10 9v6M14 9v6"/></svg>',
    done: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg>'
  };
  const ST_NAME = { open: "To do", doing: "In progress", hold: "On hold", done: "Complete" };

  // ---------- small DOM helper (text is always set as text) ----------
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v; // only ever used with the static icons above
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) { if (kid == null || kid === false) continue; el.append(kid instanceof Node ? kid : document.createTextNode(String(kid))); }
    return el;
  }
  const $ = (id) => document.getElementById(id);

  // ---------- dates (local time) ----------
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const mondayOf = (s) => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
  const short = (s) => { const d = parse(s); return MONTHS[d.getMonth()] + " " + d.getDate(); };
  const dowOf = (s) => DOW[(parse(s).getDay() + 6) % 7];
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  function fmtTime(t) { if (!t) return ""; const [H, M] = t.split(":").map(Number); const ap = H >= 12 ? "PM" : "AM"; return ((H % 12) || 12) + ":" + pad(M) + " " + ap; }
  function relDay(s) {
    const t = today();
    if (s === t) return "Today";
    if (s === addDays(t, 1)) return "Tomorrow";
    if (s === addDays(t, -1)) return "Yesterday";
    return dowOf(s) + ", " + short(s);
  }
  function nextDate(from, repeat) {
    if (repeat === "daily") return addDays(from, 1);
    if (repeat === "weekly") return addDays(from, 7);
    if (repeat === "weekdays") { let n = addDays(from, 1); while ([5, 6].includes((parse(n).getDay() + 6) % 7)) n = addDays(n, 1); return n; }
    if (repeat === "monthly") { const d = parse(from); const day = d.getDate(); const t = new Date(d.getFullYear(), d.getMonth() + 1, 1); const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(day, last)); return iso(t); }
    return null;
  }

  // ---------- state ----------
  const KEY = "weekflow.v2";
  const DEFAULT_CATS = [
    { id: "work", name: "Work", color: "#8f63ff" },
    { id: "personal", name: "Personal", color: "#ff5fa2" },
    { id: "health", name: "Health", color: "#2fd08f" },
    { id: "errands", name: "Errands", color: "#f3b74e" },
    { id: "learning", name: "Learning", color: "#4fa8ff" }
  ];
  function fresh() {
    return {
      version: 2,
      profile: { name: "" },
      settings: { theme: "dark", rollover: true, dailyReminder: true, reminderTime: "09:00", taskReminders: true, closeToTray: false, openAtLogin: false, autoUpdate: true },
      categories: DEFAULT_CATS.map((c) => ({ ...c })),
      tasks: [],
      meta: { lastRollover: null, lastWeekSeen: null, weekBanner: null, notified: {}, bestStreak: 0 }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const s = JSON.parse(raw); const f = fresh();
      return { ...f, ...s, profile: { ...f.profile, ...s.profile }, settings: { ...f.settings, ...s.settings }, meta: { ...f.meta, ...s.meta }, categories: s.categories && s.categories.length ? s.categories : f.categories, tasks: Array.isArray(s.tasks) ? s.tasks : [] };
    } catch (e) { return fresh(); }
  }
  let S = load();
  let saveTimer;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save. Your disk may be full."); } }, 120); }
  const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const cat = (id) => S.categories.find((c) => c.id === id);
  const PRI = { urgent: 0, high: 1, medium: 2, low: 3 };
  const PRI_NAME = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

  // ---------- UI state ----------
  let view = "dashboard";
  let weekStart = mondayOf(today());
  let query = "";
  let filt = { status: "open", priority: "all", category: "all", sort: "date" };
  let compRange = "30", compQuery = "";
  let updState = { state: "idle" };
  let updDismissed = null;

  // ---------- desktop bridge (present only inside the desktop app: Windows or Linux) ----------
  const desk = window.weekflowDesktop || null;
  const OS = desk && desk.platform === "linux" ? "Linux" : "Windows";

  // ---------- toast ----------
  let toastT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }

  // ---------- task operations ----------
  function addTask(fields) {
    const t = { id: uid(), title: "", notes: "", date: null, time: "", priority: "medium", category: "work", repeat: "none", status: "open", doneAt: null, createdAt: new Date().toISOString(), rolled: 0, ...fields };
    S.tasks.push(t); save(); render(); return t;
  }
  function update(id, patch) { const t = S.tasks.find((x) => x.id === id); if (!t) return; Object.assign(t, patch); save(); render(); }
  function remove(id) { S.tasks = S.tasks.filter((x) => x.id !== id); save(); render(); }
  // status: "open" (To do) | "doing" (In progress) | "hold" (On hold) | "done" (Complete)
  function setStatus(id, status, extra) {
    const t = S.tasks.find((x) => x.id === id); if (!t || !ST_NAME[status]) return;
    const was = t.status;
    if (was === status && !extra) return;
    t.status = status;
    if (extra) Object.assign(t, extra);
    if (status === "done") {
      t.doneAt = new Date().toISOString();
      if (t.repeat && t.repeat !== "none" && !t.spawnedNext) {
        t.spawnedNext = true;
        const nd = nextDate(t.date || today(), t.repeat);
        S.tasks.push({ ...t, id: uid(), date: nd, status: "open", doneAt: null, spawnedNext: false, rolled: 0, createdAt: new Date().toISOString() });
        toast("Complete. Next one is set for " + relDay(nd) + ".");
      } else toast("Marked complete. Nice work.");
    } else {
      t.doneAt = null;
      if (was === "done") { t.reopenedAt = new Date().toISOString(); toast("Reopened: back on your list" + (t.date ? " for " + relDay(t.date) : " in the Inbox") + "."); }
      else toast(ST_NAME[status]);
    }
    updateStreak(); save(); render();
  }
  const isActive = (t) => t.status === "open" || t.status === "doing";
  const inWeek = (t, ws) => t.date && t.date >= ws && t.date <= addDays(ws, 6);
  function weekNums(ws) { const list = S.tasks.filter((t) => inWeek(t, ws)); const done = list.filter((t) => t.status === "done").length; return { list, total: list.length, done, open: list.length - done }; }
  const ST_ORDER = { doing: 0, open: 1, hold: 2, done: 3 };
  function sortTasks(a, b) {
    const so = (ST_ORDER[a.status] ?? 1) - (ST_ORDER[b.status] ?? 1); if (so) return so;
    return (PRI[a.priority] ?? 2) - (PRI[b.priority] ?? 2) || String(a.time || "99").localeCompare(String(b.time || "99")) || String(a.createdAt).localeCompare(String(b.createdAt));
  }

  // ---------- streaks ----------
  function doneDays() { const s = new Set(); S.tasks.forEach((t) => { if (t.status === "done" && t.doneAt) s.add(iso(new Date(t.doneAt))); }); return s; }
  function currentStreak() {
    const days = doneDays(); let d = today(); if (!days.has(d)) d = addDays(d, -1);
    let n = 0; while (days.has(d)) { n++; d = addDays(d, -1); } return n;
  }
  function updateStreak() { const c = currentStreak(); if (c > (S.meta.bestStreak || 0)) S.meta.bestStreak = c; }

  // ---------- daily rollover + weekly reset ----------
  function dailyCheck() {
    const t = today(); const wk = mondayOf(t); let changed = false;
    if (S.meta.lastWeekSeen && S.meta.lastWeekSeen !== wk) {
      const n = weekNums(S.meta.lastWeekSeen);
      S.meta.weekBanner = { week: S.meta.lastWeekSeen, done: n.done, total: n.total };
      changed = true;
    }
    if (S.meta.lastWeekSeen !== wk) { S.meta.lastWeekSeen = wk; changed = true; }
    if (S.meta.lastRollover !== t) {
      if (S.settings.rollover) {
        let moved = 0;
        S.tasks.forEach((x) => { if ((x.status === "open" || x.status === "doing") && x.date && x.date < t) { x.date = t; x.rolled = (x.rolled || 0) + 1; moved++; } });
        if (moved) setTimeout(() => toast("Moved " + moved + " unfinished " + (moved === 1 ? "task" : "tasks") + " to today."), 600);
      }
      S.meta.lastRollover = t; changed = true;
      const cutoff = addDays(t, -7);
      Object.keys(S.meta.notified).forEach((k) => { const d = k.split("|")[1]; if (!d || d < cutoff) delete S.meta.notified[k]; });
      if (weekStart < mondayOf(t) && view !== "week") weekStart = mondayOf(t);
    }
    if (changed) { save(); render(); }
  }

  // ---------- reminders ----------
  function notify(title, body, onClick) {
    try {
      if (!("Notification" in window)) return;
      const go = () => { const n = new Notification(title, { body, icon: "icon.png", silent: false }); n.onclick = () => { window.focus(); if (onClick) onClick(); }; };
      if (Notification.permission === "granted") go();
      else if (Notification.permission !== "denied") Notification.requestPermission().then((p) => { if (p === "granted") go(); });
    } catch (e) { /* notifications unavailable */ }
  }
  function reminderTick() {
    const t = today(), hm = nowHM();
    const minsAgo = (time) => { const [a, b] = time.split(":").map(Number); const [c, d] = hm.split(":").map(Number); return (c * 60 + d) - (a * 60 + b); };
    if (S.settings.dailyReminder && S.settings.reminderTime && !S.meta.notified["daily|" + t]) {
      const ago = minsAgo(S.settings.reminderTime);
      if (ago >= 0) {
        S.meta.notified["daily|" + t] = true; save();
        if (ago <= 90) {
          const open = S.tasks.filter((x) => x.date === t && isActive(x));
          const urgent = open.filter((x) => x.priority === "urgent" || x.priority === "high").length;
          notify("Your day in WeekFlow", open.length ? open.length + (open.length === 1 ? " task" : " tasks") + " today" + (urgent ? ", " + urgent + " high priority" : "") + "." : "Nothing planned today. Add something from your Inbox.", () => go("dashboard"));
        }
      }
    }
    if (S.settings.taskReminders) {
      S.tasks.forEach((x) => {
        if (!isActive(x) || x.date !== t || !x.time) return;
        const k = "task:" + x.id + "|" + t; if (S.meta.notified[k]) return;
        const ago = minsAgo(x.time);
        if (ago >= 0) { S.meta.notified[k] = true; save(); if (ago <= 30) notify(x.title, "Reminder · " + fmtTime(x.time) + (cat(x.category) ? " · " + cat(x.category).name : ""), () => openEditor(x.id)); }
      });
    }
  }

  // ---------- theme ----------
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme() {
    const th = S.settings.theme === "system" ? (mq.matches ? "dark" : "light") : S.settings.theme;
    document.documentElement.setAttribute("data-theme", th);
    if (desk) desk.setTheme(S.settings.theme);
  }
  mq.addEventListener("change", applyTheme);

  // ---------- shared pieces ----------
  function prioPill(p) { return h("span", { class: "prio " + (p || "medium") }, PRI_NAME[p] || "Medium"); }
  function metaLine(t, opts = {}) {
    const bits = [];
    const c = cat(t.category);
    if (c) bits.push(h("span", { class: "cat" }, h("i", { style: "background:" + c.color }), c.name));
    if (opts.showDate && t.date) bits.push(h("span", { class: isActive(t) && t.date < today() ? "late" : null }, relDay(t.date)));
    if (t.time) bits.push(h("span", { html: I.clock }), fmtTime(t.time));
    if (t.repeat && t.repeat !== "none") bits.push(h("span", { html: I.repeat, title: "Repeats" }));
    if (t.rolled && t.status !== "done") bits.push(h("span", { title: "Carried over from an earlier day" }, h("span", { html: I.carry }), " carried over"));
    return bits.length ? h("div", { class: "tmeta" }, bits) : null;
  }
  // The status chip: shows where a task stands and opens a menu to change it.
  function statusChip(t, compact) {
    const st = ST_NAME[t.status] ? t.status : "open";
    return h("button", { class: "stchip st-" + st + (compact ? " compact" : ""), "aria-haspopup": "menu", "aria-label": "Status: " + ST_NAME[st] + ". Change status of " + t.title, title: "Change status", onclick: (e) => openStatusMenu(e, t) },
      h("span", { class: "sti", html: ST_ICON[st] }), compact ? null : h("span", { class: "stl" }, ST_NAME[st]), h("span", { class: "stc", html: I.caret }));
  }
  function openStatusMenu(e, t) {
    e.stopPropagation(); closeMenu();
    const opts = ["open", "doing", "hold", "done"];
    menuEl = h("div", { class: "menu stmenu", role: "menu", "aria-label": "Set status" },
      h("div", { class: "menulabel" }, "Set status"),
      opts.map((s) => h("button", { role: "menuitemradio", "aria-checked": String(t.status === s), class: "st-" + s + (t.status === s ? " cur" : ""), onclick: () => { closeMenu(); setStatus(t.id, s); } },
        h("span", { class: "sti", html: ST_ICON[s] }), ST_NAME[s], t.status === s ? h("span", { class: "tick", html: I.check }) : null)));
    placeMenu(e.currentTarget);
  }
  function placeMenu(anchor) {
    document.body.append(menuEl);
    const r = anchor.getBoundingClientRect();
    const mw = menuEl.offsetWidth || 200, mh = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.left)) + "px";
    menuEl.style.top = (r.bottom + mh + 8 > window.innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + "px";
  }
  function taskRow(t, opts = {}) {
    const row = h("li", { class: "trow st-row-" + t.status + (t.status === "done" ? " done" : ""), draggable: "true", dataset: { id: t.id } },
      h("span", { class: "grip", html: I.grip, "aria-hidden": "true" }),
      statusChip(t),
      h("button", { class: "tmain", onclick: () => openEditor(t.id) }, h("span", { class: "ttitle" }, t.title), metaLine(t, opts)),
      prioPill(t.priority),
      h("button", { class: "more", html: I.dots, "aria-label": "More actions for " + t.title, onclick: (e) => openMenu(e, t) })
    );
    row.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; });
    return row;
  }
  function dropTarget(el, onDrop) {
    el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("over"); });
    el.addEventListener("dragleave", () => el.classList.remove("over"));
    el.addEventListener("drop", (e) => { e.preventDefault(); el.classList.remove("over"); const id = e.dataTransfer.getData("text/plain"); if (id) onDrop(id); });
  }
  function cardHead(icon, title, ...right) { return h("div", { class: "cardhead" }, h("h2", null, h("span", { html: icon }), title), h("div", { style: "display:flex;gap:8px;align-items:center" }, right)); }
  function emptyState(title, text) { return h("div", { class: "empty" }, h("strong", null, title), text); }

  // ---------- context menu ----------
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function openMenu(e, t) {
    e.stopPropagation(); closeMenu();
    const items = [
      ["Edit", () => openEditor(t.id)],
      t.status === "done" ? ["Reopen (not done yet)", () => setStatus(t.id, "open")] : ["Mark complete", () => setStatus(t.id, "done")],
      t.status === "hold" ? ["Take off hold", () => setStatus(t.id, "open")] : ["Put on hold", () => setStatus(t.id, "hold")],
      ["Move to today", () => update(t.id, { date: today() })],
      ["Move to tomorrow", () => update(t.id, { date: addDays(today(), 1) })],
      ["Move to Inbox", () => update(t.id, { date: null, time: "" })],
      ["Duplicate", () => { const c = { ...t }; delete c.id; addTask({ ...c, status: "open", doneAt: null, spawnedNext: false, createdAt: new Date().toISOString() }); toast("Duplicated"); }]
    ];
    menuEl = h("div", { class: "menu", role: "menu" }, items.map(([label, fn]) => h("button", { role: "menuitem", onclick: () => { closeMenu(); fn(); } }, label)));
    let armed = false;
    const del = h("button", { class: "del", role: "menuitem", onclick: (ev) => { ev.stopPropagation(); if (!armed) { armed = true; del.textContent = "Click again to delete"; return; } closeMenu(); remove(t.id); toast("Deleted"); } }, "Delete");
    menuEl.append(del);
    placeMenu(e.currentTarget);
  }
  document.addEventListener("click", (e) => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); if (!$("bellPop").hidden && !e.target.closest(".bellwrap")) $("bellPop").hidden = true; });

  // ---------- mountains for the hero ----------
  function mountains() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "mountains"); svg.setAttribute("viewBox", "0 0 1200 260"); svg.setAttribute("preserveAspectRatio", "xMidYMax slice"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hero-sky)"/><stop offset="1" style="stop-color:var(--hero-a)"/></linearGradient>' +
      '<radialGradient id="glow" cx="0.78" cy="0.15" r="0.5"><stop offset="0" style="stop-color:var(--accent-2);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--accent-2);stop-opacity:0"/></radialGradient></defs>' +
      '<rect width="1200" height="260" fill="url(#sky)"/><rect width="1200" height="260" fill="url(#glow)"/>' +
      [[120, 30], [260, 60], [410, 22], [540, 48], [700, 30], [860, 64], [990, 26], [1120, 52], [330, 90], [780, 98], [1060, 96]].map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="' + (i % 3 === 0 ? 1.6 : 1.1) + '" style="fill:var(--hero-ink);opacity:.35"/>').join("") +
      '<path d="M0 190 L140 120 L230 160 L360 80 L470 150 L560 110 L690 170 L820 70 L930 140 L1040 100 L1200 160 L1200 260 L0 260Z" style="fill:var(--hero-b);opacity:.55"/>' +
      '<path d="M0 220 L110 170 L210 200 L330 140 L450 205 L590 150 L700 210 L840 130 L960 195 L1080 160 L1200 200 L1200 260 L0 260Z" style="fill:var(--hero-c);opacity:.55"/>' +
      '<path d="M820 70 L850 92 L835 90 L820 102 L805 92 L790 96Z M360 80 L384 100 L370 98 L358 108 L346 98Z" style="fill:var(--hero-ink);opacity:.25"/>' +
      '<path d="M0 245 L160 215 L300 238 L470 205 L640 240 L800 212 L980 240 L1200 222 L1200 260 L0 260Z" style="fill:var(--bg);opacity:.9"/>';
    return svg;
  }

  // ---------- views ----------
  function greeting() { const H = new Date().getHours(); return H < 12 ? "Good morning" : H < 17 ? "Good afternoon" : "Good evening"; }

  function viewDashboard() {
    const t = today(), wk = mondayOf(t);
    const cur = weekNums(wk), prev = weekNums(addDays(wk, -7));
    const pct = cur.total ? Math.round(cur.done / cur.total * 100) : 0;
    const streak = currentStreak();
    const out = h("div", { class: "stack" });

    if (S.meta.weekBanner) {
      const b = S.meta.weekBanner;
      out.append(h("div", { class: "banner" },
        h("p", null, h("strong", null, "New week, fresh start."), b.total ? "Last week (" + short(b.week) + "–" + short(addDays(b.week, 6)) + ") you finished " + b.done + " of " + b.total + " tasks." + (S.settings.rollover ? " Anything unfinished moved to today." : "") : "Last week had nothing scheduled. Plan this week from your Inbox."),
        h("button", { class: "btn ghost", onclick: () => go("stats") }, "See statistics"),
        h("button", { class: "btn primary", onclick: () => { S.meta.weekBanner = null; save(); render(); } }, "Got it")));
    }

    const ring = (() => {
      const r = 34, c = 2 * Math.PI * r;
      const wrap = h("div", { class: "ring" });
      wrap.innerHTML = '<svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="' + r + '" style="stroke:var(--accent-soft)" stroke-width="8"/><circle cx="42" cy="42" r="' + r + '" style="stroke:var(--accent-2)" stroke-width="8" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - pct / 100)).toFixed(1) + '"/></svg>';
      wrap.append(h("div", { class: "ck", html: I.check }));
      return wrap;
    })();
    const delta = (a, b) => { const d = a - b; return d === 0 ? h("span", { class: "d", style: "color:var(--muted)" }, "same as last week") : h("span", { class: "d" + (d < 0 ? " down" : "") }, (d > 0 ? "↑ +" : "↓ ") + d + " vs last week"); };
    const hero = h("section", { class: "hero" },
      mountains(),
      h("div", { class: "greet" }, h("h2", null, greeting() + (S.profile.name ? ", " + S.profile.name : "") + "!"), h("p", null, "Let's make this week count.")),
      h("div", { class: "glass progresscard" },
        h("span", { class: "lbl" }, "Weekly progress"), ring,
        h("span", { class: "big" }, pct + "%"),
        h("span", { class: "sub" }, cur.done + " of " + cur.total + " tasks completed"),
        h("div", { class: "bar" }, h("i", { style: "width:" + pct + "%" }))),
      h("div", { class: "tiles" },
        h("div", { class: "glass tile" }, h("span", { class: "ti", html: I.list }), h("span", { class: "v num" }, cur.total), h("span", { class: "k" }, "Total tasks"), delta(cur.total, prev.total)),
        h("div", { class: "glass tile" }, h("span", { class: "ti", html: I.done }), h("span", { class: "v num" }, cur.done), h("span", { class: "k" }, "Completed"), delta(cur.done, prev.done)),
        h("div", { class: "glass tile" }, h("span", { class: "ti", html: I.clock }), h("span", { class: "v num" }, cur.open), h("span", { class: "k" }, "Remaining"), h("span", { class: "d", style: "color:var(--muted)" }, (() => { const hd = cur.list.filter((x) => x.status === "hold").length; return hd ? hd + " on hold" : cur.open ? "left this week" : "all clear"; })())),
        h("div", { class: "glass tile flame" }, h("span", { class: "ti", html: I.flame }), h("span", { class: "v num" }, streak), h("span", { class: "k" }, "Day streak"), h("span", { class: "d", style: "color:var(--muted)" }, "best " + Math.max(S.meta.bestStreak || 0, streak))))
    );
    out.append(hero);

    // week strip
    const strip = h("div", { class: "strip" });
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i), list = S.tasks.filter((x) => x.date === d), done = list.filter((x) => x.status === "done").length;
      const btn = h("button", { class: "daybtn" + (d === t ? " today" : ""), "aria-label": relDay(d) + ": " + done + " of " + list.length + " done", onclick: () => { go("week"); } },
        h("span", { class: "dn" }, DOW[i]), h("span", { class: "dd" }, short(d)),
        h("span", { class: "dc" }, h("i", { class: list.length && done === list.length ? "full" : done ? "part" : "" }), done + "/" + list.length));
      dropTarget(btn, (id) => { update(id, { date: d }); toast("Moved to " + relDay(d)); });
      strip.append(btn);
    }
    out.append(h("section", { class: "card" },
      cardHead(I.cal, "Your week",
        h("span", { class: "weekhead" },
          h("button", { class: "iconbtn sm", html: I.left, "aria-label": "Previous week", onclick: () => { weekStart = addDays(weekStart, -7); render(); } }),
          h("span", { class: "range" }, short(weekStart) + " – " + short(addDays(weekStart, 6)) + ", " + parse(addDays(weekStart, 6)).getFullYear()),
          h("button", { class: "iconbtn sm", html: I.right, "aria-label": "Next week", onclick: () => { weekStart = addDays(weekStart, 7); render(); } })),
        h("button", { class: "pill", onclick: () => go("week") }, "View calendar")),
      strip,
      h("p", { class: "hint", style: "margin-top:10px" }, "Tip: drag a task onto a day to reschedule it.")));

    // today + right column
    const todays = S.tasks.filter((x) => x.date === t).sort(sortTasks);
    const tDone = todays.filter((x) => x.status === "done").length;
    const tl = h("ul", { class: "tasklist" }, todays.map((x) => taskRow(x)));
    const todayCard = h("section", { class: "card" },
      cardHead(I.done, "Today's tasks", todays.length ? h("span", { class: "pill good" }, tDone + " of " + todays.length + " done") : null),
      todays.length ? tl : emptyState("Nothing planned for today", "Add a task or pull one in from your Inbox."),
      h("button", { class: "addbtn", onclick: () => openEditor(null, { date: t }) }, h("span", { html: I.plus }), "Add a new task"));

    const overdue = S.tasks.filter((x) => isActive(x) && x.date && x.date < t).sort((a, b) => a.date.localeCompare(b.date));
    const later = S.tasks.filter((x) => isActive(x) && x.date && x.date > t).sort((a, b) => a.date.localeCompare(b.date) || String(a.time || "99").localeCompare(String(b.time || "99")));
    const up = overdue.concat(later).slice(0, 6);
    const upCard = h("section", { class: "card" },
      cardHead(I.upcoming, "Upcoming", h("button", { class: "linkbtn", onclick: () => { filt.status = "open"; filt.sort = "date"; go("tasks"); } }, "View all")),
      up.length ? h("ul", { class: "uplist" }, up.map((x) => h("li", null, h("button", { class: "uprow", onclick: () => openEditor(x.id) },
        h("span", { class: "when" }, h("i", { style: "background:" + (x.date < t ? "var(--high)" : (cat(x.category) || {}).color || "var(--accent-2)") }), x.date < t ? "Overdue" : relDay(x.date).replace(/^\w+, /, "")),
        h("span", { class: "what" }, x.title, x.time ? h("small", null, " · " + fmtTime(x.time)) : null)))))
        : emptyState("Clear runway", "Nothing scheduled after today yet."));
    const quick = h("section", { class: "card" },
      cardHead(I.bolt, "Quick actions"),
      h("div", { class: "quick" },
        h("button", { class: "qa", onclick: () => openEditor(null, { date: t }) }, h("span", { html: I.plus }), "Add task"),
        h("button", { class: "qa", onclick: () => go("week") }, h("span", { html: I.cal }), "View week"),
        h("button", { class: "qa", onclick: () => go("stats") }, h("span", { html: I.stats }), "View stats"),
        h("button", { class: "qa", onclick: doExport }, h("span", { html: I.share }), "Export")));
    out.append(h("div", { class: "cols" }, todayCard, h("div", { class: "rightcol" }, upCard, quick)));
    return out;
  }

  function viewWeek() {
    const t = today();
    const out = h("div", { class: "stack" });
    out.append(h("div", { class: "toolbar" },
      h("button", { class: "iconbtn", html: I.left, "aria-label": "Previous week", onclick: () => { weekStart = addDays(weekStart, -7); render(); } }),
      h("strong", { style: "font-size:16px" }, short(weekStart) + " – " + short(addDays(weekStart, 6)) + ", " + parse(addDays(weekStart, 6)).getFullYear()),
      h("button", { class: "iconbtn", html: I.right, "aria-label": "Next week", onclick: () => { weekStart = addDays(weekStart, 7); render(); } }),
      weekStart !== mondayOf(t) ? h("button", { class: "btn ghost", onclick: () => { weekStart = mondayOf(t); render(); } }, "This week") : null,
      h("span", { class: "spacer" }),
      h("span", { class: "hint" }, "Drag a task onto another day to move it."),
      h("button", { class: "btn primary", onclick: () => openEditor(null, { date: weekStart <= t && t <= addDays(weekStart, 6) ? t : weekStart }) }, h("span", { html: I.plus }), "New task")));

    const card = (x) => {
      const c = cat(x.category);
      const el = h("li", { class: "wcard st-row-" + x.status + (x.status === "done" ? " done" : ""), draggable: "true", style: c ? "--catc:" + c.color : null },
        h("button", { class: "wtitle", onclick: () => openEditor(x.id) }, h("span", { class: "ttitle" }, x.title)),
        h("div", { class: "wfoot" },
          statusChip(x),
          h("span", { class: "wmeta" },
            c ? h("span", { class: "cat" }, h("i", { style: "background:" + c.color }), c.name) : null,
            x.time ? h("span", null, fmtTime(x.time)) : null,
            x.repeat && x.repeat !== "none" ? h("span", { html: I.repeat, title: "Repeats" }) : null),
          h("span", { class: "spacer" }),
          x.priority === "urgent" || x.priority === "high" ? prioPill(x.priority) : null,
          h("button", { class: "more", html: I.dots, "aria-label": "More actions for " + x.title, onclick: (e) => openMenu(e, x) })));
      el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", x.id); });
      return el;
    };
    const dayRow = (key, name, dateLabel, list, isToday, isInbox) => {
      const done = list.filter((x) => x.status === "done").length;
      const hold = list.filter((x) => x.status === "hold").length;
      const inp = h("input", { id: "rowadd-" + key, placeholder: isInbox ? "+ Capture a task" : "+ Add a task to " + name, maxlength: "200", "aria-label": "Add a task to " + name });
      const add = h("li", { class: "wadd" }, h("form", { onsubmit: (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; addTask({ title: v, date: isInbox ? null : key }); } }, inp));
      const row = h("section", { class: "dayrow" + (isToday ? " today" : "") + (isInbox ? " inbox" : ""), "aria-label": name },
        h("header", { class: "dayhead" },
          h("div", { class: "dayname" }, name, isToday ? h("span", { class: "todaytag" }, "Today") : null),
          h("div", { class: "daydate" }, dateLabel),
          h("div", { class: "daycount" }, isInbox ? list.length + (list.length === 1 ? " task" : " tasks") : list.length ? done + " of " + list.length + " complete" + (hold ? " · " + hold + " on hold" : "") : "Nothing planned"),
          !isInbox && list.length ? h("div", { class: "daybar" }, h("i", { style: "width:" + Math.round(done / list.length * 100) + "%" })) : null),
        h("ul", { class: "daytasks" }, list.map(card), add));
      dropTarget(row, (id) => update(id, isInbox ? { date: null, time: "" } : { date: key }));
      return row;
    };
    const inbox = S.tasks.filter((x) => !x.date && x.status !== "done").sort(sortTasks);
    const rows = h("div", { class: "weekrows" });
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const list = S.tasks.filter((x) => x.date === d).sort(sortTasks);
      rows.append(dayRow(d, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i], short(d), list, d === t, false));
    }
    rows.append(dayRow("inbox", "Inbox", "no day yet", inbox, false, true));
    out.append(rows);
    return out;
  }

  function viewCompleted() {
    const t = today();
    const out = h("div", { class: "stack" });
    const ranges = [["week", "This week"], ["last", "Last week"], ["30", "Last 30 days"], ["all", "All time"]];
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Time range" }, ranges.map(([k, l]) => h("button", { class: compRange === k ? "on" : null, "aria-pressed": String(compRange === k), onclick: () => { compRange = k; render(); } }, l)));
    const search = h("input", { id: "compSearch", type: "search", class: "grow", placeholder: "Search completed tasks", value: compQuery, oninput: (e) => { compQuery = e.target.value; render(); } });
    out.append(h("div", { class: "banner" },
      h("p", null, h("strong", null, "Look back at what you finished."), "Thought something was done but it isn't? Reopen it and it goes back on your list."),
      h("span", { class: "pill good" }, S.tasks.filter((x) => x.status === "done").length + " completed all time")));
    out.append(h("div", { class: "toolbar" }, seg, search));

    const wk = mondayOf(t);
    const from = compRange === "week" ? wk : compRange === "last" ? addDays(wk, -7) : compRange === "30" ? addDays(t, -30) : "0000-00-00";
    const to = compRange === "last" ? addDays(wk, -1) : "9999-12-31";
    const q = compQuery.trim().toLowerCase();
    const list = S.tasks.filter((x) => x.status === "done").map((x) => ({ x, day: x.doneAt ? iso(new Date(x.doneAt)) : x.date || t }))
      .filter(({ x, day }) => day >= from && day <= to && (!q || (x.title + " " + (x.notes || "")).toLowerCase().includes(q)))
      .sort((a, b) => String(b.x.doneAt || b.day).localeCompare(String(a.x.doneAt || a.day)));

    const card = h("section", { class: "card" });
    if (!list.length) {
      card.append(emptyState(q ? "No completed tasks match “" + compQuery + "”" : "Nothing completed in this range", "Set a task's status to Complete and it shows up here."));
      out.append(card); return out;
    }
    let lastDay = null, ul = null;
    list.forEach(({ x, day }) => {
      if (day !== lastDay) { lastDay = day; card.append(h("div", { class: "groupname" }, relDay(day) + " · " + list.filter((r) => r.day === day).length)); ul = h("ul", { class: "complist" }); card.append(ul); }
      const c = cat(x.category);
      const when = x.doneAt ? new Date(x.doneAt) : null;
      const planned = x.date && x.date !== day ? "planned for " + relDay(x.date) : null;
      ul.append(h("li", { class: "comprow" },
        h("span", { class: "sti st-done", html: ST_ICON.done }),
        h("button", { class: "tmain", onclick: () => openEditor(x.id) },
          h("span", { class: "ttitle" }, x.title),
          h("div", { class: "tmeta" },
            c ? h("span", { class: "cat" }, h("i", { style: "background:" + c.color }), c.name) : null,
            when ? h("span", null, "Completed " + fmtTime(pad(when.getHours()) + ":" + pad(when.getMinutes()))) : null,
            planned ? h("span", null, planned) : null)),
        h("div", { class: "compacts" },
          h("button", { class: "btn ghost sm", onclick: () => setStatus(x.id, "open", { date: t }) }, h("span", { html: I.reopen }), "Reopen for today"),
          x.date && x.date !== t ? h("button", { class: "btn ghost sm", onclick: () => setStatus(x.id, "open") }, "Reopen on " + short(x.date)) : null,
          h("button", { class: "btn ghost sm", onclick: () => setStatus(x.id, "hold") }, "Put on hold"))));
    });
    out.append(card);
    return out;
  }

  function viewTasks() {
    const t = today();
    const out = h("div", { class: "stack" });
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Status" }, [["open", "To do"], ["doing", "In progress"], ["hold", "On hold"], ["done", "Complete"], ["all", "All"]].map(([k, l]) => h("button", { class: filt.status === k ? "on" : null, "aria-pressed": String(filt.status === k), onclick: () => { filt.status = k; render(); } }, l)));
    const sel = (id, val, opts, onch, label) => { const s = h("select", { id, "aria-label": label, onchange: (e) => onch(e.target.value) }, opts.map(([v, l]) => h("option", { value: v }, l))); s.value = val; return s; };
    out.append(h("div", { class: "toolbar" }, seg,
      sel("fPri", filt.priority, [["all", "All priorities"], ["urgent", "Urgent"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]], (v) => { filt.priority = v; render(); }, "Priority"),
      sel("fCat", filt.category, [["all", "All categories"]].concat(S.categories.map((c) => [c.id, c.name])), (v) => { filt.category = v; render(); }, "Category"),
      sel("fSort", filt.sort, [["date", "Sort by day"], ["priority", "Sort by priority"], ["new", "Newest first"]], (v) => { filt.sort = v; render(); }, "Sort"),
      h("span", { class: "spacer" }),
      query ? h("span", { class: "pill" }, "Search: " + query) : null,
      query ? h("button", { class: "linkbtn", onclick: () => { query = ""; $("searchInput").value = ""; render(); } }, "Clear") : null,
      h("button", { class: "btn primary", onclick: () => openEditor(null, { date: t }) }, h("span", { html: I.plus }), "New task")));
    const q = query.toLowerCase();
    let list = S.tasks.filter((x) =>
      (filt.status === "all" || (filt.status === "open" ? (x.status === "open" || x.status === "doing") : x.status === filt.status)) &&
      (filt.priority === "all" || x.priority === filt.priority) &&
      (filt.category === "all" || x.category === filt.category) &&
      (!q || (x.title + " " + (x.notes || "")).toLowerCase().includes(q)));
    const card = h("section", { class: "card" });
    if (!list.length) { card.append(emptyState(q ? "No tasks match “" + query + "”" : "No tasks here", "Try another filter, or add a task.")); out.append(card); return out; }
    if (filt.sort === "priority") { list.sort((a, b) => (PRI[a.priority] ?? 2) - (PRI[b.priority] ?? 2) || String(a.date || "9").localeCompare(String(b.date || "9"))); card.append(h("ul", { class: "tasklist" }, list.map((x) => taskRow(x, { showDate: true })))); }
    else if (filt.sort === "new") { list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); card.append(h("ul", { class: "tasklist" }, list.map((x) => taskRow(x, { showDate: true })))); }
    else {
      const groups = new Map();
      const key = (x) => !x.date ? "zz|Inbox (no day)" : x.date < t && isActive(x) ? "00|Overdue" : x.date + "|" + relDay(x.date);
      list.sort((a, b) => key(a).localeCompare(key(b)) || sortTasks(a, b)).forEach((x) => { const k = key(x); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
      groups.forEach((items, k) => { card.append(h("div", { class: "groupname" }, k.split("|")[1] + " · " + items.length), h("ul", { class: "tasklist" }, items.map((x) => taskRow(x, { showDate: k.startsWith("00") })))); });
    }
    out.append(card);
    return out;
  }

  function viewInbox() {
    const t = today();
    const out = h("div", { class: "stack" });
    const inp = h("input", { id: "captureInput", placeholder: "Capture a task and press Enter. Plan it later.", maxlength: "200", "aria-label": "New Inbox task" });
    out.append(h("form", { class: "capture", onsubmit: (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; addTask({ title: v, date: null }); toast("Added to Inbox"); } }, inp, h("button", { class: "btn primary", type: "submit" }, h("span", { html: I.plus }), "Add")));
    const list = S.tasks.filter((x) => !x.date && x.status !== "done").sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const nextMon = addDays(mondayOf(t), 7);
    const card = h("section", { class: "card" }, cardHead(I.inbox, "Inbox", h("span", { class: "pill" }, list.length + (list.length === 1 ? " task" : " tasks"))));
    if (!list.length) card.append(emptyState("Inbox zero", "Everything has a day. Capture new ideas above."));
    else card.append(h("ul", { class: "tasklist" }, list.map((x) => {
      const row = taskRow(x);
      row.insertBefore(h("div", { class: "sched" },
        h("button", { onclick: () => { update(x.id, { date: t }); toast("Scheduled for today"); } }, "Today"),
        h("button", { onclick: () => { update(x.id, { date: addDays(t, 1) }); toast("Scheduled for tomorrow"); } }, "Tomorrow"),
        h("button", { onclick: () => { update(x.id, { date: nextMon }); toast("Scheduled for next Monday"); } }, "Next week")), row.querySelector(".prio"));
      row.style.gridTemplateColumns = "auto auto minmax(0,1fr) auto auto auto";
      return row;
    })));
    out.append(card);
    return out;
  }

  function viewStats() {
    const t = today(), wk = mondayOf(t);
    const cur = weekNums(wk);
    const doneAll = S.tasks.filter((x) => x.status === "done");
    const streak = currentStreak();
    const tile = (icon, v, k, extra, cls) => h("div", { class: "card tile" + (cls ? " " + cls : "") }, h("span", { class: "ti", html: icon }), h("span", { class: "v num" }, v), h("span", { class: "k" }, k), extra ? h("span", { class: "d", style: "color:var(--muted)" }, extra) : null);
    const out = h("div", { class: "stack" });
    out.append(h("div", { class: "statgrid" },
      tile(I.done, (cur.total ? Math.round(cur.done / cur.total * 100) : 0) + "%", "Completion this week", cur.done + " of " + cur.total),
      tile(I.list, doneAll.length, "Tasks completed", "all time"),
      tile(I.flame, streak, "Current day streak", streak ? "keep it going" : "finish one today", "flame"),
      tile(I.bolt, Math.max(S.meta.bestStreak || 0, streak), "Best streak", "days in a row")));

    // last 8 weeks
    const weeks = []; for (let i = 7; i >= 0; i--) weeks.push(addDays(wk, -7 * i));
    const nums = weeks.map((w) => weekNums(w));
    const max = Math.max(1, ...nums.map((n) => n.total));
    const chart = h("div", { class: "chart", role: "img", "aria-label": "Tasks planned and completed for the last 8 weeks" },
      weeks.map((w, i) => { const n = nums[i]; const hpx = Math.round(n.total / max * 170); return h("div", { class: "col" },
        h("b", null, n.done + "/" + n.total),
        h("div", { class: "stackbar" + (w === wk ? " cur" : ""), style: "height:" + Math.max(hpx, 4) + "px" }, h("i", { style: "height:" + (n.total ? Math.round(n.done / n.total * 100) : 0) + "%" })),
        h("small", null, short(w))); }));
    out.append(h("section", { class: "card" }, cardHead(I.stats, "Last 8 weeks", h("span", { class: "legend" }, h("span", null, h("i", { style: "background:var(--accent-2)" }), "Completed"), h("span", null, h("i", { style: "background:var(--accent-soft)" }), "Planned"))), chart));

    // categories this week
    const catRows = S.categories.map((c) => { const l = cur.list.filter((x) => x.category === c.id); return { c, total: l.length, done: l.filter((x) => x.status === "done").length }; }).filter((r) => r.total).sort((a, b) => b.total - a.total);
    const catCard = h("section", { class: "card" }, cardHead(I.list, "This week by category"),
      catRows.length ? h("div", { class: "catbars" }, catRows.map((r) => h("div", { class: "catbar" }, h("span", null, r.c.name), h("div", { class: "track" }, h("i", { style: "width:" + Math.round(r.done / r.total * 100) + "%;background:" + r.c.color })), h("span", { class: "n" }, r.done + "/" + r.total)))) : emptyState("No tasks this week yet", "Category progress shows up here."));

    // history
    const byDay = new Map();
    doneAll.filter((x) => x.doneAt).sort((a, b) => b.doneAt.localeCompare(a.doneAt)).forEach((x) => { const d = iso(new Date(x.doneAt)); if (d < addDays(t, -30)) return; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(x); });
    const hist = h("section", { class: "card" }, cardHead(I.done, "Completed history", h("span", { class: "hint" }, "last 30 days")));
    if (!byDay.size) hist.append(emptyState("No completed tasks yet", "Check something off and it shows up here."));
    byDay.forEach((items, d) => hist.append(h("div", { class: "groupname histday" }, relDay(d) + " · " + items.length), h("ul", { class: "tasklist" }, items.map((x) => taskRow(x)))));
    out.append(h("div", { class: "cols" }, hist, h("div", { class: "rightcol" }, catCard)));
    return out;
  }

  function viewSettings() {
    const out = h("div", { class: "stack" });
    const sw = (on, onch, label) => h("button", { class: "switch", role: "switch", "aria-checked": String(!!on), "aria-label": label, onclick: () => onch(!on) });
    const row = (title, sub, control) => h("div", { class: "setrow" }, h("div", { class: "t" }, title, sub ? h("small", null, sub) : null), control);
    const set = (k, v) => { S.settings[k] = v; save(); render(); };

    const nameIn = h("input", { type: "text", id: "setName", value: S.profile.name, maxlength: "40", placeholder: "Your first name", onchange: (e) => { S.profile.name = e.target.value.trim(); save(); render(); toast("Saved"); } });
    const theme = h("div", { class: "seg", role: "group", "aria-label": "Theme" }, [["dark", "Dark"], ["light", "Light"], ["system", "Match " + (OS === "Linux" ? "system" : "Windows")]].map(([k, l]) => h("button", { class: S.settings.theme === k ? "on" : null, "aria-pressed": String(S.settings.theme === k), onclick: () => { S.settings.theme = k; save(); applyTheme(); render(); } }, l)));
    const timeIn = h("input", { type: "time", id: "setTime", value: S.settings.reminderTime, onchange: (e) => set("reminderTime", e.target.value || "09:00") });

    const general = h("section", { class: "card" }, cardHead(I.list, "Profile and look"),
      row("Your name", "Used in the dashboard greeting.", nameIn),
      row("Theme", null, theme));
    const planning = h("section", { class: "card" }, cardHead(I.cal, "Planning"),
      row("Roll over unfinished tasks", "Each morning, anything left from earlier days moves to today.", sw(S.settings.rollover, (v) => set("rollover", v), "Roll over unfinished tasks")),
      row("Weekly reset", "Every Monday the dashboard starts a fresh week and shows last week's score.", h("span", { class: "pill" }, "Mondays")));
    const notes = h("section", { class: "card" }, cardHead(I.clock, "Reminders"),
      row("Daily summary", "A desktop notification with today's plan.", h("div", { style: "display:flex;gap:10px;align-items:center" }, timeIn, sw(S.settings.dailyReminder, (v) => set("dailyReminder", v), "Daily summary"))),
      row("Task reminders", "Notify at a task's reminder time.", sw(S.settings.taskReminders, (v) => set("taskReminders", v), "Task reminders")),
      row("Test it", "Send a sample notification now.", h("button", { class: "btn ghost", onclick: () => notify("WeekFlow reminders are on", "You'll get your daily summary at " + fmtTime(S.settings.reminderTime) + ".") }, "Send test")));
    const desktop = desk ? h("section", { class: "card" }, cardHead(I.bolt, OS),
      row("Keep running in the tray", "Closing the window keeps WeekFlow running so reminders still arrive.", sw(S.settings.closeToTray, (v) => { set("closeToTray", v); desk.setCloseToTray(v); }, "Keep running in the tray")),
      row("Start with " + OS, "Open WeekFlow when you sign in.", sw(S.settings.openAtLogin, (v) => { set("openAtLogin", v); desk.setOpenAtLogin(v); }, "Start with " + OS))) : null;

    const updates = desk && desk.updates ? (() => {
      const u = updState, d = desk.updates;
      const ver = desk.version || "1.1.0";
      const when = u.checkedAt ? "Last checked " + relDay(iso(new Date(u.checkedAt))).toLowerCase() + " at " + fmtTime(pad(new Date(u.checkedAt).getHours()) + ":" + pad(new Date(u.checkedAt).getMinutes())) + "." : "Not checked yet.";
      const status = {
        idle: ["You're on WeekFlow " + ver + ".", when],
        checking: ["Checking for updates…", "This takes a few seconds."],
        current: ["You're up to date.", "WeekFlow " + ver + " is the latest version. " + when],
        available: ["WeekFlow " + u.version + " is available.", "You're on " + ver + ". Download it now; you choose when to restart."],
        downloading: ["Downloading WeekFlow " + u.version + "… " + (u.percent || 0) + "%", "Keep working. You'll be asked to restart when it's ready."],
        ready: ["WeekFlow " + u.version + " is ready to install.", "Restart WeekFlow to finish. It also installs the next time you quit."],
        error: ["Update check didn't work.", u.error || "Try again in a few minutes."],
        unconfigured: ["You're on WeekFlow " + ver + ".", "Automatic updates switch on once WeekFlow has an update server. Until then, new versions come as an installer that installs over this one and keeps your tasks."]
      }[u.state] || ["You're on WeekFlow " + ver + ".", when];
      const btn = u.state === "available" ? h("button", { class: "btn primary", onclick: () => d.download() }, "Download update")
        : u.state === "ready" ? h("button", { class: "btn primary", onclick: () => d.install() }, "Restart and update")
        : h("button", { class: "btn ghost", disabled: u.state === "checking" || u.state === "downloading" ? true : null, onclick: () => d.check() }, u.state === "checking" ? "Checking…" : "Check for updates");
      return h("section", { class: "card" }, cardHead(I.reopen, "Updates", h("span", { class: "pill" }, "Version " + ver)),
        h("div", { class: "updstatus st-upd-" + u.state }, h("strong", null, status[0]), h("small", null, status[1]),
          u.state === "downloading" ? h("div", { class: "bar", style: "margin-top:8px" }, h("i", { style: "width:" + (u.percent || 0) + "%" })) : null,
          u.state === "available" && u.notes ? h("p", { class: "hint", style: "margin-top:6px;white-space:pre-line" }, u.notes) : null),
        row("Update", null, btn),
        row("Check automatically", "Looks for a new version when WeekFlow opens and every few hours. Nothing installs without you.", sw(S.settings.autoUpdate, (v) => { set("autoUpdate", v); d.setAuto(v); }, "Check for updates automatically")));
    })() : null;
    const cats = h("section", { class: "card" }, cardHead(I.list, "Categories"),
      S.categories.map((c) => h("div", { class: "catedit" },
        h("input", { type: "color", value: c.color, "aria-label": "Color for " + c.name, onchange: (e) => { c.color = e.target.value; save(); render(); } }),
        h("input", { type: "text", value: c.name, maxlength: "30", "aria-label": "Category name", onchange: (e) => { c.name = e.target.value.trim() || c.name; save(); render(); } }),
        h("button", { class: "btn ghost", onclick: (e) => {
          if (S.categories.length <= 1) { toast("Keep at least one category."); return; }
          const used = S.tasks.filter((x) => x.category === c.id).length;
          if (used && e.currentTarget.dataset.armed !== "1") { e.currentTarget.dataset.armed = "1"; e.currentTarget.textContent = "Move " + used + " to " + S.categories.find((o) => o.id !== c.id).name + "?"; return; }
          const fallback = S.categories.find((o) => o.id !== c.id).id;
          S.tasks.forEach((x) => { if (x.category === c.id) x.category = fallback; });
          S.categories = S.categories.filter((o) => o.id !== c.id); save(); render();
        } }, "Remove"))),
      h("button", { class: "btn ghost", style: "margin-top:10px", onclick: () => { S.categories.push({ id: "c" + Date.now().toString(36), name: "New category", color: "#8f63ff" }); save(); render(); } }, h("span", { html: I.plus }), "Add category"));

    let armed = false;
    const wipe = h("button", { class: "btn danger", onclick: () => {
      if (!armed) { armed = true; wipe.textContent = "Click again to erase everything"; wipe.classList.add("confirm"); return; }
      const keep = { profile: S.profile, settings: S.settings, categories: S.categories };
      S = { ...fresh(), ...keep }; save(); render(); toast("All tasks erased");
    } }, "Erase all tasks");
    const data = h("section", { class: "card" }, cardHead(I.share, "Your data"),
      row("Export", "Save every task and setting to a .json file.", h("button", { class: "btn ghost", onclick: doExport }, "Export")),
      row("Import", "Load a WeekFlow export. Tasks are merged in, nothing is lost.", h("button", { class: "btn ghost", onclick: () => $("importFile").click() }, "Import")),
      row("Erase", "Remove all tasks from this computer.", wipe),
      h("p", { class: "hint", style: "margin-top:10px" }, "WeekFlow keeps your data on this computer only. Export regularly to back it up."));

    out.append(h("div", { class: "setgrid" }, h("div", { class: "rightcol" }, general, planning, notes, desktop), h("div", { class: "rightcol" }, updates, cats, data)));
    return out;
  }

  const VIEWS = { dashboard: ["Dashboard", viewDashboard], week: ["My Week", viewWeek], tasks: ["All Tasks", viewTasks], inbox: ["Inbox", viewInbox], completed: ["Completed", viewCompleted], stats: ["Statistics", viewStats], settings: ["Settings", viewSettings] };

  // ---------- render ----------
  function render() {
    const focusId = document.activeElement && document.activeElement.id;
    const scroll = $("view").scrollTop;
    const [title, fn] = VIEWS[view];
    $("pageTitle").textContent = title;
    document.querySelectorAll(".navbtn").forEach((b) => { b.classList.toggle("on", b.dataset.view === view); if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    const v = $("view"); v.replaceChildren(fn()); v.scrollTop = scroll;
    // sidebar + header bits
    const inboxN = S.tasks.filter((x) => !x.date && x.status !== "done").length;
    $("inboxBadge").hidden = !inboxN; $("inboxBadge").textContent = inboxN;
    const streak = currentStreak();
    $("streakTitle").textContent = streak ? "Stay on track!" : "Start a streak";
    $("streakSub").textContent = streak ? streak + "-day streak" : "Finish a task today";
    const t = today();
    const due = S.tasks.filter((x) => isActive(x) && x.date && (x.date < t || (x.date === t && x.time && x.time <= nowHM()))).length;
    $("bellCount").hidden = !due; $("bellCount").textContent = due;
    $("avatarBtn").textContent = (S.profile.name || "W").slice(0, 1).toUpperCase();
    renderUpdBar();
    if (focusId) { const f = document.getElementById(focusId); if (f && f !== document.activeElement) f.focus(); }
  }
  function renderUpdBar() {
    const bar = $("updBar"); const u = updState;
    const show = desk && desk.updates && (u.state === "available" || u.state === "downloading" || u.state === "ready") && updDismissed !== u.state + u.version;
    bar.hidden = !show; if (!show) return;
    const d = desk.updates;
    bar.replaceChildren(...[
      h("span", { class: "updicon", html: I.reopen }),
      h("span", { class: "updtext" }, u.state === "available" ? "WeekFlow " + u.version + " is available." : u.state === "downloading" ? "Downloading WeekFlow " + u.version + "… " + (u.percent || 0) + "%" : "WeekFlow " + u.version + " is ready. Restart to finish updating."),
      u.state === "available" ? h("button", { class: "btn primary sm", onclick: () => d.download() }, "Download") : null,
      u.state === "ready" ? h("button", { class: "btn primary sm", onclick: () => d.install() }, "Restart now") : null,
      u.state !== "downloading" ? h("button", { class: "btn ghost sm", onclick: () => { updDismissed = u.state + u.version; renderUpdBar(); } }, "Later") : null].filter(Boolean));
  }
  function go(v) { view = v; $("view").scrollTop = 0; render(); }

  // ---------- editor ----------
  let editing = null, delArmed = false;
  function fillCats(sel) { $("edCategory").replaceChildren(...S.categories.map((c) => h("option", { value: c.id }, c.name))); $("edCategory").value = sel || S.categories[0].id; }
  function openEditor(id, preset) {
    closeMenu();
    const t = id ? S.tasks.find((x) => x.id === id) : null;
    editing = t ? t.id : null; delArmed = false;
    const d = t || { title: "", date: null, time: "", priority: "medium", category: S.categories[0].id, repeat: "none", notes: "", ...(preset || {}) };
    $("edHead").textContent = t ? "Edit task" : "New task";
    $("edSave").textContent = t ? "Save" : "Add task";
    $("edTitle").value = d.title; $("edDate").value = d.date || ""; $("edTime").value = d.time || "";
    $("edPriority").value = d.priority || "medium"; $("edStatus").value = ST_NAME[d.status] ? d.status : "open"; fillCats(d.category); $("edRepeat").value = d.repeat || "none"; $("edNotes").value = d.notes || "";
    $("edDelete").hidden = !t; $("edDelete").textContent = "Delete"; $("edDelete").classList.remove("confirm");
    $("scrim").hidden = false; setTimeout(() => $("edTitle").focus(), 0);
  }
  function closeEditor() { $("scrim").hidden = true; editing = null; }
  $("editor").addEventListener("submit", (e) => {
    e.preventDefault();
    const newStatus = $("edStatus").value;
    const fields = { title: $("edTitle").value.trim(), date: $("edDate").value || null, time: $("edDate").value ? $("edTime").value : "", priority: $("edPriority").value, category: $("edCategory").value, repeat: $("edRepeat").value, notes: $("edNotes").value };
    if (!fields.title) { $("edTitle").focus(); return; }
    if (fields.repeat !== "none" && !fields.date) fields.date = today();
    const was = editing; closeEditor();
    if (was) {
      const cur = S.tasks.find((x) => x.id === was);
      Object.assign(cur, fields);
      if (cur.status !== newStatus) setStatus(was, newStatus); else { save(); render(); toast("Saved"); }
    } else {
      const nt = addTask({ ...fields, status: newStatus === "done" ? "open" : newStatus });
      if (newStatus === "done") setStatus(nt.id, "done"); else toast(fields.date ? "Added to " + relDay(fields.date) : "Added to Inbox");
    }
  });
  $("edDelete").addEventListener("click", () => { if (!editing) return; if (!delArmed) { delArmed = true; $("edDelete").textContent = "Click again to delete"; $("edDelete").classList.add("confirm"); return; } const id = editing; closeEditor(); remove(id); toast("Deleted"); });
  $("edCancel").addEventListener("click", closeEditor);
  $("edClose").addEventListener("click", closeEditor);
  $("scrim").addEventListener("mousedown", (e) => { if (e.target === $("scrim")) closeEditor(); });
  $("edDate").addEventListener("change", () => { $("edHint").textContent = $("edDate").value ? "Scheduled for " + relDay($("edDate").value) + "." : "Leave the day empty to keep it in your Inbox."; });

  // ---------- bell ----------
  $("bellBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const pop = $("bellPop"); if (!pop.hidden) { pop.hidden = true; return; }
    const t = today();
    const items = S.tasks.filter((x) => isActive(x) && x.date && x.date <= t).sort((a, b) => a.date.localeCompare(b.date) || String(a.time || "99").localeCompare(String(b.time || "99"))).slice(0, 8);
    pop.replaceChildren(h("h3", null, "Due now"), items.length ? items.map((x) => h("button", { class: "popitem", onclick: () => { pop.hidden = true; openEditor(x.id); } },
      h("span", { class: "prio " + x.priority }, PRI_NAME[x.priority]), h("span", null, x.title, h("small", null, (x.date < t ? "Overdue since " + short(x.date) : "Today") + (x.time ? " · " + fmtTime(x.time) : ""))))) : h("p", { class: "hint", style: "margin:0 4px 6px" }, "You're all caught up."));
    pop.hidden = false;
  });

  // ---------- nav, search, avatar, keys ----------
  document.querySelectorAll(".navbtn").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  $("searchInput").addEventListener("input", (e) => { query = e.target.value.trim(); if (view !== "tasks") { filt.status = "all"; view = "tasks"; } render(); });
  $("avatarBtn").addEventListener("click", () => go("settings"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (!$("scrim").hidden) closeEditor(); closeMenu(); $("bellPop").hidden = true; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === "n") { e.preventDefault(); openEditor(null, { date: today() }); }
      if (e.key === "/") { e.preventDefault(); $("searchInput").focus(); }
    }
  });

  // ---------- export / import ----------
  function doExport() {
    const data = JSON.parse(JSON.stringify(S)); data.meta.notified = {};
    const blob = new Blob([JSON.stringify({ app: "WeekFlow", version: 2, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "weekflow-backup-" + today() + ".json" });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function fromV1(tasks) {
    const dayOff = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 };
    return Object.entries(tasks).map(([id, x]) => ({
      id: "v1" + id, title: x.title || "Untitled", notes: x.notes || "", time: "", repeat: "none", rolled: 0,
      date: x.day && x.day in dayOff && x.week ? addDays(x.week, dayOff[x.day]) : null,
      priority: "medium", category: "work",
      status: ST_NAME[x.status] ? x.status : "open", doneAt: x.doneAt || null, createdAt: x.createdAt || new Date().toISOString()
    }));
  }
  $("importFile").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const p = JSON.parse(await f.text());
      let tasks = [], cats = [];
      if (p && p.app === "WeekFlow" && p.version === 2 && p.data) { tasks = p.data.tasks || []; cats = p.data.categories || []; if (!S.profile.name && p.data.profile && p.data.profile.name) S.profile.name = p.data.profile.name; }
      else if (p && p.tasks && typeof p.tasks === "object" && !Array.isArray(p.tasks)) tasks = fromV1(p.tasks);
      else throw new Error("format");
      cats.forEach((c) => { if (c && c.id && !cat(c.id)) S.categories.push({ id: String(c.id), name: String(c.name || "Category"), color: String(c.color || "#8f63ff") }); });
      let added = 0, updated = 0;
      tasks.forEach((x) => {
        if (!x || !x.title) return;
        const clean = { id: String(x.id || uid()), title: String(x.title).slice(0, 200), notes: String(x.notes || ""), date: x.date || null, time: x.time || "", priority: PRI[x.priority] != null ? x.priority : "medium", category: cat(x.category) ? x.category : S.categories[0].id, repeat: x.repeat || "none", status: ST_NAME[x.status] ? x.status : "open", doneAt: x.doneAt || null, createdAt: x.createdAt || new Date().toISOString(), rolled: x.rolled || 0, spawnedNext: !!x.spawnedNext };
        const i = S.tasks.findIndex((o) => o.id === clean.id);
        if (i >= 0) { S.tasks[i] = clean; updated++; } else { S.tasks.push(clean); added++; }
      });
      updateStreak(); save(); render();
      toast("Imported " + added + " new" + (updated ? ", updated " + updated : "") + (added + updated === 1 ? " task" : " tasks"));
    } catch (err) { toast("That file isn't a WeekFlow backup. Choose a file made with Export."); }
  });

  // ---------- desktop menu commands ----------
  if (desk) desk.onCommand((cmd) => {
    if (cmd === "new") openEditor(null, { date: today() });
    else if (cmd === "export") doExport();
    else if (cmd === "import") $("importFile").click();
    else if (cmd === "prevWeek") { weekStart = addDays(weekStart, -7); render(); }
    else if (cmd === "nextWeek") { weekStart = addDays(weekStart, 7); render(); }
    else if (cmd === "thisWeek") { weekStart = mondayOf(today()); render(); }
    else if (cmd.startsWith("view:")) go(cmd.slice(5));
  });

  if (desk && desk.updates) {
    desk.updates.onStatus((u) => { updState = u || { state: "idle" }; if (view === "settings") render(); else renderUpdBar(); });
    desk.updates.setAuto(S.settings.autoUpdate !== false);
    desk.updates.refresh();
  }

  // ---------- start ----------
  applyTheme();
  if (desk) { desk.setCloseToTray(!!S.settings.closeToTray); }
  dailyCheck();
  render();
  setInterval(() => { dailyCheck(); reminderTick(); }, 30000);
  setTimeout(reminderTick, 3000);
})();
