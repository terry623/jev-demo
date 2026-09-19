import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";
import {
  validateInput,
  readChoice,
  buildPlan,
  parsePlan,
  rasterize,
  contains,
  buildRefinement,
  parseRefinement,
} from "../src/art.js";
import { AutoDraw } from "../public/autodraw.js";
import { palettes } from "../public/palette.js";
const body = { prompt: "a red apple", palette: "classic", size: 64 };
const layer = {
  id: "main",
  shape: "ellipse",
  color: "red",
  x: 32,
  y: 34,
  w: 36,
  h: 36,
  material: "soft",
};
const layout = {
  background: "white",
  lighting: "left",
  outline: "colored",
  layers: [layer],
};
function answer(criteria, choice = Object.keys(criteria)[0]) {
  return {
    type: "choice",
    choice,
    confidence: 1,
    probabilities: Object.fromEntries(
      Object.keys(criteria).map((k) => [k, k === choice ? 1 : 0]),
    ),
  };
}
function fakePlan(payload) {
  return {
    model: "test-jev",
    usage: { input_tokens: 5, output_tokens: 5 },
    answers: Object.fromEntries(
      Object.entries(payload.questions).map(([key, q]) => {
        let choice;
        if (key === "background") choice = "white";
        else if (key === "lighting") choice = "left";
        else if (key === "outline") choice = "colored";
        else if (key.endsWith("_shape"))
          choice = key === "main_shape" ? "ellipse" : "none";
        else if (key.endsWith("_color")) choice = "red";
        else if (key.endsWith("_parent")) choice = "canvas";
        else if (key.endsWith("_anchor")) choice = "center";
        else if (key.endsWith("_x") || key.endsWith("_y")) choice = "32";
        else if (key.endsWith("_w") || key.endsWith("_h")) choice = "32";
        else if (key.endsWith("_material")) choice = "soft";
        else choice = Object.keys(q.criteria)[0];
        return [key, answer(q.criteria, choice)];
      }),
    ),
  };
}
test("validates native resolutions and 32-color palettes", () => {
  for (const size of [32, 48, 64])
    assert.equal(validateInput({ ...body, size }), null);
  assert.ok(validateInput({ ...body, size: 16 }));
  assert.ok(validateInput({ ...body, prompt: " " }));
  assert.ok(validateInput({ ...body, prompt: "a".repeat(601) }));
  assert.ok(validateInput({ ...body, palette: "other" }));
  for (const p of Object.values(palettes)) assert.equal(p.colors.length, 32);
});
test("native 64px raster contains additional geometry, not nearest-neighbor 16px blocks", () => {
  const r = rasterize(layout, "classic", 64);
  assert.equal(r.pixels.length, 4096);
  assert.ok(r.active.length > 500);
  assert.ok(r.pixels.every((p) => p >= 0 && p < 32));
  assert.ok(new Set(r.pixels).size >= 3);
  let detailed = false;
  for (let y = 0; y < 64; y += 4)
    for (let x = 0; x < 64; x += 4) {
      const block = [];
      for (let dy = 0; dy < 4; dy++)
        for (let dx = 0; dx < 4; dx++)
          block.push(r.pixels[(y + dy) * 64 + x + dx]);
      if (new Set(block).size > 1) detailed = true;
    }
  assert.ok(detailed);
});
test("tiny flat details overlay main body and remain exact instead of noisy refinement", () => {
  const pupil = {
    id: "pupil",
    shape: "rectangle",
    color: "black",
    x: 30,
    y: 30,
    w: 2,
    h: 2,
    material: "flat",
  };
  const r = rasterize({ ...layout, layers: [layer, pupil] }, "classic", 64);
  assert.equal(r.pixels[30 * 64 + 30], 0);
  assert.equal(r.evidence[30 * 64 + 30], null);
  assert.ok(!r.active.includes(30 * 64 + 30));
});
test("refinement never paints outside the known silhouette and validates distributions", () => {
  const r = rasterize(layout, "classic", 64),
    indices = r.active.slice(0, 128);
  const payload = buildRefinement(body, layout, r, indices);
  const data = {
    answers: Object.fromEntries(
      Object.entries(payload.questions).map(([k, q]) => [
        k,
        answer(q.criteria),
      ]),
    ),
  };
  const pixels = parseRefinement(data, payload, r, indices);
  assert.equal(pixels.length, 128);
  assert.ok(pixels.every((p) => r.active.includes(p.index)));
  data.answers[`p${indices[0]}`].probabilities.keep = 0.2;
  assert.throws(
    () => parseRefinement(data, payload, r, indices),
    /invalid_response/,
  );
});
test("two-stage planning preserves base and constrains attached pupils", () => {
  const payload = buildPlan(body);
  const base = parsePlan(fakePlan(payload), payload);
  assert.equal(base.layers.length, 1);
  const details = buildPlan(body, base);
  const result = parsePlan(fakePlan(details), details, base);
  assert.deepEqual(result.layers, base.layers);
  assert.equal(base.layers[0].x, 32);
  assert.ok(Object.keys(details.questions).length > 60);
});
test("all geometry shapes stay inside their bounds", () => {
  for (const shape of [
    "ellipse",
    "rectangle",
    "rounded",
    "triangle",
    "triangle_down",
    "diamond",
    "heart",
    "star",
    "crescent",
  ])
    assert.equal(contains({ ...layer, shape }, 100, 100), false);
});
test("auto draw debounces latest text and never fires while IME composition is active", () => {
  let jobs = new Map(),
    n = 0,
    calls = [],
    cancelled = 0;
  const clock = {
    setTimeout: (fn) => {
      jobs.set(++n, fn);
      return n;
    },
    clearTimeout: (id) => jobs.delete(id),
  };
  const scheduler = new AutoDraw({
    clock,
    draw: (text) => calls.push(text),
    cancel: () => cancelled++,
  });
  const flush = () => {
    const pending = [...jobs.values()];
    jobs.clear();
    pending.forEach((fn) => fn());
  };
  scheduler.input("cat");
  scheduler.input("cat with scarf");
  flush();
  assert.deepEqual(calls, ["cat with scarf"]);
  scheduler.compositionStart();
  scheduler.input("貓");
  flush();
  assert.equal(calls.length, 1);
  scheduler.compositionEnd("橘貓");
  flush();
  assert.deepEqual(calls, ["cat with scarf", "橘貓"]);
  scheduler.input("unfinished");
  scheduler.stop();
  flush();
  assert.equal(calls.length, 2);
  assert.ok(cancelled >= 6);
});
test("blank input cancels pending generation", () => {
  let pending = null,
    calls = 0;
  const scheduler = new AutoDraw({
    draw: () => calls++,
    cancel: () => {},
    clock: {
      setTimeout: (fn) => ((pending = fn), 1),
      clearTimeout: () => (pending = null),
    },
  });
  scheduler.input("apple");
  scheduler.input(" ");
  pending?.();
  assert.equal(calls, 0);
});
test("API rejects old island routes and invalid request before model calls", async () => {
  const env = { TYPESAFE_API_KEY: "test" };
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/step", { method: "POST" }),
        env,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/pixels", { method: "GET" }),
        env,
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/pixels", {
          method: "POST",
          headers: { Origin: "https://other" },
        }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/pixels", {
          method: "POST",
          body: JSON.stringify({ ...body, size: 2048 }),
        }),
        env,
      )
    ).status,
    400,
  );
});
test("full stream contains two previews, complete pixel batches and done metadata", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_, opts) =>
    Response.json(fakePlan(JSON.parse(opts.body)));
  try {
    const r = await worker.fetch(
      new Request("https://test/api/pixels", {
        method: "POST",
        body: JSON.stringify({ ...body, size: 32 }),
      }),
      { TYPESAFE_API_KEY: "private-test" },
    );
    const events = (await r.text())
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s));
    assert.equal(events.filter((e) => e.type === "preview").length, 2);
    assert.equal(events.at(-1).type, "done");
    assert.equal(events.at(-1).total_pixels, 1024);
    assert.equal(
      events
        .filter((e) => e.type === "pixels")
        .reduce((sum, e) => sum + e.pixels.length, 0),
      events.at(-1).refined,
    );
    assert.equal(JSON.stringify(events).includes("private-test"), false);
  } finally {
    globalThis.fetch = original;
  }
});
test("upstream failure is an explicit stream error, never a fake finished image", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("failure", { status: 503 });
  try {
    const r = await worker.fetch(
      new Request("https://test/api/pixels", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      { TYPESAFE_API_KEY: "test" },
    );
    const events = (await r.text())
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s));
    assert.equal(events.at(-1).type, "error");
    assert.ok(!events.some((e) => e.type === "done"));
  } finally {
    globalThis.fetch = original;
  }
});

test("cancelling the response stream aborts the upstream request", async () => {
  const original = globalThis.fetch;
  let signal;
  globalThis.fetch = async (_, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) =>
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      ),
    );
  };
  try {
    const r = await worker.fetch(
      new Request("https://test/api/pixels", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      { TYPESAFE_API_KEY: "test" },
    );
    const reader = r.body.getReader();
    await reader.read();
    await reader.cancel();
    assert.ok(signal.aborted);
  } finally {
    globalThis.fetch = original;
  }
});
