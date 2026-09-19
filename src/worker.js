import { validateInput, buildRequest, parsePixels } from "./pixels.js";
import { buildCompositionRequest, parseComposition } from "./composition.js";
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
    if (Number(request.headers.get("Content-Length")) > 12000)
      return json({ error: "請求過大。" }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "請提供畫面描述。" }, 400);
    let raw = "",
      bytes = 0;
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 12000) {
        await reader.cancel();
        return json({ error: "請求過大。" }, 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    let body;
    try {
      body = JSON.parse(raw);
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
      return json({ error: "操作太頻繁，請稍候一分鐘再試。" }, 429);

    const abort = new AbortController();
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        const send = (data) => {
          if (!cancelled)
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        };
        const started = Date.now();
        const timeout = setTimeout(() => abort.abort(), 45000);
        send({ type: "start", total: 256, batches: 4 });
        const usage = { input_tokens: 0, output_tokens: 0 };
        const models = new Set();
        let completed = 0;
        const tasks = [];
        let failed = false;
        async function query(payload) {
          let response;
          for (let attempt = 0; attempt < 2; attempt++) {
            response = await fetch("https://api.typesafe.ai/v1/systemone", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
              signal: abort.signal,
            });
            if (![429, 529].includes(response.status) || attempt === 1) break;
            await response.body?.cancel();
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
          if (!response.ok)
            throw new Error(
              response.status === 429 || response.status === 529
                ? "busy"
                : "upstream",
            );
          const data = await response.json();
          usage.input_tokens += data.usage?.input_tokens || 0;
          usage.output_tokens += data.usage?.output_tokens || 0;
          models.add(data.model);
          return data;
        }
        async function run() {
          let layout = null;
          if (body.guided !== false) {
            send({ type: "planning" });
            layout = parseComposition(
              await query(buildCompositionRequest(body)),
              body.palette,
            );
            send({ type: "composition", layout });
          }
          for (const offset of [0, 64, 128, 192])
            tasks.push(
              (async () => {
                const data = await query(
                  buildRequest(body, offset, 64, layout),
                );
                const pixels = parsePixels(data, body.palette, offset);
                completed += pixels.length;
                if (!failed)
                  send({ type: "pixels", pixels, completed, total: 256 });
              })(),
            );
          await Promise.all(tasks);
          send({
            type: "done",
            usage,
            models: [...models],
            elapsed_ms: Date.now() - started,
            layout,
          });
        }
        run()
          .catch((error) => {
            failed = true;
            abort.abort();
            send({
              type: "error",
              error:
                error.message === "busy"
                  ? "Jev 目前忙碌，請稍後再試。"
                  : error.message === "invalid_response"
                    ? "部分像素回應不完整，請重新生成。"
                    : error.name === "AbortError"
                      ? "這一輪等候逾時，請再試一次。"
                      : "模型服務暫時無法完成這一輪，請稍後再試。",
            });
          })
          .finally(async () => {
            clearTimeout(timeout);
            await Promise.allSettled(tasks);
            if (!cancelled) controller.close();
          });
      },
      cancel() {
        cancelled = true;
        abort.abort();
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
