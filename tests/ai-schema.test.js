import test from "node:test";import assert from "node:assert/strict";import {validateMissionPlan,validateQA,validateLeadAnalysis,validateProposal} from "../lib/ai-schema.js";
test("validates mission plans",()=>assert.equal(validateMissionPlan({tasks:[{title:"Research",description:"Inspect supplied context",agent_slug:"research-agent",dependencies:[]}]}).tasks.length,1));
test("rejects malformed mission plans",()=>assert.throws(()=>validateMissionPlan({tasks:[{title:"x"}]}),/description is required/));
test("validates QA",()=>assert.equal(validateQA({pass:true,issues:[],corrections:[],confidence:90}).pass,true));
test("validates lead analysis services",()=>assert.throws(()=>validateLeadAnalysis({opportunities:[{service:"unknown"}]}),/invalid service/));
test("validates proposal essentials",()=>assert.throws(()=>validateProposal({subject:"x"}),/message is required/));
