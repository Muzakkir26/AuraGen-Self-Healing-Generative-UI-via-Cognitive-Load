// Calculates cognitive load score (0 to 100) from user behavior metrics
function calculateScore(mouseSpeed, pauseTime, rageClicks) {
  let score = 0;

  if (mouseSpeed > 100) {
    score = score + 30;
  }

  if (pauseTime > 4) {
    score = score + 40;
  }

  if (rageClicks >= 3) {
    score = score + 30;
  }

  return score;
}

// Validates incoming telemetry data from frontend
function isDataValid(data) {
  if (!data) {
    return { valid: false, error: "No data received" };
  }

  if (typeof data.mouseSpeed !== "number") {
    return { valid: false, error: "mouseSpeed must be a number" };
  }

  if (typeof data.pauseTime !== "number") {
    return { valid: false, error: "pauseTime must be a number" };
  }

  if (typeof data.rageClicks !== "number") {
    return { valid: false, error: "rageClicks must be a number" };
  }

  if (typeof data.fieldName !== "string") {
    return { valid: false, error: "fieldName must be a string" };
  }

  return { valid: true, error: null };
}

module.exports = { calculateScore, isDataValid };
