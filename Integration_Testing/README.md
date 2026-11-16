# Member-04: Real Application Integration Testing

These tests import actual Member-01 and Member-03 source files. They are not mock implementations.

## Required integrated repository layout

The integrated project root must contain these paths:

```text
integrated-AuraGen/
  ai/validator/astValidator.js
  server/telemetryService.js
  server/schemas/requestSchema.js
  Member-04/Integration_Testing/test_real_modules.test.js
```

If the team repository uses different folder names, adjust `AURAGEN_ROOT` or the paths in the test file.

## Windows PowerShell

Run from the integrated repository root:

```powershell
$env:AURAGEN_ROOT = (Get-Location).Path

# Install Member-01 AI validator dependencies if they are not installed:
npm --prefix ai install

# Install backend dependencies if the schema test should run:
npm install

# Execute real cross-team tests:
node --test Member-04/Integration_Testing/test_real_modules.test.js
```

If your Member-04 folder has a different name, update the test path accordingly.

## What the tests verify

- Member-03 actual telemetry scoring against the documented score of 85.
- Member-03 actual backend validation of negative and fractional values.
- Member-01 actual Babel AST validator accepts a safe component.
- Member-01 actual Babel AST validator rejects browser/network globals such as `fetch`.
- Member-03 Zod schema rejects invalid telemetry values.

## Important findings from the uploaded source files

The uploaded Member-03 `server/telemetryService.js` currently computes the example
(120, 5, 4) as 100 using threshold points (30 + 40 + 30). The uploaded
`src/lib/scoring.ts` documentation and Member-04 contract test expect 85.
These are two different scoring rules. The integration test intentionally expects
85 so it exposes the mismatch instead of silently accepting it.

Also, `server/telemetryService.js` currently checks telemetry field types but does
not reject negative numbers or fractional `rageClicks`. The uploaded
`server/schemas/requestSchema.js` does reject those cases, but
`server/routes/healRoute.js` currently calls `isDataValid` from
`telemetryService.js`, not `validateTelemetryRequest` from the Zod schema.
The integration tests intentionally expose that validation gap.

A failing result here is a real finding to share with Member-03, not proof that
Member-04's test is broken. Do not report these tests as passed until the backend
contract and implementation are aligned.

## Reporting

Record the command output and date in Member-04 `Test_Logs/`. Keep mock/unit
tests labelled separately from real integration tests.
