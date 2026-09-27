# Architecture

AI Agency OS is organized around a reusable execution model:

Mission → Orchestrator → Task DAG → Specialized Agents → QA → Human Approval → Execution → Follow-up → Analytics

The core engine remains provider-independent. AI providers, database persistence and workflow automation are isolated behind integration adapters.

## Safety

External outreach, publishing, deletion, payments and other irreversible actions must pass through the approval system.