// Shared access to the Code-Gen Agent for every backend route that needs it.
//
// One agent (and so one generation cache) per server process, plus the per-session cooldown
// from contracts §2: at most one generation per session + field every GENERATION_COOLDOWN_MS.

var ai = require("../../ai");

var agent = null;

// Created on first use so a config error (e.g. provider=openai with no key) shows up in a response, not at boot.
function getAgent() {
  if (!agent) {
    agent = ai.createAgentFromEnv(process.env);
    console.log("[AI] Code-Gen Agent ready. Provider:", agent.provider, "| Model:", agent.modelName);
  }
  return agent;
}

// Lets tests plug in an agent built around a fake model.
function setAgent(customAgent) {
  agent = customAgent;
}

function createCooldown(ms) {
  var last = new Map();
  return {
    ms: ms,
    // true when this key generated less than `ms` ago; otherwise records `now` and returns false.
    check: function (key, now) {
      var t = last.get(key);
      if (t !== undefined && now - t < ms) return true;
      last.set(key, now);
      if (last.size > 5000) {
        last.forEach(function (time, k) { if (now - time >= ms) last.delete(k); });
      }
      return false;
    },
    release: function (key) { last.delete(key); },
    clear: function () { last.clear(); },
  };
}

// Shared by /api/generate and /api/heal-ui so the two routes can't double-generate for one field.
var cooldown = createCooldown(Number(process.env.GENERATION_COOLDOWN_MS || 30000));

module.exports = { getAgent, setAgent, createCooldown, cooldown, toUiMessage: ai.toUiMessage };
