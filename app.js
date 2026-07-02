"use strict";

const $ = (id) => document.getElementById(id);
const store = {
  get: (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ---- date ----
const now = new Date();
const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
const friendlyDate = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
$("dateLine").textContent = friendlyDate;
$("entryDate").textContent = friendlyDate;

// ---- tabs ----
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
    document.querySelectorAll(".tab-panel").forEach((p) => { p.classList.remove("active"); p.hidden = true; });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    const panel = $(`tab-${target}`);
    panel.hidden = false;
    panel.classList.add("active");
  });
});

// ---- metrics ----
["energy", "focus", "stress"].forEach((id) => {
  const slider = $(`f-${id}`);
  const val = $(`f-${id}-val`);
  slider.addEventListener("input", () => { val.textContent = slider.value; });
});

// ---- weekly toggle ----
$("weeklyToggle").addEventListener("click", () => {
  const expanded = $("weeklyToggle").getAttribute("aria-expanded") === "true";
  $("weeklyToggle").setAttribute("aria-expanded", String(!expanded));
  $("weeklyFields").hidden = expanded;
});

// ---- load today's draft ----
const FIELDS = ["sleep","mood","thoughts","motivation","reality","energy","focus","stress","body","authentic","enjoyed","engaged","problems"];
const draft = store.get(`draft:${dateKey}`, {});
FIELDS.forEach((f) => {
  const el = $(`f-${f}`);
  if (!el) return;
  if (el.type === "range") {
    if (draft[f]) { el.value = draft[f]; $(`f-${f}-val`).textContent = draft[f]; }
  } else {
    if (draft[f]) el.value = draft[f];
  }
});

// auto-save draft on input
FIELDS.forEach((f) => {
  const el = $(`f-${f}`);
  if (!el) return;
  el.addEventListener("input", () => {
    const d = store.get(`draft:${dateKey}`, {});
    d[f] = el.value;
    store.set(`draft:${dateKey}`, d);
  });
});

// ---- save entry ----
$("saveEntry").addEventListener("click", () => {
  const entry = { date: dateKey, savedAt: new Date().toISOString() };
  FIELDS.forEach((f) => {
    const el = $(`f-${f}`);
    if (el) entry[f] = el.value.trim();
  });

  const journal = store.get("journal", []).filter((e) => e.date !== dateKey);
  journal.unshift(entry);
  store.set("journal", journal.slice(0, 365));
  store.set(`draft:${dateKey}`, entry); // keep draft in sync

  renderHistory();

  $("saveEntry").textContent = "Saved ✓";
  setTimeout(() => { $("saveEntry").textContent = "Save entry"; }, 1400);
});

// ---- history ----
function renderHistory() {
  const journal = store.get("journal", []);
  $("historyEmpty").hidden = journal.length > 0;
  const list = $("historyList");
  list.textContent = "";

  journal.forEach((e) => {
    const detail = document.createElement("details");
    detail.className = "history-entry";

    const summary = document.createElement("summary");
    const meta = document.createElement("span");
    meta.className = "history-meta";
    meta.textContent = formatDateKey(e.date);
    const preview = document.createElement("span");
    preview.className = "history-preview";
    preview.textContent = e.mood || e.thoughts || "—";
    const arrow = document.createElement("span");
    arrow.className = "history-arrow";
    arrow.textContent = "›";
    summary.append(meta, preview, arrow);
    detail.append(summary);

    const body = document.createElement("div");
    body.className = "history-body";

    // scores row
    const scores = [["energy","Energy"],["focus","Focus"],["stress","Stress"]];
    const scoreRow = document.createElement("div");
    scoreRow.className = "scores";
    scores.forEach(([f, label]) => {
      if (!e[f]) return;
      const chip = document.createElement("span");
      chip.className = "score-chip";
      chip.textContent = `${label} `;
      const val = document.createElement("span");
      val.textContent = `${e[f]}/10`;
      chip.append(val);
      scoreRow.append(chip);
    });
    if (scoreRow.children.length) body.append(scoreRow);

    // text fields
    const textFields = [
      ["sleep","Time of sleep"], ["mood","Mood"], ["thoughts","Thoughts"],
      ["motivation","Motivation"], ["reality","Perception of Reality"],
      ["body","What my body needed"], ["authentic","Most authentic moment"],
      ["enjoyed","Enjoyed"], ["engaged","Most engaged"], ["problems","Problems worth solving"],
    ];
    textFields.forEach(([f, label]) => {
      if (!e[f]) return;
      const row = document.createElement("div");
      row.className = "history-field";
      const lbl = document.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = label;
      const val = document.createElement("div");
      val.className = "val";
      val.textContent = e[f];
      row.append(lbl, val);
      body.append(row);
    });

    detail.append(body);
    list.append(detail);
  });
}

function formatDateKey(k) {
  if (!k) return "";
  const d = new Date(k + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}


// ---- goals ----
function renderGoals() {
  const goals = store.get("goals", []);
  $("goalsEmpty").hidden = goals.length > 0;
  const list = $("goalList");
  list.textContent = "";
  goals.forEach((goal, i) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "goal-row";
    const name = document.createElement("span");
    name.textContent = goal.name;
    const pct = document.createElement("span");
    pct.className = "pct";
    pct.textContent = `${goal.progress ?? 0}%`;
    row.append(name, pct);
    const slider = document.createElement("input");
    slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.value = goal.progress ?? 0;
    slider.setAttribute("aria-label", `Progress for ${goal.name}`);
    slider.addEventListener("input", () => {
      goal.progress = Number(slider.value);
      pct.textContent = `${goal.progress}%`;
      goals[i] = goal;
      store.set("goals", goals);
    });
    li.append(row, slider);
    list.append(li);
  });
}

$("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("goalName").value.trim();
  if (!name) return;
  const goals = store.get("goals", []);
  goals.push({ name, progress: 0 });
  store.set("goals", goals);
  $("goalName").value = "";
  renderGoals();
});

// ---- journal.txt parser (runs in browser) ----
function parseJournalTxt(raw) {
  const lines = raw.split(/\r?\n/);
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const FULL_DATE_RE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+ \d+,\s*\d{4})/i;
  const NUMBERED_RE = /^\d+-\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\w+)-(\d+)/i;

  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function parseFullDate(line) {
    const m = line.match(FULL_DATE_RE);
    if (!m) return null;
    const d = new Date(m[2].replace(/\s+/," "));
    return isNaN(d) ? null : toISO(d);
  }
  function resolveNumbered(line, ctxYear) {
    const m = line.match(NUMBERED_RE);
    if (!m) return null;
    const mon = MONTHS[m[2].slice(0,3).toLowerCase()];
    const day = parseInt(m[3], 10);
    if (!mon || !day) return null;
    const dayName = m[1].toLowerCase();
    const dayIdx = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].indexOf(dayName);
    for (const yr of [ctxYear, ctxYear-1, ctxYear+1, 2025, 2024, 2026]) {
      if (!yr) continue;
      const d = new Date(yr, mon-1, day);
      if (!isNaN(d) && (dayIdx === -1 || d.getDay() === dayIdx))
        return `${yr}-${String(mon).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    }
    return `${ctxYear||2025}-${String(mon).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }
  function isHeader(line) {
    return FULL_DATE_RE.test(line) || NUMBERED_RE.test(line);
  }
  function extractNum(str) {
    if (!str) return "";
    const m = str.match(/(\d+)\s*\/\s*10/);
    return m ? m[1] : str.trim();
  }
  function getField(block, label) {
    const re = new RegExp(`${label}[:\\s]*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|\\nWeekly|$)`, "i");
    const m = block.match(re);
    return m ? m[1].trim() : "";
  }

  const journalStart = lines.findIndex((l) => /^Journal:/i.test(l.trim()));
  const src = journalStart >= 0 ? lines.slice(journalStart + 1) : lines;

  const blocks = [];
  let cur = null;
  let lastYear = new Date().getFullYear();

  for (const line of src) {
    if (isHeader(line)) {
      if (cur) blocks.push(cur);
      let date = parseFullDate(line) || resolveNumbered(line, lastYear);
      if (date) lastYear = parseInt(date, 10);
      cur = { date: date || null, lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);

  const STRUCTURED = /Time of sleep|^Mood:|^Thoughts:|Energy Level|Focus Level/im;

  const entries = blocks
    .filter((b) => b.date)
    .map((b) => {
      const block = b.lines.join("\n");
      const obj = { date: b.date, savedAt: b.date + "T12:00:00.000Z" };
      if (STRUCTURED.test(block)) {
        obj.sleep      = getField(block, "Time of sleep");
        obj.mood       = getField(block, "Mood");
        obj.thoughts   = getField(block, "Thoughts");
        obj.motivation = getField(block, "Motivation");
        obj.reality    = getField(block, "Perception of Reality");
        obj.energy     = extractNum(getField(block, "Energy Level"));
        obj.focus      = extractNum(getField(block, "Focus Level"));
        obj.stress     = extractNum(getField(block, "What is my stress level"));
        obj.body       = getField(block, "What does my body need right now");
        obj.authentic  = getField(block, "When did I feel most authentic today");
        obj.enjoyed    = getField(block, "What did I enjoy doing today");
        obj.engaged    = getField(block, "When did I feel most engaged this week");
        obj.problems   = getField(block, "What problems around me actually annoy me enough");
      } else {
        obj.thoughts = block.trim();
      }
      return obj;
    })
    .reduce((acc, entry) => {
      const ex = acc.find((e) => e.date === entry.date);
      if (ex) {
        if (entry.thoughts && ex.thoughts) ex.thoughts += "\n\n" + entry.thoughts;
        else Object.assign(ex, entry);
      } else {
        acc.push(entry);
      }
      return acc;
    }, [])
    .sort((a, b) => b.date.localeCompare(a.date));

  return entries;
}

// ---- import ----
$("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("importStatus").textContent = "Reading…";
  const reader = new FileReader();
  reader.onload = () => {
    try {
      let incoming;
      if (file.name.endsWith(".txt")) {
        incoming = parseJournalTxt(reader.result);
      } else {
        incoming = JSON.parse(reader.result);
        if (!Array.isArray(incoming)) throw new Error("not an array");
      }
      const existing = store.get("journal", []);
      const existingDates = new Set(existing.map((e) => e.date));
      const added = incoming.filter((e) => !existingDates.has(e.date));
      const merged = [...added, ...existing].sort((a, b) => b.date.localeCompare(a.date));
      store.set("journal", merged.slice(0, 2000));
      renderHistory();
      $("importStatus").textContent = `${added.length} entries added`;
      setTimeout(() => { $("importStatus").textContent = ""; }, 3000);
    } catch {
      $("importStatus").textContent = "Couldn't read file";
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

// ---- offline ----
const updateOnline = () => { $("offlineNote").hidden = navigator.onLine; };
window.addEventListener("online", updateOnline);
window.addEventListener("offline", updateOnline);
updateOnline();

// ---- service worker ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

renderGoals();
renderHistory();
