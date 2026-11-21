const express = require("express");
const router = express.Router();
const { calculateScore } = require("../telemetryService");
const { validateTelemetryRequest } = require("../schemas/requestSchema");
const { validateTelemetryResponse } = require("../schemas/responseSchema");

// POST /api/telemetry - receives user confusion data and evaluates AI trigger
router.post("/telemetry", function (req, res) {
  // 1. Validate incoming request payload using Zod schema
  const requestValidation = validateTelemetryRequest(req.body);
  if (!requestValidation.valid) {
    return res.status(400).json({
      success: false,
      error: requestValidation.error
    });
  }

  const data = requestValidation.data;

  // 2. Calculate cognitive friction score from verified telemetry
  const score = calculateScore(data.mouseSpeed, data.pauseTime, data.rageClicks);
  const isConfused = score >= 70;

  console.log(`[API] Field: "${data.fieldName}" | Score: ${score} | Trigger AI: ${isConfused}`);

  // 3. Assemble response payload
  const rawResponse = {
    success: true,
    score: score,
    triggerAI: isConfused,
    stuckField: data.fieldName,
    savedValue: data.userInput || ""
  };

  // 4. Validate outgoing response before sending to frontend
  const responseValidation = validateTelemetryResponse(rawResponse);
  if (!responseValidation.valid) {
    return res.status(500).json({
      success: false,
      error: `Internal validation failure: ${responseValidation.error}`
    });
  }

  // 5. Return verified response to client
  return res.status(200).json(responseValidation.data);
});

module.exports = router;
