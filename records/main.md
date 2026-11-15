# Branch record: `main`

**In one line:** the shared, integrated version of the project. It currently holds the frontend (Member-02) and backend (Member-03) work.

## What's on `main` right now

| Area | Files | Came from |
|---|---|---|
| Next.js app shell | `src/app/*`, `next.config.js`, `tailwind.config.js`, `package.json` | Member-02 |
| Complex financial form (the "before" UI) | `src/components/portal/ComplexFinancialForm.tsx`, `InfotactHeader.tsx` | Member-02 |
| UI kit | `src/components/ui/Badge, Button, Card, Input, ProgressBar` | Member-02 |
| Telemetry hook + live score display | `src/hooks/useCognitiveTelemetry.ts`, `src/components/telemetry/TelemetryMonitorHUD.tsx` | Member-02 |
| Frontend-side scoring + API route | `src/lib/scoring.ts`, `src/app/api/telemetry/route.ts`, `src/types/telemetry.ts` | Member-02 |
| Mock WebSocket server, contract test | `scripts/mock-ws-server.js`, `test-contract.js` | Member-02 |
| Express backend | `server/index.js`, `server/routes/healRoute.js`, `server/telemetryService.js` | Member-03 |
| Error handler + request logger | `server/middleware/errorHandler.js`, `server/middleware/logger.js` | Member-03 |

**Not on `main` yet:** the AI layer and contracts (Member-01), and the testing/report work (Member-04).

## Merge history

| Date | Merged | What it brought |
|---|---|---|
| Nov 9 | Initial commit | Empty repo |
| Nov 10 | Member-03 PR | Project init, Express + dotenv, start server |
| Nov 11 | Member-03 PR | Cognitive score calculation |
| Nov 12 | Member-03 PR | Input validation |
| Nov 13 | Member-03 PR | `POST /api/heal-ui` endpoint (later reshaped into `POST /api/telemetry`) |
| Nov 14 | Member-02 PR #5 | Whole frontend: form, hook, UI kit, HUD, scoring |
| Nov 14 | Member-03 PR | Global error handler, route clean-up |
| Nov 15 | Member-03 PR | Request logger with response timing |

## How it runs today

```
Browser form ──(mouse speed, pause time, rage clicks, field, input)──▶ /api/telemetry ──▶ score 0–100, triggerAI if ≥ 70
```

Nothing happens yet when `triggerAI` is true. That's where the AI layer plugs in.

## Concerns
- **Process:** PRs were merged by their own authors. The README rule is that only the Team Lead reviews and merges into `main`. Enforce this from now on (GitHub → Settings → Branches → require a review on `main`).
- **Duplicate backends:** both the Next.js API route and the Express server score telemetry, with different formulas. Keep one.
- **Folder layout:** the code sits at the repo root, not in `/frontend` and `/backend` as the README says. Update the README to match.

## Next for `main`
1. Merge Member-01 (AI layer + contracts) after resolving `README.md` / `.env.example` conflicts.
2. Agree on one scoring path and one message format.
3. Merge the first end-to-end flow before the mid review.
