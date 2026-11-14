// server/telemetryService.js
// Purpose: Calculate Cognitive Load Score from user behavior

/**
 * Calculates a score from 0 to 100 based on friction metrics.
 * 
 * Rules:
 * 1. High mouse velocity (erratic movement)  -> +30 points
 * 2. Pausing/hesitating for more than 4 sec   -> +40 points
 * 3. 3 or more rage clicks on same area       -> +30 points
 */
function calculateScore(mouseSpeed, pauseTime, rageClicks) {
  let score = 0;

  // Check erratic mouse movement
  if (mouseSpeed > 100) {
    score = score + 30;
  }

  // Check hesitation time
  if (pauseTime > 4) {
    score = score + 40;
  }

  // Check repeated frustrated clicking
  if (rageClicks >= 3) {
    score = score + 30;
  }

  return score;
}

// Export so other files can use it
module.exports = { calculateScore };


// --- FUNCTION 2: Validate Data (Day 4) ---
// Checks if the data sent by frontend is correct and complete
// Returns an object: { valid: true/false, error: "reason" }
function isDataValid(data) {

  // Check 1: Did we receive anything at all?
  if (!data) {
    return { valid: false, error: "No data received" };
  }

  // Check 2: Is mouseSpeed present and is it a number?
  if (typeof data.mouseSpeed !== "number") {
    return { valid: false, error: "mouseSpeed must be a number" };
  }

  // Check 3: Is pauseTime present and is it a number?
  if (typeof data.pauseTime !== "number") {
    return { valid: false, error: "pauseTime must be a number" };
  }

  // Check 4: Is rageClicks present and is it a number?
  if (typeof data.rageClicks !== "number") {
    return { valid: false, error: "rageClicks must be a number" };
  }

  // Check 5: Is fieldName present and is it a text string?
  if (typeof data.fieldName !== "string") {
    return { valid: false, error: "fieldName must be a string" };
  }

  // All checks passed!
  return { valid: true, error: null };
}

// Export both functions
module.exports = { calculateScore, isDataValid };