# Security

Never commit secrets to this repository.

Keep these values private:
- NVIDIA/OpenAI API keys
- Supabase service-role/service tokens
- Activepieces webhook secrets and private workflow credentials
- Vercel deployment credentials
- GitHub tokens

Only public Supabase configuration intended for browser use may be exposed to the frontend.

Use deployment environment variables for runtime secrets. If a credential is ever committed, revoke and rotate it immediately.

**AI Agency OS was created by Mehul Gupta · MG Labs Co.**
