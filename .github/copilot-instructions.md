# Blog FR - AI Agent Instructions

## 🎯 Project Overview

Full-stack blog system with **FastAPI (Python 3.13)** backend and **Next.js 16** frontend. Core architecture: SSR for content pages (SEO), CSR for user interactions, OpenAPI-driven type safety.

## 🏗️ Architecture Fundamentals

### Data Flow

- **SSR Path** (`/posts/[slug]`): Next.js Server → FastAPI (`backend:8000` internal) → PostgreSQL. Server Components use `fetch()` with internal URL for metadata generation.
- **CSR Path**: React Client → Next.js proxy (`/api/*` → `backend:8000`) → FastAPI → PostgreSQL. Client uses TanStack Query + hey-api SDK.
- **Key**: Next.js proxies ALL `/api/*` requests (see [frontend/next.config.ts](../frontend/next.config.ts) `rewrites()`). Client never calls backend directly.

### Project Structure

```
backend/app/          # FastAPI modules (posts, users, media, git_ops)
  ├── core/           # config, db, exceptions, middleware
  ├── {module}/       # Each has: model.py, schema.py, router.py, service.py, crud.py
frontend/src/
  ├── app/            # Next.js App Router (Server Components)
  ├── components/     # React components (Client + MDX)
  ├── shared/api/     # Auto-generated TypeScript SDK from OpenAPI
content/              # MDX files for Git sync
```

## 🔧 Development Workflows

### Backend Commands

```bash
cd backend
make test-cov-html   # Run tests with coverage report
make lint            # Ruff linting
make format          # Ruff formatting
make db-migrate      # Run Alembic migrations
uv run fastapi dev app/main.py  # Start dev server
```

### Frontend Commands

```bash
cd frontend
npm run dev          # Start Next.js dev server (port 3000)
npm run api:generate # Regenerate TypeScript SDK from OpenAPI
npm run build        # Production build (output: standalone)
```

### Critical Workflow: API Type Generation

When backend schemas change:

```bash
./scripts/generate-api.sh  # Exports openapi.json → generates TypeScript SDK
```

This updates [frontend/src/shared/api/generated/](../frontend/src/shared/api/generated/) - **never edit manually**. Configuration: [frontend/openapi-ts.config.ts](../frontend/openapi-ts.config.ts) uses `@hey-api/openapi-ts`.

### Git Sync Workflow

Sync MDX files from [content/](../content/) to database:

```bash
./scripts/sync-posts.sh  # Runs backend/scripts/sync_git_content.py
```

Or via API: `POST /api/v1/ops/git/sync` (admin only). See [GIT_SYNC_GUIDE.md](../GIT_SYNC_GUIDE.md) for frontmatter schema.

### Docker Development

```bash
docker compose -f docker-compose.dev.yml up  # Dev with hot reload
docker compose up -d                          # Production
```

## 📐 Code Conventions

### Backend Patterns

**Module Structure** (see [backend/docs/ROUTER_ARCHITECTURE.md](../backend/docs/ROUTER_ARCHITECTURE.md)):

- `model.py`: SQLModel models (inherits SQLModel + table=True)
- `schema.py`: Pydantic schemas for API (Create, Update, Response)
- `router.py`: FastAPI endpoints with **2-layer permissions**:
  - Coarse-grained: `Depends(get_current_active_user)` or `Depends(get_current_adminuser)`
  - Fine-grained: Service layer checks ownership (superadmin bypasses)
- `service.py`: Business logic + permission checks
- `crud.py`: Database operations (async SQLModel + AsyncSession)

**Example Permission Pattern** ([backend/app/posts/router.py](../backend/app/posts/router.py)):

```python
@router.patch("/{post_id}")
async def update_post(
    post_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],  # Router layer
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    return await service.update_post(session, post_id, ..., current_user)  # Service checks ownership
```

**Slug Generation**: All posts use `generate_slug_with_random_suffix()` (e.g., `my-post-a3f2k8`) to avoid collisions. Located in [backend/app/posts/utils.py](../backend/app/posts/utils.py).

**Testing** ([backend/tests/conftest.py](../backend/tests/conftest.py)):

- Session-scoped event loop (`asyncio_default_fixture_loop_scope = "session"`)
- Test database uses `.env.test` (set `ENVIRONMENT=test`)
- Markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.{module}`

### Frontend Patterns

**Server vs Client Components**:

- **Server**: Pages in `app/` for SEO (e.g., [frontend/src/app/posts/[slug]/page.tsx](../frontend/src/app/posts/[slug]/page.tsx)). Use `fetch()` with internal URL (`settings.BACKEND_INTERNAL_URL`), `cache()` wrapper, `revalidate` for ISR.
- **Client**: Interactive components in `components/` (use `"use client"`). State management: TanStack Query for API calls.

**MDX Rendering** ([frontend/src/components/mdx/README.md](../frontend/src/components/mdx/README.md)):

- **Registry** ([mdx/registry/mdx-components.tsx](../frontend/src/components/mdx/registry/mdx-components.tsx)): Maps HTML tags → React components (no logic).
- **Components** ([mdx/components/](../frontend/src/components/mdx/components/)): Handles rendering logic (CodeBlock auto-detects Mermaid vs syntax highlighting).
- **Integration**: `<MDXRemote source={mdx} components={createMdxComponents()} />`

**API Client Usage**:

```typescript
import { client } from "@/shared/api/client";
import { getPosts } from "@/shared/api/generated/sdk.gen";

// TanStack Query
const { data } = useQuery({
  queryKey: ["posts", filters],
  queryFn: () => getPosts({ query: filters }),
});
```

### Configuration

- **Backend**: [backend/app/core/config.py](../backend/app/core/config.py) uses `DATABASE_URL` directly (no DSN parsing). Toggle `database_echo` for SQL logging.
- **Frontend**: [frontend/src/config/settings.ts](../frontend/src/config/settings.ts) defines `BACKEND_INTERNAL_URL` (SSR: `http://backend:8000`) vs `NEXT_PUBLIC_API_URL` (CSR: `http://localhost:8000`).
- **Middleware**: Registered in [backend/app/middleware/**init**.py](../backend/app/middleware/__init__.py). Order matters: RequestID → Logging → FileUpload → Error Handlers.

## 🌍 Language & Localization

- **Git Commit Messages**: All Git-related text generation (commit messages, branch names, PR descriptions) MUST use **Simplified Chinese**.
- **AI Responses**: Default language for explanations, comments, and task summaries is **Simplified Chinese** unless the user explicitly switches to another language.
- **Commit Pattern**: `[模块名] 描述性文字` (e.g., `[posts] 修复文章详情页渲染异常`).

## 🐛 Debugging Tips

- **SSR Fetch Failures**: Check `BACKEND_INTERNAL_URL` in frontend config (must be `http://backend:8000` in Docker, `http://localhost:8000` locally).
- **Type Mismatches**: Regenerate SDK with `./scripts/generate-api.sh` after backend schema changes.
- **Database Issues**: Use `make db-migrate` for schema updates. Reset: `make db-reset` (drops all data).
- **Slug Conflicts**: Never manually set slugs without random suffix - use `generate_unique_slug()` in service layer.
- **Permission Errors**: Superadmins (`is_superadmin=True`) bypass all ownership checks in service layer.

## 📚 Key Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md): Complete data flow diagrams
- [GIT_SYNC_GUIDE.md](../GIT_SYNC_GUIDE.md): MDX frontmatter schema + sync rules
- [backend/docs/ROUTER_ARCHITECTURE.md](../backend/docs/ROUTER_ARCHITECTURE.md): Permission patterns across modules
- [frontend/src/components/mdx/README.md](../frontend/src/components/mdx/README.md): MDX component architecture

## 🚨 Common Pitfalls

- ❌ **Editing generated SDK**: Files in `frontend/src/shared/api/generated/` are auto-generated - edit backend schemas instead.
- ❌ **Direct backend calls from client**: Client must use Next.js proxy (`/api/*`), not `http://localhost:8000/api/*`.
- ❌ **Async/await in DB**: Always use `AsyncSession` + `await` for SQLModel queries (see [backend/app/core/db.py](../backend/app/core/db.py)).
- ❌ **Missing dependencies**: Backend uses `uv` (not pip), frontend uses `pnpm` (lockfile: `pnpm-lock.yaml`).
- ❌ **Test environment leakage**: Tests must set `ENVIRONMENT=test` before importing app modules (see [backend/tests/conftest.py](../backend/tests/conftest.py)).

---

**Package Managers**: Backend → `uv` ([pyproject.toml](../backend/pyproject.toml)), Frontend → `pnpm` ([package.json](../frontend/package.json))
