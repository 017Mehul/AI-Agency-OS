import {aiJSON} from "../../../lib/ai.js";
import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../../../lib/supabase.js";
import {isInternalRequest} from "../../../lib/internal-auth.js";
import {assertLeadOwner} from "../../../lib/authz.js";
export const methods=["POST"];
export default async function(req,res){try{
 const id=req.query?.id||new URL(req.url,"http://localhost").pathname.split("/").filter(Boolean).slice(-2,-1)[0];if(!id)return res.status(400).json({error:"lead id is required"});
 const lead=(await supabaseRequest("leads?id=eq."+encodeURIComponent(id)+"&select=*"))[0];if(!lead)return res.status(404).json({error:"Lead not found"});
 if(!isInternalRequest(req)){const user=await getAuthenticatedUser(bearerToken(req));await assertLeadOwner(id,user.id);}
 const result=await aiJSON([{role:"system",content:"You are the Lead Hunter and service opportunity analyst. Analyze only supplied lead data. Return JSON with opportunities for website, app, automation, ai_video and uiux. Include service, score, confidence, reason, evidence, recommended_solution, estimated_value, plus service-specific fields: website {url,performance_score,design_score,mobile_score,seo_score,conversion_score,technology,issues,opportunities,ai_summary}; app {current_app,problem,recommended_app,features,platform,ai_analysis}; automation {current_process,pain_point,recommended_automation,tools,workflow,estimated_time_saved,ai_analysis}; ai_video {brand,product,opportunity_type,creative_angle,hook,video_concept,platform,ai_analysis}."},{role:"user",content:JSON.stringify({lead})}],{maxTokens:6500});
 const opportunities=Array.isArray(result.opportunities)?result.opportunities:[],created=[];
 for(const o of opportunities){
  if(!["website","app","automation","ai_video","uiux"].includes(o.service))continue;
  const row=(await supabaseRequest("lead_opportunities",{method:"POST",body:{lead_id:id,service:o.service,score:Number(o.score||0),confidence:Number(o.confidence||0),reason:o.reason||null,evidence:o.evidence||[],recommended_solution:o.recommended_solution||null,estimated_value:o.estimated_value==null?null:Number(o.estimated_value),status:"identified"}}))[0];
  created.push(row);
  if(o.service==="website"&&(o.url||lead.website))await supabaseRequest("website_audits",{method:"POST",body:{lead_id:id,url:o.url||lead.website,performance_score:o.performance_score??null,design_score:o.design_score??null,mobile_score:o.mobile_score??null,seo_score:o.seo_score??null,conversion_score:o.conversion_score??null,technology:o.technology||{},issues:o.issues||[],opportunities:o.opportunities||[],ai_summary:o.ai_summary||o.recommended_solution||null}});
  if(o.service==="app")await supabaseRequest("app_opportunities",{method:"POST",body:{lead_id:id,current_app:o.current_app||null,problem:o.problem||o.reason||null,recommended_app:o.recommended_app||o.recommended_solution||null,features:o.features||[],platform:o.platform||null,estimated_value:o.estimated_value==null?null:Number(o.estimated_value),ai_analysis:o.ai_analysis||o.reason||null}});
  if(o.service==="automation")await supabaseRequest("automation_opportunities",{method:"POST",body:{lead_id:id,current_process:o.current_process||null,pain_point:o.pain_point||o.reason||null,recommended_automation:o.recommended_automation||o.recommended_solution||null,tools:o.tools||[],workflow:o.workflow||{},estimated_time_saved:o.estimated_time_saved||null,estimated_value:o.estimated_value==null?null:Number(o.estimated_value),ai_analysis:o.ai_analysis||o.reason||null}});
  if(o.service==="ai_video")await supabaseRequest("video_opportunities",{method:"POST",body:{lead_id:id,brand:o.brand||lead.company_name,product:o.product||null,opportunity_type:o.opportunity_type||null,creative_angle:o.creative_angle||null,hook:o.hook||null,video_concept:o.video_concept||o.recommended_solution||null,platform:o.platform||null,estimated_value:o.estimated_value==null?null:Number(o.estimated_value),ai_analysis:o.ai_analysis||o.reason||null}});
 }
 await supabaseRequest("leads?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status:"qualified",raw_data:{...(lead.raw_data||{}),last_analysis:result}}});
 return res.json({lead_id:id,analysis:result,opportunities:created});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:400).json({error:error?.message||"Lead analysis failed",code:error?.code||"REQUEST_FAILED"});}}
