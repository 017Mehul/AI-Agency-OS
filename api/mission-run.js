import {bearerToken,getAuthenticatedUser} from "../lib/supabase.js";
import {getMission,runNextTask} from "../lib/mission-engine.js";

export const methods=["POST"];

export default async function(req,res){
  try{
    const user=await getAuthenticatedUser(bearerToken(req));
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
    if(!body.id) return res.status(400).json({error:"id is required"});
    const data=await getMission(body.id);
    if(data.mission.created_by!==user.id) return res.status(403).json({error:"Forbidden"});
    if(!["planning_complete","running","waiting_approval"].includes(data.mission.status)) return res.status(409).json({error:`Mission status ${data.mission.status} cannot run`});
    if(data.mission.status==="waiting_approval") return res.json({status:"waiting_approval",approvals:data.approvals.filter(a=>a.status==="pending")});
    const result=await runNextTask(data.mission);
    return res.json(result);
  }catch(error){return res.status(400).json({error:error?.message||"Mission run failed"});}
}
