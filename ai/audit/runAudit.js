"use strict";

/**
 * Generation audit (Week 3 deliverable: "prove the LLM consistently outputs valid components").
 *
 * Runs every sample friction point N times through the real Code-Gen Agent (cache off) and
 * reports first-try pass rate, pass rate after repair, latency and the most common violations.
 *
 * Usage (from ai/):
 *   node audit/runAudit.js                 # provider from env, 3 runs per scenario
 *   node audit/runAudit.js --runs 10
 *   LLM_PROVIDER=openai OPENAI_API_KEY=... node audit/runAudit.js --runs 5
 *
 * Writes reports/audit-<provider>-<date>.json and .md.
 */

const fs = require("node:fs");
const path = require("node:path");
const { createChatModel } = require("../agent/llm");
const { createCodeGenAgent } = require("../agent/codeGenAgent");
const { scenarios } = require("./scenarios");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function runAudit({ runs = 3, env = process.env } = {}) {
  const { provider, model, modelName } = createChatModel(env);
  const agent = createCodeGenAgent({ model, modelName, provider, cache: null, timeoutMs: Number(env.LLM_TIMEOUT_MS || 30000) });

  const rows = [];
  for (const s of scenarios()) {
    for (let i = 0; i < runs; i += 1) {
      const r = await agent.generate(s.request);
      rows.push({
        scenario: s.name,
        run: i + 1,
        status: r.status,
        attempts: r.meta.attempts,
        latencyMs: r.meta.latencyMs,
        violations: r.validation ? r.validation.violations.map((v) => v.rule) : [],
        error: r.meta.error || null,
      });
    }
  }

  const total = rows.length;
  const ok = rows.filter((r) => r.status === "ok");
  const firstTry = ok.filter((r) => r.attempts === 1);
  const latencies = rows.filter((r) => r.status !== "error").map((r) => r.latencyMs);
  const violationCounts = {};
  rows.forEach((r) => r.violations.forEach((v) => { violationCounts[v] = (violationCounts[v] || 0) + 1; }));

  const byScenario = {};
  rows.forEach((r) => {
    const b = (byScenario[r.scenario] = byScenario[r.scenario] || { runs: 0, ok: 0, firstTry: 0 });
    b.runs += 1;
    if (r.status === "ok") b.ok += 1;
    if (r.status === "ok" && r.attempts === 1) b.firstTry += 1;
  });

  return {
    generatedAt: new Date().toISOString(),
    provider,
    model: modelName,
    isMock: provider === "mock",
    runsPerScenario: runs,
    totals: {
      generations: total,
      passFirstTryPct: pct(firstTry.length, total),
      passAfterRepairPct: pct(ok.length, total),
      rejected: rows.filter((r) => r.status === "rejected").length,
      errors: rows.filter((r) => r.status === "error").length,
      latencyMs: { mean: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0, p95: percentile(latencies, 95), max: Math.max(0, ...latencies) },
    },
    violationCounts,
    byScenario,
    rows,
  };
}

function toMarkdown(report) {
  const t = report.totals;
  const lines = [
    `# Generation audit: ${report.provider} (${report.model})`,
    "",
    `Run at ${report.generatedAt} · ${report.runsPerScenario} run(s) per scenario · ${t.generations} generations in total`,
    "",
  ];
  if (report.isMock) {
    lines.push("> **Mock provider.** This run tests the pipeline (prompt → extract → validate → compile), not LLM quality.", "> Run again with `LLM_PROVIDER=openai` for real model numbers.", "");
  }
  lines.push(
    "| Metric | Value |", "|---|---|",
    `| Valid on first try | ${t.passFirstTryPct}% |`,
    `| Valid after one repair | ${t.passAfterRepairPct}% |`,
    `| Rejected (falls back to static wizard) | ${t.rejected} |`,
    `| Errors (timeout / LLM failure) | ${t.errors} |`,
    `| Latency mean / p95 / max | ${t.latencyMs.mean} / ${t.latencyMs.p95} / ${t.latencyMs.max} ms |`,
    "",
    "## By scenario", "", "| Scenario | Runs | First try | After repair |", "|---|---|---|---|",
    ...Object.entries(report.byScenario).map(([name, b]) => `| ${name} | ${b.runs} | ${b.firstTry} | ${b.ok} |`),
    "",
    "## Violations seen",
    "",
    Object.keys(report.violationCounts).length
      ? ["| Rule | Count |", "|---|---|", ...Object.entries(report.violationCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`)].join("\n")
      : "None.",
    "",
  );
  return lines.join("\n");
}

async function main() {
  const runs = Number(arg("runs", 3));
  const report = await runAudit({ runs });
  const outDir = path.join(__dirname, "..", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `audit-${report.provider}-${report.generatedAt.slice(0, 10)}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${base}.md`, toMarkdown(report));
  const t = report.totals;
  console.log(`[audit] ${report.provider}/${report.model}: ${t.generations} generations, first try ${t.passFirstTryPct}%, after repair ${t.passAfterRepairPct}%, p95 ${t.latencyMs.p95} ms`);
  console.log(`[audit] wrote ${path.relative(process.cwd(), base)}.{json,md}`);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { runAudit, toMarkdown };
