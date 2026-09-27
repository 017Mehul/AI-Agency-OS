import crypto from "node:crypto";
import {config} from "./config.js";
function suppliedSecret(req){const h=req.headers||{};const x=h["x-ai-agency-internal-secret"]||h["x-ai-agency-webhook-secret"]||"";if(x)return String(x);const a=h.authorization||"";return a.startsWith("Bearer ")?a.slice(7):"";}
export function isInternalRequest(req){const expected=config.automation.m2mSecret;if(!expected)return false;const supplied=suppliedSecret(req);if(!supplied)return false;const a=Buffer.from(String(expected)),b=Buffer.from(String(supplied));return a.length===b.length&&crypto.timingSafeEqual(a,b);}
export function requireInternalRequest(req){if(!isInternalRequest(req))throw new Error("Internal automation authentication required");}
