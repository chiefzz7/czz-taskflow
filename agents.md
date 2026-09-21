# AGENTS.md

# TaskFlow Engineering Guidelines

Este documento define as regras que qualquer agente de IA deve seguir ao trabalhar no repositório **TaskFlow**.

Leia este arquivo antes de criar, modificar, mover ou excluir qualquer código.

---

## Project

**Name:** TaskFlow

TaskFlow is a modern task management and collaboration platform containing two main environments:

* Personal
* Enterprise

Every user has access to their own Personal workspace and may also participate in one or more Enterprise workspaces.

---

## Core Principles

All implementations must prioritize:

* maintainability;
* readability;
* security;
* scalability;
* accessibility;
* responsiveness;
* type safety;
* separation of concerns;
* predictable behavior;
* good user experience.

Avoid unnecessary complexity.

Prefer simple and explicit solutions.

---

# Technology Stack

## Backend

Mandatory:

* Python
* FastAPI
* uv
* SQLModel
* Pydantic
* bcrypt
* JWT
* WebSockets
* pytest

Future infrastructure:

* Render
* PostgreSQL
* Supabase

---

## Frontend

Mandatory:

* React
* Vite
* TypeScript
* React Router
* Axios
* Tailwind CSS
* Lucide React

---

# Styling Rule

All application styling MUST use Tailwind CSS.

Do NOT introduce:

* custom CSS files;
* CSS Modules;
* styled-components;
* Emotion;
* Sass;
* Less;
* inline style objects.

Tailwind configuration and required base Tailwind directives are allowed.

If styling can be implemented with Tailwind, use Tailwind.

---

# Responsive Design

TaskFlow must be developed mobile-first.

Every new interface must be tested conceptually at:

* mobile;
* tablet;
* notebook;
* desktop.

Never assume desktop-only usage.

Avoid horizontal overflow.

Do not use hardcoded widths that break mobile layouts.

Prefer responsive Tailwind utilities.

Example:

`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4`

instead of fixed layouts.

---

# Themes

TaskFlow supports:

* light mode;
* dark mode;
* system preference.

Every new component MUST work correctly in both themes.

Do not add colors that make content unreadable in either theme.

Use semantic visual patterns consistently.

---

# Application Modes

There are two task contexts:

## Personal

Tasks belong to the authenticated user.

## Enterprise

Tasks belong to an Enterprise and may have:

* creator;
* assignees;
* responsible user;
* viewers;
* administrators.

Never mix Personal and Enterprise authorization logic accidentally.

Always identify the current workspace context.

---

# Authentication

Authentication uses JWT.

Passwords MUST:

* be hashed using bcrypt;
* never be returned by APIs;
* never be logged;
* never be committed to the repository.

Protected endpoints must validate authentication on the backend.

Frontend route guards are UX helpers, not security mechanisms.

---

# Authorization

Enterprise features must use RBAC.

Initial roles:

* Admin
* Manager
* Member

Authorization MUST be enforced server-side.

Never rely exclusively on frontend permission checks.

A user without access to a resource must not receive that resource from the API.

---

# Backend Architecture

Preferred structure:

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   └── routes/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── dependencies/
│   ├── websocket/
│   └── utils/
├── tests/
├── pyproject.toml
├── .env.example
└── README.md
```

---

# Backend Responsibilities

## Routes

Routes must handle:

* HTTP concerns;
* request parsing;
* dependency injection;
* response handling.

Routes should NOT contain substantial business logic.

---

## Services

Services contain business rules.

Examples:

* TaskService
* AuthService
* EnterpriseService
* RecurrenceService
* ReportService
* ChatService

---

## Repositories

Repositories handle data access.

Business services should not depend directly on in-memory dictionaries or raw database implementations.

This is critical because development may initially use temporary storage while production will use PostgreSQL/Supabase.

---

## Schemas

Use Pydantic/SQLModel schemas appropriately.

Do not expose database models directly when doing so leaks fields or tightly couples the API contract to persistence.

Create separate schemas when appropriate:

* Create
* Update
* Read
* Response

---

# API Convention

All REST endpoints should live under:

`/api/v1`

Examples:

```text
/api/v1/auth
/api/v1/users
/api/v1/tasks
/api/v1/enterprises
/api/v1/reports
/api/v1/dashboard
```

WebSockets may use:

```text
/ws/enterprises/{enterprise_id}/chat
```

---

# HTTP Semantics

Use proper HTTP methods:

* GET — read
* POST — create
* PUT — full replacement when appropriate
* PATCH — partial update
* DELETE — delete

Use appropriate HTTP status codes.

Do not return HTTP 200 for every situation.

---

# Errors

Errors should have predictable API structures.

Never return raw stack traces to clients.

Backend logs may contain debugging information but must never contain:

* passwords;
* JWT secrets;
* access tokens;
* sensitive credentials.

---

# Task Domain

A Task should support:

* id;
* title;
* description;
* status;
* priority;
* creator;
* responsible user;
* assignees;
* viewers;
* created_at;
* updated_at;
* planned_start_at;
* started_at;
* due_at;
* completed_at;
* recurrence;
* workspace context.

Possible statuses:

* backlog
* todo
* in_progress
* review
* done
* archived

Possible priorities:

* none
* low
* medium
* high
* urgent

Use enums when appropriate.

Avoid magic strings scattered across the project.

---

# Task Recurrence

Recurrence logic must remain isolated.

Initial recurrence types:

* daily;
* weekly;
* monthly;
* yearly.

Do not duplicate recurrence calculations across components or endpoints.

Use a dedicated recurrence service.

Future recurrence options may include:

* interval;
* days of week;
* recurrence end date;
* maximum occurrences.

Design accordingly.

---

# Dates

Backend timestamps should be stored consistently in UTC.

Never silently mix naive and timezone-aware datetime objects.

Frontend is responsible for presenting dates according to the user's timezone.

---

# IDs

Prefer UUIDs for public domain entities.

Do not assume sequential integer IDs.

---

# Enterprise

Enterprise entities should support:

* owner;
* members;
* roles;
* settings.

Membership information must be modeled independently from User.

Do NOT add enterprise-specific fields directly to the User model if they belong to membership.

Prefer:

`EnterpriseMember`

with:

* enterprise_id;
* user_id;
* role;
* status;
* joined_at.

---

# Chat

Enterprise chat uses WebSockets.

Messages should support:

* text;
* image;
* audio.

Chat and WebSocket code should remain separated from ordinary HTTP controllers when practical.

Do not place WebSocket connection management inside unrelated services.

Implement a dedicated connection manager.

---

# Uploads

Files must use an abstraction layer.

Development may use local storage.

Production may use Supabase Storage.

Application business logic must not depend directly on local filesystem paths.

---

# Frontend Architecture

Preferred structure:

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── layouts/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   └── features/
│       ├── auth/
│       ├── tasks/
│       ├── dashboard/
│       ├── enterprise/
│       ├── reports/
│       └── chat/
├── package.json
├── .env.example
└── README.md
```

---

# React Components

Components should be:

* small;
* focused;
* reusable;
* typed.

Avoid components with several unrelated responsibilities.

If a component grows excessively, split it.

---

# UI Components

Prefer reusable UI primitives.

Examples:

* Button
* Input
* Select
* Modal
* Drawer
* Badge
* Card
* Avatar
* Tabs
* Tooltip
* Toast
* Skeleton
* Dropdown

Do not recreate slightly different versions of the same primitive throughout the application.

---

# TypeScript

Avoid `any`.

Use:

* interfaces;
* types;
* generics;

when appropriate.

API response types should be explicit.

---

# Axios

Axios configuration MUST be centralized.

Preferred location:

`src/services/api.ts`

It should handle:

* API base URL;
* authentication headers;
* error normalization;
* unauthorized responses.

Do not instantiate Axios independently across multiple components.

---

# State Management

Do not introduce complex state management without justification.

Use:

* local component state;
* Context API;

when sufficient.

Do not add Redux by default.

---

# Data Fetching

Never place API URLs directly inside UI components.

API requests belong in:

* services;
* hooks;
* feature API modules.

Components should focus primarily on presentation and interaction.

---

# Forms

Forms must include:

* proper labels;
* validation;
* loading state;
* error state;
* disabled submission while processing;
* clear validation feedback.

Do not allow duplicate submissions.

---

# UX States

Every network-driven screen should consider:

* loading;
* empty;
* error;
* unauthorized;
* success.

Use skeletons where useful.

Avoid blank screens during loading.

---

# Accessibility

Use semantic HTML.

Buttons must be actual buttons.

Inputs need labels.

Interactive elements must support keyboard navigation whenever reasonably possible.

Icons without accompanying text must have accessible labels when necessary.

Do not use color as the only indicator of state.

---

# Design Quality

The UI should feel like a professional SaaS application.

Avoid:

* giant gradients;
* excessive glassmorphism;
* random colors;
* excessive animation;
* enormous border radii everywhere;
* visually noisy dashboards.

Prefer:

* subtle shadows;
* restrained colors;
* strong typography;
* consistent spacing;
* clear hierarchy.

---

# Dashboard

Dashboard components should be reusable between Personal and Enterprise modes when possible.

Metrics may include:

* total tasks;
* completed;
* pending;
* overdue;
* in progress;
* completion rate.

Enterprise dashboards may additionally contain:

* tasks per member;
* performance by period;
* workload distribution.

---

# Reports

Reports must support filters.

Do not calculate important security-sensitive report data exclusively in the frontend.

Backend should provide aggregated data where appropriate.

---

# Environment Variables

Never hardcode environment-dependent URLs.

Frontend:

```env
VITE_API_URL=
VITE_WS_URL=
```

Backend:

```env
DATABASE_URL=
JWT_SECRET_KEY=
JWT_ALGORITHM=
ACCESS_TOKEN_EXPIRE_MINUTES=
CORS_ORIGINS=
STORAGE_PROVIDER=
```

Keep `.env.example` updated.

Never commit `.env`.

---

# Development Storage

The first version may use temporary or in-memory repositories.

However:

Business services MUST depend on repository interfaces/abstractions.

Example:

```text
TaskService
    ↓
TaskRepository
    ↓
InMemoryTaskRepository
```

Future:

```text
TaskService
    ↓
TaskRepository
    ↓
SQLTaskRepository
```

Do not make TaskService aware of which storage engine is being used.

---

# Database

Production database will use PostgreSQL through Supabase.

SQLModel models should therefore be designed with PostgreSQL compatibility in mind.

Avoid database-specific assumptions that would make migration difficult.

---

# Migration Strategy

When persistent SQL storage is introduced, use migrations.

Prefer Alembic.

Never manually alter production database structures without migrations.

---

# Testing

Backend critical functionality should have pytest coverage.

Prioritize tests for:

* authentication;
* authorization;
* task ownership;
* task visibility;
* Enterprise permissions;
* CRUD operations;
* invalid input.

A security rule without a test should be treated carefully.

---

# Before Editing

Before modifying existing code:

1. read the relevant files;
2. identify dependencies;
3. understand current behavior;
4. verify whether reusable functionality already exists;
5. modify the smallest reasonable surface.

Do not rewrite large working files without necessity.

---

# Before Creating a Component

Search whether an equivalent component already exists.

Do not create:

```text
Button.tsx
PrimaryButton.tsx
DefaultButton.tsx
MainButton.tsx
```

when variants of one Button component are sufficient.

---

# Before Adding a Dependency

Ask:

1. Can this be implemented reasonably with current dependencies?
2. Is the dependency maintained?
3. Is the bundle cost justified?
4. Does it solve a meaningful problem?

Avoid dependency bloat.

---

# Code Quality

Prefer:

* explicit naming;
* small functions;
* early returns;
* clear domain boundaries.

Avoid:

* deep nesting;
* duplicated conditions;
* magic values;
* giant utility files;
* premature abstraction;
* hidden side effects.

---

# Comments

Comments should explain WHY, not simply repeat WHAT the code does.

Bad:

```python
# Set user id
user_id = user.id
```

Useful:

```python
# Enterprise task visibility is validated here because this service
# is also consumed outside HTTP routes.
```

---

# Security

Treat all client input as untrusted.

Validate authorization server-side.

Never expose:

* password hashes;
* JWT secrets;
* internal stack traces;
* private enterprise resources;
* unauthorized attachments.

---

# Git Safety

Never commit:

* `.env`;
* credentials;
* tokens;
* private keys;
* `.venv`;
* `node_modules`;
* build artifacts;
* local upload directories.

---

# Agent Behavior

When performing a task:

1. understand the requested change;
2. inspect relevant existing code;
3. identify the correct architectural layer;
4. implement the smallest coherent solution;
5. run relevant checks;
6. fix errors caused by the change;
7. report what changed.

Do not claim something works if it was not verified when verification is possible.

---

# Verification

For backend changes, where applicable run:

```bash
uv run pytest
```

and/or:

```bash
uv run fastapi dev app/main.py
```

For frontend changes, where applicable run:

```bash
npm run build
```

Also run the configured lint command if available.

---

# Do Not

Never:

* fabricate successful test results;
* ignore TypeScript errors;
* leave broken imports;
* leave dead components;
* silently remove features;
* store plaintext passwords;
* bypass backend authorization;
* introduce CSS outside Tailwind;
* hardcode production secrets;
* expose unauthorized resources;
* duplicate services unnecessarily.

---

# Refactoring

Refactor only when:

* required for the requested feature;
* fixing clear technical debt encountered during the task;
* necessary for correctness.

Avoid unrelated large refactors.

---

# Backward Compatibility

When modifying APIs already consumed by the frontend:

* inspect consumers;
* preserve compatibility where reasonable;
* update all affected clients when changing the contract.

Never casually rename API fields without updating consumers.

---

# Definition of Done

A task is considered finished only when applicable:

* implementation is complete;
* imports resolve;
* TypeScript compiles;
* frontend builds;
* backend starts;
* relevant tests pass;
* error states are handled;
* mobile layout remains usable;
* light mode works;
* dark mode works;
* documentation is updated when necessary.

---

# Final Rule

TaskFlow must be developed as a real product, not as a disposable demo.

Every change should move the repository toward a maintainable production-ready SaaS application.
