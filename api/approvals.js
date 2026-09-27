import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
import {assertApprovalOwner,assertMissionOwner} from "../lib/authz.js";
import {body} from "../lib/validation.js";
import {notify} from "../lib/notifications.js";
export const methods=["GET","POST"];
async function resolveUser(req){const token=bearerToken(req);if(isInternalRequest(req))return{id:null,internal:true,token:null};return{id:(await getAuthenticatedUser(token)).id,internal:false,token};}
export default async function(req,res){try{
 const user=await resolveUser(req);
 if(req.method==="GET"){const u=new URL(req.url,"http://localhost"),id=u.searchParams.get("id"),status=u.searchParams.get("status")||"pending",missionId=u.searchParams.get("mission_id");if(!user.internal&&!missionId&&!id)return res.status(400).json({error:"mission_id or id is required"});if(!user.internal&&missionId)await assertMissionOwner(missionId,user.id,user.token);const q=[id?"id=eq."+encodeURIComponent(id):"",missionId?"mission_id=eq."+encodeURIComponent(missionId):"","status=eq."+encodeURIComponent(status),"select=*","order=created_at.desc"].filter(Boolean).join("&");const approvals=await supabaseRequest("approvals?"+q,{accessToken:user.internal?undefined:user.token});if(!user.internal&&id&&approvals[0])await assertApprovalOwner(id,user.id,user.token);return res.json({approvals});}
 const input=body(req);if(!input.id)return res.status(400).json({error:"id is required"});const rows=await supabaseRequest("approvals?id=eq."+encodeURIComponent(input.id)+"&select=*",{accessToken:user.internal?undefined:user.token}),approval=rows[0];if(!approval)return res.status(404).json({error:"Approval not found"});if(!user.internal)await assertApprovalOwner(approval.id,user.id,user.token);
 const action=String(input.action||"").toLowerCase();if(!["approve","reject"].includes(action))return res.status(400).json({error:"action must be approve or reject"});const status=action==="approve"?"approved":"rejected";
 const updatedRows=await supabaseRequest("approvals?id=eq."+encodeURIComponent(input.id)+"&status=eq.pending",{method:"PATCH",body:{status,approved_by:user.internal?null:user.id,resolved_at:new Date().toISOString()},accessToken:user.internal?undefined:user.token});
 if(!updatedRows.length)return res.status(409).json({error:"Approval was already resolved"});
 const updated=updatedRows[0];
 if(approval.mission_id){const m=(await supabaseRequest("missions?id=eq."+encodeURIComponent(approval.mission_id)+"&select=created_by"))[0];if(m?.created_by)await notify(m.created_by,"approval_resolved","Approval "+status,"Approval "+approval.action+" was "+status,{approval_id:approval.id,mission_id:approval.mission_id});}else if(approval.lead_id){const l=(await supabaseRequest("leads?id=eq."+encodeURIComponent(approval.lead_id)+"&select=created_by"))[0];if(l?.created_by)await notify(l.created_by,"approval_resolved","Approval "+status,"Lead approval was "+status,{approval_id:approval.id,lead_id:approval.lead_id});}
 if(approval.task_id)await supabaseRequest("mission_tasks?id=eq."+encodeURIComponent(approval.task_id),{method:"PATCH",body:{status:action==="approve"?"ready":"cancelled",locked_at:null}});
 if(approval.mission_id)await supabaseRequest("missions?id=eq."+encodeURIComponent(approval.mission_id),{method:"PATCH",body:{status:action==="approve"?"running":"cancelled"}});
 await supabaseRequest("agent_events",{method:"POST",body:{mission_id:approval.mission_id||null,task_id:approval.task_id||null,event_type:"approval_"+status,message:"Approval "+status,metadata:{approval_id:approval.id,action}}});
 return res.json({approval:updated,status});
}catch(error){const code=error?.code==="FORBIDDEN"?403:error?.code==="NOT_FOUND"?404:400;return res.status(code).json({error:error?.message||"Approval request failed",code:error?.code||"REQUEST_FAILED"});}}
