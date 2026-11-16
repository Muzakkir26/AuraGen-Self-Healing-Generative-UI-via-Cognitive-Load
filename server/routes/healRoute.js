var { calculateScore, isDataValid } = require("../telemetryService");
var express = require("express");
var router = express.Router();

// POST /api/telemetry - receives user confusion data from frontend
router.post("/telemetry", function (req, res) {
  var data = req.body;

  // Validate incoming data
  var check = isDataValid(data);
  if (check.valid === false) {
    return res.status(400).json({
      success: false,
      error: check.error
    });
  }

  // Calculate frustration score
  var score = calculateScore(data.mouseSpeed, data.pauseTime, data.rageClicks);
  var isConfused = score >= 70;

  console.log("[API] Field:", data.fieldName, "| Score:", score, "| Trigger AI:", isConfused);

  // Send response back to frontend
  return res.status(200).json({
    success: true,
    score: score,
    triggerAI: isConfused,
    stuckField: data.fieldName,
    savedValue: data.userInput || ""
  });
});

module.exports = router;
