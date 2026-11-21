const { z } = require("zod");

// Validates outgoing telemetry response payload sent to frontend
const telemetryResponseSchema = z.object({
  success: z.boolean(),
  score: z.number().min(0, "Score cannot be negative").max(100, "Score cannot exceed 100"),
  triggerAI: z.boolean(),
  stuckField: z.string(),
  savedValue: z.string().optional().default(""),
  error: z.string().optional()
});

// Validates structured UI healing specification when AI assistance triggers
const uiHealingSchema = z.object({
  viewMode: z.enum(["standard", "wizard", "conversational"]).default("wizard"),
  stepTitle: z.string().min(1, "Step title is required"),
  suggestedInputType: z.string().default("text"),
  preservedData: z.record(z.any()).optional().default({})
});

// Returns standardized validation result for outgoing response
function validateTelemetryResponse(data) {
  const result = telemetryResponseSchema.safeParse(data);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const fieldPath = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "response";
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
  telemetryResponseSchema,
  uiHealingSchema,
  validateTelemetryResponse
};
