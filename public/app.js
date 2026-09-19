import {
  PEOPLE,
  PLACES,
  ACTIONS,
  OBJECTS,
  POLICIES,
  createWorld,
  validateWorld,
  clock,
} from "./world.js";
const $ = (s) => document.querySelector(s),
  escape = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const SAVE = "jev-little-world-v1";
let world = createWorld(),
  selected = "momo",
  busy = false,
  playing = false,
  timer = null,
  autoTurns = 0,
  controller = null;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE));
  if (validateWorld(saved) && Array.isArray(saved.events)) world = saved;
} catch {}
function avatar(p) {
  return `<svg viewBox="0 0 48 64" aria-hidden="true"><ellipse cx="24" cy="59" rx="14" ry="4" fill="#3a6644" opacity=".15"/><path d="M17 45v12m14-12v12" stroke="${p.hair}" stroke-width="5" stroke-linecap="round"/><path d="M13 31q11-8 22 0l4 17q-15 9-30 0Z" fill="${p.color}"/><path d="M13 34l-5 11m27-11 5 11" stroke="#eed3ad" stroke-width="5" stroke-linecap="round"/><ellipse cx="24" cy="21" rx="14" ry="16" fill="#f1d5b0"/><path d="M10 21Q5 3 23 3Q43 3 38 25L34 14Q24 20 15 12L12 24Z" fill="${p.hair}"/><circle cx="19" cy="22" r="1.3" fill="#5c5141"/><circle cx="29" cy="22" r="1.3" fill="#5c5141"/><path d="M22 28q2 2 4 0" fill="none" stroke="#a77660" stroke-width="1.2" stroke-linecap="round"/>${p.id === "wood" ? '<path d="M5 14Q24-3 43 14" fill="#c5b080"/><path d="M7 14h35" stroke="#ad9669" stroke-width="4"/>' : p.id === "spark" ? '<path d="M11 10q12-10 26 1" stroke="#d5ab62" stroke-width="5" fill="none"/>' : p.id === "momo" ? '<path d="M32 6l4-5 4 6-6 4Z" fill="#f4c892"/>' : p.id === "bean" ? '<circle cx="18" cy="23" r="5" fill="none" stroke="#716477"/><circle cx="30" cy="23" r="5" fill="none" stroke="#716477"/><path d="M23 22h2" stroke="#716477"/>' : ""}</svg>`;
}
$("#place-labels").innerHTML = Object.entries(PLACES)
  .map(
    ([id, p]) =>
      `<span class="place-label" data-place="${id}" style="left:${p.x}%;top:${p.y + 12}%">${escape(p.name)}</span>`,
  )
  .join("");
$("#residents").innerHTML = PEOPLE.map(
  (p) =>
    `<button class="npc" data-person="${p.id}" aria-label="查看${p.name}">${avatar(p)}<span class="npc-name">${p.name}</span><span class="npc-action" hidden></span></button>`,
).join("");
$("#roster").innerHTML = PEOPLE.map(
  (p) =>
    `<button data-person="${p.id}" aria-label="觀察${p.name}">${avatar(p)}${p.name}</button>`,
).join("");
function save() {
  try {
    localStorage.setItem(SAVE, JSON.stringify(world));
  } catch {
    $("#run-status").textContent = "瀏覽器無法儲存，關閉分頁後進度會消失。";
  }
}
function select(id) {
  selected = id;
  renderDetail();
  document.querySelectorAll("[data-person]").forEach((el) => {
    el.classList.toggle("selected", el.dataset.person === selected);
    el.setAttribute("aria-pressed", String(el.dataset.person === selected));
  });
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-person]");
  if (el) {
    select(el.dataset.person);
    if (el.classList.contains("npc") && innerWidth <= 820)
      $(".inspector").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  }
});
function render() {
  $("#world-time").textContent = clock(world.tick).label;
  $("#announcement").textContent = world.announcement;
  $("#shared-food").innerHTML = `${world.sharedFood} <small>份</small>`;
  $("#forest-food").innerHTML = `${world.forestFood} <small>份</small>`;
  $("#avg-hunger").innerHTML =
    `${Math.round(world.people.reduce((s, p) => s + p.hunger, 0) / 8)} <small>/ 100</small>`;
  $("#policy").textContent = POLICIES[world.policy];
  $("#policy").title = world.rule;
  $("#weather-badge").textContent =
    `${world.weather === "rain" ? "☂ 雨天" : "☀ 晴朗"} · ${world.power ? "電力正常" : "全島停電"}${world.party ? " · 派對進行中" : ""}`;
  $("#scene").classList.toggle("rainy", world.weather === "rain");
  $("#night-shade").classList.toggle(
    "dark",
    !world.power || clock(world.tick).hour >= 19 || clock(world.tick).hour < 6,
  );
  $("#power-lamp").setAttribute("fill", world.power ? "#ffe7a7" : "#687f70");
  $("#party-flags").style.opacity = world.party ? "1" : ".28";
  $("#bonfire").style.opacity = world.party ? "1" : ".3";
  const occupied = [],
    sceneWidth = $("#scene").clientWidth,
    sceneHeight = $("#scene").clientHeight;
  const gapX = Math.max(5, (44 / sceneWidth) * 100),
    gapY = Math.max(8, (56 / sceneHeight) * 100);
  world.people.forEach((p) => {
    const el = document.querySelector(`.npc[data-person="${p.id}"]`),
      place = PLACES[p.location];
    const candidates = [];
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        candidates.push({
          x: place.x + dx * gapX,
          y: place.y + 5 + dy * gapY,
          score: dx * dx + dy * dy * 1.2,
        });
    candidates.sort((a, b) => a.score - b.score);
    const pos =
      candidates.find(
        (c) =>
          c.x > 21 &&
          c.x < 83 &&
          c.y > 32 &&
          c.y < 84 &&
          ((c.x - 50) / 34) ** 2 + ((c.y - 53) / 29) ** 2 < 1.1 &&
          !occupied.some(
            (o) =>
              Math.abs(c.x - o.x) < gapX * 0.95 &&
              Math.abs(c.y - o.y) < gapY * 0.95,
          ),
      ) || candidates[0];
    occupied.push(pos);
    el.style.left = `${pos.x}%`;
    el.style.top = `${pos.y}%`;
    const bubble = el.querySelector(".npc-action");
    bubble.hidden = !p.last;
    if (p.last) bubble.textContent = ACTIONS[p.last.action]?.icon || "·";
    el.title = `${PEOPLE.find((x) => x.id === p.id).name} · ${p.last ? ACTIONS[p.last.action]?.label : "剛抵達"} · 飢餓 ${p.hunger}`;
  });
  $("#objects").innerHTML = world.objects.length
    ? `<div class="object-token" title="${escape(world.objects.at(-1).name)}">${OBJECTS[world.objects.at(-1).type].icon}<small>${escape(world.objects.at(-1).name)} ×${world.objects.at(-1).charges}</small></div>`
    : "";
  const events = world.events || [];
  $("#event-count").textContent =
    `第 ${world.tick} 回合 · 最近 ${events.length} 則`;
  $("#journal").innerHTML = [...events]
    .reverse()
    .map(
      (e) =>
        `<div class="journal-row ${escape(e.kind)}"><time>${String(clock(e.tick).hour).padStart(2, "0")}:00</time><span class="journal-dot"></span>${e.id ? `<a data-person="${escape(e.id)}" tabindex="0" role="button">${escape(e.text)}</a>` : `<span>${escape(e.text)}</span>`}</div>`,
    )
    .join("");
  select(selected);
  controls();
}
function renderDetail() {
  const p = world.people.find((p) => p.id === selected),
    profile = PEOPLE.find((p) => p.id === selected),
    d = p.last;
  const needs = [
    ["hunger", "飢餓", p.hunger, "越高越需要食物"],
    ["energy", "體力", p.energy, "越低越需要休息"],
    ["social", "孤單", p.social, "越高越渴望陪伴"],
  ];
  $("#person-detail").innerHTML =
    `<div class="detail-top"><div class="person-header"><div class="portrait">${avatar(profile)}</div><div><h2>${profile.name}</h2><div class="role">${profile.role}</div></div></div><p class="personality">${profile.personality}</p>${needs.map(([id, label, value, hint]) => `<div class="need ${id}" title="${hint}"><div class="need-title"><span>${label}</span><strong>${Math.round(value)} / 100</strong></div><div class="meter"><span style="width:${value}%"></span></div></div>`).join("")}<div class="pocket"><span>▣ 背包 ${p.food} 份食物</span><span>${p.umbrella ? "☂ 有雨傘" : "⌖ " + PLACES[p.location].name}</span></div></div>
 <section class="decision"><div class="small-title"><h3>這一刻的選擇</h3><span>${d ? `第 ${d.tick} 回合` : "等待第一個選擇"}</span></div>${
   d
     ? `<div class="chosen-action"><b>${ACTIONS[d.action].icon}</b>${ACTIONS[d.action].label}<small>JEV CHOICE</small></div><p class="outcome">${escape(d.result)}</p>${Object.entries(
         d.probabilities,
       )
         .sort((a, b) => b[1] - a[1])
         .map(
           ([action, prob]) =>
             `<div class="probability ${action === d.action ? "selected" : ""}"><span>${escape(ACTIONS[action]?.label || action)}</span><div class="meter"><span style="width:${prob * 100}%"></span></div><span>${(prob * 100).toFixed(1)}%</span></div>`,
         )
         .join(
           "",
         )}<details class="evidence"><summary>他做決定時，看到了什麼？</summary><p>飢餓 ${d.observed.hunger} · 體力 ${d.observed.energy} · 孤單 ${d.observed.social}<br>共享食物 ${d.observed.sharedFood} 份 · ${d.observed.weather === "rain" ? "下雨" : "晴天"} · ${d.observed.power ? "有電" : "停電"}<br>島規：${escape(d.observed.rule)}</p></details>`
     : '<div class="empty-note">他還在熟悉這座島。<br>按「前進一回合」，看 Jev 如何為他選擇下一步。</div>'
 }</section>
 <section class="memories"><div class="small-title"><h3>留在心裡的事</h3><span>最近 6 則記憶</span></div>${
   p.memory.length
     ? [...p.memory]
         .reverse()
         .map(
           (m) =>
             `<div class="memory"><time>${clock(m.tick).label}</time>${escape(m.text)}</div>`,
         )
         .join("")
     : '<p class="empty-note">還沒有故事。你的一句話，可能就是第一段記憶。</p>'
 }</section><p class="model-note">${world.lastRun ? `${escape(world.lastRun.model)} · ${(world.lastRun.elapsed / 1000).toFixed(1)} 秒 / 回合<br>` : ""}機率來自 Jev，呈現當時可用行動的相對傾向。<br>記憶與日誌記錄實際事件，並非生成的內心獨白。</p>`;
}
function controls() {
  $("#step").disabled = busy;
  $("#send").disabled = busy;
  $("#reset").disabled = busy;
  $("#command").disabled = busy;
  document
    .querySelectorAll("[data-command]")
    .forEach((b) => (b.disabled = busy));
  $("#play").textContent = playing ? "Ⅱ 暫停觀察" : "▶ 開始觀察";
  $("#play").disabled = busy && !playing;
  document.body.classList.toggle("running", playing);
  if (busy) $("#run-status").textContent = "Jev 正在理解島上的變化…";
  else if (playing)
    $("#run-status").textContent = `自動觀察中 · ${autoTurns} / 12 回合`;
  else
    $("#run-status").textContent =
      `時間暫停 · ${world.tick ? `已觀察 ${world.tick} 回合` : "你可以先改變世界"}`;
}
function stop() {
  playing = false;
  clearTimeout(timer);
  timer = null;
  controls();
}
async function api(path, extra = {}) {
  if (busy) return null;
  busy = true;
  controls();
  $("#error").hidden = true;
  controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        world: {
          ...world,
          events: [],
          lastRun: null,
          people: world.people.map(({ last, ...p }) => ({ ...p, last: null })),
        },
        ...extra,
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "無法連線，請稍後重試。");
    data.world.events = [...world.events, ...data.world.events].slice(-70);
    if (path === "/api/intervene") {
      data.world.lastRun = world.lastRun;
      data.world.people.forEach((p, i) => (p.last = world.people[i].last));
    }
    world = data.world;
    save();
    render();
    return data;
  } catch (error) {
    stop();
    $("#error").textContent =
      error.name === "AbortError"
        ? "等候逾時，世界尚未變動。請稍後重試。"
        : error.message;
    $("#error").hidden = false;
    return null;
  } finally {
    clearTimeout(timeout);
    controller = null;
    busy = false;
    controls();
  }
}
async function step() {
  const data = await api("/api/step");
  if (data && playing) {
    autoTurns++;
    if (autoTurns >= 12) {
      stop();
      $("#run-status").textContent = "已完成 12 回合，暫停讓你看看島上的變化。";
    } else timer = setTimeout(step, 12000);
  }
}
$("#play").addEventListener("click", () => {
  if (playing) {
    stop();
    return;
  }
  playing = true;
  autoTurns = 0;
  controls();
  step();
});
$("#step").addEventListener("click", () => {
  stop();
  step();
});
$("#intervention-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("#command").value.trim();
  if (!text || busy) return;
  stop();
  const result = await api("/api/intervene", { text });
  if (result) {
    $("#intervention-feedback").textContent = result.effects.length
      ? `已套用：${result.effects.join(" · ")}。前進一回合看看反應。`
      : "公告已傳達，將影響下一回合選擇。";
    $("#command").value = "";
  }
});
for (const button of document.querySelectorAll("[data-command]"))
  button.addEventListener("click", () => {
    $("#command").value = button.dataset.command;
    $("#intervention-form").requestSubmit();
  });
$("#back-to-island").addEventListener("click", () =>
  $(".island-card").scrollIntoView({ behavior: "smooth" }),
);
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});
$("#about").addEventListener("click", () => $("#about-dialog").showModal());
$(".dialog-close").addEventListener("click", () => $("#about-dialog").close());
$("#reset").addEventListener("click", () => {
  stop();
  $("#reset-dialog").showModal();
});
$("#cancel-reset").addEventListener("click", () => $("#reset-dialog").close());
$("#confirm-reset").addEventListener("click", () => {
  world = createWorld();
  save();
  $("#intervention-feedback").textContent = "新的微光島，新的故事。";
  $("#error").hidden = true;
  $("#reset-dialog").close();
  render();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches(".journal-row [data-person]")
  ) {
    e.preventDefault();
    select(e.target.dataset.person);
  }
});
render();
