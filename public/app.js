import { palettes, SIZES, DEFAULT_SIZE } from "./palette.js";
import { AutoDraw } from "./autodraw.js";
const $ = (selector) => document.querySelector(selector),
  esc = (value) =>
    String(value ?? "").replace(
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
const STORE = "jev-pixel-studio-v4";
let size = DEFAULT_SIZE,
  palette = "classic",
  art = null,
  history = [],
  controller = null,
  requestId = 0,
  exportFile = null,
  exportVersion = 0,
  busy = false,
  phase = "idle";
const suggestions = [
  {
    name: "月光小屋",
    icon: "☾",
    subtitle: "A QUIET NIGHT",
    palette: "neon",
    prompt:
      "月光下的一棟小屋，紫色三角屋頂，米白牆壁，兩扇亮黃色窗和棕色門，右上角金色月亮，深藍天空，底部草地。",
  },
  {
    name: "圍巾橘貓",
    icon: "🐈",
    subtitle: "A LITTLE FRIEND",
    palette: "classic",
    prompt:
      "正面的橘貓頭像，圓臉，兩隻三角貓耳，黑色小眼睛和粉紅鼻子，脖子戴綠色圍巾，奶油白背景，左上方柔和光線。",
  },
  {
    name: "太空機器人",
    icon: "🤖",
    subtitle: "HELLO, HUMAN",
    palette: "neon",
    prompt:
      "可愛機器人正面頭像，淺灰色圓角金屬頭，兩隻發亮的藍色方眼，紅色天線，細小的微笑，深藍背景，金屬高光。",
  },
  {
    name: "紅蘋果",
    icon: "🍎",
    subtitle: "ONE SMALL THING",
    palette: "earth",
    prompt:
      "一顆圓潤的紅蘋果，頂部短棕色果梗和一片綠葉，左上方亮紅高光，右下方暗紅陰影，奶油白背景。",
  },
];
function validArt(a) {
  return (
    a &&
    SIZES.includes(a.size) &&
    Object.hasOwn(palettes, a.palette) &&
    typeof a.prompt === "string" &&
    a.prompt.length <= 600 &&
    Array.isArray(a.pixels) &&
    a.pixels.length === a.size * a.size &&
    a.pixels.every((n) => Number.isInteger(n) && n >= 0 && n < 32)
  );
}
try {
  const saved = JSON.parse(localStorage.getItem(STORE));
  if (Array.isArray(saved?.history))
    history = saved.history.filter(validArt).slice(0, 6);
  if (SIZES.includes(saved?.size)) size = saved.size;
  if (Object.hasOwn(palettes, saved?.palette)) palette = saved.palette;
  if (typeof saved?.draft === "string")
    $("#prompt").value = saved.draft.slice(0, 600);
  if (history[0]) art = structuredClone(history[0]);
} catch {}
function persist() {
  try {
    localStorage.setItem(
      STORE,
      JSON.stringify({ size, palette, draft: $("#prompt").value, history }),
    );
  } catch {
    /* The drawing still works in private mode or with full storage. */
  }
}
function status(text, nextPhase = phase) {
  phase = nextPhase;
  $("#status").textContent = text;
  document.body.classList.toggle("working", busy);
  $("#stop").hidden = !busy;
  $("#input-hint").innerHTML =
    `<i></i> ${phase === "waiting" ? "等你寫完…" : phase === "composing" ? "選好字，再開始" : busy ? "正在把想像畫出來" : "停下輸入，自動開始"}`;
}
function progress(value) {
  $("#progress").setAttribute("aria-valuenow", Math.round(value));
  $("#progress span").style.width = `${Math.max(0, Math.min(100, value))}%`;
}
function nativeCanvas(image, target) {
  target.width = image.size;
  target.height = image.size;
  const ctx = target.getContext("2d"),
    data = ctx.createImageData(image.size, image.size);
  const rgb = palettes[image.palette].colors.map(([, hex]) =>
    hex
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16)),
  );
  for (let i = 0; i < image.pixels.length; i++) {
    data.data.set([...rgb[image.pixels[i]], 255], i * 4);
  }
  ctx.putImageData(data, 0, 0);
}
function paint() {
  if (!art) return;
  nativeCanvas(art, $("#art"));
  if ($("#zoom-dialog").open) nativeCanvas(art, $("#zoom-art"));
  $("#empty").hidden = true;
  $("#zoom-open").disabled = false;
  $("#art-label").textContent = art.complete
    ? "FINISHED / 完成"
    : "IN PROGRESS / 構圖與細化";
  $("#canvas-size").textContent = `${art.size} × ${art.size}`;
  $("#art-caption").textContent = art.prompt;
  $("#art-caption").title = art.prompt;
  $("#art-time").textContent =
    art.complete && art.meta
      ? `${(art.meta.elapsed_ms / 1000).toFixed(1)}s`
      : "";
  $("#redraw").disabled = !$("#prompt").value.trim();
}
function configure() {
  document.querySelectorAll("[data-size]").forEach((el) => {
    const selected = Number(el.dataset.size) === size;
    el.classList.toggle("selected", selected);
    el.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-palette]").forEach((el) => {
    const selected = el.dataset.palette === palette;
    el.classList.toggle("selected", selected);
    el.setAttribute("aria-pressed", String(selected));
  });
  $("#palette-name").textContent = palettes[palette].name;
  if (!art) $("#canvas-size").textContent = `${size} × ${size}`;
  $("#char-count").textContent = `${$("#prompt").value.length} / 600`;
  $("#clear").hidden = !$("#prompt").value;
  $("#redraw").disabled = !$("#prompt").value.trim();
}
function prepareExport() {
  const version = ++exportVersion;
  exportFile = null;
  $("#save").disabled = true;
  if (!art) return;
  const snapshot = structuredClone(art),
    native = document.createElement("canvas");
  nativeCanvas(snapshot, native);
  const output = document.createElement("canvas");
  output.width = output.height = snapshot.size * 16;
  const ctx = output.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(native, 0, 0, output.width, output.height);
  output.toBlob((blob) => {
    if (!blob || version !== exportVersion) return;
    exportFile = new File(
      [blob],
      `jev-${snapshot.size}x${snapshot.size}${snapshot.complete ? "" : "-preview"}.png`,
      { type: "image/png" },
    );
    $("#save").disabled = false;
  }, "image/png");
}
function stopCurrent() {
  const wasBusy = busy;
  requestId++;
  if (controller) controller.abort();
  controller = null;
  busy = false;
  $("#stop").hidden = true;
  document.body.classList.remove("working");
  if (art && !art.complete && wasBusy) {
    $("#art-label").textContent = "PREVIEW / 尚未完成";
    prepareExport();
  }
}
const scheduler = new AutoDraw({
  draw: (text) => generate(text),
  cancel: stopCurrent,
  waiting: () => {
    status("等你寫完，停一秒就開始。", "waiting");
    $("#error").hidden = true;
  },
});
async function generate(text, force = false) {
  if (document.hidden || !text.trim()) return;
  if (
    !force &&
    art?.complete &&
    art.prompt === text &&
    art.palette === palette &&
    art.size === size
  ) {
    status("這個想像，已經畫好了。", "done");
    return;
  }
  stopCurrent();
  const id = requestId,
    params = { prompt: text.trim(), palette, size };
  controller = new AbortController();
  const activeController = controller;
  busy = true;
  $("#error").hidden = true;
  status("Jev 正在安排構圖…", "planning");
  progress(3);
  $("#art-time").textContent = "";
  const timeout = setTimeout(() => activeController.abort(), 100000);
  let gotDone = false,
    gotError = false,
    reader;
  const accept = (event) => {
    if (id !== requestId) return;
    if (event.type === "planning") {
      status(
        event.phase === 1 ? "正在找出輪廓與色彩…" : "補上眼睛、窗戶與小細節…",
        "planning",
      );
      progress(event.phase === 1 ? 5 : 20);
    }
    if (event.type === "preview") {
      art = { ...params, pixels: event.pixels, complete: false };
      exportFile = null;
      exportVersion++;
      $("#save").disabled = true;
      paint();
      progress(event.phase === 1 ? 18 : 30);
      status(
        event.phase === 1
          ? "構圖出現了，繼續加上細節…"
          : "輪廓就緒，開始細化光影…",
        "painting",
      );
    }
    if (event.type === "pixels") {
      for (const pixel of event.pixels) art.pixels[pixel.index] = pixel.color;
      paint();
      progress(30 + (65 * event.completed) / Math.max(1, event.total));
      status(
        `細化光影 · ${Math.round((100 * event.completed) / Math.max(1, event.total))}%`,
        "painting",
      );
    }
    if (event.type === "waiting") status("Jev 正在忙，稍等一下…", "painting");
    if (event.type === "error") {
      gotError = true;
      throw Error(event.error);
    }
    if (event.type === "done") {
      if (!art) throw Error("沒有收到畫布，請再試一次。");
      gotDone = true;
      art.complete = true;
      art.meta = event;
      art.id = Date.now();
      history = [structuredClone(art), ...history].slice(0, 6);
      persist();
      paint();
      progress(100);
      $("#art-time").textContent = `${(event.elapsed_ms / 1000).toFixed(1)}s`;
      status("畫好了。再改幾個字，看看不同的可能。", "done");
      prepareExport();
    }
  };
  try {
    const response = await fetch("/api/pixels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: activeController.signal,
    });
    if (!response.ok) {
      const data = await response.json();
      throw Error(data.error || "暫時無法連線，請稍後再試。");
    }
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (id !== requestId) {
        await reader.cancel();
        return;
      }
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        if (line.trim()) accept(JSON.parse(line));
      }
    }
    if (buffer.trim()) accept(JSON.parse(buffer));
    if (!gotDone && !gotError)
      throw Error("連線中斷，已保留目前畫面，請再試一次。");
  } catch (error) {
    if (id !== requestId) return;
    activeController.abort();
    try {
      await reader?.cancel();
    } catch {}
    $("#error span").textContent =
      error.name === "AbortError"
        ? "等候有點久，已保留目前畫面，請再試一次。"
        : error.message;
    $("#error").hidden = false;
    status("還沒畫完，可以再試一次。", "error");
    if (art) {
      $("#art-label").textContent = art.complete
        ? "FINISHED / 上一張完成作品"
        : "PREVIEW / 尚未完成";
      prepareExport();
    }
  } finally {
    clearTimeout(timeout);
    if (id === requestId) {
      busy = false;
      controller = null;
      document.body.classList.remove("working");
      $("#stop").hidden = true;
      status($("#status").textContent, phase);
    }
  }
}
$("#palettes").innerHTML = Object.entries(palettes)
  .map(
    ([id, p]) =>
      `<button class="palette-button" data-palette="${id}" aria-label="${p.name}，32 色" title="${p.name}" aria-pressed="false">${[1, 8, 10, 11].map((n) => `<span style="background:${p.colors[n][1]}"></span>`).join("")}</button>`,
  )
  .join("");
$("#examples").innerHTML = suggestions
  .map(
    (s, i) =>
      `<button class="example" data-example="${i}"><span class="example-icon">${s.icon}</span><span><strong>${s.name}</strong><small>${s.subtitle}</small></span></button>`,
  )
  .join("");
function changed() {
  $("#error").hidden = true;
  configure();
  persist();
  scheduler.input($("#prompt").value);
  if (!$("#prompt").value.trim()) {
    status("寫下新靈感，停一下就會畫。", "idle");
    progress(0);
  }
}
$("#prompt").addEventListener("input", changed);
$("#prompt").addEventListener("compositionstart", () => {
  scheduler.compositionStart();
  status("中文選字中，慢慢來。", "composing");
});
$("#prompt").addEventListener("compositionend", () => {
  configure();
  persist();
  scheduler.compositionEnd($("#prompt").value);
});
$("#prompt").addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    scheduler.stop();
    generate($("#prompt").value.trim(), true);
  }
});
$("#clear").addEventListener("click", () => {
  $("#prompt").value = "";
  changed();
  $("#prompt").focus();
});
function chooseExample(i) {
  const s = suggestions[i];
  $("#prompt").value = s.prompt;
  palette = s.palette;
  changed();
}
for (const button of document.querySelectorAll("[data-example]"))
  button.addEventListener("click", () =>
    chooseExample(Number(button.dataset.example)),
  );
$("#first-example").addEventListener("click", () => chooseExample(0));
for (const button of document.querySelectorAll("[data-size]"))
  button.addEventListener("click", () => {
    size = Number(button.dataset.size);
    changed();
  });
for (const button of document.querySelectorAll("[data-palette]"))
  button.addEventListener("click", () => {
    palette = button.dataset.palette;
    changed();
  });
for (const selector of ["#retry", "#redraw"])
  $(selector).addEventListener("click", () => {
    scheduler.stop();
    generate($("#prompt").value.trim(), true);
  });
$("#stop").addEventListener("click", () => {
  scheduler.stop();
  status("已暫停。繼續輸入或按重畫。", "paused");
});
$("#keyboard-done").addEventListener("click", () => $("#prompt").blur());
$("#save").addEventListener("click", async () => {
  if (!exportFile) return;
  const file = exportFile;
  try {
    if (
      matchMedia("(pointer:coarse)").matches &&
      navigator.canShare?.({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: "我的 Jev 像素畫" });
    } else {
      const url = URL.createObjectURL(file),
        a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  } catch (e) {
    if (e.name !== "AbortError") status("儲存未成功，請再按一次儲存圖片。");
  }
});
$("#history-open").addEventListener("click", () => {
  $("#history-grid").innerHTML = history.length
    ? history
        .map(
          (a, i) =>
            `<button class="history-item" data-history="${i}"><canvas width="${a.size}" height="${a.size}" aria-label="${esc(a.prompt)}"></canvas><span>${esc(a.prompt)}</span><small>${a.size} × ${a.size} · ${esc(palettes[a.palette].name)}</small></button>`,
        )
        .join("")
    : "<p>第一張畫完成後，就會留在這裡。</p>";
  document.querySelectorAll("[data-history]").forEach((button) => {
    const i = Number(button.dataset.history);
    nativeCanvas(history[i], button.querySelector("canvas"));
    button.addEventListener("click", () => {
      scheduler.stop();
      $("#error").hidden = true;
      art = structuredClone(history[i]);
      size = art.size;
      palette = art.palette;
      $("#prompt").value = art.prompt;
      configure();
      persist();
      paint();
      prepareExport();
      progress(100);
      status("回到這個小小的想像。", "done");
      $("#history-dialog").close();
    });
  });
  $("#history-dialog").showModal();
});
$("#help-open").addEventListener("click", () => $("#help-dialog").showModal());
$("#zoom-open").addEventListener("click", () => {
  if (!art) return;
  nativeCanvas(art, $("#zoom-art"));
  $("#zoom-area").classList.remove("expanded");
  $("#zoom-toggle").textContent = "放大 2 倍";
  $("#zoom-dialog").showModal();
});
$("#zoom-toggle").addEventListener("click", () => {
  const expanded = $("#zoom-area").classList.toggle("expanded");
  $("#zoom-toggle").textContent = expanded ? "適合畫面" : "放大 2 倍";
});
$("#details-open").addEventListener("click", () => {
  $("#art-details").innerHTML = art
    ? `<p>${esc(art.prompt)}</p><p><strong>${art.size} × ${art.size}</strong> 原生像素 · 32 色<br>狀態：${art.complete ? "完成" : "構圖預覽／尚未完成"}<br>PNG 輸出：${art.size * 16} × ${art.size * 16}</p>${art.meta ? `<p>Jev 構圖部件：${art.meta.layers}<br>細化主體像素：${art.meta.refined}<br>模型：${esc(art.meta.models?.join(", "))}<br>耗時：${(art.meta.elapsed_ms / 1000).toFixed(1)} 秒</p>` : ""}`
    : "<p>第一張畫完成後，這裡會顯示它的小筆記。</p>";
  $("#details-dialog").showModal();
});
document
  .querySelectorAll("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () => button.closest("dialog").close()),
  );
let viewportBaseline = window.visualViewport?.height || innerHeight;
function viewport() {
  const v = window.visualViewport,
    height = v?.height || innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  if (document.activeElement !== $("#prompt")) viewportBaseline = height;
  const keyboard =
    innerWidth <= 740 &&
    document.activeElement === $("#prompt") &&
    (innerHeight - height > 100 ||
      height < viewportBaseline * 0.8 ||
      height < 520);
  document.body.classList.toggle("keyboard-open", keyboard);
}
window.visualViewport?.addEventListener("resize", viewport);
window.addEventListener("resize", viewport);
$("#prompt").addEventListener("focus", viewport);
$("#prompt").addEventListener("blur", () => setTimeout(viewport, 50));
document.addEventListener("visibilitychange", () => {
  if (document.hidden && (busy || scheduler.timer)) {
    scheduler.stop();
    status("已暫停。回來後可繼續修改或重畫。", "paused");
  }
});
configure();
viewport();
if (art) {
  paint();
  prepareExport();
  progress(100);
  status("上次的小畫，還在這裡。", "done");
}
