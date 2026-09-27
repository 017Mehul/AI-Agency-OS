import test from "node:test";
import assert from "node:assert/strict";
import {taskNeedsApproval} from "../lib/mission-engine.js";

test("approval is required for explicit external actions",()=>{
  assert.equal(taskNeedsApproval({title:"Publish campaign",description:"",input:{}}),true);
  assert.equal(taskNeedsApproval({title:"Research leads",description:"",input:{external_action:true}}),true);
});

test("approval is required when explicitly configured",()=>{
  assert.equal(taskNeedsApproval({title:"Prepare draft",description:"",input:{requires_approval:true}}),true);
});

test("approval is not required for ordinary internal work",()=>{
  assert.equal(taskNeedsApproval({title:"Analyze supplied data",description:"Create a summary",input:{}}),false);
});
