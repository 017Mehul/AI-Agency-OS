import {aiJSON} from "../../../lib/ai.js";
import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../../../lib/supabase.js";
import {isInternalRequest} from "../../../lib/internal-auth.js";
export const methods=["POST"];
export default async function(req,res){try{
 const id=req.query?.id||new URL(req.url,"http://localhost").pathname.split("/").filter(Boolean).slice(-2,-1)[0];
 if(!id)return res.status(400).json({error:"lead id is required"});
 const leads=await supabaseRequest("leads?id=eq."+id+"&select=*"),lead=leads[0];if(!lead)return res.status(404).json({error:"Lead not found"});
 if(!isInternalRequest(req)){const user=await getAuthenticatedUser(bearerToken(req));if(lead.created_by&&lead.created_by!==user.id)return res.status(403).json({error:"Forbidden"});}
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
 let opportunity=null;
 if(body.opportunity_id){const rows=await supabaseRequest("lead_opportunities?id=eq."+body.opportunity_id+"&select=*");opportunity=rows[0]||null;}
 if(!opportunity){const rows=await supabaseRequest("lead_opportunities?lead_id=eq."+id+"&order=score.desc&limit=1&select=*");opportunity=rows[0]||null;}
 if(!opportunity)return res.status(409).json({error:"No opportunity found. Analyze the lead first."});
 const result=await aiJSON([{role:"system",content:"You are the Proposal Writer for an AI Agency OS. Draft a personalized proposal using only the supplied lead and opportunity. Never send it. Return JSON with subject, message, scope, deliverables, timeline, price and next_step."},{role:"user",content:JSON.stringify({lead,opportunity,requested_service:body.service||opportunity.service,price_hint:body.price_hint||null})}],{maxTokens:5000});
 const proposalData={...result,generated_by:"proposal-writer"};
 const row=(await supabaseRequest("proposals",{method:"POST",body:{lead_id:id,opportunity_id:opportunity.id,service:opportunity.service,subject:result.subject||"Proposal",message:result.message||"",proposal_data:proposalData,status:"draft"}}))[0];
 const approval=(await supabaseRequest("approvals",{method:"POST",body:{lead_id:id,action:"send_proposal",payload:{proposal_id:row.id,subject:row.subject,message:row.message},reason:"Proposal requires human approval before external outreach",status:"pending"}}))[0];
 return res.status(201).json({proposal:row,approval});
}catch(error){return res.status(400).json({error:error?.message||"Proposal generation failed"});}}
