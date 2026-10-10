import {config} from "./config.js";
import {generateNvidiaJSON} from "./integrations/nvidia.js";
import {generateOpenAIJSON} from "./integrations/openai.js";
export function parseJSONResponse(data){
 const raw=String(data?.choices?.[0]?.message?.content||"{}").trim();
 const cleaned=raw.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi,"").replace(/^\s*json\s*/i,"").replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/i,"").trim();
 try{return JSON.parse(cleaned);}
 catch{const start=cleaned.indexOf("{"),end=cleaned.lastIndexOf("}");if(start>=0&&end>start){try{return JSON.parse(cleaned.slice(start,end+1));}catch{}}const finishReason=data?.choices?.[0]?.finish_reason||"unknown";console.warn("[ai] invalid JSON",{length:raw.length,head:raw.slice(0,300),tail:raw.slice(-300),finish_reason:finishReason});const error=new Error(`AI provider returned invalid JSON (finish_reason=${finishReason})`);error.code="AI_INVALID_JSON";error.finish_reason=finishReason;error.rawContent=raw;throw error;}
}
export async function aiJSON(messages,options={}){
 const provider=(options.provider||config.ai.provider||"nvidia").toLowerCase();
 const generate=provider==="openai"?generateOpenAIJSON:generateNvidiaJSON;
 try{return parseJSONResponse(await generate(messages,options));}
 catch(error){
  if(error?.code!=="AI_INVALID_JSON"||options.repairJSON===false)throw error;
  const raw=String(error?.rawContent||"");
  const original=String(messages?.[messages.length-1]?.content||"");
  const repairMessages=[
   {role:"system",content:"You repair malformed JSON for a production API. Return exactly one valid JSON object and nothing else. Do not include markdown, reasoning, comments, or prose. Preserve the intended data. Ensure all strings are properly escaped and all arrays/objects are closed."},
   {role:"user",content:"Original request:\n"+original+"\n\nThe model returned malformed JSON. Repair the following response into one valid JSON object. Preserve its intended structure and values. For dependencies, use arrays of zero-based integer task indexes, not strings.\n\nMalformed response:\n"+(raw||"No response content was retained. Regenerate the requested JSON from the original request.")}
  ];
  const repaired=await generate(repairMessages,{...options,maxTokens:Math.max(Number(options.maxTokens)||0,3000),reasoningBudget:256,repairJSON:false});
  return parseJSONResponse(repaired);
 } 
}