# AuraGen team records

A plain-language record of what has been done on every branch: who built what, when, and what still needs attention.
Last updated: **2026-11-15** (end of Week 2, day 4).

| Record | Branch | Owner role |
|---|---|---|
| [main.md](main.md) | `main` | Integrated, shared code |
| [member-01.md](member-01.md) | `Member-01` | Team Lead: AI/LLM layer, validation, integration |
| [member-02.md](member-02.md) | `Member-02` | Frontend/UI: form, telemetry hook, rendering |
| [member-03.md](member-03.md) | `Member-03` | Backend/API: server, scoring, validation |
| [member-04.md](member-04.md) | `Member-04` | Testing, evaluation, documentation, report |

## PDF reports (with viva questions)

| PDF | Contents |
|---|---|
| [00_Team_Overview.pdf](pdf/00_Team_Overview.pdf) | Project summary, team completion, plan vs reality, end-to-end status, team viva questions |
| [Member-01_Report.pdf](pdf/Member-01_Report.pdf) … [Member-04_Report.pdf](pdf/Member-04_Report.pdf) | Completion %, what was built, how it works, timeline, gaps, and viva questions with model answers |

Rebuild after updating the data in the script: `pip install reportlab` then `python records/pdf/build_reports.py`.

## Team at a glance

| Member | What's done so far | Days with commits (Nov 9–15) | Merged into `main`? | Health |
|---|---|---|---|---|
| Member-01 | Contracts; Babel validator + compiler; prompt builder; LangChain Code-Gen Agent + mock LLM; cache; `/api/generate`; audit (44 tests) | 3 (Nov 9, 10, 15) | Not yet (PR ready) | 🟡 AI layer complete for W1–W3. Needs daily commits |
| Member-02 | Next.js app, financial form, telemetry hook, UI kit, live score HUD | 5 (Nov 10–14) | Yes | 🟢 On track |
| Member-03 | Express server, score calculation, input validation, error handler, logger | 7 (Nov 9–15) | Yes | 🟢 On track |
| Member-04 | Test plan, test cases, bug tracker, simulated benchmarks, draft final report | 1 (Nov 14) | Not yet | 🔴 Needs rework (see record) |

## Where the project stands vs. the official plan

| Week | Plan (AI & Backend) | Plan (Frontend) | Reality |
|---|---|---|---|
| W1 (Nov 5–11) | LangChain pipeline fed with the component library | Telemetry hook streaming over WebSockets | Telemetry hook ✅. LangChain pipeline ✅ (Nov 15, late) |
| W2 (Nov 12–18) | Babel layer catching bad or malicious code | Shell that compiles a code string in the browser and renders it | Babel validator + compiler ✅. Browser rendering shell ⏳ |
| W3 (Nov 19–25) | Generation audit | Cognitive Load Score spikes during simulated confusion | Audit tool ✅ (mock run). Real-model run waits for the key |
| Mid review (Nov 20–27) | | | Needs: one end-to-end demo. Backend → AI now works (`POST /api/generate`). **Missing: the score ≥ 70 call and the browser renderer** |

## Top 5 team issues (Team Lead view)

1. **End-to-end flow is two links short.** Score ✅ → *(missing: backend calls `/api/generate` when score ≥ 70)* → AI generates + validates ✅ → *(missing: browser renderer shows the component)*.
2. **Two scoring implementations.** The frontend (`src/lib/scoring.ts`, Next.js API route) and the backend (`server/telemetryService.js`, Express) each compute the score, with different weights. One must be chosen.
3. **Contract drift.** The running code uses a simple REST payload (`mouseSpeed, pauseTime, rageClicks, fieldName, userInput`), not the WebSocket messages in `docs/contracts.md`. Pick one and update the contract.
4. **Testing is disconnected from the real code.** Member-04's tests check stand-alone Python mock classes, and the benchmark numbers are randomly generated. See [member-04.md](member-04.md).
5. **Commit-day rule.** The mid review needs commits on 10 of the prior 14 days. Every member should commit something small every day from now on.

## How to update these records
After each work session, add a line to the member's **Timeline** and update **Status / Next**. Refresh the "Team at a glance" table weekly.
Regenerate the raw data with:

```bash
git fetch --all
git log --all --no-merges --format="%h %ad %an %s" --date=short
```
