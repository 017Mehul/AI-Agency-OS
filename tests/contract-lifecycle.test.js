import test from "node:test";
import assert from "node:assert/strict";
import { validateMissionPlan, validateQA, validateLeadAnalysis, validateProposal } from "../lib/ai-schema.js";

test("contract: accepts a well-formed mission plan", () => {
  const plan = { tasks: [{ title: "Research", description: "Use supplied data", agent_slug: "research-agent", dependencies: [] }] };
  assert.equal(validateMissionPlan(plan).tasks.length, 1);
});
test("contract: rejects an empty mission plan", () => assert.throws(() => validateMissionPlan({ tasks: [] }), /1-50 tasks/));
test("contract: rejects a missing task title", () => assert.throws(() => validateMissionPlan({ tasks: [{ description: "x", agent_slug: "research-agent" }] }), /title is required/));
test("contract: rejects a missing task description", () => assert.throws(() => validateMissionPlan({ tasks: [{ title: "x", agent_slug: "research-agent" }] }), /description is required/));
test("contract: rejects a missing agent slug", () => assert.throws(() => validateMissionPlan({ tasks: [{ title: "x", description: "y" }] }), /agent_slug is required/));
test("contract: rejects non-array dependencies", () => assert.throws(() => validateMissionPlan({ tasks: [{ title: "x", description: "y", agent_slug: "research-agent", dependencies: "0" }] }), /dependencies must be an array/));
test("contract: accepts valid QA output", () => assert.equal(validateQA({ pass: true, issues: [], corrections: [], confidence: 90 }).pass, true));
test("contract: rejects QA output without boolean pass", () => assert.throws(() => validateQA({ pass: "yes" }), /qa.pass must be boolean/));
test("contract: rejects out-of-range QA confidence", () => assert.throws(() => validateQA({ pass: true, confidence: 101 }), /between 0 and 100/));
test("contract: accepts a supported lead opportunity", () => assert.equal(validateLeadAnalysis({ opportunities: [{ service: "website", score: 80 }] }).opportunities.length, 1));
test("contract: rejects unsupported lead services", () => assert.throws(() => validateLeadAnalysis({ opportunities: [{ service: "unknown" }] }), /invalid service/));
test("contract: limits lead analysis opportunity count", () => assert.throws(() => validateLeadAnalysis({ opportunities: Array.from({ length: 21 }, () => ({ service: "website" })) }), /too many items/));
test("contract: accepts a proposal with subject and message", () => assert.equal(validateProposal({ subject: "Proposal", message: "Draft only" }).subject, "Proposal"));
test("contract: rejects a proposal without subject", () => assert.throws(() => validateProposal({ message: "Draft only" }), /subject is required/));
test("contract: rejects a proposal without message", () => assert.throws(() => validateProposal({ subject: "Proposal" }), /message is required/));

test("lifecycle: recovers a stale task for another bounded attempt", async () => {
  process.env.SUPABASE_URL = "https://unit-test.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "unit-test-key";
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body });
    const method = init.method || "GET";
    let data = [];
    if (method === "GET") data = [{ id: "task-1", mission_id: "mission-1", attempt_count: 1, max_attempts: 3 }];
    else if (String(url).includes("/mission_tasks?")) data = [{ id: "task-1", status: "ready" }];
    else data = [{ id: "event-1" }];
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const { recoverStaleTasks } = await import("../lib/mission-engine.js");
    const result = await recoverStaleTasks({ maxAgeMinutes: 1 });
    assert.deepEqual(result, { recovered: 1 });
    assert.equal(calls.length, 3);
    assert.match(calls[1].body, /"status":"ready"/);
    assert.match(calls[2].url, /agent_events/);
  } finally { globalThis.fetch = originalFetch; }
});

test("lifecycle: marks an exhausted stale task and mission failed", async () => {
  process.env.SUPABASE_URL = "https://unit-test.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "unit-test-key";
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body });
    const method = init.method || "GET";
    let data = [];
    if (method === "GET") data = [{ id: "task-2", mission_id: "mission-2", attempt_count: 3, max_attempts: 3 }];
    else data = [{ id: "updated" }];
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const { recoverStaleTasks } = await import("../lib/mission-engine.js");
    const result = await recoverStaleTasks({ maxAgeMinutes: 1 });
    assert.deepEqual(result, { recovered: 1 });
    assert.equal(calls.length, 4);
    assert.match(calls[1].body, /"status":"failed"/);
    assert.match(calls[2].url, /missions\?/);
    assert.match(calls[2].body, /"status":"failed"/);
    assert.match(calls[3].url, /agent_events/);
  } finally { globalThis.fetch = originalFetch; }
});
