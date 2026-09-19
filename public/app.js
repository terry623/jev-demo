import { SIZE, palettes, examples } from "./palette.js";

const $ = (id) => document.getElementById(id);
const frames = [];
const cells = [];
let selectedFrame = -1;
let selectedPixel = 119;
let workingFrame = null;
let busy = false;
let heatmap = false;
let abortController = null;

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const activeFrame = () => workingFrame || frames[selectedFrame];

function palettePreview() {
  const palette = palettes[$("palette").value];
  $("palette-swatches").replaceChildren(
    ...palette.colors.map(([, hex, label]) => {
      const swatch = document.createElement("span");
      swatch.style.background = hex;
      swatch.title = `${label} ${hex}`;
      return swatch;
    }),
  );
  updateButtons();
}

function updateButtons() {
  const frame = frames[selectedFrame];
  $("download").disabled = busy || !frame;
  $("refine").disabled = busy || !frame || frame.palette !== $("palette").value;
  $("refine").title =
    frame && frame.palette !== $("palette").value
      ? "調色盤已改變，請重新生成作品。"
      : "從目前選取的版本出發，套用文字描述再修正。";
  $("generate").hidden = busy;
  $("stop").hidden = !busy;
  for (const element of document.querySelectorAll(
    "#prompt, #palette, #rounds, #guided, .examples button, .frame",
  ))
    element.disabled = busy;
  $("status-dot").classList.toggle("busy", busy);
  $("artboard").setAttribute("aria-busy", String(busy));
}

function updatePrompt() {
  $("char-count").textContent = `${$("prompt").value.length}/600`;
}

function renderCanvas() {
  const frame = activeFrame();
  const palette = palettes[frame?.palette || $("palette").value];
  for (let i = 0; i < cells.length; i++) {
    const pixel = frame?.pixels[i];
    const cell = cells[i];
    const color = pixel
      ? heatmap
        ? `hsl(${25 + pixel.confidence * 75} 76% ${30 + pixel.confidence * 37}%)`
        : palette.colors[pixel.color][1]
      : (Math.floor(i / SIZE) + (i % SIZE)) % 2 === 0
        ? "#2b3526"
        : "#2e3929";
    cell.style.setProperty("--pixel-color", color);
    cell.classList.toggle("selected", !!pixel && i === selectedPixel);
    cell.tabIndex = i === selectedPixel ? 0 : -1;
    cell.setAttribute("aria-selected", String(i === selectedPixel));
    cell.setAttribute(
      "aria-label",
      `X ${i % SIZE}, Y ${Math.floor(i / SIZE)}${pixel ? `，${palette.colors[pixel.color][2]}，機率 ${pct(pixel.probabilities[pixel.color])}` : "，尚未生成"}`,
    );
  }
  $("empty-state").hidden = busy || !!frame;
  $("canvas-mode").textContent = heatmap ? "CONFIDENCE VIEW" : "COLOR VIEW";
  $("heat-legend").hidden = !heatmap;
  $("canvas-title").textContent = frame
    ? `${frame.round === 0 ? "初稿" : `修正 ${frame.round}`} / ${frame.prompt.slice(0, 18)}`
    : "UNTITLED / 尚未生成";
  renderInspector();
}

function renderInspector() {
  const frame = activeFrame();
  const pixel = frame?.pixels[selectedPixel];
  const colors = palettes[frame?.palette || $("palette").value].colors;
  $("selected-coord").textContent =
    `X ${String(selectedPixel % SIZE).padStart(2, "0")} / Y ${String(Math.floor(selectedPixel / SIZE)).padStart(2, "0")}`;
  $("selected-name").textContent = pixel
    ? colors[pixel.color][2]
    : "等待這一格";
  $("selected-hex").textContent = pixel
    ? colors[pixel.color][1].toUpperCase()
    : "#------";
  $("selected-swatch").style.background = pixel
    ? colors[pixel.color][1]
    : "#e8ecdf";
  $("selected-swatch").textContent = pixel ? "" : "?";
  $("confidence-value").textContent = pixel ? pct(pixel.confidence) : "—";
  $("latency").textContent = frame?.elapsed_ms
    ? `${(frame.elapsed_ms / 1000).toFixed(2)}s`
    : "—";
  $("tokens").textContent = frame?.usage
    ? frame.usage.input_tokens.toLocaleString()
    : "—";
  $("model").textContent = frame?.models?.join(", ") || "jev-latest";
  $("layout-json").textContent = frame?.layout
    ? JSON.stringify(frame.layout, null, 2)
    : "// 純像素模式或尚未生成構圖";
  const list = $("probabilities");
  list.replaceChildren();
  if (!pixel) {
    const message = document.createElement("p");
    message.textContent = busy
      ? "這格還在等待模型回應。可以先點選已上色的像素。"
      : "作品生成後，點選畫布探索每個像素的候選色。";
    list.append(message);
    $("pixel-json").textContent = "// 等待真實模型回應";
    return;
  }
  pixel.probabilities
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .forEach(({ value, index }) => {
      const row = document.createElement("div");
      row.className = "prob-row";
      const dot = document.createElement("span");
      dot.className = "prob-dot";
      dot.style.background = colors[index][1];
      const name = document.createElement("span");
      name.textContent = colors[index][2];
      const number = document.createElement("span");
      number.className = "prob-percent";
      number.textContent = pct(value);
      const track = document.createElement("div");
      track.className = "prob-track";
      const fill = document.createElement("div");
      fill.className = "prob-fill";
      fill.style.width = `${value * 100}%`;
      track.append(fill);
      row.append(dot, name, number, track);
      list.append(row);
    });
  $("pixel-json").textContent = JSON.stringify(
    {
      position: {
        x: selectedPixel % SIZE,
        y: Math.floor(selectedPixel / SIZE),
      },
      type: "choice",
      choice: colors[pixel.color][0],
      confidence: pixel.confidence,
      probabilities: Object.fromEntries(
        colors.map(([key], index) => [key, pixel.probabilities[index]]),
      ),
    },
    null,
    2,
  );
}

function paintFrame(frame, resolution = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext("2d");
  const colors = palettes[frame.palette].colors;
  const size = resolution / SIZE;
  frame.pixels.forEach((pixel, index) => {
    context.fillStyle = colors[pixel.color][1];
    context.fillRect(
      (index % SIZE) * size,
      Math.floor(index / SIZE) * size,
      size,
      size,
    );
  });
  return canvas;
}

function renderFrames() {
  $("frame-count").textContent = `${frames.length} 個版本 · 保留至頁面關閉`;
  $("frames").replaceChildren(
    ...frames.map((frame, index) => {
      const button = document.createElement("button");
      button.className = `frame ${index === selectedFrame ? "active" : ""}`;
      button.disabled = busy;
      button.setAttribute("aria-pressed", String(index === selectedFrame));
      button.setAttribute(
        "aria-label",
        `版本 ${index + 1}，${frame.round === 0 ? "初稿" : `修正 ${frame.round}`}，${frame.prompt}`,
      );
      button.title = frame.prompt;
      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = frame.round === 0 ? "初稿" : `修正 ${frame.round}`;
      const time = document.createElement("span");
      time.textContent = `${(frame.elapsed_ms / 1000).toFixed(2)}s / 256px`;
      const tag = document.createElement("span");
      tag.className = "frame-tag";
      tag.textContent = `#${String(index + 1).padStart(2, "0")} ${palettes[frame.palette].name}`;
      info.append(title, time, tag);
      button.append(paintFrame(frame, 64), info);
      button.onclick = () => {
        if (busy) return;
        selectedFrame = index;
        $("palette").value = frame.palette;
        $("prompt").value = frame.prompt;
        $("guided").checked = frame.guided;
        updatePrompt();
        palettePreview();
        $("status-text").textContent =
          `正在查看版本 ${index + 1}，可修改描述後再修一輪。`;
        $("progress-text").textContent = "256 / 256";
        $("progress-fill").style.width = "100%";
        renderFrames();
        renderCanvas();
        updateButtons();
      };
      return button;
    }),
  );
  if (busy) $("frames").scrollLeft = $("frames").scrollWidth;
}

async function generatePass(prompt, palette, previous, round, guided) {
  workingFrame = {
    prompt,
    palette,
    round,
    guided,
    pixels: Array(256).fill(null),
  };
  $("progress-text").textContent = "0 / 256";
  $("progress-fill").style.width = "0%";
  renderCanvas();
  const response = await fetch("/api/pixels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      palette,
      guided,
      ...(previous ? { previous } : {}),
    }),
    signal: abortController.signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "無法連上模型服務，請稍後再試。");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    finished = false;
  const handle = (event) => {
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "planning")
      $("status-text").textContent = "Jev 正在規劃形狀、位置與配色…";
    if (event.type === "composition") {
      workingFrame.layout = event.layout;
      $("status-text").textContent = "構圖完成，正在逐格選色…";
      renderInspector();
    }
    if (event.type === "pixels") {
      for (const pixel of event.pixels)
        workingFrame.pixels[pixel.index] = pixel;
      $("progress-text").textContent = `${event.completed} / 256`;
      $("progress-fill").style.width = `${(event.completed / 256) * 100}%`;
      renderCanvas();
    }
    if (event.type === "done") {
      if (workingFrame.pixels.some((pixel) => !pixel))
        throw new Error("這一輪的像素未完整回傳，請再試一次。");
      Object.assign(workingFrame, {
        usage: event.usage,
        models: event.models,
        elapsed_ms: event.elapsed_ms,
        layout: event.layout,
      });
      finished = true;
    }
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) handle(JSON.parse(line));
      }
      if (done) break;
    }
    if (buffer.trim()) handle(JSON.parse(buffer));
    if (!finished) throw new Error("連線提早結束，完整版本尚未生成。");
    return workingFrame;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function run(refinement = false) {
  if (busy) return;
  const prompt = $("prompt").value.trim();
  if (!prompt) {
    $("error").textContent = "先寫下想畫的內容，或選一個靈感範例。";
    $("error").hidden = false;
    $("prompt").focus();
    return;
  }
  const source = refinement ? frames[selectedFrame] : null;
  if (refinement && !source) return;
  const guided = $("guided").checked;
  const palette = source?.palette || $("palette").value;
  let previous = source?.pixels.map((pixel) => pixel.color);
  const startRound = source ? source.round + 1 : 0;
  const passes = refinement ? 1 : 1 + Number($("rounds").value);
  busy = true;
  abortController = new AbortController();
  $("error").hidden = true;
  updateButtons();
  try {
    for (let pass = 0; pass < passes; pass++) {
      abortController.signal.throwIfAborted();
      const round = startRound + pass;
      $("status-text").textContent =
        `${round === 0 ? "繪製初稿" : `修正第 ${round} 輪`} · Jev 正在為每一格選色…`;
      const frame = await generatePass(
        prompt,
        palette,
        previous,
        round,
        guided,
      );
      frames.push(frame);
      selectedFrame = frames.length - 1;
      previous = frame.pixels.map((pixel) => pixel.color);
      workingFrame = null;
      renderFrames();
      renderCanvas();
    }
    $("status-text").textContent = `完成！點像素看選色，或選一個版本繼續創作。`;
  } catch (error) {
    const stopped = abortController.signal.aborted;
    $("status-text").textContent = stopped
      ? "已停止，完成的版本仍保留在下方。"
      : "這一輪未完成，已保留先前的完整版本。";
    if (!stopped) {
      $("error").textContent = error.message || "生成失敗，請稍後再試。";
      $("error").hidden = false;
    }
    $("progress-text").textContent = frames.length ? "256 / 256" : "0 / 256";
    $("progress-fill").style.width = frames.length ? "100%" : "0%";
  } finally {
    busy = false;
    workingFrame = null;
    abortController = null;
    renderCanvas();
    updateButtons();
  }
}

for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement("button");
  cell.className = "pixel";
  cell.setAttribute("role", "gridcell");
  cell.onclick = () => {
    selectedPixel = i;
    renderCanvas();
  };
  cell.onkeydown = (event) => {
    const offsets = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -SIZE,
      ArrowDown: SIZE,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    selectedPixel = Math.max(
      0,
      Math.min(255, selectedPixel + offsets[event.key]),
    );
    renderCanvas();
    cells[selectedPixel].focus();
  };
  cells.push(cell);
  $("artboard").append(cell);
}
for (const [id, palette] of Object.entries(palettes)) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = palette.name;
  $("palette").append(option);
}
for (const example of examples) {
  const button = document.createElement("button");
  button.textContent = `${example.emoji} ${example.name}`;
  button.onclick = () => {
    $("prompt").value = example.prompt;
    $("palette").value = example.palette;
    $("error").hidden = true;
    updatePrompt();
    palettePreview();
  };
  $("examples").append(button);
}
$("prompt").value = examples[0].prompt;
$("prompt").addEventListener("input", updatePrompt);
$("palette").addEventListener("change", palettePreview);
$("rounds").addEventListener("input", () => {
  $("round-label").textContent = `${$("rounds").value} 輪`;
});
$("generate").onclick = () => run();
$("refine").onclick = () => run(true);
$("stop").onclick = () => abortController?.abort();
$("grid-toggle").onclick = () => {
  const enabled = $("artboard").classList.toggle("show-grid");
  $("grid-toggle").setAttribute("aria-pressed", String(enabled));
};
$("heat-toggle").onclick = () => {
  heatmap = !heatmap;
  $("heat-toggle").setAttribute("aria-pressed", String(heatmap));
  renderCanvas();
};
$("download").onclick = () => {
  const frame = frames[selectedFrame];
  if (!frame || busy) return;
  paintFrame(frame, 1024).toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jev-pixel-${selectedFrame + 1}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
};
updatePrompt();
palettePreview();
renderCanvas();
