"use strict";

const designSystem = require("./designSystem");
const { validate } = require("./validator/astValidator");
const { compileComponent, RUNTIME_PARAMS, SHADOWED_GLOBALS } = require("./validator/compile");
const prompt = require("./agent/prompt");
const { createCodeGenAgent, toUiMessage } = require("./agent/codeGenAgent");
const { createChatModel, MockWizardChatModel } = require("./agent/llm");
const { GenerationCache } = require("./agent/cache");
const { wizardFor } = require("./agent/templates");

/** One-call setup from environment variables: model + cache + agent. */
function createAgentFromEnv(env = process.env) {
  const { provider, model, modelName } = createChatModel(env);
  const cache = new GenerationCache({ ttlMs: Number(env.GENERATION_CACHE_TTL_MS || 10 * 60 * 1000) });
  return createCodeGenAgent({ model, modelName, provider, cache, timeoutMs: Number(env.LLM_TIMEOUT_MS || 15000) });
}

module.exports = {
  designSystem,
  validate,
  compileComponent,
  RUNTIME_PARAMS,
  SHADOWED_GLOBALS,
  prompt,
  createCodeGenAgent,
  createAgentFromEnv,
  toUiMessage,
  createChatModel,
  MockWizardChatModel,
  GenerationCache,
  wizardFor,
};
