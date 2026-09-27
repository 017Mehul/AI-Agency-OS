import {aiJSON} from "../../../lib/ai.js";
import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../../../lib/supabase.js";
import {isInternalRequest} from "../../../lib/internal-auth.js";
import {assertLeadOwner} from "../../../lib/authz.js";
export const methods=["POST"];
export default async function(req,res){try{
 const id=req.query?.id||new URL(req.url,"http://localhost").pathname.split("/").filter(Boolean).slice(-2,-1)[0];if(!id)return res.status(400).json({error:"lead id is required"});
 const leadRows=await supabaseRequest("leads?id=eq."+encodeURIComponent(id)+"&select=*"),lead=leadRows[0];if(!lead)return res.status(404).json({error:"Lead not found"});
 if(!isInternalRequest(req)){const user=await getAuthenticatedUser(bearerToken(req));await assertLeadOwner(id,user.id);}
 const result=await aiJSON([{role:"system",content:"You are the Lead Hunter for an AI Agency OS. Analyze only supplied lead data. Return JSON with opportunities for website, app, automation, ai_video or uiux. Each opportunity includes service, score, confidence, reason, evidence, recommended_solution and estimated_value."},{role:"user",content:JSON.stringify({lead})}],{maxTokens:5000});
 const opportunities=Array.isArray(result.opportunities)?result.opportunities:[],created=[];
 for(const o of opportunities){if(!["website","app","automation","ai_video","uiux"].includes(o.service))continue;created.push((await supabaseRequest("lead_opportunities",{method:"POST",body:{lead_id:id,service:o.service,score:Number(o.score||0),confidence:Number(o.confidence||0),reason:o.reason||null,evidence:o.evidence||[],recommended_solution:o.recommended_solution||null,estimated_value:o.estimated_value==null?null:Number(o.estimated_value),status:"identified"}}))[0]);}
 await supabaseRequest("leads?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status:"qualified",raw_data:{...(lead.raw_data||{}),last_analysis:result}}});
 return res.json({lead_id:id,analysis:result,opportunities:created});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:400).json({error:error?.message||"Lead analysis failed",code:error?.code||"REQUEST_FAILED"});}}
