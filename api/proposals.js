import {bearerToken,getAuthenticatedUser,supabaseRequest} from "../lib/supabase.js";
import {isInternalRequest} from "../lib/internal-auth.js";
import {assertLeadOwner} from "../lib/authz.js";
import {body,limit} from "../lib/validation.js";
export const methods=["GET","PATCH"];
export default async function(req,res){try{
 const internal=isInternalRequest(req),user=internal?null:await getAuthenticatedUser(bearerToken(req));
 if(req.method==="GET"){
  const u=new URL(req.url,"http://localhost"),id=u.searchParams.get("id"),status=u.searchParams.get("status"),leadId=u.searchParams.get("lead_id");
  if(!internal&&!id&&!leadId)return res.status(400).json({error:"lead_id or id is required"});
  if(!internal&&leadId)await assertLeadOwner(leadId,user.id);
  let q=id?"id=eq."+encodeURIComponent(id):"select=*&order=created_at.desc&limit="+limit(u.searchParams.get("limit"),100,100);
  if(id)q+="&select=*";if(status)q+="&status=eq."+encodeURIComponent(status);if(leadId)q+="&lead_id=eq."+encodeURIComponent(leadId);
  const proposals=await supabaseRequest("proposals?"+q);
  if(!internal&&id&&proposals[0])await assertLeadOwner(proposals[0].lead_id,user.id);
  return res.json({proposals});
 }
 const input=body(req);if(!input.id)return res.status(400).json({error:"id is required"});
 const current=(await supabaseRequest("proposals?id=eq."+encodeURIComponent(input.id)+"&select=*"))[0];if(!current)return res.status(404).json({error:"Proposal not found"});
 if(!internal)await assertLeadOwner(current.lead_id,user.id);
 const patch={};for(const k of ["status","subject","message","proposal_data"])if(input[k]!==undefined)patch[k]=input[k];
 const row=(await supabaseRequest("proposals?id=eq."+encodeURIComponent(input.id),{method:"PATCH",body:patch}))[0];return res.json({proposal:row});
}catch(error){return res.status(error?.code==="FORBIDDEN"?403:error?.code==="NOT_FOUND"?404:400).json({error:error?.message||"Proposal request failed",code:error?.code||"REQUEST_FAILED"});}}
