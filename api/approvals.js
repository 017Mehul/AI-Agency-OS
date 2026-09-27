import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
export const methods=["GET","POST"];
async function resolveUser(req){if(isInternalRequest(req))return{id:null,internal:true};return{id:(await getAuthenticatedUser(bearerToken(req))).id,internal:false};}
export default async function(req,res){try{
 const user=await resolveUser(req);
 if(req.method==="GET"){const u=new URL(req.url,"http://localhost"),id=u.searchParams.get("id"),status=u.searchParams.get("status")||"pending",missionId=u.searchParams.get("mission_id");const q=[id?"id=eq."+id:"",missionId?"mission_id=eq."+missionId:"","status=eq."+status,"select=*","order=created_at.desc"].filter(Boolean).join("&");return res.json({approvals:await supabaseRequest("approvals?"+q)});}
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});if(!body.id)return res.status(400).json({error:"id is required"});
 const rows=await supabaseRequest("approvals?id=eq."+body.id+"&select=*"),approval=rows[0];if(!approval)return res.status(404).json({error:"Approval not found"});if(approval.status!=="pending")return res.status(409).json({error:"Approval is already "+approval.status});
 const action=String(body.action||"").toLowerCase();if(!["approve","reject"].includes(action))return res.status(400).json({error:"action must be approve or reject"});
 const status=action==="approve"?"approved":"rejected";
 const updated=(await supabaseRequest("approvals?id=eq."+body.id,{method:"PATCH",body:{status,approved_by:user.id,resolved_at:new Date().toISOString()}}))[0];
 if(approval.task_id)await supabaseRequest("mission_tasks?id=eq."+approval.task_id,{method:"PATCH",body:{status:action==="approve"?"ready":"cancelled"}});
 if(approval.mission_id)await supabaseRequest("missions?id=eq."+approval.mission_id,{method:"PATCH",body:{status:action==="approve"?"running":"cancelled"}});
 await supabaseRequest("agent_events",{method:"POST",body:{mission_id:approval.mission_id||null,task_id:approval.task_id||null,event_type:"approval_"+status,message:"Approval "+status,metadata:{approval_id:approval.id,action}}});
 return res.json({approval:updated,status});
}catch(error){return res.status(400).json({error:error?.message||"Approval request failed"});}}
