export const access="public";
import {config} from "../lib/config.js";
export const methods=["GET"];
export default async function(req,res){
  res.setHeader("Cache-Control","no-store");
  return res.json({
    appName:config.appName,
    brandName:config.brandName,
    aiProvider:config.ai.provider,
    aiModel:config.ai.model,
    supabaseUrl:config.supabase.url,
    supabaseConfigured:Boolean(config.supabase.publishableKey),
    automationProvider:config.automation.provider
  });
}
