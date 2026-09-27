import test from "node:test";
import assert from "node:assert/strict";

process.env.ACTIVEPIECES_M2M_SECRET="test-m2m-secret";

const {isInternalRequest}=await import("../lib/internal-auth.js");

test("accepts the configured M2M bearer secret",()=>{
  assert.equal(isInternalRequest({headers:{authorization:"Bearer test-m2m-secret"}}),true);
});

test("rejects an invalid M2M bearer secret",()=>{
  assert.equal(isInternalRequest({headers:{authorization:"Bearer wrong-secret"}}),false);
});

test("rejects requests with no credentials",()=>{
  assert.equal(isInternalRequest({headers:{}}),false);
});
