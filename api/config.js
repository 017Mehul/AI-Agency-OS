export const access="public";
import {config,requireConfig} from "../lib/config.js";
export const methods=["GET"];
export default async function(req,res){const supabaseUrl=requireConfig(config.supabase.url,"SUPABASE_URL is not configured");const supabasePublishableKey=requireConfig(config.supabase.publishableKey,"SUPABASE_PUBLISHABLE_KEY is not configured");res.setHeader("Cache-Control","no-store");res.json({appName:config.appName,brandName:config.brandName,aiProvider:config.ai.provider,supabaseUrl,supabasePublishableKey});}