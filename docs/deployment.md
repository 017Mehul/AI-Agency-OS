# Deployment

AI Agency OS is deployed as a serverless Node.js application on Vercel with Supabase as the data layer.

## Required environment

Configure these privately in Vercel:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_TOKEN for server-side database operations
- NVIDIA_API_KEY when using NVIDIA/Nemotron
- AI_PROVIDER
- AI_MODEL
- AI_BASE_URL

For Activepieces integration, keep these private:

- ACTIVEPIECES_TRIGGER_URL
- ACTIVEPIECES_WEBHOOK_SECRET
- ACTIVEPIECES_M2M_SECRET

Never commit any of these values to GitHub.

## Backend surface

Application endpoints include:

- /api/health
- /api/config
- /api/missions
- /api/mission-run
- /api/leads
- /api/leads/[id]/analyze
- /api/leads/[id]/proposal
- /api/proposals
- /api/approvals
- /api/follow-ups
- /api/dashboard

Automation-only endpoints:

- /api/heartbeat
- /api/activepieces-callback

Automation endpoints require ACTIVEPIECES_M2M_SECRET.

## Deployment verification

After each push, Vercel automatically creates a production deployment from main.

Verify the deployment reaches READY, /api/health responds with status ok, Supabase credentials are present, and Nemotron requests succeed when enabled.

Never expose secret values in repository source, build logs, or client responses.

## Activepieces

Activepieces workflow construction is intentionally kept outside this repository. The repository exposes the backend contract; Activepieces handles orchestration and external execution.

The remaining Activepieces work is to replace the workflow stubs with these backend endpoints and finish the approved follow-up/messaging branch.
