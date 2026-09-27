import {aiJSON} from "./ai.js";
import {supabaseRequest} from "./supabase.js";

const AGENT_RULES={
  "orchestrator":"Turn the mission into a practical execution plan. Return JSON with tasks[]. Each task must have title, description, agent_slug, priority, dependencies, requires_approval and input.",
  "research-agent":"Research the provided business or market context from the supplied data only. Return structured findings, assumptions, risks and next_actions. Do not invent external facts.",
  "lead-hunter":"Analyze supplied lead/prospect information and return qualification, fit signals, missing information and recommended next action.",
  "website-auditor":"Analyze supplied website information and return scores/issues/opportunities. Do not claim live measurements unless provided.",
  "app-strategist":"Identify app/product opportunities from the supplied context. Return problem, recommended_app, features, platform, value rationale and risks.",
  "automation-architect":"Design an automation from the supplied process. Return trigger, steps, systems, data flow, failure handling and approval points.",
  "ai-video-strategist":"Design an AI-video opportunity from supplied context. Return concept, audience, hook, scenes, production approach and CTA.",
  "proposal-writer":"Draft a personalized proposal from supplied lead/opportunity data. Return subject, message, scope, deliverables, timeline and price assumptions. Do not send it.",
  "qa-inspector":"Validate another agent output against the supplied goal. Return pass, issues, corrections and confidence.",
  "follow-up-manager":"Draft an approval-aware follow-up plan. Never send outreach. Return timing, channel, message and reason.",
  "analytics-analyst":"Analyze supplied execution metrics and return findings, anomalies and optimization actions."
};

function json(value){return value??{};}

async function insert(table,row){return (await supabaseRequest(table,{method:"POST",body:row}))[0];}
async function patch(table,query,row){return (await supabaseRequest(`${table}?${query}`,{method:"PATCH",body:row}))[0];}

export async function createMission({userId,title,goal,services=[],priority="normal",targetCount=0}){
  const mission=await insert("missions",{created_by:userId,title,goal,services,priority,target_count:targetCount});
  await insert("agent_events",{mission_id:mission.id,event_type:"mission_created",message:"Mission created",metadata:{services}});
  return mission;
}

export async function planMission(mission){
  const agents=await supabaseRequest("agents?status=eq.active&select=id,name,slug,role,description,capabilities");
  const planner=agents.find(a=>a.slug==="orchestrator");
  if(!planner) throw new Error("Orchestrator agent is not seeded");

  await patch("missions?id=eq."+mission.id,"", {status:"planning"});
  const plan=await aiJSON([
    {role:"system",content:"You are the Orchestrator for an AI Agency OS. Create an executable, dependency-aware plan. Only use the supplied mission context. Return valid JSON."},
    {role:"user",content:JSON.stringify({mission:{title:mission.title,goal:mission.goal,services:mission.services,priority:mission.priority,target_count:mission.target_count},available_agents:agents.map(a=>({slug:a.slug,name:a.name,role:a.role,capabilities:a.capabilities})),instructions:AGENT_RULES.orchestrator})}
  ],{maxTokens:5000});

  const tasks=Array.isArray(plan.tasks)?plan.tasks:[];
  if(!tasks.length) throw new Error("Orchestrator returned no tasks");

  const slugSet=new Set(agents.map(a=>a.slug));
  const created=[];
  for(let i=0;i<tasks.length;i++){
    const t=tasks[i];
    const slug=slugSet.has(t.agent_slug)?t.agent_slug:"research-agent";
    const agent=agents.find(a=>a.slug===slug)||planner;
    const deps=Array.isArray(t.dependencies)?t.dependencies.map(d=>Number(d)).filter(Number.isInteger):[];
    const row=await insert("mission_tasks",{
      mission_id:mission.id,agent_id:agent.id,title:String(t.title||`Task ${i+1}`),
      description:String(t.description||""),status:deps.length?"pending":"ready",
      priority:Number(t.priority??50),input:json(t.input),dependencies:deps
    });
    created.push(row);
  }

  const planPayload={...plan,tasks:created.map(t=>({id:t.id,title:t.title,agent_id:t.agent_id,status:t.status,dependencies:t.dependencies}))};
  const updated=await patch("missions?id=eq."+mission.id,"",{status:"planning_complete",plan:planPayload});
  await insert("agent_events",{mission_id:mission.id,agent_id:planner.id,event_type:"mission_planned",message:`Created ${created.length} tasks`,metadata:{task_count:created.length}});
  return {mission:updated,tasks:created};
}

function taskNeedsApproval(task){
  const input=task.input||{};
  if(input.requires_approval===true) return true;
  if(input.external_action===true) return true;
  if(["send","publish","delete","deploy","contact","email","dm","outreach","purchase","irreversible"].some(k=>String(task.title+" "+task.description).toLowerCase().includes(k))) return true;
  return false;
}

async function refreshReadyTasks(missionId){
  const tasks=await supabaseRequest(`mission_tasks?mission_id=eq.${missionId}&select=*`);
  const completed=new Set(tasks.filter(t=>t.status==="completed").map(t=>t.id));
  for(const t of tasks){
    if(t.status!=="pending"||!Array.isArray(t.dependencies)||!t.dependencies.length) continue;
    if(t.dependencies.every(d=>completed.has(d))) await patch("mission_tasks?id=eq."+t.id,"",{status:"ready"});
  }
  return tasks;
}

export async function runNextTask(mission){
  await refreshReadyTasks(mission.id);
  const tasks=await supabaseRequest(`mission_tasks?mission_id=eq.${mission.id}&status=eq.ready&order=priority.asc,created_at.asc&limit=1&select=*`);
  if(!tasks.length){
    const remaining=await supabaseRequest(`mission_tasks?mission_id=eq.${mission.id}&status=in.(pending,ready,running)&select=id,status`);
    const approvals=await supabaseRequest(`approvals?mission_id=eq.${mission.id}&status=eq.pending&select=id`);
    if(approvals.length){return {status:"waiting_approval",approvals};}
    if(!remaining.length){
      const done=await patch("missions?id=eq."+mission.id,"",{status:"completed",completed_at:new Date().toISOString()});
      return {status:"completed",mission:done};
    }
    return {status:"blocked",message:"No task is currently ready"};
  }

  const task=tasks[0];
  const agents=await supabaseRequest(`agents?id=eq.${task.agent_id}&select=*`);
  const agent=agents[0];
  if(!agent) throw new Error("Assigned agent not found");

  if(taskNeedsApproval(task)){
    const existing=await supabaseRequest(`approvals?task_id=eq.${task.id}&status=eq.pending&select=id`);
    if(!existing.length){
      await insert("approvals",{mission_id:mission.id,task_id:task.id,type:"external_action",payload:{task_id:task.id,title:task.title,description:task.description,input:task.input},reason:"External or irreversible action requires human approval",status:"pending"});
    }
    await patch("missions?id=eq."+mission.id,"",{status:"waiting_approval"});
    await insert("agent_events",{mission_id:mission.id,task_id:task.id,agent_id:agent.id,event_type:"approval_required",message:"Human approval required before execution",metadata:{}});
    return {status:"waiting_approval",task};
  }

  await patch("mission_tasks?id=eq."+task.id,"",{status:"running",started_at:new Date().toISOString()});
  const run=await insert("agent_runs",{mission_id:mission.id,task_id:task.id,agent_id:agent.id,status:"running",attempt:1,input:task.input});
  try{
    const output=await aiJSON([
      {role:"system",content:`You are the ${agent.name} in an AI Agency OS. ${AGENT_RULES[agent.slug]||agent.description||"Complete the task safely and return structured JSON."} Never perform external actions yourself.`},
      {role:"user",content:JSON.stringify({mission:{id:mission.id,title:mission.title,goal:mission.goal,services:mission.services},task:{id:task.id,title:task.title,description:task.description,input:task.input},agent:{name:agent.name,role:agent.role,capabilities:agent.capabilities}})}
    ],{maxTokens:5000});
    await patch("mission_tasks?id=eq."+task.id,"",{status:"completed",output,completed_at:new Date().toISOString()});
    await patch("agent_runs?id=eq."+run.id,"",{status:"completed",output,completed_at:new Date().toISOString()});
    await insert("agent_events",{mission_id:mission.id,task_id:task.id,agent_id:agent.id,event_type:"task_completed",message:`${agent.name} completed task`,metadata:{output}});
    const refreshed=await refreshReadyTasks(mission.id);
    if(refreshed.some(t=>t.status==="ready")) await patch("missions?id=eq."+mission.id,"",{status:"running"});
    return {status:"completed",task_id:task.id,agent:agent.name,output};
  }catch(error){
    await patch("mission_tasks?id=eq."+task.id,"",{status:"failed",output:{error:error.message}});
    await patch("agent_runs?id=eq."+run.id,"",{status:"failed",error:error.message,completed_at:new Date().toISOString()});
    await patch("missions?id=eq."+mission.id,"",{status:"failed"});
    await insert("agent_events",{mission_id:mission.id,task_id:task.id,agent_id:agent.id,event_type:"task_failed",message:error.message,metadata:{}});
    throw error;
  }
}

export async function getMission(id){
  const missions=await supabaseRequest(`missions?id=eq.${id}&select=*`);
  if(!missions.length) throw new Error("Mission not found");
  const tasks=await supabaseRequest(`mission_tasks?mission_id=eq.${id}&select=*&order=created_at.asc`);
  const approvals=await supabaseRequest(`approvals?mission_id=eq.${id}&select=*&order=created_at.desc`);
  return {mission:missions[0],tasks,approvals};
}
