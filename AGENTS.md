# AGENTS.md

Guidance for any AI agent working in this repository.

## Project goal

This repository is the home of a complete e-commerce platform built as microservices.

The current phase is **platform foundation**, not product features. The goal is to define and then build the layers every service needs to go live safely:

- Code management and CI/CD
- Servers, environments, and orchestration
- API gateway (single entry point)
- SSO / identity
- Microservice conventions
- Databases and backups
- File storage
- Logs, metrics, and audit
- Security
- Stability and reliability

Out of scope for now:

- Branding, visual design, marketing content
- Branding / marketing content for storefront (admin UI lab under `apps/admin-panel` is in progress; storefront connected later)

Start from `docs/README.md` for the full documentation map.

## Language rules

| Where | Language |
|---|---|
| Conversation with the user (chat replies) | **Persian (Farsi)** |
| Code, comments, identifiers, commit messages | **English** |
| Documentation, READMEs, ADRs, runbooks | **English** |
| File and folder names | **English** (kebab-case) |
| Config keys, log messages, error messages | **English** |

Never write Persian text into any file in this repository. If the user provides Persian content that must be stored, translate it to English first.

## Prompt workflow

The user writes prompts in Persian. Before doing the work, the agent must follow these steps:

1. **Review as a software engineer.** Check technical feasibility, architectural fit with `docs/`, impact on existing services, security, data, and operational risks, and missing technical details.
2. **Review as a project manager.** Check scope, priority relative to `docs/roadmap.md`, dependencies, acceptance criteria, and whether the request should be split into smaller steps.
3. **Discuss with the user in Persian.** Present both reviews briefly, raise open questions, and propose clarifications. Do not start implementing while there are material open questions.
4. **Translate.** Once agreed, write the final version of the prompt in clear English (goal, scope, out of scope, acceptance criteria). Show it to the user.
5. **Execute** using the English version as the source of truth.

For trivial requests (typo fixes, a single obvious edit), steps 1–3 can be a single short sentence, but step 4 still applies.

## Working rules

- Respect the current phase. If the user asks for structure or documentation only, do not write application code, Dockerfiles, manifests, or scripts.
- Keep `docs/` as the source of truth. When a decision changes, update the relevant doc and add an ADR in `docs/architecture/decisions/`.
- Every new service follows `docs/architecture/microservices.md` and is registered in `services/README.md`.
- Never commit secrets, credentials, real hostnames, or production data. Use placeholders.
- Each service owns its data. No service reads another service's database.
- Prefer small, reviewable changes.

## Repository layout

```
.
├── AGENTS.md                 Agent guidance (this file)
├── README.md                 Repository overview
├── docs/                     Source of truth: architecture, operations, runbooks
├── services/                 Business microservices (one folder per service)
├── platform/                 Shared platform components (gateway, identity/Keycloak, ...)
├── infrastructure/           Kubernetes and environment definitions
├── pipelines/                CI/CD pipeline definitions and conventions
├── packages/                 Shared JS/TS packages (Yarn workspaces)
└── apps/                     Client apps (`admin-panel` UI lab; storefront later)
```

Git submodules (after clone run `git submodule update --init --recursive`): Keycloak at `platform/identity/upstream/`, SigNoz at `platform/observability/upstream/`. JS packages: use Yarn from the repo root. Admin UI lab: `yarn dev:ui` (Prisma SQLite; no platform stack required). CI workflows under `.github/workflows/` push first-party images (`file-service`, `keycloak`, `signoz`) as `:<sha>` and `:main`.
