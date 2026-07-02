"use strict";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

// ---- Date + phase ----
const now = new Date();
const dateKey = now.toISOString().slice(0, 10);
$("dateLine").textContent = now.toLocaleDateString(undefined, {
  weekday: "long", month: "long", day: "numeric",
});

const hour = now.getHours() + now.getMinutes() / 60;
const isEvening = hour >= 17;
const phase = isEvening ? "evening" : "morning";

$("phaseLine").textContent = isEvening
  ? "Evening. Close the day with clarity."
  : "Morning. Set the lens for the day.";

// ---- Day arc: sun position from 6:00 to 22:00 ----
(function positionSun() {
  const t = Math.min(Math.max((hour - 6) / 16, 0), 1);
  const angle = Math.PI * (1 - t); // PI at sunrise (left) -> 0 at night (right)
  const cx = 160 + 130 * Math.cos(angle);
  const cy = 112 - 130 * Math.sin(angle);
  const dot = $("sunDot");
  dot.setAttribute("cx", cx.toFixed(1));
  dot.setAttribute("cy", cy.toFixed(1));
})();

// ---- Today's entry ----
const entryKey = `entry:${dateKey}:${phase}`;
$("entryHeading").textContent = isEvening ? "Evening reflection" : "Morning strategy";
$("entryHint").textContent = isEvening
  ? "What was today actually about? Write it, or paste tonight's reflection email."
  : "Today's strategy arrives by email at 7:00. Paste it here, or write your own focus.";
$("entryText").value = store.get(entryKey, "");

$("saveEntry").addEventListener("click", () => {
  const text = $("entryText").value.trim();
  if (!text) return;
  store.set(entryKey, text);
  const journal = store.get("journal", []).filter((e) => e.key !== entryKey);
  journal.unshift({ key: entryKey, date: dateKey, phase, text });
  store.set("journal", journal.slice(0, 60));
  renderJournal();
  $("saveEntry").textContent = "Saved";
  setTimeout(() => { $("saveEntry").textContent = "Save entry"; }, 1200);
});

// ---- Goals ----
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
    pct.textContent = `${goal.progress}%`;
    row.append(name, pct);
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "100"; slider.value = goal.progress;
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

// ---- Journal ----
function renderJournal() {
  const journal = store.get("journal", []);
  $("journalEmpty").hidden = journal.length > 0;
  const list = $("journalList");
  list.textContent = "";
  journal.slice(0, 14).forEach((entry) => {
    const li = document.createElement("li");
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${entry.date} — ${entry.phase}`;
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = entry.text.length > 160 ? entry.text.slice(0, 160) + "…" : entry.text;
    li.append(meta, body);
    list.append(li);
  });
}

renderGoals();
renderJournal();

// ---- Offline indicator ----
function updateOnline() { $("offlineNote").hidden = navigator.onLine; }
window.addEventListener("online", updateOnline);
window.addEventListener("offline", updateOnline);
updateOnline();

// ---- Service worker ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
