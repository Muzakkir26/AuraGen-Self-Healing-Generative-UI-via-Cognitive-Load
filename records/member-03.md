# Branch record: `Member-03` (Backend/API)

**In one line:** built the server that receives the user's behaviour data, checks it, calculates a frustration score, and says whether the AI should step in.

## What was built, in plain words

| Piece | What it does | File |
|---|---|---|
| Express server | Runs the backend, with a `/health` check | `server/index.js` |
| Telemetry endpoint | `POST /api/telemetry`: takes mouse speed, pause time, rage clicks and field. Returns `score`, `triggerAI` (true when score ≥ 70) and the stuck field | `server/routes/healRoute.js` |
| Score calculation | Adds up to 100 points: fast mouse +30, long pause +40, 3+ rage clicks +30 | `server/telemetryService.js` |
| Input validation | Rejects bad requests with clear 400 errors | `server/telemetryService.js` |
| Global error handler | Catches crashes and returns a clean error | `server/middleware/errorHandler.js` |
| Request logger | Logs every request with how long it took | `server/middleware/logger.js` |

## Timeline

| Date | Work |
|---|---|
| Nov 9 | Initialised the Node project, installed Express and dotenv |
| Nov 10 | Started the backend server |
| Nov 11 | Cognitive score calculation |
| Nov 12 | Input validation function |
| Nov 13 | `POST /api/heal-ui` endpoint |
| Nov 14 | Global error handler, route clean-up |
| Nov 15 | Request logger with response timing |

## Status vs plan
- Steady daily progress: committed on every day from Nov 9 to Nov 15. 🟢
- Backend side of the Friction Engine: ✅ basic version.
- WebSocket server, trigger rule (high for 3 s, 30 s cool-down) and calling the AI layer: ⏳.

## Concerns
- The score is all-or-nothing steps (0/30/40/70/100), so it can't show a gradual rise. The contract suggests weighted, normalised signals.
- The formula differs from the frontend's `src/lib/scoring.ts`. One source of truth is needed.
- Uses REST, not the WebSocket messages in `docs/contracts.md`.
- Merged own PRs into `main`. These should go through Team Lead review.

## Next (suggested)
1. When `triggerAI` is true, call the AI layer (`compileComponent` from `ai/`) and return or push the result.
2. Add a WebSocket channel to push `ui.generated` / `ui.fallback` to the browser.
3. Add the trigger hold (3 s) and cool-down (30 s) from the contract.
