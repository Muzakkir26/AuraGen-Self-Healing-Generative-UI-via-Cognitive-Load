// Calculates cognitive load score (0 to 100) from user behavior metrics


function calculateScore(mouseSpeed, pauseTime, rageClicks) {
  let speedComponent = 0;

  if (mouseSpeed >= 350) {
    speedComponent = 15;
  } else if (mouseSpeed >= 100) {
    speedComponent = 10;
  } else if (mouseSpeed >= 20) {
    speedComponent = 5;
  }

  const pauseComponent = Math.min(
    35,
    Math.floor(Math.max(0, pauseTime)) * 7
  );

  const rageComponent = Math.min(
    40,
    Math.max(0, rageClicks) * 10
  );

  return Math.min(
    100,
    Math.max(0, speedComponent + pauseComponent + rageComponent)
  );
}

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

module.exports = {
  calculateScore,
  isDataValid
};
