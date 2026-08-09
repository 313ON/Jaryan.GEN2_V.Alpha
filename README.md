# Jaryan Engineering Portal Monorepo

A modular monolith built with TypeScript, NestJS, Next.js, and PNPM/npm workspaces.

## Architecture

This repository follows a **Modular Monolith** pattern, where all modules live in a single deployable unit but maintain strict internal boundaries.

### Layers

- **Domain** (`packages/shared-domain`): Pure TypeScript business rules. No frameworks, no I/O.
- **Application** (`packages/shared-application`): Ports, use cases, and orchestration.
- **Infrastructure** (`packages/shared-infrastructure`): Prisma adapters, S3, external services.
- **Types** (`packages/shared-types`): Shared DTOs and common interfaces.

### Apps

- **Web** (`apps/web`): Next.js frontend.
- **API** (`apps/api`): NestJS backend.

### Boundaries

- All modules are **project-scoped by default** via `ProjectContext`.
- **Server-side authorization only**; the UI never makes security decisions.
- No direct database access across modules; all persistence goes through **ports**.
- No microservices, no plugin architecture, no legacy code duplication.
