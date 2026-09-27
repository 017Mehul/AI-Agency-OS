import test from "node:test";import assert from "node:assert/strict";import {config} from "../lib/config.js";
test("does not hardcode production database URL",()=>{assert.equal(config.appName,"AI Agency OS");assert.equal(config.supabase.url,"");assert.equal(config.ai.provider,"nvidia");assert.ok(!config.supabase.publishableKey);});
