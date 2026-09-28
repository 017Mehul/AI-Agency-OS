import crypto from "node:crypto";
import {config} from "./config.js";

function suppliedSecret(req){
  const h=req.headers||{};
  const x=h["x-ai-agency-internal-secret"]||h["x-ai-agency-webhook-secret"]||h["x-mg-webhook-secret"]||"";
  if(x)return String(x);
  const a=h.authorization||"";
  return a.startsWith("Bearer ")?a.slice(7):"";
}
function equal(a,b){
  const x=Buffer.from(String(a)),y=Buffer.from(String(b));
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function hash(value){return crypto.createHash("sha256").update(String(value)).digest("hex");}
function scopedCredentials(){
  if(!config.automation.scopedCredentials)return [];
  try{
    const parsed=JSON.parse(config.automation.scopedCredentials);
    return Object.entries(parsed||{}).map(([keyId,value])=>({keyId,...value})).filter(v=>v&&typeof v.hash==="string");
  }catch{return [];}
}
function scopedMatch(secret,scope){
  const digest=hash(secret);
  for(const credential of scopedCredentials()){
    const expired=credential.expiresAt&&Date.parse(credential.expiresAt)<=Date.now();
    if(expired||!Array.isArray(credential.scopes)||!credential.scopes.includes(scope))continue;
    if(equal(digest,credential.hash))return credential;
  }
  return null;
}
export function isMasterRequest(req){
  const expected=config.automation.m2mSecret;
  const supplied=suppliedSecret(req);
  return Boolean(expected&&supplied&&equal(expected,supplied));
}
export function authorizeAutomation(req,scope){
  const supplied=suppliedSecret(req);
  if(!supplied)return null;
  if(isMasterRequest(req))return {type:"master",scopes:["*"]};
  if(!scope)return null;
  const credential=scopedMatch(supplied,scope);
  return credential?{type:"scoped",keyId:credential.keyId,scopes:credential.scopes}:null;
}
export function isInternalRequest(req,scope){
  return Boolean(authorizeAutomation(req,scope));
}
export function isScopedAutomationRequest(req){
  const supplied=suppliedSecret(req);
  return Boolean(supplied&&!isMasterRequest(req)&&scopedCredentials().some(c=>equal(hash(supplied),c.hash)));
}
export function requireInternalRequest(req,scope){
  if(!isInternalRequest(req,scope)){const error=new Error("Internal automation authentication required");error.status=401;throw error;}
}
