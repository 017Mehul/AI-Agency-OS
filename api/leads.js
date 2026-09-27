import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
export const methods=["GET","POST"];
export default async function(req,res){try{
 const token=bearerToken(req),internal=isInternalRequest(req);const user=internal?null:await getAuthenticatedUser(token);
 if(req.method==="GET"){const u=new URL(req.url,"http://localhost"),limit=Math.min(Math.max(Number(u.searchParams.get("limit")||50),1),100),status=u.searchParams.get("status");let q="select=*&order=created_at.desc&limit="+limit;if(status)q+="&status=eq."+encodeURIComponent(status);if(!internal)q+="&created_by=eq."+encodeURIComponent(user.id);return res.json({leads:await supabaseRequest("leads?"+q,{accessToken:internal?undefined:token})});}
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});if(!body.company_name)return res.status(400).json({error:"company_name is required"});
 const row=(await supabaseRequest("leads",{method:"POST",body:{created_by:internal?null:user.id,company_name:String(body.company_name).trim(),website:body.website||null,domain:body.domain||null,contact_name:body.contact_name||null,contact_email:body.contact_email||null,contact_role:body.contact_role||null,linkedin_url:body.linkedin_url||null,source:body.source||"manual",source_url:body.source_url||null,industry:body.industry||null,location:body.location||null,company_size:body.company_size||null,description:body.description||null,raw_data:body.raw_data||{},status:body.status||"new"}},accessToken:internal?undefined:token}))[0];
 return res.status(201).json({lead:row});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:400).json({error:error?.message||"Lead request failed",code:error?.code||"REQUEST_FAILED"});}}
