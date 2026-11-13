// server/routes/healRoute.js
// Member 3 (Backend) - Day 5
// Purpose: The main API endpoint that frontend calls when user is frustrated

// Import our functions from Day 3 and Day 4
const { calculateScore, isDataValid } = require("../telemetryService");

// Import express Router to create a route
const express = require("express");
const router = express.Router();

// POST /api/heal-ui
// This is the door where frontend sends user confusion data
router.post("/heal-ui", function (req, res) {

  // Step 1: Get the data sent by frontend
  var data = req.body;

  // Step 2: Validate it using our Day 4 safety checker
  var check = isDataValid(data);

  if (check.valid === false) {
    // Bad data! Send back error with status 400 (Bad Request)
    return res.status(400).json({
      success: false,
      error: check.error
    });
  }

  // Step 3: Data is good! Calculate the frustration score (Day 3)
  var score = calculateScore(data.mouseSpeed, data.pauseTime, data.rageClicks);

  // Step 4: Check if score is high enough to trigger AI
  var isConfused = score >= 70;

  // Step 5: Log it (no secrets in logs!)
  console.log("[API] Field:", data.fieldName, "| Score:", score, "| Trigger AI:", isConfused);

  // Step 6: Send back clean response to frontend
  return res.status(200).json({
    success: true,
    score: score,
    triggerAI: isConfused,
    stuckField: data.fieldName,
    savedValue: data.userInput || ""
  });
});

module.exports = router;