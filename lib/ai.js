import {config} from "./config.js";
import {generateNvidiaJSON} from "./integrations/nvidia.js";
import {generateOpenAIJSON} from "./integrations/openai.js";
export function parseJSONResponse(data){
 const raw=String(data?.choices?.[0]?.message?.content||"{}").trim();
 const cleaned=raw.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi,"").replace(/^\s*json\s*/i,"").replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/i,"").trim();
 try{return JSON.parse(cleaned);}
 catch{const start=cleaned.indexOf("{"),end=cleaned.lastIndexOf("}");if(start>=0&&end>start){try{return JSON.parse(cleaned.slice(start,end+1));}catch{}}const finishReason=data?.choices?.[0]?.finish_reason||"unknown";console.warn("[ai] invalid JSON",{length:raw.length,head:raw.slice(0,300),tail:raw.slice(-300),finish_reason:finishReason});const error=new Error(`AI provider returned invalid JSON (finish_reason=${finishReason})`);error.code="AI_INVALID_JSON";error.finish_reason=finishReason;throw error;}
}
export async function aiJSON(messages,options={}){
 const provider=(options.provider||config.ai.provider||"nvidia").toLowerCase();
 const data=provider==="openai"?await generateOpenAIJSON(messages,options):await generateNvidiaJSON(messages,options);
 return parseJSONResponse(data);
}