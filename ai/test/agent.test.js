"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { FakeListChatModel } = require("@langchain/core/utils/testing");
const {
  createCodeGenAgent, createAgentFromEnv, toUiMessage, MockWizardChatModel, GenerationCache,
  wizardFor, validate, compileComponent, RUNTIME_PARAMS, designSystem: ds,
} = require("..");
const { createChatModel } = require("../agent/llm");
const { scenarios, FIELDS } = require("../audit/scenarios");

const GOOD = fs.readFileSync(path.join(__dirname, "..", "examples", "PanWizard.jsx"), "utf8");
const BAD = "export default function Bad({ values }) { const w = window; return <iframe />; }";
const fenced = (code) => "Here you go:\n```jsx\n" + code + "\n```";
const request = () => scenarios().find((s) => s.request.frictionPoint.fieldId === "field-pan").request;

const fake = (responses) => new FakeListChatModel({ responses });

test("ok on the first try returns a contracts §4 result", async () => {
  const agent = createCodeGenAgent({ model: fake([fenced(GOOD)]), modelName: "fake" });
  const r = await agent.generate(request());
  assert.equal(r.status, "ok");
  assert.match(r.componentId, /^gen_[0-9a-f]{8}$/);
  assert.equal(r.componentName, "PanWizard");
  assert.ok(r.compiled.startsWith('"use strict"'));
  assert.deepEqual(r.validation, { passed: true, violations: [] });
  assert.equal(r.meta.attempts, 1);
  assert.equal(r.meta.cacheHit, false);
  assert.equal(r.meta.promptVersion, "p-0.2");
  assert.equal(typeof r.meta.latencyMs, "number");
});

test("rejected code gets one repair attempt that sends the violations back", async () => {
  const model = fake([fenced(BAD), fenced(GOOD)]);
  const seen = [];
  const spy = { invoke: (msgs, opts) => { seen.push(msgs.map((m) => m._getType())); return model.invoke(msgs, opts); } };
  const agent = createCodeGenAgent({ model: spy });
  const r = await agent.generate(request());
  assert.equal(r.status, "ok");
  assert.equal(r.meta.attempts, 2);
  assert.deepEqual(seen[1], ["system", "human", "ai", "human"]);
});

test("still unsafe after the repair → status rejected with violations, nothing compiled", async () => {
  const agent = createCodeGenAgent({ model: fake([fenced(BAD), fenced(BAD)]) });
  const r = await agent.generate(request());
  assert.equal(r.status, "rejected");
  assert.equal(r.compiled, null);
  const rules = r.validation.violations.map((v) => v.rule);
  assert.ok(rules.includes("banned-identifier") && rules.includes("jsx-element"));
});

test("a reply without code counts as a rejection", async () => {
  const agent = createCodeGenAgent({ model: fake(["Sorry, I can't do that.", "Still no."]) });
  const r = await agent.generate(request());
  assert.equal(r.status, "rejected");
  assert.equal(r.validation.violations[0].rule, "no-code");
});

test("a hanging LLM times out with status error", async () => {
  const hang = { invoke: () => new Promise(() => {}) };
  const agent = createCodeGenAgent({ model: hang, timeoutMs: 50 });
  const r = await agent.generate(request());
  assert.equal(r.status, "error");
  assert.match(r.meta.error, /^timeout/);
});

test("an LLM failure returns status error instead of throwing", async () => {
  const broken = { invoke: async () => { throw new Error("401 invalid api key"); } };
  const r = await createCodeGenAgent({ model: broken }).generate(request());
  assert.equal(r.status, "error");
  assert.match(r.meta.error, /llm-failure: 401/);
});

test("a bad request returns status error without calling the LLM", async () => {
  let called = false;
  const agent = createCodeGenAgent({ model: { invoke: async () => { called = true; } } });
  const r = await agent.generate({ frictionPoint: { fieldId: "nope" }, formSchema: { fields: FIELDS } });
  assert.equal(r.status, "error");
  assert.match(r.meta.error, /^bad-request/);
  assert.equal(called, false);
});

test("identical requests hit the cache; the LLM is called once", async () => {
  let calls = 0;
  const model = fake([fenced(GOOD)]);
  const counting = { invoke: (m, o) => { calls += 1; return model.invoke(m, o); } };
  const agent = createCodeGenAgent({ model: counting, cache: new GenerationCache() });
  const a = await agent.generate(request());
  const b = await agent.generate(request());
  assert.equal(calls, 1);
  assert.equal(b.meta.cacheHit, true);
  assert.equal(b.compiled, a.compiled);
  assert.notEqual(b.componentId, a.componentId, "every push gets a fresh component id");
});

test("typed values don't split the cache, because they never enter the prompt", async () => {
  let calls = 0;
  const counting = { invoke: async () => { calls += 1; return { content: fenced(GOOD) }; } };
  const agent = createCodeGenAgent({ model: counting, cache: new GenerationCache() });
  const r1 = request(); r1.formState.values["field-pan"] = "AAAAA1111A";
  const r2 = request(); r2.formState.values["field-pan"] = "BBBBB2222B";
  await agent.generate(r1);
  await agent.generate(r2);
  assert.equal(calls, 1);
});

test("cache entries expire and the LRU evicts the oldest", () => {
  let t = 0;
  const c = new GenerationCache({ maxEntries: 2, ttlMs: 100, now: () => t });
  c.set("a", 1); c.set("b", 2); c.get("a"); c.set("c", 3);
  assert.equal(c.get("b"), undefined, "b was least recently used");
  assert.equal(c.get("a"), 1);
  t = 200;
  assert.equal(c.get("a"), undefined, "expired");
});

test("template wizards pass the validator for every field type", () => {
  for (const field of FIELDS) {
    const r = validate(wizardFor(field));
    assert.equal(r.passed, true, `${field.type}: ${JSON.stringify(r.violations)}`);
  }
});

test("hostile schema text can't escape into the template code", () => {
  const evil = { id: "x\"});window.x=1;//", label: "</Card>{window}", type: "text", help: "\"}; fetch('/steal'); //" };
  const out = compileComponent(wizardFor(evil));
  assert.equal(out.ok, true, JSON.stringify(out.validation.violations));
  assert.ok(!/[^"]window\.x=1/.test(out.compiled.replace(/"(?:[^"\\]|\\.)*"/g, '""')), "payload stays inside string literals");
});

test("mock model (LangChain) + agent produce a valid component for every scenario", async () => {
  const agent = createCodeGenAgent({ model: new MockWizardChatModel(), modelName: "mock" });
  for (const s of scenarios()) {
    const r = await agent.generate(s.request);
    assert.equal(r.status, "ok", `${s.name}: ${JSON.stringify(r.validation)}`);
    assert.equal(r.meta.attempts, 1);

    // The compiled result really runs and renders the right input for the stuck field.
    const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), Fragment: "F" };
    const scope = { React, useState: (v) => [1, () => {}], useMemo: (fn) => fn() };
    for (const n of ds.COMPONENT_NAMES) scope[n] = n;
    const Component = new Function(...RUNTIME_PARAMS, r.compiled)(...RUNTIME_PARAMS.map((n) => scope[n]));
    const json = JSON.stringify(Component({ values: {}, onChange() {}, onSubmit() {} }));
    assert.ok(json.includes(`"id":"${s.request.frictionPoint.fieldId}"`), s.name);
  }
});

test("toUiMessage builds the §5 push messages", async () => {
  const req = request();
  const ok = await createCodeGenAgent({ model: fake([fenced(GOOD)]) }).generate(req);
  const pushOk = toUiMessage(req, ok);
  assert.equal(pushOk.type, "ui.generated");
  assert.equal(pushOk.targetFieldId, "field-pan");
  assert.deepEqual(pushOk.initialValues, req.formState.values);
  assert.deepEqual(toUiMessage(req, { status: "rejected" }), { type: "ui.fallback", sessionId: req.sessionId, targetFieldId: "field-pan", reason: "rejected" });
});

test("provider selection from env", () => {
  assert.equal(createChatModel({}).provider, "mock");
  assert.equal(createChatModel({ LLM_PROVIDER: "mock", OPENAI_API_KEY: "x" }).provider, "mock");
  assert.equal(createChatModel({ OPENAI_API_KEY: "sk-test" }).provider, "openai");
  assert.throws(() => createChatModel({ LLM_PROVIDER: "openai" }), /OPENAI_API_KEY/);
  assert.throws(() => createChatModel({ LLM_PROVIDER: "other" }), /Unknown/);
  assert.equal(createAgentFromEnv({}).provider, "mock");
});
