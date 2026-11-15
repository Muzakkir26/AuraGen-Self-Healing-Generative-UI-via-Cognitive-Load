# Branch record: `Member-02` (Frontend/UI)

**In one line:** built the web app the user sees. That covers the complex financial form, the hook that watches how the user moves and clicks, and a live display of the cognitive load score.

## What was built, in plain words

| Piece | What it does | File |
|---|---|---|
| Next.js + Tailwind app | The website itself | `src/app/*`, config files |
| Complex financial form | The deliberately hard "before" form users struggle with | `src/components/portal/ComplexFinancialForm.tsx` |
| Portal header | Branded header | `src/components/portal/InfotactHeader.tsx` |
| UI kit | Badge, Button, Card, Input, ProgressBar | `src/components/ui/*` |
| **Telemetry hook** | Measures mouse speed, how long the user pauses on a field, and rage clicks. Streams them over WebSocket and falls back to HTTP if the connection drops. Values decay back to 0 when the user calms down | `src/hooks/useCognitiveTelemetry.ts` |
| Telemetry HUD | On-screen panel showing live signals and score, hidden in normal mode | `src/components/telemetry/TelemetryMonitorHUD.tsx` |
| Frontend scoring + API route | Local score calculation and a `/api/telemetry` route | `src/lib/scoring.ts`, `src/app/api/telemetry/route.ts` |
| Mock WS server + contract test | Lets the frontend run without the real backend | `scripts/mock-ws-server.js`, `test-contract.js` |

## Timeline

| Date | Work |
|---|---|
| Nov 10 | Added the whole frontend: form, UI kit, hook, HUD. Then fixed field-level hesitation, WebSocket streaming and error states |
| Nov 11 | Restyled the form, header and global CSS |
| Nov 12 | Button and Next config changes |
| Nov 13 | Better telemetry hook, HUD hidden in normal mode, form validation, docs |
| Nov 14 | Merged `main` into the branch; PR #5 merged into `main` |

## Status vs plan
- Week 1 telemetry tracker: ✅ done, and the strongest part of the project so far.
- Week 2 dynamic injection (a shell that loads a code string and renders it): ⏳ not started.

## Concerns
- Uses a REST payload that differs from `docs/contracts.md` §1–2. Needs an agreed format.
- Has its own scoring formula (`src/lib/scoring.ts`) that differs from the backend's.
- Approved components in the contract (`Wizard`, `WizardStep`, `TextField`, `SelectField`, …) don't exist yet. Only the basic UI kit is there.
- Commit messages like "frontend changed" are vague. Describe what changed.

## Next (suggested)
1. Build the **Dynamic Renderer**: take the `compiled` string, build it with `new Function(...RUNTIME_PARAMS, compiled)`, and render it inside Suspense + ErrorBoundary (see `ai/README.md`).
2. Build the approved components from contracts §7 (`Wizard`, `WizardStep`, `TextField`, …).
3. Make a static fallback wizard for when generation fails.
