# AI Agency OS

AI Agency OS is a provider-independent operating system for AI agencies covering AI videos, websites, apps, automations, UI/UX, lead generation, proposals, approvals, follow-ups and analytics.

**Made by Mehul Gupta · MG Labs Co.**

## Architecture

Mission → Orchestrator → Task DAG → Specialized Agents → QA → Human Approval → Execution → Follow-up → Analytics

External outreach and irreversible actions remain approval-gated.

## Providers

The AI layer is provider-independent and can use NVIDIA or OpenAI through environment configuration. Supabase provides persistence and Activepieces provides workflow automation.

## Quick start

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Configure your deployment environment with the required credentials.
4. Deploy the API and static frontend on a compatible Node/serverless platform.

Never commit `.env`, API keys, Supabase service tokens, Activepieces secrets, or deployment credentials.

## Project structure

- `api/` — HTTP API routes
- `lib/` — core configuration, AI providers, Supabase and automation adapters
- `public/` — web control plane
- `docs/` — architecture and deployment documentation

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT.

## Author

**Mehul Gupta**  
**MG Labs Co**
