// POST /api/heal-ui: the end-to-end trigger.
//
// The frontend sends one telemetry payload for the field the user is on. The backend scores it
// (telemetryService) and, when the score reaches the threshold, asks the Code-Gen Agent for a
// wizard for that field in the same request. The reply keeps the /api/telemetry fields and adds
// `ui`: a ui.generated message the renderer can mount, or a ui.fallback message.
//
// Body:  { mouseSpeed, pauseTime, rageClicks, fieldName, userInput?, sessionId? }
// Reply: { success, score, triggerAI, stuckField, savedValue, ui, generation }
//
// The telemetry fields are checked with the same zod schemas as /api/telemetry
// (server/schemas), so both routes accept and return the same shapes.

var express = require("express");
var telemetry = require("../telemetryService");
var { validateTelemetryRequest } = require("../schemas/requestSchema");
var { validateTelemetryResponse } = require("../schemas/responseSchema");
var agentService = require("../ai/agentService");
var financialForm = require("../forms/financialForm");

var router = express.Router();

function threshold() {
  return Number(process.env.LOAD_HIGH_THRESHOLD || 70);
}

router.post("/heal-ui", async function (req, res, next) {
  try {
    var body = req.body || {};
    var check = validateTelemetryRequest(body);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }
    var data = check.data;

    var score = telemetry.calculateScore(data.mouseSpeed, data.pauseTime, data.rageClicks);
    var triggerAI = score >= threshold();
    // The zod schema drops unknown keys, so the optional sessionId is read from the raw body.
    var sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId : "anonymous";

    var base = validateTelemetryResponse({
      success: true,
      score: score,
      triggerAI: triggerAI,
      stuckField: data.fieldName,
      savedValue: data.userInput,
    });
    if (!base.valid) {
      return res.status(500).json({ success: false, error: "Internal validation failure: " + base.error });
    }
    var reply = Object.assign({}, base.data, { ui: null, generation: null });

    if (!triggerAI) return res.status(200).json(reply);

    var request = financialForm.toGenerationRequest(data, sessionId);
    if (!request) {
      reply.ui = { type: "ui.fallback", sessionId: sessionId, targetFieldId: data.fieldName, reason: "unknown-field" };
      return res.status(200).json(reply);
    }

    var key = sessionId + "|" + request.frictionPoint.fieldId;
    if (agentService.cooldown.check(key, Date.now())) {
      reply.ui = { type: "ui.fallback", sessionId: sessionId, targetFieldId: request.frictionPoint.fieldId, reason: "cooldown" };
      return res.status(200).json(reply);
    }

    var result = await agentService.getAgent().generate(request);
    // A failed generation shouldn't block a retry for the next 30 s.
    if (result.status !== "ok") agentService.cooldown.release(key);

    console.log("[Heal UI] Field:", data.fieldName, "| Score:", score, "| Status:", result.status,
      "| Cache:", result.meta.cacheHit, "| Latency:", result.meta.latencyMs + "ms");

    reply.ui = agentService.toUiMessage(request, result);
    reply.generation = {
      status: result.status,
      componentName: result.componentName,
      violations: result.validation ? result.validation.violations : [],
      meta: result.meta,
    };
    return res.status(200).json(reply);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
