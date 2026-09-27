# Deployment

The application is designed for serverless Node.js deployment, including Vercel.

1. Import the repository.
2. Configure environment variables from `.env.example`.
3. Keep all secret values in the deployment provider.
4. Deploy.
5. Verify `/api/health`.
6. Verify the frontend receives only the intended public Supabase configuration.

Do not put production credentials in GitHub.