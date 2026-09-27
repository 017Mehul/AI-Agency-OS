import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
export const methods=["GET","POST"];
export default async function(req,res){try{
 const internal=isInternalRequest(req);const user=internal?null:await getAuthenticatedUser(bearerToken(req));
 if(req.method==="GET"){const u=new URL(req.url,"http://localhost"),limit=Math.min(Number(u.searchParams.get("limit")||50),100),status=u.searchParams.get("status");let q="select=*&order=created_at.desc&limit="+limit;if(status)q+="&status=eq."+status;if(!internal)q+="&created_by=eq."+user.id;return res.json({leads:await supabaseRequest("leads?"+q)});}
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});if(!body.company_name)return res.status(400).json({error:"company_name is required"});const row=(await supabaseRequest("leads",{method:"POST",body:{created_by:internal?null:user.id,company_name:body.company_name,website:body.website||null,domain:body.domain||null,contact_name:body.contact_name||null,contact_email:body.contact_email||null,contact_role:body.contact_role||null,linkedin_url:body.linkedin_url||null,source:body.source||"manual",source_url:body.source_url||null,industry:body.industry||null,location:body.location||null,company_size:body.company_size||null,description:body.description||null,raw_data:body.raw_data||{},status:body.status||"new"}}))[0];return res.status(201).json({lead:row});
}catch(error){return res.status(400).json({error:error?.message||"Lead request failed"});}}
