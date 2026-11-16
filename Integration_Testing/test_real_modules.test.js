/**
 * Real cross-team integration tests.
 *
 * Run from the integrated repository root:
 *   set AURAGEN_ROOT=C:\path\to\integrated-AuraGen
 *   node --test Member-04/Integration_Testing/test_real_modules.test.js
 *
 * AURAGEN_ROOT must contain server/, ai/, and src/ from the integrated project.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const root = process.env.AURAGEN_ROOT
  ? path.resolve(process.env.AURAGEN_ROOT)
  : process.cwd();

function loadRequired(relativePath) {
  const fullPath = path.join(root, relativePath);
  assert.ok(fs.existsSync(fullPath), `Missing actual application file: ${fullPath}`);
  return require(fullPath);
}

test("M-03 real backend: contract example matches documented score 85", () => {
  const { calculateScore } = loadRequired("server/telemetryService.js");
  const actual = calculateScore(120, 5, 4);
  assert.equal(
    actual,
    85,
    `Backend returned ${actual}, but the shared frontend/backend contract documents 85.`
  );
});

test("M-03 real backend: rejects negative telemetry values", () => {
  const { isDataValid } = loadRequired("server/telemetryService.js");
  const result = isDataValid({
    mouseSpeed: -1,
    pauseTime: 5,
    rageClicks: 4,
    fieldName: "annual_income",
    userInput: "50000",
  });
  assert.equal(result.valid, false, "Negative mouseSpeed must be rejected.");
});

test("M-03 real backend: rejects fractional rageClicks", () => {
  const { isDataValid } = loadRequired("server/telemetryService.js");
  const result = isDataValid({
    mouseSpeed: 120,
    pauseTime: 5,
    rageClicks: 1.5,
    fieldName: "annual_income",
    userInput: "50000",
  });
  assert.equal(result.valid, false, "rageClicks must be a non-negative integer.");
});

test("M-01 real AI validator: accepts a simple approved component", () => {
  const { validate } = loadRequired("ai/validator/astValidator.js");
  const source = `
    export default function SafeCard({ values, onChange }) {
      return <div><p>Welcome to AuraGen</p></div>;
    }
  `;
  const result = validate(source);
  assert.equal(result.passed, true, JSON.stringify(result.violations));
});

test("M-01 real AI validator: rejects access to browser/network globals", () => {
  const { validate } = loadRequired("ai/validator/astValidator.js");
  const source = `
    export default function UnsafeCard({ values }) {
      const result = fetch("https://example.invalid");
      return <div>{result}</div>;
    }
  `;
  const result = validate(source);
  assert.equal(result.passed, false, "Generated code using fetch must be rejected.");
  assert.ok(
    result.violations.some((item) => item.rule === "banned-identifier"),
    "Expected banned-identifier violation for fetch."
  );
});

test("M-03 schema: Zod contract rejects negative values and fractional rageClicks", (t) => {
  let schemaModule;
  try {
    schemaModule = loadRequired("server/schemas/requestSchema.js");
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      t.skip("Install backend dependencies before running the Zod schema integration test.");
      return;
    }
    throw error;
  }
  const { validateTelemetryRequest } = schemaModule;
  const negative = validateTelemetryRequest({
    mouseSpeed: -1, pauseTime: 5, rageClicks: 4,
    fieldName: "annual_income", userInput: "50000"
  });
  const fractional = validateTelemetryRequest({
    mouseSpeed: 120, pauseTime: 5, rageClicks: 1.5,
    fieldName: "annual_income", userInput: "50000"
  });
  assert.equal(negative.valid, false);
  assert.equal(fractional.valid, false);
});
