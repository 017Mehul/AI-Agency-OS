import {supabaseRequest} from "./supabase.js";
export async function notify(userId,type,title,message,metadata={}){
 if(!userId)return null;
 return (await supabaseRequest("notifications",{method:"POST",body:{user_id:userId,type,title,message,metadata}}))[0];
}
