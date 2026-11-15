"use strict";

/**
 * Code-Gen Agent: the LangChain pipeline from "user is stuck" to "safe compiled component".
 *
 *   request (contracts §3)
 *     → buildPrompt            system + user prompt from the design system
 *     → cache lookup           identical prompt → reuse the earlier result
 *     → chat model (LangChain) mock or GPT-4o
 *     → extractCode            pull the jsx block out of the reply
 *     → compileComponent       Babel AST validation, then compilation
 *     → on rejection: send the violations back to the model, retry (maxRepairs times)
 *   result (contracts §4)
 *
 * generate() never throws. Every outcome is a §4 result with status ok | rejected | error.
 */

const crypto = require("node:crypto");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { buildPrompt, buildRepairPrompt, extractCode } = require("./prompt");
const { compileComponent } = require("../validator/compile");
const { cacheKey } = require("./cache");
const { messageText } = require("./llm");

class TimeoutError extends Error {}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new TimeoutError(`LLM did not answer within ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

const newComponentId = () => `gen_${crypto.randomBytes(4).toString("hex")}`;

/**
 * @param {object} opts
 * @param {object} opts.model      LangChain chat model (anything with invoke(messages, options))
 * @param {string} [opts.modelName]
 * @param {string} [opts.provider]
 * @param {import("./cache").GenerationCache} [opts.cache]
 * @param {number} [opts.timeoutMs=15000]  per LLM call
 * @param {number} [opts.maxRepairs=1]
 * @param {() => number} [opts.now]
 */
function createCodeGenAgent({ model, modelName = "unknown", provider = "unknown", cache = null, timeoutMs = 15000, maxRepairs = 1, now = Date.now } = {}) {
  if (!model || typeof model.invoke !== "function") throw new TypeError("createCodeGenAgent needs a LangChain chat model.");

  async function generate(request) {
    const started = now();
    const meta = (extra) => ({ model: modelName, provider, latencyMs: now() - started, cacheHit: false, promptVersion: null, attempts: 0, ...extra });

    let prompt;
    try {
      prompt = buildPrompt(request);
    } catch (err) {
      return { status: "error", componentId: null, componentName: null, source: null, compiled: null, validation: null, meta: meta({ error: `bad-request: ${err.message}` }) };
    }

    const key = cache ? cacheKey(prompt, modelName) : null;
    if (cache) {
      const hit = cache.get(key);
      if (hit) {
        return { ...hit, componentId: newComponentId(), meta: meta({ ...hit.meta, cacheHit: true, latencyMs: now() - started, promptVersion: prompt.promptVersion }) };
      }
    }

    const messages = [new SystemMessage(prompt.system), new HumanMessage(prompt.user)];
    let lastSource = null;
    let lastValidation = null;
    let attempts = 0;

    try {
      for (let attempt = 0; attempt <= maxRepairs; attempt += 1) {
        attempts += 1;
        const reply = await withTimeout(model.invoke(messages, { signal: AbortSignal.timeout(timeoutMs) }), timeoutMs);
        const text = messageText(reply);
        const source = extractCode(text);
        lastSource = source;

        if (!source) {
          lastValidation = { passed: false, violations: [{ rule: "no-code", message: "The reply contained no jsx code block.", line: null }] };
        } else {
          const out = compileComponent(source);
          lastValidation = { passed: out.validation.passed, violations: out.validation.violations };
          if (out.ok) {
            const result = {
              status: "ok",
              componentId: newComponentId(),
              componentName: out.componentName,
              source,
              compiled: out.compiled,
              validation: lastValidation,
              meta: meta({ promptVersion: prompt.promptVersion, attempts }),
            };
            if (cache) cache.set(key, result);
            return result;
          }
        }

        if (attempt < maxRepairs) {
          messages.push(new AIMessage(text), new HumanMessage(buildRepairPrompt(lastValidation.violations)));
        }
      }
    } catch (err) {
      const kind = err instanceof TimeoutError || err.name === "TimeoutError" || err.name === "AbortError" ? "timeout" : "llm-failure";
      return { status: "error", componentId: null, componentName: null, source: lastSource, compiled: null, validation: lastValidation, meta: meta({ promptVersion: prompt.promptVersion, attempts, error: `${kind}: ${err.message}` }) };
    }

    return { status: "rejected", componentId: null, componentName: null, source: lastSource, compiled: null, validation: lastValidation, meta: meta({ promptVersion: prompt.promptVersion, attempts }) };
  }

  return { generate, modelName, provider, cache };
}

/** Turns a §4 result into the §5 WebSocket push message for the browser. */
function toUiMessage(request, result) {
  const targetFieldId = request && request.frictionPoint ? request.frictionPoint.fieldId : null;
  const sessionId = request ? request.sessionId : null;
  if (result.status === "ok") {
    return { type: "ui.generated", sessionId, componentId: result.componentId, targetFieldId, compiled: result.compiled, initialValues: (request.formState && request.formState.values) || {} };
  }
  return { type: "ui.fallback", sessionId, targetFieldId, reason: result.status };
}

module.exports = { createCodeGenAgent, toUiMessage, TimeoutError };
