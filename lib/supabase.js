import {config,requireConfig} from "./config.js";

function headers(accessToken){
  const key=process.env.SUPABASE_SERVICE_TOKEN||config.supabase.publishableKey;
  requireConfig(key,"SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_TOKEN is not configured");
  return {
    apikey:key,
    Authorization:`Bearer ${process.env.SUPABASE_SERVICE_TOKEN||accessToken||key}`,
    "Content-Type":"application/json",
    Prefer:"return=representation"
  };
}

export async function supabaseRequest(path,{method="GET",body,accessToken,prefer}={}){
  const url=requireConfig(config.supabase.url,"SUPABASE_URL is not configured");
  const h=headers(accessToken);
  if(prefer) h.Prefer=prefer;
  const response=await fetch(`${url.replace(/\/$/,"")}/rest/v1/${path}`,{
    method,
    headers:h,
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!response.ok) throw new Error(data?.message||data?.error_description||data?.hint||`Supabase request failed (${response.status})`);
  return data;
}

export async function getAuthenticatedUser(accessToken){
  if(!accessToken) throw new Error("Authentication required");
  const url=requireConfig(config.supabase.url,"SUPABASE_URL is not configured");
  const key=requireConfig(config.supabase.publishableKey,"SUPABASE_PUBLISHABLE_KEY is not configured");
  const r=await fetch(`${url.replace(/\/$/,"")}/auth/v1/user`,{
    headers:{apikey:key,Authorization:`Bearer ${accessToken}`}
  });
  if(!r.ok) throw new Error("Invalid or expired Supabase session");
  return r.json();
}

export function bearerToken(req){
  const value=req.headers?.authorization||"";
  return value.startsWith("Bearer ")?value.slice(7):"";
}
