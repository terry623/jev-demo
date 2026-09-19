import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";
import {
  createWorld,
  validateWorld,
  availableActions,
  resolveTurn,
  applyIntervention,
  PEOPLE,
} from "../public/world.js";
import {
  buildDecisions,
  parseDecisions,
  buildIntervention,
  parseIntervention,
  INTERVENTIONS,
} from "../src/decisions.js";
const targets = (id) => PEOPLE.find((p) => p.id !== id).id;
function choices(w, actions = {}) {
  return Object.fromEntries(
    w.people.map((p) => [
      p.id,
      {
        action: actions[p.id] || "rest",
        target: targets(p.id),
        confidence: 1,
        probabilities: { [actions[p.id] || "rest"]: 1 },
      },
    ]),
  );
}
function mockAnswer(criteria, choice = Object.keys(criteria)[0]) {
  return {
    type: "choice",
    choice,
    confidence: 1,
    probabilities: Object.fromEntries(
      Object.keys(criteria).map((k) => [k, k === choice ? 1 : 0]),
    ),
  };
}
function intervention(overrides) {
  return {
    ...Object.fromEntries(
      Object.entries(INTERVENTIONS).map(([k, c]) => [k, Object.keys(c)[0]]),
    ),
    ...overrides,
  };
}
test("world validation rejects malformed identities, resources and memory", () => {
  const w = createWorld();
  assert.ok(validateWorld(w));
  w.people[0].food = -1;
  assert.equal(validateWorld(w), false);
  w.people[0].food = 0;
  w.people[1].id = "momo";
  assert.equal(validateWorld(w), false);
  assert.equal(validateWorld(null), false);
});
test("party scarcity removes all hidden food and broadcasts a shared memory", () => {
  const w = createWorld();
  w.objects = [{ type: "food", name: "補給", charges: 4 }];
  const { world, effects } = applyIntervention(
    w,
    "今晚派對，只剩兩份食物",
    intervention({ food: "two", party: "on" }),
  );
  assert.equal(world.sharedFood, 2);
  assert.equal(world.forestFood, 0);
  assert.equal(
    world.people.reduce((a, p) => a + p.food, 0),
    0,
  );
  assert.equal(world.objects[0].charges, 0);
  assert.ok(world.party);
  assert.ok(effects.length === 2);
  assert.ok(world.people.every((p) => p.memory.length === 1));
  assert.equal(w.sharedFood, 8);
});
test("simultaneous hungry residents compete without creating negative food; priority rotates", () => {
  let w = createWorld();
  w.people.forEach((p) => (p.food = 0));
  w.sharedFood = 2;
  const a = Object.fromEntries(w.people.map((p) => [p.id, "eat"]));
  const result = resolveTurn(w, choices(w, a));
  assert.equal(result.sharedFood, 0);
  assert.equal(
    result.people.filter((p) => p.last.result.includes("吃下一份")).length,
    2,
  );
  assert.equal(
    result.people.filter((p) => p.last.result.includes("已被拿完")).length,
    6,
  );
  assert.equal(result.people[0].hunger, 11);
  w.tick = 1;
  const next = resolveTurn(w, choices(w, a));
  assert.match(next.people[0].last.result, /已被拿完/);
  assert.match(next.people[2].last.result, /吃下一份/);
  assert.ok(validateWorld(result));
});
test("sharing consumes one food and creates a target memory; asking does not steal food", () => {
  const w = createWorld();
  const d = choices(w, { sea: "share", sun: "ask" });
  d.sea.target = "bean";
  d.sun.target = "wood";
  const result = resolveTurn(w, d);
  assert.equal(result.people[3].food, 1);
  assert.equal(result.people[2].hunger, w.people[2].hunger - 35 + 7);
  assert.ok(result.people[2].memory.some((m) => m.text.includes("海海")));
  assert.ok(result.people[1].memory.some((m) => m.text.includes("小晴")));
  assert.equal(result.sharedFood, w.sharedFood);
});
test("two repairs restore power; engineer repairs in one action", () => {
  const w = createWorld();
  w.power = false;
  assert.equal(resolveTurn(w, choices(w, { wood: "repair" })).power, false);
  assert.equal(
    resolveTurn(w, choices(w, { wood: "repair", sun: "repair" })).power,
    true,
  );
  assert.equal(resolveTurn(w, choices(w, { spark: "repair" })).power, true);
});
test("rain costs energy and shelter works; forest regenerates every three turns", () => {
  const w = createWorld();
  w.weather = "rain";
  w.tick = 2;
  const out = resolveTurn(w, choices(w, { wood: "forage" }));
  assert.equal(out.people[1].energy, w.people[1].energy - 20);
  assert.equal(out.forestFood, w.forestFood - 1 + 4);
  assert.equal(out.people[5].energy, 74);
  assert.equal(w.people[1].energy, 85);
});
test("rules exclude forbidden actions and model probabilities must be complete", () => {
  const w = createWorld();
  w.policy = "nohoard";
  assert.ok(!availableActions(w, w.people[0]).includes("hoard"));
  const payload = buildDecisions(w);
  const data = {
    answers: Object.fromEntries(
      Object.entries(payload.questions).map(([k, q]) => [
        k,
        mockAnswer(q.criteria),
      ]),
    ),
  };
  assert.equal(Object.keys(parseDecisions(data, payload)).length, 8);
  delete data.answers.momo.probabilities.rest;
  assert.throws(() => parseDecisions(data, payload), /invalid_response/);
});
test("objects provide bounded consumable effects and memories stay bounded", () => {
  let w = createWorld();
  w.power = false;
  w.objects = [{ type: "generator", name: "備用發電機", charges: 1 }];
  w = resolveTurn(w, choices(w, { pepper: "explore" }));
  assert.ok(w.power);
  assert.equal(w.objects[0].charges, 0);
  for (let i = 0; i < 10; i++) w = resolveTurn(w, choices(w));
  assert.ok(w.people.every((p) => p.memory.length <= 6));
  assert.ok(w.events.length <= 70);
  assert.ok(validateWorld(w));
});
test("API rejects old routes, bad state and cross-origin calls before inference", async () => {
  const env = { TYPESAFE_API_KEY: "test" };
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/pixels", { method: "POST" }),
        env,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/step", { method: "GET" }),
        env,
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/step", {
          method: "POST",
          headers: { Origin: "https://evil.test" },
        }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/api/step", { method: "POST", body: "{}" }),
        env,
      )
    ).status,
    400,
  );
});
test("API composes real shaped provider answers into world outcomes", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_, opts) => {
    const payload = JSON.parse(opts.body);
    return Response.json({
      model: "jev-test",
      answers: Object.fromEntries(
        Object.entries(payload.questions).map(([k, q]) => [
          k,
          mockAnswer(
            q.criteria,
            Object.hasOwn(q.criteria, "rest") ? "rest" : undefined,
          ),
        ]),
      ),
    });
  };
  try {
    const response = await worker.fetch(
      new Request("https://test/api/step", {
        method: "POST",
        body: JSON.stringify({ world: createWorld() }),
      }),
      { TYPESAFE_API_KEY: "server-only" },
    );
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.world.tick, 1);
    assert.ok(data.world.people.every((p) => p.last.action === "rest"));
    assert.equal(JSON.stringify(data).includes("server-only"), false);
  } finally {
    globalThis.fetch = original;
  }
});
test("interventions use independent preserved dimensions and reject missing responses", () => {
  const payload = buildIntervention(createWorld(), "下雨");
  assert.equal(Object.keys(payload.questions).length, 6);
  const data = {
    answers: Object.fromEntries(
      Object.entries(INTERVENTIONS).map(([k, c]) => [k, mockAnswer(c)]),
    ),
  };
  assert.equal(parseIntervention(data).weather, "keep");
  delete data.answers.food;
  assert.throws(() => parseIntervention(data), /invalid_response/);
});

test("maximum-length announcements remain valid and quiet policy removes noisy party", () => {
  const { world } = applyIntervention(
    createWorld(),
    "島".repeat(400),
    intervention({ policy: "custom" }),
  );
  assert.ok(validateWorld(world));
  world.party = true;
  world.policy = "quiet";
  assert.ok(!availableActions(world, world.people[0]).includes("party"));
  assert.ok(availableActions(world, world.people[0]).includes("chat"));
});
test("rate limiting and upstream failures do not produce a changed world", async () => {
  const req = () =>
    new Request("https://test/api/step", {
      method: "POST",
      body: JSON.stringify({ world: createWorld() }),
    });
  const limited = await worker.fetch(req(), {
    TYPESAFE_API_KEY: "test",
    RATE_LIMITER: { limit: async () => ({ success: false }) },
  });
  assert.equal(limited.status, 429);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("busy", { status: 529 });
  try {
    const response = await worker.fetch(req(), { TYPESAFE_API_KEY: "test" });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).world, undefined);
  } finally {
    globalThis.fetch = original;
  }
});
