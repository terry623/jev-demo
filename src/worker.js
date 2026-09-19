import {
  validateWorld,
  resolveTurn,
  applyIntervention,
} from "../public/world.js";
import {
  buildDecisions,
  buildIntervention,
  parseDecisions,
  parseIntervention,
} from "./decisions.js";
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
    if (!["/api/step", "/api/intervene"].includes(url.pathname))
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
      if (!reader) return json({ error: "缺少世界狀態。" }, 400);
      let bytes = 0,
        raw = "";
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 96000) {
          await reader.cancel();
          return json({ error: "請求過大。" }, 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
      body = JSON.parse(raw);
    } catch {
      return json({ error: "無效的 JSON。" }, 400);
    }
    if (!validateWorld(body?.world))
      return json({ error: "世界狀態無效，請重新開島。" }, 400);
    const intervention = url.pathname === "/api/intervene";
    if (
      intervention &&
      (typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 400)
    )
      return json({ error: "請輸入 1 至 400 字的干預。" }, 400);
    if (
      env.RATE_LIMITER &&
      !(
        await env.RATE_LIMITER.limit({
          key: request.headers.get("CF-Connecting-IP") || "local",
        })
      ).success
    )
      return json({ error: "島民需要喘口氣，請一分鐘後再試。" }, 429);
    const started = Date.now();
    try {
      const payload = intervention
        ? buildIntervention(body.world, body.text.trim())
        : buildDecisions(body.world);
      const response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(40000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return json(
          {
            error: [429, 529].includes(response.status)
              ? "Jev 目前忙碌，請稍後再試。"
              : "模型服務暫時無法回應，世界尚未變動。",
          },
          502,
        );
      }
      const data = await response.json();
      const meta = {
        model: data.model,
        elapsed: Date.now() - started,
        usage: data.usage,
      };
      if (intervention)
        return json({
          ...applyIntervention(
            body.world,
            body.text.trim(),
            parseIntervention(data),
          ),
          meta,
        });
      return json({
        world: resolveTurn(body.world, parseDecisions(data, payload), meta),
        meta,
      });
    } catch (e) {
      return json(
        {
          error:
            e.name === "TimeoutError"
              ? "這一輪等候逾時，世界尚未變動，請重試。"
              : "模型回應不完整，世界尚未變動，請重試。",
        },
        502,
      );
    }
  },
};
