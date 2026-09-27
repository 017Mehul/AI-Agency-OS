# Providers

## AI

Set `AI_PROVIDER=nvidia` or `AI_PROVIDER=openai`.

NVIDIA uses `NVIDIA_API_KEY`; OpenAI uses `OPENAI_API_KEY`.

## Database

Supabase configuration uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Service credentials remain server-side.

## Automation

Activepieces uses `ACTIVEPIECES_TRIGGER_URL` and `ACTIVEPIECES_WEBHOOK_SECRET`.

### Activepieces M2M execution

Internal automation calls use `Authorization: Bearer <ACTIVEPIECES_M2M_SECRET>` against `/api/heartbeat` and `/api/mission-run`. Keep `ACTIVEPIECES_M2M_SECRET` only in Vercel and in the matching Activepieces secret connection. Never commit or paste the value into source control.

Never commit these values.