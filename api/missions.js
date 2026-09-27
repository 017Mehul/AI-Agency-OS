import {bearerToken,getAuthenticatedUser} from "../lib/supabase.js";
import {createMission,planMission,getMission} from "../lib/mission-engine.js";

export const methods=["GET","POST"];

function sendError(res,error){res.status(400).json({error:error?.message||"Request failed"});}

export default async function(req,res){
  try{
    const token=bearerToken(req);
    const user=await getAuthenticatedUser(token);
    if(req.method==="GET"){
      const id=new URL(req.url,"http://localhost").searchParams.get("id");
      if(!id) return res.status(400).json({error:"id is required"});
      const data=await getMission(id);
      if(data.mission.created_by&&data.mission.created_by!==user.id) return res.status(403).json({error:"Forbidden"});
      return res.json(data);
    }
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
    const action=body.action||"create";
    if(action==="create"){
      const mission=await createMission({userId:user.id,title:body.title,goal:body.goal,services:body.services||[],priority:body.priority||"normal",targetCount:body.target_count||0});
      return res.status(201).json({mission});
    }
    if(action==="plan"){
      const data=await getMission(body.id);
      if(data.mission.created_by!==user.id) return res.status(403).json({error:"Forbidden"});
      return res.json(await planMission(data.mission));
    }
    return res.status(400).json({error:"Unsupported action. Use create or plan."});
  }catch(error){return sendError(res,error);}
}
