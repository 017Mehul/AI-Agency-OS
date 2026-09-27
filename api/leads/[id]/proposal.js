import {aiJSON} from "../../../lib/ai.js";
import {validateProposal} from "../../../lib/ai-schema.js";
import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../../../lib/supabase.js";
import {isInternalRequest} from "../../../lib/internal-auth.js";
import {assertLeadOwner} from "../../../lib/authz.js";
import {body} from "../../../lib/validation.js";
export const methods=["POST"];
export default async function(req,res){try{
 const id=req.query?.id||new URL(req.url,"http://localhost").pathname.split("/").filter(Boolean).slice(-2,-1)[0];if(!id)return res.status(400).json({error:"lead id is required"});
 const token=bearerToken(req),internal=isInternalRequest(req),leads=await supabaseRequest("leads?id=eq."+encodeURIComponent(id)+"&select=*",{accessToken:internal?undefined:token}),lead=leads[0];if(!lead)return res.status(404).json({error:"Lead not found"});
 if(!internal){const user=await getAuthenticatedUser(token);await assertLeadOwner(id,user.id,token);}
 const input=body(req);let opportunity=null;if(input.opportunity_id){opportunity=(await supabaseRequest("lead_opportunities?id=eq."+encodeURIComponent(input.opportunity_id)+"&select=*",{accessToken:internal?undefined:token}))[0]||null;if(opportunity&&opportunity.lead_id!==id)return res.status(403).json({error:"Opportunity does not belong to lead"});}if(!opportunity)opportunity=(await supabaseRequest("lead_opportunities?lead_id=eq."+encodeURIComponent(id)+"&order=score.desc&limit=1&select=*",{accessToken:internal?undefined:token}))[0]||null;if(!opportunity)return res.status(409).json({error:"No opportunity found. Analyze the lead first."});
 const existing=(await supabaseRequest("proposals?opportunity_id=eq."+encodeURIComponent(opportunity.id)+"&status=in.(draft,pending_approval,approved,sent)&order=created_at.desc&limit=1&select=*",{accessToken:internal?undefined:token}))[0];if(existing){const approval=(await supabaseRequest("approvals?lead_id=eq."+encodeURIComponent(id)+"&status=eq.pending&order=created_at.desc&limit=1&select=*",{accessToken:internal?undefined:token}))[0]||null;return res.status(200).json({proposal:existing,approval,idempotent:true});}
 const result=validateProposal(await aiJSON([{role:"system",content:"You are the Proposal Writer for an AI Agency OS. Draft a personalized proposal using only supplied lead and opportunity. Never send it. Return subject, message, scope, deliverables, timeline, price and next_step."},{role:"user",content:JSON.stringify({lead,opportunity,requested_service:input.service||opportunity.service,price_hint:input.price_hint||null})}],{maxTokens:5000}));
 const row=(await supabaseRequest("proposals",{method:"POST",body:{lead_id:id,opportunity_id:opportunity.id,service:opportunity.service,subject:result.subject,message:result.message,proposal_data:{...result,generated_by:"proposal-writer"},status:"pending_approval"},accessToken:internal?undefined:token}))[0];
 const approval=(await supabaseRequest("approvals",{method:"POST",body:{lead_id:id,action:"send_proposal",payload:{proposal_id:row.id,subject:row.subject,message:row.message},reason:"Proposal requires human approval before external outreach",status:"pending"},accessToken:internal?undefined:token}))[0];
 return res.status(201).json({proposal:row,approval});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:error?.code==="NOT_FOUND"?404:error?.code==="AI_SCHEMA_INVALID"?422:400).json({error:error?.message||"Proposal generation failed",code:error?.code||"REQUEST_FAILED"});}}
