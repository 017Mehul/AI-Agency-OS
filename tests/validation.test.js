import test from "node:test";import assert from "node:assert/strict";import {body,required,oneOf,limit} from "../lib/validation.js";
test("parses JSON body",()=>assert.deepEqual(body({body:'{"title":"x"}'}),{title:"x"}));
test("rejects missing required values",()=>assert.throws(()=>required("","title"),/title is required/));
test("enforces enum",()=>assert.throws(()=>oneOf("bad","status",["ready","done"]),/status must be one of/));
test("clamps limits",()=>assert.equal(limit(1000,50,100),100));
