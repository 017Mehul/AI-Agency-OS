import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
export const methods=["GET"];
const count=async(table,filter="")=>(await supabaseRequest(table+"?select=id"+(filter?"&"+filter:""))).length;
export default async function(req,res){try{
 const internal=isInternalRequest(req);const user=internal?null:await getAuthenticatedUser(bearerToken(req));const owner=user?.id;
 const ownerFilter=owner?"created_by=eq."+owner:"";
 const [missions,leads,proposals,approvals,tasks,runs,followups]=await Promise.all([
  count("missions",ownerFilter),count("leads",ownerFilter),count("proposals"),count("approvals","status=eq.pending"),count("mission_tasks"),count("agent_runs"),count("follow_ups","status=eq.pending")
 ]);
 const recent=await supabaseRequest("agent_events?select=*&order=created_at.desc&limit=25");
 return res.json({metrics:{missions,leads,proposals,pending_approvals:approvals,tasks,agent_runs:runs,pending_follow_ups:followups},recent_events:recent});
}catch(error){return res.status(400).json({error:error?.message||"Dashboard request failed"});}}
