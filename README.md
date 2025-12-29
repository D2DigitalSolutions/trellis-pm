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

## 🛠️ Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)
- npm (or pnpm/yarn)

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
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

## 📝 License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ using Next.js, Tailwind CSS, and Prisma.
