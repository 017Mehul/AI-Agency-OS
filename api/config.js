export const access="public";
import {config} from "../lib/config.js";
export const methods=["GET"];
export default async function(req,res){res.setHeader("Cache-Control","no-store");res.json({appName:config.appName,brandName:config.brandName,aiProvider:config.ai.provider,aiModel:config.ai.model,supabaseUrl:config.supabase.url,supabasePublishableKey:config.supabase.publishableKey||null,supabaseConfigured:Boolean(config.supabase.publishableKey),automationProvider:config.automation.provider});}
