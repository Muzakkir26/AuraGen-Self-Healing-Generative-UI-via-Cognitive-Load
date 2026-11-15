// POST /api/generate: the AI layer's entry point for the backend (Member-01).
//
// Body: a generation request (docs/contracts.md §3).
// Reply: { result, ui }
//   result: the generation result (§4): status ok | rejected | error, compiled code, validation, meta
//   ui:     the push message for the browser (§5): ui.generated or ui.fallback
//
// When the telemetry score crosses the threshold, call this with the stuck field and the form schema.
// Without OPENAI_API_KEY it runs the mock LLM, so the full flow can be demoed with no key.

var express = require("express");
var ai = require("../../ai");

var router = express.Router();
var COOLDOWN_MS = Number(process.env.GENERATION_COOLDOWN_MS || 30000);

// Created on first use so a config error (e.g. provider=openai with no key) shows up in the response, not at boot.
var agent = null;
function getAgent() {
  if (!agent) {
    agent = ai.createAgentFromEnv(process.env);
    console.log("[AI] Code-Gen Agent ready. Provider:", agent.provider, "| Model:", agent.modelName);
  }
  return agent;
}

// At most one generation per session + field every COOLDOWN_MS (contracts §2 trigger rule).
var lastGeneration = new Map();
function onCooldown(key, now) {
  var last = lastGeneration.get(key);
  if (last !== undefined && now - last < COOLDOWN_MS) return true;
  lastGeneration.set(key, now);
  if (lastGeneration.size > 5000) {
    lastGeneration.forEach(function (t, k) { if (now - t >= COOLDOWN_MS) lastGeneration.delete(k); });
  }
  return false;
}

router.post("/generate", async function (req, res, next) {
  try {
    var body = req.body || {};
    var fieldId = body.frictionPoint && body.frictionPoint.fieldId;
    if (typeof body.sessionId !== "string" || !body.sessionId || typeof fieldId !== "string" || !fieldId) {
      return res.status(400).json({ success: false, error: "sessionId and frictionPoint.fieldId are required" });
    }

    var key = body.sessionId + "|" + fieldId;
    if (onCooldown(key, Date.now())) {
      return res.status(429).json({
        success: false,
        error: "A component was generated for this field less than " + COOLDOWN_MS / 1000 + " s ago",
        ui: { type: "ui.fallback", sessionId: body.sessionId, targetFieldId: fieldId, reason: "cooldown" },
      });
    }

    var result = await getAgent().generate(body);
    if (result.status === "error" && /^bad-request/.test(result.meta.error || "")) {
      lastGeneration.delete(key);
      return res.status(400).json({ success: false, error: result.meta.error });
    }

    console.log("[AI] Field:", fieldId, "| Status:", result.status, "| Attempts:", result.meta.attempts,
      "| Cache:", result.meta.cacheHit, "| Latency:", result.meta.latencyMs + "ms");

    return res.status(200).json({ success: result.status === "ok", result: result, ui: ai.toUiMessage(body, result) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
