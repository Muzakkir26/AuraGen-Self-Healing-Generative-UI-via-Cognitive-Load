#!/usr/bin/env node
"use strict";

// End-to-end demo of POST /api/heal-ui, no API key needed.
//
//   npm run demo:heal-ui                       starts the routes in-process with the mock LLM
//   npm run demo:heal-ui -- --url http://localhost:3001   uses a server that is already running
//
// Steps:
//   1. calm telemetry      -> low score, no UI
//   2. struggling telemetry with a typed value -> ui.generated
//   3. the reply is loaded with ai/runtime and rendered; the wizard is printed as a text tree,
//      "Next" is clicked and the typed value must still be in the input
//   4. an edit inside the wizard flows back to the form values
//   5. the same request again -> ui.fallback (cooldown)
//
// Exits with code 1 if any step does not behave as expected, so it also works as a smoke test.

var path = require("node:path");

var AI_DIR = path.join(__dirname, "..", "ai");
// React and the test renderer come from the ai package (its devDependencies), so both share one copy of React.
function fromAi(name) {
  return require(require.resolve(name, { paths: [AI_DIR] }));
}

var args = process.argv.slice(2);
var urlIndex = args.indexOf("--url");
var externalUrl = urlIndex >= 0 ? args[urlIndex + 1] : null;
if (urlIndex >= 0 && !externalUrl) {
  console.error("--url needs a value, e.g. --url http://localhost:3001");
  process.exit(2);
}

if (!externalUrl) {
  // In-process mode always uses the mock model, even if a real key is set in the environment.
  process.env.LLM_PROVIDER = "mock";
  process.env.OPENAI_API_KEY = "";
}

var SESSION = "demo_" + Date.now().toString(36);
var CALM = { mouseSpeed: 20, pauseTime: 1, rageClicks: 0, fieldName: "annual_income", userInput: "", sessionId: SESSION };
var STRUGGLING = { mouseSpeed: 120, pauseTime: 5, rageClicks: 4, fieldName: "annual_income", userInput: "50000", sessionId: SESSION };

var failures = 0;
function check(ok, label) {
  console.log((ok ? "  ok   " : "  FAIL ") + label);
  if (!ok) failures++;
}

async function startInProcess() {
  var express = require("express");
  var app = express();
  app.use(express.json());
  app.use("/api", require("../server/routes/healUiRoute"));
  var server = await new Promise(function (resolve) {
    var s = app.listen(0, "127.0.0.1", function () { resolve(s); });
  });
  return {
    base: "http://127.0.0.1:" + server.address().port,
    close: function () {
      return new Promise(function (resolve) {
        server.close(resolve);
        server.closeAllConnections();
      });
    },
  };
}

async function post(base, body) {
  var res = await fetch(base + "/api/heal-ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// Stand-ins for the approved components: each renders as an element named after the component,
// so the printed tree shows exactly what the generated code asked for.
function makeScope(React, componentNames) {
  var scope = { React: React, useState: React.useState, useMemo: React.useMemo };
  componentNames.forEach(function (name) {
    scope[name] = function Stub(props) {
      return React.createElement(name, props, props.children);
    };
  });
  return scope;
}

var SHOWN_PROPS = ["title", "description", "label", "value", "checked", "current", "total", "variant"];

function printTree(node, depth) {
  var pad = "    " + "  ".repeat(depth);
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    console.log(pad + JSON.stringify(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(function (n) { printTree(n, depth); });
    return;
  }
  var props = node.props || {};
  var shown = SHOWN_PROPS.filter(function (k) { return props[k] !== undefined; })
    .map(function (k) { return k + "=" + JSON.stringify(props[k]); });
  console.log(pad + "<" + node.type + (shown.length ? " " + shown.join(" ") : "") + ">");
  printTree(node.children, depth + 1);
}

async function main() {
  var React = fromAi("react");
  var TestRenderer = fromAi("react-test-renderer");
  var act = TestRenderer.act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  var ds = require("../ai/designSystem");
  var runtime = require("../ai/runtime/loadComponent");

  var server = externalUrl ? { base: externalUrl.replace(/\/+$/, ""), close: async function () {} } : await startInProcess();
  console.log("AuraGen /api/heal-ui demo");
  console.log("Server: " + server.base + (externalUrl ? " (external)" : " (in-process, mock LLM)"));
  console.log("Session: " + SESSION + "\n");

  try {
    console.log("1. Calm user on annual_income");
    var calm = await post(server.base, CALM);
    console.log("     score " + calm.body.score + ", triggerAI " + calm.body.triggerAI);
    check(calm.status === 200 && calm.body.triggerAI === false && calm.body.ui === null, "no UI for a calm user");

    console.log("\n2. Struggling user (4 rage clicks, 5 s pause) who typed \"50000\"");
    var hot = await post(server.base, STRUGGLING);
    var ui = hot.body.ui || {};
    var gen = hot.body.generation || {};
    console.log("     score " + hot.body.score + ", ui " + ui.type + ", component " + gen.componentName +
      ", " + (gen.meta ? gen.meta.latencyMs + " ms" : "no meta") + (gen.meta && gen.meta.cacheHit ? " (cache)" : ""));
    check(hot.status === 200 && hot.body.triggerAI === true, "score reaches the threshold");
    check(ui.type === "ui.generated" && typeof ui.compiled === "string", "reply carries a compiled component");
    check(ui.initialValues && ui.initialValues.annual_income === "50000", "initialValues keep the typed value");
    if (ui.type !== "ui.generated") throw new Error("no ui.generated message (reason: " + ui.reason + ")");

    console.log("\n3. Load with ai/runtime and render");
    var Generated = runtime.loadGeneratedComponent(ui.compiled, makeScope(React, ds.COMPONENT_NAMES));
    // The page form is empty here, so the server's initialValues seed the wizard.
    var values = runtime.startingValues(ui, {});
    function Host() {
      var state = React.useState(values);
      values = state[0];
      return React.createElement(Generated, {
        values: state[0],
        onChange: function (id, v) { state[1](function (prev) { return runtime.applyChange(prev, id, v); }); },
        onSubmit: function () {},
      });
    }
    var renderer;
    act(function () { renderer = TestRenderer.create(React.createElement(Host)); });
    console.log("   step 1:");
    printTree(renderer.toJSON(), 0);

    var next = renderer.root.findAll(function (n) { return n.type === "Button" && n.props.children === "Next"; })[0];
    check(Boolean(next), "wizard has a Next button");
    act(function () { next.props.onClick(); });
    console.log("   step 2 (after Next):");
    printTree(renderer.toJSON(), 0);

    var input = renderer.root.findAll(function (n) { return n.type === "NumberField"; })[0];
    check(Boolean(input) && input.props.value === "50000", "typed value is still in the input after the swap");

    console.log("\n4. Edit inside the wizard");
    act(function () { input.props.onChange("65000"); });
    console.log("     form values: " + JSON.stringify(values));
    check(values.annual_income === "65000", "edit flows back to the form values");

    console.log("\n5. Same request again within the cooldown");
    var again = await post(server.base, STRUGGLING);
    console.log("     ui " + (again.body.ui && again.body.ui.type) + ", reason " + (again.body.ui && again.body.ui.reason));
    check(again.body.ui && again.body.ui.type === "ui.fallback" && again.body.ui.reason === "cooldown", "second request gets the cooldown fallback");
    act(function () { renderer.unmount(); });
  } finally {
    await server.close();
  }

  console.log("\n" + (failures ? failures + " check(s) failed" : "All checks passed"));
  // exitCode instead of process.exit(): open sockets finish closing first (process.exit trips a libuv assert on Windows).
  process.exitCode = failures ? 1 : 0;
}

main().catch(function (err) {
  console.error("\nDemo failed: " + (err && err.message ? err.message : err));
  if (externalUrl) console.error("Is the server running at " + externalUrl + " with LLM_PROVIDER=mock?");
  process.exitCode = 1;
});
