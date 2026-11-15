"use strict";

/**
 * Chat model factory. Every model returned here is a LangChain chat model, so the
 * Code-Gen Agent talks to the mock and to the real provider in exactly the same way.
 *
 * Provider choice (env LLM_PROVIDER):
 *   - "openai": ChatOpenAI (needs OPENAI_API_KEY). The project spec names GPT-4o.
 *   - "mock":   deterministic wizard generator, no network, no key.
 *   - unset:    "openai" when OPENAI_API_KEY is set, otherwise "mock".
 * More providers can be added here once the mentor approves the final choice.
 */

const { SimpleChatModel } = require("@langchain/core/language_models/chat_models");
const { wizardFor } = require("./templates");

const REPAIR_MARKER = "rejected by the safety validator";

// Reads the stuck field back out of the user prompt that prompt.js builds.
function parseStuckField(text) {
  const block = (text.split("STUCK FIELD")[1] || "").split(/\n\n/)[0];
  const get = (key) => {
    const m = block.match(new RegExp(`^\\s*-?\\s*${key}: (.*)$`, "m"));
    return m ? m[1].trim() : undefined;
  };
  const id = get("id");
  if (!id) return null;
  const typeLine = get("type") || "text";
  const field = { id, label: get("label") || id, type: typeLine.split(" ")[0], required: /\(required\)/.test(typeLine) };
  if (get("help")) field.help = get("help");
  if (get("pattern")) field.pattern = get("pattern");
  if (get("options")) {
    try { field.options = JSON.parse(get("options")); } catch { /* truncated list: leave options empty */ }
  }
  return field;
}

function messageText(m) {
  return typeof m.content === "string" ? m.content : (m.content || []).map((p) => p.text || "").join("");
}

class MockWizardChatModel extends SimpleChatModel {
  static lc_name() { return "MockWizardChatModel"; }

  constructor(fields = {}) {
    super(fields);
    this.modelName = "mock-wizard-v1";
    this.latencyMs = fields.latencyMs || 0;
  }

  _llmType() { return "auragen-mock"; }

  async _call(messages) {
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    const humans = messages.filter((m) => m._getType() === "human").map(messageText);
    const first = humans[0] || "";
    const field = parseStuckField(first);
    if (!field) return "I could not find the stuck field in the request.";
    const intro = humans.length > 1 && humans[humans.length - 1].includes(REPAIR_MARKER) ? "Here is the corrected component." : "Here is the wizard.";
    return `${intro}\n\n\`\`\`jsx\n${wizardFor(field)}\`\`\``;
  }
}

function resolveProvider(env = process.env) {
  if (env.LLM_PROVIDER) return env.LLM_PROVIDER.toLowerCase();
  return env.OPENAI_API_KEY ? "openai" : "mock";
}

function createChatModel(env = process.env) {
  const provider = resolveProvider(env);
  const temperature = env.LLM_TEMPERATURE !== undefined ? Number(env.LLM_TEMPERATURE) : 0.2;

  if (provider === "mock") {
    return { provider, model: new MockWizardChatModel({ latencyMs: Number(env.MOCK_LLM_LATENCY_MS || 0) }), modelName: "mock-wizard-v1" };
  }
  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) throw new Error("LLM_PROVIDER=openai but OPENAI_API_KEY is empty. Set the key or use LLM_PROVIDER=mock.");
    const { ChatOpenAI } = require("@langchain/openai");
    const modelName = env.LLM_MODEL || "gpt-4o";
    return { provider, model: new ChatOpenAI({ model: modelName, temperature, apiKey: env.OPENAI_API_KEY, maxRetries: 1 }), modelName };
  }
  throw new Error(`Unknown LLM_PROVIDER "${provider}". Use "openai" or "mock".`);
}

module.exports = { createChatModel, resolveProvider, MockWizardChatModel, parseStuckField, messageText };
