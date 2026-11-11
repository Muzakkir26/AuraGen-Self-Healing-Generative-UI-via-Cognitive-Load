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