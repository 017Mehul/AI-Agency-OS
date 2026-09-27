// AI Agency OS — built by Mehul Gupta / MG Labs Co
const env=(typeof process!=="undefined"&&process.env)?process.env:{};
const DEFAULT_SUPABASE_URL="https://ejltkdfdfxunvtnahzra.supabase.co";
export const config={
  appName:env.APP_NAME||"AI Agency OS",
  brandName:env.BRAND_NAME||"MG Labs Co",
  ai:{provider:(env.AI_PROVIDER||"nvidia").toLowerCase(),model:env.AI_MODEL||"nvidia/nemotron-3.5-lightning-30b-a3b",baseUrl:env.AI_BASE_URL||"https://integrate.api.nvidia.com/v1",apiKey:env.AI_API_KEY||env.NVIDIA_API_KEY||env.OPENAI_API_KEY||""},
  supabase:{url:env.SUPABASE_URL||DEFAULT_SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY||""},
  automation:{provider:(env.AUTOMATION_PROVIDER||"activepieces").toLowerCase(),triggerUrl:env.ACTIVEPIECES_TRIGGER_URL||"",webhookSecret:env.ACTIVEPIECES_WEBHOOK_SECRET||"",m2mSecret:env.ACTIVEPIECES_M2M_SECRET||""}
};
export function requireConfig(value,message){if(!value)throw new Error(message);return value;}
