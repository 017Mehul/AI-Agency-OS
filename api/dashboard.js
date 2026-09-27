import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
const count=async(table,filter="")=>(await supabaseRequest(table+"?select=id"+(filter?"&"+filter:""))).length;
export const methods=["GET"];
export default async function(req,res){try{
 const internal=isInternalRequest(req);
 const user=internal?null:await getAuthenticatedUser(bearerToken(req));
 const owner=user?.id;
 if(!internal&&!owner)return res.status(401).json({error:"Authentication required"});
 const ownerFilter=owner?"created_by=eq."+encodeURIComponent(owner):"";
 const leadIds=owner? (await supabaseRequest("leads?select=id&created_by=eq."+encodeURIComponent(owner))).map(x=>x.id):[];
 const leadFilter=owner&&leadIds.length?"lead_id=in.("+leadIds.join(",")+")":(owner?"lead_id=eq.__none__":"");
 const [missions,leads,proposals,approvals,tasks,runs,followups]=await Promise.all([
  count("missions",ownerFilter),
  count("leads",ownerFilter),
  count("proposals",leadFilter),
  count("approvals",leadFilter+"&status=eq.pending"),
  owner?count("mission_tasks","mission_id=in.("+(await supabaseRequest("missions?select=id&created_by=eq."+encodeURIComponent(owner))).map(x=>x.id).join(",")+")"):count("mission_tasks"),
  owner?count("agent_runs","mission_id=in.("+(await supabaseRequest("missions?select=id&created_by=eq."+encodeURIComponent(owner))).map(x=>x.id).join(",")+")"):count("agent_runs"),
  count("follow_ups",leadFilter+"&status=eq.pending")
 ]);
 const recent=internal?await supabaseRequest("agent_events?select=*&order=created_at.desc&limit=25"):
   leadIds.length?await supabaseRequest("agent_events?select=*&mission_id=in.("+(await supabaseRequest("missions?select=id&created_by=eq."+encodeURIComponent(owner))).map(x=>x.id).join(",")+")&order=created_at.desc&limit=25"):[];
 return res.json({metrics:{missions,leads,proposals,pending_approvals:approvals,tasks,agent_runs:runs,pending_follow_ups:followups},recent_events:recent});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:400).json({error:error?.message||"Dashboard request failed"});}}