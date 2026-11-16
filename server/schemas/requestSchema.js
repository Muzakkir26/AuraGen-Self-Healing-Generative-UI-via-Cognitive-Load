const { z } = require("zod");

// Validates incoming telemetry payload from frontend
const telemetryRequestSchema = z.object({
  mouseSpeed: z.number().min(0, "mouseSpeed must be a non-negative number"),
  pauseTime: z.number().min(0, "pauseTime must be a non-negative number"),
  rageClicks: z.number().int().min(0, "rageClicks must be a non-negative integer"),
  fieldName: z.string().min(1, "fieldName must be a non-empty string"),
  userInput: z.string().optional().default("")
});

// Returns standardized validation result
function validateTelemetryRequest(data) {
  const result = telemetryRequestSchema.safeParse(data);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const fieldPath = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "payload";
    return {
      valid: false,
      error: `${fieldPath}: ${firstIssue.message}`
    };
  }

  return {
    valid: true,
    data: result.data
  };
}

module.exports = {
  telemetryRequestSchema,
  validateTelemetryRequest
};
