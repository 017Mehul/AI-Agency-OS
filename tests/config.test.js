import test from "node:test";import assert from "node:assert/strict";import {config} from "../lib/config.js";
test("has safe production defaults",()=>{assert.equal(config.appName,"AI Agency OS");assert.equal(config.supabase.url,"https://ejltkdfdfxunvtnahzra.supabase.co");assert.equal(config.ai.provider,"nvidia");assert.ok(!config.supabase.publishableKey);});
