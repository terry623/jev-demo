import {
  validateInput,
  buildPlan,
  parsePlan,
  rasterize,
  buildRefinement,
  parseRefinement,
} from "./art.js";
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname !== "/api/pixels")
      return json({ error: "找不到此 API。" }, 404);
    if (request.method !== "POST") return json({ error: "請使用 POST。" }, 405);
    if (
      request.headers.get("Origin") &&
      request.headers.get("Origin") !== url.origin
    )
      return json({ error: "不接受跨網站請求。" }, 403);
    if (!env.TYPESAFE_API_KEY)
      return json({ error: "尚未設定模型服務金鑰。" }, 503);
    let body;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "請提供畫面描述。" }, 400);
      let raw = "",
        bytes = 0;
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 5000) {
          await reader.cancel();
          return json({ error: "描述過長。" }, 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
      body = JSON.parse(raw + decoder.decode());
    } catch {
      return json({ error: "無效的 JSON。" }, 400);
    }
    const invalid = validateInput(body);
    if (invalid) return json({ error: invalid }, 400);
    if (
      env.RATE_LIMITER &&
      !(
        await env.RATE_LIMITER.limit({
          key: request.headers.get("CF-Connecting-IP") || "local",
        })
      ).success
    )
      return json({ error: "畫得有點快，請稍等一分鐘再繼續。" }, 429);
    const abort = new AbortController();
    let cancelled = false;
    const onAbort = () => {
      cancelled = true;
      abort.abort();
    };
    request.signal.addEventListener("abort", onAbort, { once: true });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const started = Date.now(),
          usage = { input_tokens: 0, output_tokens: 0 },
          models = new Set();
        let retries = 0,
          completed = 0,
          failed = false;
        const timer = setTimeout(() => abort.abort(), 90000);
        const send = (data) => {
          if (!cancelled)
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        };
        async function query(payload) {
          for (let attempt = 0; ; attempt++) {
            const response = await fetch(
              "https://api.typesafe.ai/v1/systemone",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                signal: abort.signal,
              },
            );
            if (
              [429, 529].includes(response.status) &&
              attempt < 2 &&
              retries < 4
            ) {
              retries++;
              await response.body?.cancel();
              send({ type: "waiting" });
              await new Promise((resolve, reject) => {
                const listener = () => {
                  clearTimeout(t);
                  reject(new Error("aborted"));
                };
                const t = setTimeout(
                  () => {
                    abort.signal.removeEventListener("abort", listener);
                    resolve();
                  },
                  1000 * 2 ** attempt,
                );
                if (abort.signal.aborted) {
                  clearTimeout(t);
                  reject(new Error("aborted"));
                } else
                  abort.signal.addEventListener("abort", listener, {
                    once: true,
                  });
              });
              continue;
            }
            if (!response.ok) {
              await response.body?.cancel();
              throw Error(
                [429, 529].includes(response.status) ? "busy" : "upstream",
              );
            }
            const data = await response.json();
            usage.input_tokens += data.usage?.input_tokens || 0;
            usage.output_tokens += data.usage?.output_tokens || 0;
            models.add(data.model);
            return data;
          }
        }
        async function run() {
          send({ type: "planning", phase: 1 });
          const basePayload = buildPlan(body);
          const base = parsePlan(await query(basePayload), basePayload);
          const preview = rasterize(base, body.palette, body.size);
          send({
            type: "preview",
            pixels: preview.pixels,
            size: body.size,
            phase: 1,
          });
          send({ type: "planning", phase: 2 });
          const detailPayload = buildPlan(body, base);
          const layout = parsePlan(
            await query(detailPayload),
            detailPayload,
            base,
          );
          const raster = rasterize(layout, body.palette, body.size);
          send({
            type: "preview",
            pixels: raster.pixels,
            size: body.size,
            phase: 2,
            total: raster.active.length,
            layers: layout.layers.length,
            layout,
          });
          const jobs = [];
          for (let i = 0; i < raster.active.length; i += 128)
            jobs.push(raster.active.slice(i, i + 128));
          let cursor = 0;
          await Promise.all(
            Array.from({ length: Math.min(4, jobs.length) }, async () => {
              while (cursor < jobs.length && !abort.signal.aborted && !failed) {
                const indices = jobs[cursor++];
                try {
                  const payload = buildRefinement(
                    body,
                    layout,
                    raster,
                    indices,
                  );
                  const pixels = parseRefinement(
                    await query(payload),
                    payload,
                    raster,
                    indices,
                  );
                  if (failed || abort.signal.aborted) return;
                  completed += pixels.length;
                  send({
                    type: "pixels",
                    pixels,
                    completed,
                    total: raster.active.length,
                  });
                } catch (e) {
                  failed = true;
                  abort.abort();
                  throw e;
                }
              }
            }),
          );
          if (abort.signal.aborted) throw Error("aborted");
          send({
            type: "done",
            usage,
            models: [...models],
            elapsed_ms: Date.now() - started,
            layers: layout.layers.length,
            refined: completed,
            total_pixels: body.size ** 2,
          });
        }
        run()
          .catch((error) => {
            abort.abort();
            send({
              type: "error",
              error:
                error.message === "busy"
                  ? "Jev 目前忙碌。已保留畫面，稍後可重畫。"
                  : Date.now() - started >= 89000
                    ? "細化等候逾時，已保留目前畫面，請再試一次。"
                    : "這次沒有完整畫完，已保留目前畫面，請稍後重試。",
            });
          })
          .finally(() => {
            clearTimeout(timer);
            request.signal.removeEventListener("abort", onAbort);
            if (!cancelled) {
              cancelled = true;
              controller.close();
            }
          });
      },
      cancel() {
        onAbort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
