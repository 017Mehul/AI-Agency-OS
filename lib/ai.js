import {config} from "./config.js";
import {generateNvidiaJSON} from "./integrations/nvidia.js";
import {generateOpenAIJSON} from "./integrations/openai.js";
function parseJSONResponse(data){
 const raw=data?.choices?.[0]?.message?.content||"{}";
 try{return JSON.parse(String(raw).replace(/^\\s*json\\s*/i,"").trim());}
 catch{throw new Error("AI provider returned invalid JSON");}
}
export async function aiJSON(messages,options={}){
 const provider=(options.provider||config.ai.provider||"nvidia").toLowerCase();
 const data=provider==="openai"?await generateOpenAIJSON(messages,options):await generateNvidiaJSON(messages,options);
 return parseJSONResponse(data);
}
