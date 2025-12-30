# Trellis PM

A modern project management application built with Next.js, TypeScript, and Tailwind CSS.

![Trellis PM](https://via.placeholder.com/1200x630/1e1b4b/818cf8?text=Trellis+PM)

## 🚀 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **API:** [tRPC](https://trpc.io/)
- **State Management:** [TanStack React Query](https://tanstack.com/query)
- **Validation:** [Zod](https://zod.dev/)
- **Linting:** ESLint + Prettier

## 📁 Project Structure

```
trellis-pm/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API routes (tRPC)
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── components/
│   │   └── ui/            # shadcn/ui components
│   ├── lib/
│   │   ├── hooks/         # Custom React hooks
│   │   ├── providers/     # Context providers (tRPC, etc.)
│   │   ├── schemas/       # Zod validation schemas
│   │   └── utils.ts       # Utility functions
│   ├── server/
│   │   ├── ai/            # AI provider integrations
│   │   ├── db/            # Database client
│   │   ├── services/      # Business logic layer
│   │   └── trpc/          # tRPC routers and configuration
│   └── generated/         # Prisma generated client
├── .env                   # Environment variables
├── .prettierrc            # Prettier configuration
└── eslint.config.mjs      # ESLint configuration
```

## ⚡ Quick Start (Copy-Paste Commands)

These are the exact commands to get Trellis PM running locally. Copy and paste them in order.

### Windows (PowerShell) - Local PostgreSQL

**Step 1: Install PostgreSQL**

Download and install from: https://www.postgresql.org/download/windows/

During installation:
- Remember the password you set for the `postgres` user (e.g., `postgres`)
- Keep the default port `5432`
- ✅ Check "Add to PATH" if prompted

**Step 2: Clone and Install**

```powershell
git clone https://github.com/D2DigitalSolutions/trellis-pm.git
cd trellis-pm
npm install
```

> **Already cloned?** Just run `cd trellis-pm` and `npm install`

**Step 3: Create the Database**

After PostgreSQL is installed, open **pgAdmin** (comes with PostgreSQL):

1. Open pgAdmin from Start Menu
2. Connect to your local server (enter your postgres password)
3. Right-click "Databases" → Create → Database
4. Name: `trellis_pm` → Click Save

Or use SQL Shell (psql) from Start Menu:
```sql
CREATE DATABASE trellis_pm;
\q
```

**Step 4: Create `.env.local` File**

Create a file named `.env.local` in the project root with this content:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trellis_pm?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Provider - choose ONE of these options:

# Option 1: OpenAI (recommended)
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-your-openai-key-here"

# Option 2: XAI (Grok)
# AI_PROVIDER="xai"
# XAI_API_KEY="your-xai-key-here"

# Option 3: Ollama (free, local)
# AI_PROVIDER="ollama"
# OLLAMA_ENABLED="true"
# OLLAMA_BASE_URL="http://localhost:11434"
```

> ⚠️ Replace `YOUR_PASSWORD` with your PostgreSQL password!

**Step 5: Setup Database and Run**

```powershell
npm run db:push
npm run db:seed
npm run dev
```

**Step 6: Open the App**

- Dashboard: http://localhost:3000/dashboard
- Dev Panel: http://localhost:3000/dev

---

### Windows (PowerShell) - Docker Option

If you have Docker Desktop installed:

```powershell
git clone https://github.com/D2DigitalSolutions/trellis-pm.git
cd trellis-pm
npm install

docker run --name trellis-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=trellis_pm -p 5432:5432 -d postgres:16-alpine

# Create .env.local with DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trellis_pm?schema=public"
notepad .env.local

npm run db:push
npm run db:seed
npm run dev
```

---

### macOS / Linux (Bash)

```bash
# 1. Clone and install
git clone https://github.com/D2DigitalSolutions/trellis-pm.git
cd trellis-pm
npm install

# 2. Start PostgreSQL with Docker (or use local install)
docker run --name trellis-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=trellis_pm \
  -p 5432:5432 \
  -d postgres:16-alpine

# 3. Create .env.local file
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trellis_pm?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Provider (choose one)
AI_PROVIDER="openai"
OPENAI_API_KEY="your-openai-key-here"
EOF

# 4. Setup database
npm run db:push
npm run db:seed

# 5. Run the app
npm run dev
```

### After Starting

1. **Dashboard**: http://localhost:3000/dashboard
2. **Dev Panel**: http://localhost:3000/dev
3. **Prisma Studio**: `npm run db:studio` → http://localhost:5555

---

## 🛠️ Local Development Setup (Detailed)

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)
- npm (or pnpm/yarn)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/D2DigitalSolutions/trellis-pm.git
cd trellis-pm
npm install
```

### 2. Set Up PostgreSQL

#### Option A: Local PostgreSQL

Install PostgreSQL on your machine and create a database:

```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql
createdb trellis_pm

# Windows (using Chocolatey)
choco install postgresql
# Then create database using pgAdmin or psql
```

#### Option B: Docker

```bash
docker run --name trellis-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=trellis_pm \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### 3. Configure Environment Variables

Copy the example environment file and update the values:

```bash
cp .env .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trellis_pm?schema=public"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Providers (optional)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
```

### 4. Set Up the Database

Generate the Prisma client and run migrations:

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (development)
npm run db:migrate

# OR push schema directly (quick setup)
npm run db:push
```

### 5. Seed the Database (Optional)

Populate the database with sample data:

```bash
npm run db:seed
```

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Dev Panel

A development-only panel is available at [http://localhost:3000/dev](http://localhost:3000/dev) for manual verification of AI features.

**Features:**
- **AI Provider Status**: Shows which provider is active (OpenAI, XAI, Ollama)
- **Project & Mode Template**: View project mode templates and AI system prompts
- **Generate Branch Summary**: Manually trigger summarization for any branch
- **Extract Work Items**: Test the extract-work AI endpoint with sample text

**Usage:**
1. Run `npm run db:seed` to create demo data
2. Run `npm run db:studio` to get branch IDs
3. Open the dev panel and paste branch IDs to test AI features

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate:prod` | Deploy migrations (production) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed the database |

## 🔧 Database Management

### Viewing Data with Prisma Studio

```bash
npm run db:studio
```

This opens a web interface at [http://localhost:5555](http://localhost:5555) to browse and edit your data.

### Creating a New Migration

```bash
npm run db:migrate -- --name your_migration_name
```

### Resetting the Database

```bash
npx prisma migrate reset
```

⚠️ This will delete all data and reapply migrations.

## 🎨 Adding UI Components

Use the shadcn/ui CLI to add new components:

```bash
npx shadcn@latest add [component-name]

# Examples:
npx shadcn@latest add accordion
npx shadcn@latest add calendar
npx shadcn@latest add command
```

## 🧪 API Usage

### tRPC Client (React Components)

```tsx
import { trpc } from "@/lib/providers/trpc-provider";

// In a React component
function MyComponent() {
  const { data: projects } = trpc.project.getAll.useQuery();
  const createProject = trpc.project.create.useMutation();

  const handleCreate = () => {
    createProject.mutate({
      name: "New Project",
      ownerId: "user-id",
    });
  };

  return (
    <div>
      {projects?.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Custom Hooks

```tsx
import { useProjects, useCreateProject } from "@/lib/hooks";

function MyComponent() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();

  // ...
}
```

## 💬 Branch Chat

The Branch Chat feature allows users to send messages within work item branches. Messages are stored in the database and displayed in real-time.

### Features

- **Optimistic Updates**: Messages appear instantly while being sent to the server
- **Auto-scroll**: Chat automatically scrolls to the latest message
- **Loading States**: Visual feedback during message sending
- **Error Handling**: Toast notifications on send failure with message recovery
- **Keyboard Support**: Press Enter to send messages

### Usage

```tsx
import { useMessages, useAppendMessage } from "@/lib/hooks";

function ChatComponent({ branchId }: { branchId: string }) {
  const { data, isLoading } = useMessages(branchId);
  const appendMessage = useAppendMessage();

  const handleSend = async (content: string) => {
    await appendMessage.mutateAsync({
      branchId,
      content,
      role: "USER",
    });
  };

  // ...
}
```

## 🌿 Branch Management

The Branch Panel supports creating new branches and forking from messages.

### Creating a New Branch

```tsx
import { useCreateBranch } from "@/lib/hooks";

function BranchManager({ workItemId }: { workItemId: string }) {
  const createBranch = useCreateBranch();

  const handleCreate = async (name: string) => {
    const newBranch = await createBranch.mutateAsync({
      workItemId,
      name,
    });
    console.log("Created branch:", newBranch.id);
  };

  // ...
}
```

### Forking from a Message

Fork creates a new branch that includes all messages up to the selected message:

```tsx
import { useForkBranchFromMessage } from "@/lib/hooks";

function MessageActions({ messageId }: { messageId: string }) {
  const forkBranch = useForkBranchFromMessage();

  const handleFork = async () => {
    const newBranch = await forkBranch.mutateAsync({
      messageId,
      name: `fork-${Date.now()}`,
      copyMessages: true, // Include messages up to fork point
    });
    console.log("Forked to branch:", newBranch?.id);
  };

  // ...
}
```

### UI Features

- **Branch List**: View all branches for a work item with fork indicators
- **Create Branch Button**: Opens dialog to create a new empty branch
- **Fork Button**: Appears on hover over messages in the chat
- **Auto-switch**: After creating/forking, automatically switches to the new branch

## 🧪 Manual Test Scripts

Use these step-by-step scripts to verify the main features work correctly.

### Test 1: Message Sending

1. Open http://localhost:3000/dashboard
2. Click on "Demo Project" in the sidebar
3. Click on any work item (e.g., "User Authentication Epic")
4. The right panel shows the branch chat
5. Type "Hello, this is a test message" in the input
6. Press Enter
7. **Expected**: Message appears immediately, input clears, loading spinner shows briefly

### Test 2: Fork from Message

1. Complete Test 1 first (need messages in chat)
2. Hover over any message in the chat
3. Click the "..." button that appears
4. Click "Fork from here"
5. **Expected**: Dialog opens with default name "fork-[timestamp]"
6. Click "Create Fork"
7. **Expected**: Toast shows "Forked to branch...", branch list updates, new branch selected

### Test 3: Create New Branch

1. Open http://localhost:3000/dashboard
2. Select a project and work item
3. Click "+ New Branch" button in the right panel header
4. Enter name "test-branch"
5. Click "Create"
6. **Expected**: New branch appears in list and is auto-selected

### Test 4: Rolling Summary (Automatic)

1. Open http://localhost:3000/dev
2. Copy a branch ID from the "Summarize Branch" section (use Prisma Studio to find one)
3. Send 5+ messages to that branch via the dashboard
4. Wait 10 seconds
5. Go back to dev panel and click "Generate Summary"
6. **Expected**: Summary reflects the new messages

### Test 5: Extract Work Items (AI)

1. Open http://localhost:3000/dev
2. In the "Extract Work" section, enter a branch ID
3. Enter this sample text:
   ```
   We need to build a user dashboard that shows their recent activity. 
   It should include a chart of tasks completed per day, a list of 
   notifications, and a quick-add button for new tasks. The chart 
   should use Chart.js and be responsive.
   ```
4. Click "Extract Work Items"
5. **Expected**: JSON response with:
   - `workItemsToCreate`: Array with tasks like "Build user dashboard", "Implement activity chart"
   - `artifactsToCreate`: Array with specs/plans
   - `suggestedNextActions`: Array with next steps

### Test 6: Mode Template Integration

1. Run `npm run db:seed` to ensure templates exist
2. Open Prisma Studio: `npm run db:studio`
3. Go to Project table
4. Note the `modeTemplateId` of "Demo Project" (should be "Agile Sprint")
5. Open http://localhost:3000/dev
6. Select "Demo Project"
7. **Expected**: Shows "Agile Sprint" as the mode template
8. Run Extract Work with the sample text from Test 5
9. **Expected**: Extracted items follow agile patterns (sprints, story points, etc.)

---

## 🔒 Security Considerations

### Authentication Status

**Current State:** Authentication is **intentionally deferred** for the MVP phase.

**Rationale:**
- Focus on core AI-powered project management features first
- Reduce complexity during initial development
- Enable rapid prototyping and testing

**Guardrails in Place:**
1. All API routes use tRPC's type-safe procedures with Zod validation
2. Database operations use Prisma's parameterized queries (SQL injection safe)
3. AI prompts include explicit security rules against prompt injection
4. Dev panel is clearly marked as dev-only

**Planned for Production:**
- NextAuth.js integration with session-based auth
- Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
- API route protection middleware
- Rate limiting on AI endpoints

---

## 📝 License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ using Next.js, Tailwind CSS, and Prisma.
