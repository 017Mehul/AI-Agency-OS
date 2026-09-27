import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {body,limit} from "../lib/validation.js";
export const methods=["GET","PATCH"];
export default async function(req,res){try{const user=await getAuthenticatedUser(bearerToken(req));
 if(req.method==="GET"){const u=new URL(req.url,"http://localhost"),unread=u.searchParams.get("unread"),q=["user_id=eq."+encodeURIComponent(user.id),"select=*","order=created_at.desc","limit="+limit(u.searchParams.get("limit"),50,100)].concat(unread==="true"?["read_at=is.null"]:[]).join("&");return res.json({notifications:await supabaseRequest("notifications?"+q)});}
 const input=body(req);if(!input.id)return res.status(400).json({error:"id is required"});const row=(await supabaseRequest("notifications?id=eq."+encodeURIComponent(input.id)+"&user_id=eq."+encodeURIComponent(user.id),{method:"PATCH",body:{read_at:new Date().toISOString()}}))[0];return res.json({notification:row});
}catch(error){return res.status(400).json({error:error?.message||"Notification request failed"});}}
