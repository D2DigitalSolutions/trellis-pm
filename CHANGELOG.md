# Trellis PM - Project Tracking Document

This document tracks the development progress of Trellis PM, including all features implemented, changes made, and milestones achieved.

---

## 📅 Development Timeline

### December 29, 2024

#### Extract Work Endpoint & Tests ✅

**Time:** AI Feature Implementation

**Changes Made:**

1. **Extract Work API Endpoint**
   - `POST /api/ai/extract-work` - REST endpoint for work extraction
   - `ai.extractWork` - tRPC mutation for work extraction
   - Input: branchId + userText
   - Output: structured JSON with workItemsToCreate, artifactsToCreate, suggestedNextActions

2. **Zod Schemas**
   - `workItemToCreateSchema` - validates extracted work items (title, type, description, acceptanceCriteria, priority, etc.)
   - `artifactToCreateSchema` - validates extracted artifacts (workItemTitleRef, type, title, content)
   - `extractWorkResponseSchema` - full response validation
   - `extractWorkInputSchema` - input validation with options

3. **AI Integration**
   - Uses configured AI provider (OpenAI, XAI, Ollama)
   - Leverages structured output when provider supports it
   - Falls back to JSON mode + validation + retry for other providers
   - Includes JSON repair utilities for malformed responses
   - Context building from branch history (optional)

4. **tRPC Router (`ai.ts`)**
   - `status` - returns AI provider configuration status
   - `extractWork` - extracts work items from user text
   - `generateText` - simple text generation for testing

5. **React Hooks**
   - `useAIStatus` - query AI provider status
   - `useExtractWork` - mutation for work extraction
   - `useGenerateText` - mutation for text generation

6. **Tests (vitest)**
   - Schema validation tests (30 tests)
   - Work item type validation
   - Artifact type validation
   - Input validation
   - JSON repair utilities
   - Mock provider integration tests

**Files Created:**
- `src/server/ai/schemas/extract-work.ts`
- `src/server/ai/schemas/index.ts`
- `src/server/ai/extract-work.ts`
- `src/server/trpc/routers/ai.ts`
- `src/app/api/ai/extract-work/route.ts`
- `src/server/ai/__tests__/extract-work.test.ts`
- `vitest.config.ts`

---

#### Schema Redesign for AI-Powered Conversations ✅

**Time:** Schema Update

**Changes Made:**

1. **New Data Model Design**
   - Replaced simple Task model with flexible WorkItem model
   - Added WorkItem types: EPIC, SPRINT, TASK, BUG, IDEA
   - Implemented WorkItemEdge for parent-child relationships
   - Added Branch model for conversation threading (with fork support)
   - Added Message model with roles: USER, ASSISTANT, TOOL, SYSTEM
   - Added Artifact model for structured outputs: PLAN, SPEC, CHECKLIST, DECISION, CODE, NOTE

2. **Soft Delete Support**
   - Added `deletedAt` field to all models
   - Updated all queries to filter soft-deleted records by default
   - Added restore endpoints for recoverable deletes

3. **tRPC API Updates**
   - New workItem router (CRUD + edges + reordering)
   - New branch router (create, fork, set default)
   - New message router (CRUD + pagination)
   - New artifact router (CRUD with versioning)
   - Updated project router with soft delete

4. **React Hooks**
   - useWorkItems, useWorkItem, useCreateWorkItem, etc.
   - useBranches, useBranch, useCreateBranch
   - useMessages, useCreateMessage, useUpdateMessage
   - useArtifacts, useArtifact, useCreateArtifact

5. **Seed Script**
   - Demo project with full work item hierarchy
   - Epic → Sprint → Tasks relationship
   - Bug and Idea work items
   - Main branch with forked conversation
   - Sample messages (user + assistant)
   - Sample artifacts (Plan, Spec, Checklist)

---

#### Initial Project Setup ✅

**Time:** Project Initialization

**Changes Made:**

1. **Next.js Project Creation**
   - Created Next.js 16 project with App Router
   - TypeScript configuration enabled
   - Tailwind CSS v4 integrated
   - ESLint pre-configured
   - `src/` directory structure enabled

2. **Package Installation**
   - Core: Next.js, React 19, TypeScript
   - Database: Prisma, @prisma/client
   - API: tRPC (server, client, react-query, next)
   - State: @tanstack/react-query, superjson
   - Validation: Zod
   - UI: shadcn/ui components (Radix primitives)
   - Styling: Tailwind CSS, tailwind-merge, clsx, class-variance-authority

3. **Development Tools Setup**
   - ESLint with Next.js, TypeScript, and Prettier configs
   - Prettier with Tailwind CSS plugin for class sorting
   - TypeScript strict mode

4. **Folder Structure Created**
   ```
   src/
   ├── app/           # Next.js routes
   ├── components/    # UI components
   │   └── ui/        # shadcn/ui components
   ├── lib/           # Shared utilities
   │   ├── hooks/     # Custom React hooks
   │   ├── providers/ # Context providers
   │   └── schemas/   # Zod schemas
   └── server/        # Backend code
       ├── ai/        # AI provider integrations
       ├── db/        # Database client
       ├── services/  # Business logic
       └── trpc/      # API routers
   ```

5. **UI Components (shadcn/ui)**
   - Button, Card, Input, Label, Textarea
   - Select, Dialog, Dropdown Menu
   - Avatar, Badge, Separator
   - Sheet, Tabs, Sonner (toasts)

6. **Landing Page**
   - Modern dark theme design
   - Gradient backgrounds with blur effects
   - Hero section with CTA buttons
   - Feature cards highlighting key functionality
   - Responsive layout

7. **Documentation**
   - README.md with complete setup instructions
   - Local development guide
   - Database setup (local & Docker options)
   - Available npm scripts documented
   - API usage examples

---

## 🎯 Milestones

| Milestone | Status | Date |
|-----------|--------|------|
| Project initialization | ✅ Complete | Dec 29, 2024 |
| Database schema design | ✅ Complete | Dec 29, 2024 |
| AI-ready schema redesign | ✅ Complete | Dec 29, 2024 |
| tRPC API setup | ✅ Complete | Dec 29, 2024 |
| UI component library | ✅ Complete | Dec 29, 2024 |
| Landing page | ✅ Complete | Dec 29, 2024 |
| Authentication | 🔲 Pending | - |
| Dashboard page | 🔲 Pending | - |
| Work item board (Kanban) | 🔲 Pending | - |
| Conversation UI | 🔲 Pending | - |
| Artifact renderer | 🔲 Pending | - |
| AI integration | 🔲 Pending | - |
| Production deployment | 🔲 Pending | - |

---

## 📦 Dependencies Installed

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.1 | React framework |
| react | 19.2.3 | UI library |
| react-dom | 19.2.3 | React DOM |
| @prisma/client | ^7.2.0 | Database ORM |
| prisma | ^7.2.0 | Prisma CLI |
| @trpc/server | ^11.8.1 | tRPC server |
| @trpc/client | ^11.8.1 | tRPC client |
| @trpc/react-query | ^11.8.1 | tRPC React bindings |
| @trpc/next | ^11.8.1 | tRPC Next.js adapter |
| @tanstack/react-query | ^5.90.14 | Data fetching |
| superjson | ^2.2.6 | JSON serialization |
| zod | ^4.2.1 | Schema validation |
| sonner | ^2.0.7 | Toast notifications |
| lucide-react | ^0.562.0 | Icons |
| class-variance-authority | ^0.7.1 | Component variants |
| clsx | ^2.1.1 | Class utilities |
| tailwind-merge | ^3.4.0 | Tailwind class merging |
| next-themes | ^0.4.6 | Theme management |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5 | TypeScript |
| tailwindcss | ^4 | CSS framework |
| eslint | ^9 | Linting |
| eslint-config-next | 16.1.1 | Next.js ESLint config |
| eslint-config-prettier | ^10.1.8 | Prettier ESLint config |
| eslint-plugin-prettier | ^5.5.4 | Prettier ESLint plugin |
| prettier | ^3.7.4 | Code formatting |
| prettier-plugin-tailwindcss | ^0.7.2 | Tailwind class sorting |
| tsx | ^4.19.0 | TypeScript execution |

---

## 🔜 Upcoming Features

1. **Authentication**
   - NextAuth.js integration
   - OAuth providers (Google, GitHub)
   - Email/password authentication
   - Session management

2. **Dashboard**
   - Project overview cards
   - Recent activity feed
   - Quick work item creation
   - Statistics and charts

3. **Work Item Board**
   - Drag-and-drop management
   - Column customization
   - Filtering and search
   - Keyboard shortcuts

4. **Conversation UI**
   - Branch switching
   - Message rendering with markdown
   - Fork conversation support
   - Real-time streaming

5. **Artifact Renderer**
   - Plan visualization
   - Checklist with completion tracking
   - Code blocks with syntax highlighting
   - Decision trees

6. **AI Features**
   - Claude/OpenAI integration
   - Streaming responses
   - Tool use support
   - Context-aware suggestions

---

## 📝 Notes

- Using Space Grotesk font for modern look
- Dark theme by default with indigo/purple accent colors
- Optimized for desktop-first with mobile responsive
- PostgreSQL required for full functionality
- Schema supports conversation branching like git

---

## 🗄️ Database Schema Overview

```
Project
  └── WorkItem (EPIC, SPRINT, TASK, BUG, IDEA)
        ├── WorkItemEdge (parent-child relationships)
        ├── Branch (conversation threads)
        │     └── Message (USER, ASSISTANT, TOOL, SYSTEM)
        └── Artifact (PLAN, SPEC, CHECKLIST, DECISION, CODE, NOTE)
```

---

*Last updated: December 29, 2024*
