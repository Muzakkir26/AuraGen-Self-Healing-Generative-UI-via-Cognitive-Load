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
var agentService = require("../ai/agentService");

var router = express.Router();
var cooldown = agentService.cooldown;

router.post("/generate", async function (req, res, next) {
  try {
    var body = req.body || {};
    var fieldId = body.frictionPoint && body.frictionPoint.fieldId;
    if (typeof body.sessionId !== "string" || !body.sessionId || typeof fieldId !== "string" || !fieldId) {
      return res.status(400).json({ success: false, error: "sessionId and frictionPoint.fieldId are required" });
    }

    var key = body.sessionId + "|" + fieldId;
    if (cooldown.check(key, Date.now())) {
      return res.status(429).json({
        success: false,
        error: "A component was generated for this field less than " + cooldown.ms / 1000 + " s ago",
        ui: { type: "ui.fallback", sessionId: body.sessionId, targetFieldId: fieldId, reason: "cooldown" },
      });
    }

    var result = await agentService.getAgent().generate(body);
    if (result.status === "error" && /^bad-request/.test(result.meta.error || "")) {
      cooldown.release(key);
      return res.status(400).json({ success: false, error: result.meta.error });
    }

    console.log("[AI] Field:", fieldId, "| Status:", result.status, "| Attempts:", result.meta.attempts,
      "| Cache:", result.meta.cacheHit, "| Latency:", result.meta.latencyMs + "ms");

    return res.status(200).json({ success: result.status === "ok", result: result, ui: agentService.toUiMessage(body, result) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
