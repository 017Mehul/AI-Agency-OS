import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
const count=async(table,filter="",accessToken)=> (await supabaseRequest(table+"?select=id"+(filter?"&"+filter:""),{accessToken})).length;
export const methods=["GET"];
export default async function(req,res){try{
 const internal=isInternalRequest(req),token=bearerToken(req),user=internal?null:await getAuthenticatedUser(token);
 if(!internal&&!user?.id)return res.status(401).json({error:"Authentication required"});
 if(internal){const [missions,leads,proposals,approvals,tasks,runs,followups,recent]=await Promise.all([count("missions"),count("leads"),count("proposals"),count("approvals","status=eq.pending"),count("mission_tasks"),count("agent_runs"),count("follow_ups","status=eq.pending"),supabaseRequest("agent_events?select=*&order=created_at.desc&limit=25")]);return res.json({metrics:{missions,leads,proposals,pending_approvals:approvals,tasks,agent_runs:runs,pending_follow_ups:followups},recent_events:recent});}
 const owner=encodeURIComponent(user.id);
 const [missionRows,leadRows]=await Promise.all([supabaseRequest("missions?select=id&created_by=eq."+owner,{accessToken:token}),supabaseRequest("leads?select=id&created_by=eq."+owner,{accessToken:token})]);
 const missionIds=missionRows.map(x=>x.id),leadIds=leadRows.map(x=>x.id);const inFilter=(field,ids)=>ids.length?field+"=in.("+ids.join(",")+")":null;
 const [missions,leads,proposals,approvals,tasks,runs,followups,recent]=await Promise.all([Promise.resolve(missionRows.length),Promise.resolve(leadRows.length),inFilter("lead_id",leadIds)?count("proposals",inFilter("lead_id",leadIds),token):Promise.resolve(0),inFilter("lead_id",leadIds)?count("approvals",inFilter("lead_id",leadIds)+"&status=eq.pending",token):Promise.resolve(0),inFilter("mission_id",missionIds)?count("mission_tasks",inFilter("mission_id",missionIds),token):Promise.resolve(0),inFilter("mission_id",missionIds)?count("agent_runs",inFilter("mission_id",missionIds),token):Promise.resolve(0),inFilter("lead_id",leadIds)?count("follow_ups",inFilter("lead_id",leadIds)+"&status=eq.pending",token):Promise.resolve(0),inFilter("mission_id",missionIds)?supabaseRequest("agent_events?select=*&"+inFilter("mission_id",missionIds)+"&order=created_at.desc&limit=25",{accessToken:token}):Promise.resolve([])]);
 return res.json({metrics:{missions,leads,proposals,pending_approvals:approvals,tasks,agent_runs:runs,pending_follow_ups:followups},recent_events:recent});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:400).json({error:error?.message||"Dashboard request failed"});}}
