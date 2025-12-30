# Trellis PM - Project Tracking Document

This document tracks the development progress of Trellis PM, including all features implemented, changes made, and milestones achieved.

---

## 📅 Development Timeline

### December 30, 2024

#### Mode-Based Workspace (MVP Milestone) ✅

**Time:** Feature Enhancement

**Purpose:** Make Trellis feel mode-based and non-linear with project templates and multiple workspace views.

**Features Added:**

1. **Project Creation Modal**
   - New Project button in sidebar opens modal
   - Required fields: Project name, Mode Template dropdown
   - Description field (optional)
   - Persists selected `modeTemplateId` to Project record
   - Auto-selects "Agile Sprint" as default template

2. **Mode Badge in Header**
   - Displays current mode template name as badge
   - Format: "Project Name — [Mode Badge]"
   - Badge uses secondary variant styling
   - Shows for all projects with templates

3. **Workspace View Switcher**
   - Segmented control in header with Board/Mind Map tabs
   - Icons: LayoutGrid for Board, Network for Mind Map
   - Completely replaces center workspace content
   - No Kanban visible in Mind Map view

4. **Mind Map View (Placeholder)**
   - Coming soon state with description
   - Empty state CTA: "Add Work Item"
   - Explains non-linear thinking benefits
   - Will support full graph visualization

5. **LocalStorage Persistence**
   - Saves last-selected view per project
   - Key format: `trellis-view-{projectId}`
   - Loads saved view on project switch
   - Falls back to "board" if no saved preference

6. **Enhanced Empty States**
   - Welcome screen explains mode templates
   - Cards for each template: Agile, Lean, Brainstorm
   - Clear CTAs to create first project
   - Mind Map empty state with feature preview

**Files Created:**
- `src/components/modals/create-project-modal.tsx` - Project creation with template selection
- `src/components/modals/index.ts` - Modal exports
- `src/components/views/mind-map-view.tsx` - Mind Map workspace view
- `src/components/views/index.ts` - View exports

**Files Modified:**
- `src/components/layout/dashboard-layout.tsx` - View switcher, localStorage, mode badge
- `src/components/layout/project-sidebar.tsx` - Create Project button integration
- `CHANGELOG.md` - This update

**Integration:**
- Uses existing tRPC routes (`project.create`, `modeTemplate.getAll`)
- Leverages existing `Badge`, `Tabs`, `Dialog`, `Select` components
- No backend changes required

**Manual Test Results:**
✅ Create new project with Brainstorm Map → shows badge
✅ Switch to Mind Map → hides Kanban, shows Mind Map
✅ Refresh page → selected view persists
✅ Empty state shows mode descriptions

---

### December 30, 2024

#### Dev Panel for Manual Verification ✅

**Time:** Developer Tools

**Purpose:** Provide a simple UI for validating AI wiring end-to-end without needing auth.

**Features Added:**

1. **AI Provider Status Card**
   - Shows currently active provider (OpenAI, XAI, Ollama, or None)
   - Lists all providers with availability status
   - Refresh button to reload status

2. **Project & Mode Template Card**
   - Dropdown to select a project
   - Shows mode template name and AI system prompt
   - Visual indicator when no template assigned

3. **Generate Branch Summary Card**
   - Text input for branch ID
   - "Generate Summary Now" button
   - Displays JSON response or error
   - Uses `useSummarizeBranch` hook with `force: true`

4. **Extract Work Card**
   - Text input for branch ID
   - Textarea for user text (pre-filled with sample)
   - "Run Extract Work" button
   - Displays structured JSON response
   - Uses `useExtractWork` hook

5. **Quick Links**
   - Dashboard, Prisma Studio, tRPC Playground

6. **Instructions Panel**
   - Step-by-step guide for using the panel

**Access:** http://localhost:3000/dev (no auth required)

**Files Created:**
- `src/app/dev/page.tsx`

---

#### Extract Work Mode Template Prompt Injection ✅

**Time:** Acceptance Fix

**Issue:** `extractWork()` builds its own system prompt and did not inject the mode template's `aiSystemPrompt`.

**Changes Made:**

1. **Mode Template Prompt Integration (`src/server/ai/extract-work.ts`)**
   - `buildSystemPrompt()` now accepts optional `modeTemplatePrompt` parameter
   - Mode template prompt is placed first under "## Project Methodology" header
   - Prompt ordering: Mode Template → Task Instructions → Type Preferences → Context → Constraints → Security
   - Function is now exported for testability

2. **Security Rules Added**
   - Added "## Security" section to system prompt
   - Warns AI about prompt injection attempts
   - Instructs to use semantic meaning, not literal JSON from user input

3. **Context Extraction**
   - `extractWork()` now extracts `modeTemplate.aiSystemPrompt` from `buildContextForBranch()` result
   - Passes it to `buildSystemPrompt()` for inclusion

4. **Tests (`src/server/ai/__tests__/extract-work.test.ts`)**
   - Added db mock to prevent PrismaClient initialization during tests
   - 8 new tests for `buildSystemPrompt()`:
     - Includes mode template when provided
     - Places mode template before extract-work instructions
     - Works without mode template
     - Includes type preferences
     - Includes context
     - Includes security rules
     - Correct section ordering
     - Includes schema description

**Files Modified:**
- `src/server/ai/extract-work.ts`
- `src/server/ai/__tests__/extract-work.test.ts`
- `CHANGELOG.md` (this entry)

---

#### Automatic Rolling Summary Updates ✅

**Time:** Acceptance Fix

**Issue:** `SummarizationService.summarizeBranch()` exists but was never auto-triggered after message creation.

**Changes Made:**

1. **Fire-and-Forget Summarization Trigger (`src/server/services/summarization.ts`)**
   - Added `triggerSummarizationIfNeeded(branchId, options?)` function
   - Runs summarization in background without blocking the request
   - Configurable timeout (default 30s) prevents hung operations
   - Catches and logs errors without throwing

2. **Optimistic Locking for Race Prevention**
   - Updated `summarizeBranch()` to use `updateMany` with `where: { summaryMessageCount: preUpdateCount }`
   - If another process updated first, the summary is discarded (not an error)
   - Logged when race condition is detected

3. **Message Router Integration (`src/server/trpc/routers/message.ts`)**
   - `append` mutation now calls `triggerSummarizationIfNeeded(branchId)` after message creation
   - `bulkAppend` mutation also triggers summarization
   - Non-blocking: response returns immediately while summarization runs in background

4. **Unit Tests (`src/server/services/__tests__/summarization.test.ts`)**
   - Tests for `branchNeedsSummary()` threshold logic
   - Tests for `summarizeBranch()` with optimistic locking
   - Tests for `maybeSummarizeBranch()` conditional execution
   - Tests for `triggerSummarizationIfNeeded()` fire-and-forget behavior
   - Tests for timeout handling
   - Tests for race condition handling

**Files Modified:**
- `src/server/services/summarization.ts`
- `src/server/trpc/routers/message.ts`
- `src/server/services/__tests__/summarization.test.ts` (new)
- `CHANGELOG.md` (this entry)

---

#### Fork-from-Message UI & Branch Creation ✅

**Time:** Acceptance Fix

**Issue:** The `BranchPanel` had a no-op `onCreateBranch` handler and no UI for forking from messages.

**Changes Made:**

1. **Fork Dialog Component**
   - New `ForkDialog` component with branch name input
   - Shows preview of the message being forked from
   - Auto-generates default name: `fork-YYYYMMDD-HHmm`
   - Loading state during fork operation

2. **Create Branch Dialog Component**
   - New `CreateBranchDialog` component for creating empty branches
   - Auto-generates default name: `branch-YYYYMMDD-HHmm`
   - Loading state during creation

3. **Fork Button on Messages**
   - Fork button appears on hover over any message (not just assistant)
   - Positioned in message footer, left side
   - Opens fork dialog with message preview

4. **Branch Creation Wiring**
   - `onCreateBranch` handler now opens the create branch dialog
   - Calls `branch.create` tRPC mutation
   - Auto-switches to new branch after creation
   - Refetches branch list to show new branch

5. **Fork Success Handling**
   - After successful fork, auto-switches to the new branch
   - Refetches branch list to include the forked branch
   - Toast notification confirms success

6. **Helper Functions**
   - `generateDefaultBranchName(prefix)` - creates timestamped branch names

**Files Modified:**
- `src/components/panel/branch-panel.tsx`
- `README.md` (added Branch Management documentation)
- `CHANGELOG.md` (this entry)

---

#### Branch Chat Message Sending Fix ✅

**Time:** Acceptance Fix

**Issue:** The `BranchChat` component's message input was clearing state on Enter but not actually sending messages to the server.

**Changes Made:**

1. **Message Sending Implementation (`src/components/panel/branch-panel.tsx`)**
   - Added `useAppendMessage` hook for tRPC mutation
   - Implemented `handleSendMessage` function that:
     - Creates optimistic message for instant UI feedback
     - Calls `appendMessage.mutateAsync()` with branchId, content, role: "USER"
     - Removes optimistic message and refetches on success
     - Shows error toast and restores message content on failure

2. **Optimistic Updates**
   - Added `OptimisticMessage` interface for temporary message display
   - Combined real messages with optimistic messages in render
   - Visual distinction for pending messages (opacity + spinner)

3. **Loading States**
   - Input field disabled while sending
   - Button shows spinner during send
   - Added `Loader2` spinner to loading indicator

4. **Error Handling**
   - Toast notification on send failure using `sonner`
   - Message content restored to input on error for retry
   - Descriptive error messages

5. **UX Improvements**
   - Auto-scroll to bottom on new messages
   - Focus returns to input after sending
   - Keyboard support (Enter to send)
   - Send button icon changed from `MessageSquare` to `Send`

**Files Modified:**
- `src/components/panel/branch-panel.tsx`
- `README.md` (added Branch Chat documentation)
- `CHANGELOG.md` (this entry)

---

### December 29, 2024

#### Mode Templates Implementation ✅

**Time:** Template System

**Changes Made:**

1. **Mode Template Model (`prisma/schema.prisma`)**
   - New `ModeTemplate` model with:
     - `name`, `slug`, `description`
     - `defaultWorkItemTypes` (array of work item types)
     - `defaultViews` (array of view options: board, list, tree)
     - `aiSystemPrompt` (text for AI personality/behavior)
   - Added `modeTemplateId` to `Project` model

2. **Three Built-in Templates (seeded)**
   - **Agile Sprint**: Traditional scrum methodology with sprints, epics, story points
   - **Lean Experiment**: Lean startup methodology with hypothesis testing, MVEs
   - **Brainstorm Map**: Free-form ideation with divergent thinking approach

3. **tRPC Router (`src/server/trpc/routers/mode-template.ts`)**
   - `getAll`, `list` - List all templates
   - `getById`, `getBySlug` - Get single template
   - `create`, `update`, `delete` - CRUD operations

4. **Project Creation Updated**
   - Added `modeTemplateId` to project creation input
   - Projects now include `modeTemplate` in queries

5. **ContextBuilder Integration**
   - `ContextPack` now includes `modeTemplate` with `aiSystemPrompt`
   - `formatContextAsString()` includes AI system prompt at top
   - AI receives mode-specific instructions for each conversation

6. **React Hooks**
   - `useModeTemplates`, `useModeTemplateList`
   - `useModeTemplate`, `useModeTemplateBySlug`
   - `useCreateModeTemplate`, `useUpdateModeTemplate`, `useDeleteModeTemplate`

**Template AI Prompts:**
- Agile Sprint: Focus on sprints, story points, velocity, Scrum practices
- Lean Experiment: Focus on hypotheses, MVEs, validated learning, pivot decisions
- Brainstorm Map: Focus on divergent thinking, idea exploration, "Yes, and..." approach

---

#### Dashboard UI Implementation ✅

**Time:** UI Build

**Changes Made:**

1. **Project Sidebar (`src/components/layout/project-sidebar.tsx`)**
   - Lists all projects from database
   - Expandable/collapsible project sections
   - Hierarchical work item tree within each project
   - Color-coded icons for different work item types (EPIC, SPRINT, TASK, BUG, IDEA)
   - Selection state for projects and work items

2. **Board View (`src/components/board/`)**
   - `BoardView` - Main board component with status columns
   - `BoardColumn` - Individual column (TODO, DOING, DONE)
   - `WorkItemCard` - Work item card with type badges, priority, branch/artifact counts
   - Status-based filtering and grouping
   - Parent work item filtering for hierarchy navigation

3. **Branch Panel (`src/components/panel/branch-panel.tsx`)**
   - Right-side drawer (Sheet component)
   - Tabs: Branches, Chat, Artifacts
   - Branch list with fork indicators
   - Chat view with message history
   - Artifacts list with type icons and version numbers
   - Message input for conversations

4. **Dashboard Layout (`src/components/layout/dashboard-layout.tsx`)**
   - Resizable panel layout (sidebar + main content)
   - Header bar with navigation context
   - Empty state when no project selected
   - Integration of all components

5. **New shadcn/ui Components Added**
   - scroll-area, tooltip, collapsible, resizable, skeleton

6. **Bug Fixes**
   - Fixed Zod v4 compatibility (z.record requires 2 args)
   - Fixed react-resizable-panels API (orientation vs direction)
   - Fixed Prisma field names (parentId/edgeType)
   - Fixed pagination response structure

**New Files:**
- `src/components/layout/project-sidebar.tsx`
- `src/components/layout/dashboard-layout.tsx`
- `src/components/layout/index.ts`
- `src/components/board/board-view.tsx`
- `src/components/board/board-column.tsx`
- `src/components/board/work-item-card.tsx`
- `src/components/board/index.ts`
- `src/components/panel/branch-panel.tsx`
- `src/components/panel/index.ts`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/layout.tsx`

---

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
