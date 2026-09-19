import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { buildRequest, parsePixels, validateInput } from "../src/pixels.js";
import { palettes } from "../public/palette.js";

const valid = {
  prompt: "A red apple on a white background",
  palette: "classic",
  guided: false,
};
const request = (body, headers = {}, path = "/api/pixels") =>
  new Request(`https://demo.test${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const env = {
  TYPESAFE_API_KEY: "test",
  RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const responseFor = (payload) => ({
  model: "jev-test",
  usage: { input_tokens: 100, output_tokens: 20 },
  answers: Object.fromEntries(
    Object.keys(payload.questions).map((id) => [
      id,
      {
        type: "choice",
        choice: "red",
        confidence: 0.9,
        probabilities: Object.fromEntries(
          palettes.classic.colors.map(([key]) => [
            key,
            key === "red" ? 0.9 : key === "white" ? 0.1 : 0,
          ]),
        ),
      },
    ]),
  ),
});

test("pixel requests cover each coordinate exactly once and constrain output to palette", () => {
  const batches = [0, 64, 128, 192].map((offset) =>
    buildRequest(valid, offset),
  );
  const keys = batches.flatMap((batch) => Object.keys(batch.questions));
  assert.equal(keys.length, 256);
  assert.equal(new Set(keys).size, 256);
  assert.match(batches[3].questions.p255.instructions, /row 15, column 15/);
  assert.equal(Object.keys(batches[0].questions.p0.criteria).length, 16);
  assert.equal(batches[0].state.artwork_description, valid.prompt);
});

test("refinement provides only bounded local neighbors and rejects invalid grids", () => {
  const previous = Array(256).fill(0);
  previous[0] = 8;
  const payload = buildRequest({ ...valid, previous }, 0);
  assert.match(payload.questions.p0.instructions, /Previous color: red/);
  assert.match(payload.questions.p0.instructions, /outside,outside,outside/);
  assert.match(payload.questions.p0.instructions, /outside,red,black/);
  for (const grid of [
    [],
    Array(256).fill(-1),
    Array(256).fill("red"),
    Array(256).fill(null),
  ])
    assert.ok(validateInput({ ...valid, previous: grid }));
  assert.equal(validateInput({ ...valid, previous }), null);
});

test("API validates body, rejects legacy endpoint and enforces boundaries", async () => {
  for (const body of [
    "{",
    null,
    { ...valid, prompt: " " },
    { ...valid, prompt: "x".repeat(601) },
    { ...valid, palette: "constructor" },
  ])
    assert.equal((await worker.fetch(request(body), env)).status, 400);
  assert.equal(
    (await worker.fetch(request("x".repeat(12001)), env)).status,
    413,
  );
  assert.equal(
    (await worker.fetch(request(valid, {}, "/api/evaluate"), env)).status,
    404,
  );
  assert.equal(
    (await worker.fetch(request(valid, { Origin: "https://other.test" }), env))
      .status,
    403,
  );
  assert.equal((await worker.fetch(request(valid), {})).status, 503);
  assert.equal(
    (
      await worker.fetch(request(valid), {
        ...env,
        RATE_LIMITER: { limit: async () => ({ success: false }) },
      })
    ).status,
    429,
  );
});

test("stream carries all real answers and aggregated usage without credentials", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(init.headers.Authorization, "Bearer test");
    const payload = JSON.parse(init.body);
    calls.push(payload);
    return Response.json(responseFor(payload));
  };
  try {
    const response = await worker.fetch(
      request({ ...valid, questions: { evil: true } }),
      env,
    );
    assert.equal(response.status, 200);
    const raw = await response.text();
    const events = raw.trim().split("\n").map(JSON.parse);
    assert.equal(calls.length, 4);
    assert.equal(events[0].type, "start");
    const pixels = events
      .filter((e) => e.type === "pixels")
      .flatMap((e) => e.pixels);
    assert.equal(pixels.length, 256);
    assert.equal(new Set(pixels.map((p) => p.index)).size, 256);
    assert.ok(pixels.every((p) => p.color === 8 && p.probabilities[8] === 0.9));
    assert.equal(events.at(-1).type, "done");
    assert.deepEqual(events.at(-1).usage, {
      input_tokens: 400,
      output_tokens: 80,
    });
    assert.ok(!raw.includes("Bearer"));
    assert.ok(calls.every((p) => !p.questions.evil));
  } finally {
    globalThis.fetch = original;
  }
});

test("partial or malformed model output cannot become a finished image", async () => {
  const payload = buildRequest(valid, 0);
  const data = responseFor(payload);
  data.answers.p0.probabilities.red = 5;
  assert.throws(() => parsePixels(data, "classic", 0));
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("private upstream diagnostic", { status: 401 });
  try {
    const raw = await (await worker.fetch(request(valid), env)).text();
    const events = raw.trim().split("\n").map(JSON.parse);
    assert.ok(events.some((e) => e.type === "error"));
    assert.ok(!events.some((e) => e.type === "done"));
    assert.ok(!raw.includes("private upstream"));
  } finally {
    globalThis.fetch = original;
  }
});

test("guided geometry keeps parent-relative details connected", async () => {
  const { buildCompositionRequest, parseComposition, layersAt } = await import(
    "../src/composition.js"
  );
  const payload = buildCompositionRequest(valid);
  assert.equal(Object.keys(payload.questions).length, 65);
  const answers = { background: { choice: "white" } };
  for (const role of [
    "ground",
    "main",
    "upper",
    "accent",
    "left",
    "right",
    "lower",
    "extra",
  ])
    answers[role + "_shape"] = { choice: "none" };
  const set = (id, values) => {
    for (const [key, value] of Object.entries(values))
      answers[id + "_" + key] = { choice: String(value) };
  };
  set("main", {
    shape: "ellipse",
    color: "red",
    x: 8,
    y: 10,
    w: 10,
    h: 10,
    parent: "canvas",
    anchor: "inside_center",
  });
  set("upper", {
    shape: "rectangle",
    color: "brown",
    x: 8,
    y: 2,
    w: 2,
    h: 2,
    parent: "main",
    anchor: "above",
  });
  const layout = parseComposition({ answers }, "classic");
  assert.equal(layout.layers[1].y, 4);
  assert.equal(
    layout.layers[1].y + layout.layers[1].h / 2,
    layout.layers[0].y - layout.layers[0].h / 2,
  );
  assert.equal(layersAt(layout, 7, 3).at(-1).id, "upper");
  assert.match(
    buildRequest(valid, 0, 64, layout).questions.p55.instructions,
    /intended fill brown/,
  );
  answers.upper_parent.choice = "upper";
  assert.throws(() => parseComposition({ answers }, "classic"));
});

test("guided stream obtains composition before sending pixel batches", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const payload = JSON.parse(init.body);
    if (payload.questions.background) {
      const answers = { background: { choice: "white" } };
      for (const role of [
        "ground",
        "main",
        "upper",
        "accent",
        "left",
        "right",
        "lower",
        "extra",
      ])
        answers[role + "_shape"] = { choice: "none" };
      return Response.json({
        answers,
        model: "jev-test",
        usage: { input_tokens: 50, output_tokens: 10 },
      });
    }
    return Response.json(responseFor(payload));
  };
  try {
    const events = (
      await (
        await worker.fetch(request({ ...valid, guided: true }), env)
      ).text()
    )
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(calls, 5);
    assert.ok(
      events.findIndex((e) => e.type === "composition") <
        events.findIndex((e) => e.type === "pixels"),
    );
    assert.equal(events.at(-1).usage.input_tokens, 450);
    assert.equal(events.at(-1).layout.background, "white");
  } finally {
    globalThis.fetch = original;
  }
});
