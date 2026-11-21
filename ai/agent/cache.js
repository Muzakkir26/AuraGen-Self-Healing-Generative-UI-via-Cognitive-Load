"use strict";

/**
 * Small in-memory LRU cache with expiry for generation results (Week 4 latency goal).
 *
 * Safe to share between users: the prompt never contains typed values (see prompt.js),
 * so two users stuck on the same field get the same prompt and can reuse the same component.
 */

const crypto = require("node:crypto");

function cacheKey(prompt, modelName) {
  return crypto
    .createHash("sha256")
    .update([prompt.promptVersion, prompt.designSystemVersion, modelName, prompt.system, prompt.user].join("\u0000"))
    .digest("hex");
}

class GenerationCache {
  constructor({ maxEntries = 200, ttlMs = 10 * 60 * 1000, now = Date.now } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry || entry.expires <= this.now()) {
      if (entry) this.map.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.map.delete(key); // refresh LRU position
    this.map.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expires: this.now() + this.ttlMs });
    while (this.map.size > this.maxEntries) this.map.delete(this.map.keys().next().value);
  }

  stats() {
    return { size: this.map.size, hits: this.hits, misses: this.misses };
  }
}

module.exports = { GenerationCache, cacheKey };
