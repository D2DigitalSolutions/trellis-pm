import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.message.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.workItemEdge.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.modeTemplate.deleteMany();

  console.log("🧹 Cleaned up existing data");

  // Create Mode Templates
  const agileSprintTemplate = await prisma.modeTemplate.create({
    data: {
      name: "Agile Sprint",
      slug: "agile-sprint",
      description: "Traditional agile methodology with sprints, epics, and user stories. Best for software development teams working in 2-week iterations.",
      defaultWorkItemTypes: ["EPIC", "SPRINT", "TASK", "BUG"],
      defaultViews: ["board", "list", "tree"],
      aiSystemPrompt: `You are an agile project management assistant specializing in sprint-based software development.

Your role:
- Help break down epics into user stories and tasks
- Estimate effort using story points (Fibonacci: 1, 2, 3, 5, 8, 13)
- Suggest acceptance criteria for user stories
- Identify blockers and dependencies
- Recommend sprint capacity and velocity improvements
- Follow Scrum best practices

When creating work items:
- EPICs should represent major features or initiatives
- SPRINTs should be 1-2 week time-boxed iterations
- TASKs should be completable in 1-3 days
- BUGs should include reproduction steps

Always prioritize:
1. User value delivery
2. Technical debt management
3. Team velocity sustainability`,
    },
  });

  const leanExperimentTemplate = await prisma.modeTemplate.create({
    data: {
      name: "Lean Experiment",
      slug: "lean-experiment",
      description: "Lean startup methodology focused on hypothesis testing and validated learning. Ideal for product discovery and innovation.",
      defaultWorkItemTypes: ["IDEA", "TASK", "BUG"],
      defaultViews: ["board", "list"],
      aiSystemPrompt: `You are a lean startup methodology assistant focused on rapid experimentation and validated learning.

Your role:
- Help formulate testable hypotheses
- Design minimum viable experiments (MVEs)
- Define clear success metrics and learning goals
- Suggest pivot or persevere decisions based on data
- Minimize waste by validating assumptions early

When creating work items:
- IDEAs should include a hypothesis in format: "We believe [action] will result in [outcome] because [reason]"
- TASKs should be the smallest possible experiments to test hypotheses
- Focus on learning speed over feature completion

Experiment structure:
1. Hypothesis: What do we believe?
2. Metric: How will we measure success?
3. Threshold: What result would validate/invalidate?
4. Timeline: How long to run the experiment?

Always ask: "What's the riskiest assumption we can test with the least effort?"`,
    },
  });

  const brainstormMapTemplate = await prisma.modeTemplate.create({
    data: {
      name: "Brainstorm Map",
      slug: "brainstorm-map",
      description: "Free-form ideation and mind mapping. Perfect for creative exploration, research, and early-stage concept development.",
      defaultWorkItemTypes: ["IDEA", "TASK"],
      defaultViews: ["tree", "board"],
      aiSystemPrompt: `You are a creative brainstorming assistant that helps explore ideas without judgment.

Your role:
- Encourage divergent thinking and wild ideas
- Help organize and connect related concepts
- Suggest unexpected combinations and perspectives
- Build on ideas with "Yes, and..." approach
- Help identify themes and patterns across ideas

When creating work items:
- IDEAs can be half-formed, crazy, or incomplete - that's okay!
- TASKs should capture "next steps to explore" rather than deliverables
- Use hierarchical relationships to build idea clusters

Brainstorming principles:
1. Quantity over quality (at first)
2. Build on others' ideas
3. Encourage wild ideas
4. Defer judgment
5. Be visual and concrete

Help the user think divergently first, then converge on promising directions. Ask "What if..." questions to expand thinking.`,
    },
  });

  console.log("📐 Created mode templates:", agileSprintTemplate.name, ",", leanExperimentTemplate.name, ",", brainstormMapTemplate.name);

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@trellis.pm",
      name: "Demo User",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
    },
  });

  console.log("👤 Created demo user:", demoUser.email);

  // Create demo project with Agile Sprint template
  const project = await prisma.project.create({
    data: {
      name: "Trellis PM Development",
      description: "Building the next-generation AI-powered project management tool",
      slug: "trellis-pm-dev",
      ownerId: demoUser.id,
      modeTemplateId: agileSprintTemplate.id,
      members: {
        create: {
          userId: demoUser.id,
          role: "OWNER",
        },
      },
    },
  });

  console.log("📁 Created project:", project.name);

  // Create Epic work item
  const epic = await prisma.workItem.create({
    data: {
      type: "EPIC",
      title: "AI-Powered Task Management",
      description: "Implement AI features for intelligent task management and prioritization",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
  });

  console.log("📌 Created epic:", epic.title);

  // Create Sprint work item
  const sprint = await prisma.workItem.create({
    data: {
      type: "SPRINT",
      title: "Sprint 1: Foundation",
      description: "Set up core infrastructure and basic AI integration",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project.id,
      creatorId: demoUser.id,
    },
  });

  // Create edge: Epic -> Sprint
  await prisma.workItemEdge.create({
    data: {
      parentId: epic.id,
      childId: sprint.id,
      edgeType: "PARENT_CHILD",
    },
  });

  console.log("🏃 Created sprint:", sprint.title);

  // Create Task work items
  const task1 = await prisma.workItem.create({
    data: {
      type: "TASK",
      title: "Design conversation branching system",
      description: "Create the data model and UI for branching conversations",
      status: "DONE",
      priority: "HIGH",
      position: 0,
      projectId: project.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
  });

  const task2 = await prisma.workItem.create({
    data: {
      type: "TASK",
      title: "Implement message streaming",
      description: "Add real-time streaming for AI responses",
      status: "IN_PROGRESS",
      priority: "HIGH",
      position: 1,
      projectId: project.id,
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
    },
  });

  const task3 = await prisma.workItem.create({
    data: {
      type: "TASK",
      title: "Build artifact renderer",
      description: "Create components to render different artifact types (Plan, Spec, Checklist, etc.)",
      status: "OPEN",
      priority: "MEDIUM",
      position: 2,
      projectId: project.id,
      creatorId: demoUser.id,
    },
  });

  // Create edges: Sprint -> Tasks
  await prisma.workItemEdge.createMany({
    data: [
      { parentId: sprint.id, childId: task1.id, edgeType: "PARENT_CHILD" },
      { parentId: sprint.id, childId: task2.id, edgeType: "PARENT_CHILD" },
      { parentId: sprint.id, childId: task3.id, edgeType: "PARENT_CHILD" },
    ],
  });

  console.log("✅ Created tasks:", task1.title, ",", task2.title, ",", task3.title);

  // Create a Bug work item
  const bug = await prisma.workItem.create({
    data: {
      type: "BUG",
      title: "Message ordering incorrect after branch switch",
      description: "Messages appear out of order when switching between branches",
      status: "OPEN",
      priority: "URGENT",
      projectId: project.id,
      creatorId: demoUser.id,
    },
  });

  console.log("🐛 Created bug:", bug.title);

  // Create an Idea work item
  const idea = await prisma.workItem.create({
    data: {
      type: "IDEA",
      title: "Voice input for task creation",
      description: "Allow users to create tasks and interact with AI using voice",
      status: "OPEN",
      priority: "LOW",
      projectId: project.id,
      creatorId: demoUser.id,
    },
  });

  console.log("💡 Created idea:", idea.title);

  // Create a default branch for task2 (the in-progress task)
  const mainBranch = await prisma.branch.create({
    data: {
      name: "main",
      isDefault: true,
      workItemId: task2.id,
    },
  });

  console.log("🌿 Created main branch for task:", task2.title);

  // Add some messages to the branch
  const messages = await prisma.message.createMany({
    data: [
      {
        role: "USER",
        content: "How should we implement message streaming for AI responses?",
        branchId: mainBranch.id,
        userId: demoUser.id,
      },
      {
        role: "ASSISTANT",
        content: `I recommend using Server-Sent Events (SSE) for streaming AI responses. Here's a high-level approach:

1. **Backend**: Create an API endpoint that uses SSE to stream tokens from the AI provider
2. **Frontend**: Use the \`fetch\` API with a ReadableStream to consume the SSE events
3. **State Management**: Update the message content incrementally as tokens arrive

This approach provides:
- Real-time feedback to users
- Lower perceived latency
- Ability to cancel mid-stream if needed

Would you like me to create a detailed implementation plan?`,
        branchId: mainBranch.id,
        metadata: { model: "claude-3", tokens: 150 },
      },
      {
        role: "USER",
        content: "Yes, please create a detailed plan as an artifact.",
        branchId: mainBranch.id,
        userId: demoUser.id,
      },
      {
        role: "ASSISTANT",
        content: "I've created a detailed implementation plan for the message streaming feature. You can find it in the artifacts section.",
        branchId: mainBranch.id,
        metadata: { model: "claude-3", tokens: 45 },
      },
    ],
  });

  console.log("💬 Created", 4, "messages in branch");

  // Create a forked branch (exploring alternative approach)
  const forkBranch = await prisma.branch.create({
    data: {
      name: "websocket-approach",
      isDefault: false,
      workItemId: task2.id,
      forkedFromId: mainBranch.id,
      forkPointMessageId: null, // Would reference a specific message ID in production
    },
  });

  // Add a message to the fork
  await prisma.message.create({
    data: {
      role: "USER",
      content: "What about using WebSockets instead of SSE? Would that be better?",
      branchId: forkBranch.id,
      userId: demoUser.id,
    },
  });

  await prisma.message.create({
    data: {
      role: "ASSISTANT",
      content: `WebSockets could work, but SSE is generally better for this use case because:

1. **Simpler**: SSE is built on HTTP, no special protocol handling
2. **Auto-reconnect**: SSE handles reconnection automatically
3. **One-way is sufficient**: AI streaming is server-to-client only

WebSockets shine when you need **bidirectional** real-time communication (like collaborative editing), but for AI streaming, SSE is more appropriate.

That said, if you're already using WebSockets elsewhere in your app, consolidating on one protocol could reduce complexity.`,
      branchId: forkBranch.id,
      metadata: { model: "claude-3", tokens: 120 },
    },
  });

  console.log("🔀 Created forked branch:", forkBranch.name);

  // Create artifacts
  const planArtifact = await prisma.artifact.create({
    data: {
      type: "PLAN",
      title: "Message Streaming Implementation Plan",
      content: {
        phases: [
          {
            name: "Phase 1: Backend Setup",
            tasks: [
              "Create SSE endpoint at /api/ai/stream",
              "Integrate with AI provider SDK",
              "Implement token buffering",
              "Add error handling and retry logic",
            ],
          },
          {
            name: "Phase 2: Frontend Integration",
            tasks: [
              "Create useStreamingMessage hook",
              "Build StreamingMessageBubble component",
              "Add loading and typing indicators",
              "Implement cancel functionality",
            ],
          },
          {
            name: "Phase 3: Polish",
            tasks: [
              "Add markdown rendering for streamed content",
              "Optimize re-renders during streaming",
              "Add analytics for streaming performance",
              "Write tests",
            ],
          },
        ],
        estimatedDays: 5,
        dependencies: ["AI provider API key", "React Query setup"],
      },
      workItemId: task2.id,
      branchId: mainBranch.id,
    },
  });

  console.log("📋 Created plan artifact:", planArtifact.title);

  const specArtifact = await prisma.artifact.create({
    data: {
      type: "SPEC",
      title: "Streaming API Specification",
      content: {
        endpoint: "/api/ai/stream",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        requestBody: {
          branchId: "string",
          message: "string",
        },
        events: [
          { type: "token", data: { content: "string" } },
          { type: "done", data: { messageId: "string", totalTokens: "number" } },
          { type: "error", data: { code: "string", message: "string" } },
        ],
      },
      workItemId: task2.id,
      branchId: mainBranch.id,
    },
  });

  console.log("📄 Created spec artifact:", specArtifact.title);

  const checklistArtifact = await prisma.artifact.create({
    data: {
      type: "CHECKLIST",
      title: "Streaming Feature Checklist",
      content: {
        items: [
          { id: 1, text: "SSE endpoint created", completed: true },
          { id: 2, text: "AI provider integrated", completed: true },
          { id: 3, text: "Frontend hook implemented", completed: false },
          { id: 4, text: "Cancel functionality added", completed: false },
          { id: 5, text: "Error handling tested", completed: false },
          { id: 6, text: "Performance optimized", completed: false },
        ],
      },
      workItemId: task2.id,
      branchId: mainBranch.id,
    },
  });

  console.log("☑️ Created checklist artifact:", checklistArtifact.title);

  console.log("\n✨ Seeding complete!");
  console.log("\n📊 Summary:");
  console.log("   - 3 Mode Templates (Agile Sprint, Lean Experiment, Brainstorm Map)");
  console.log("   - 1 User");
  console.log("   - 1 Project (using Agile Sprint template)");
  console.log("   - 6 Work Items (1 Epic, 1 Sprint, 3 Tasks, 1 Bug, 1 Idea)");
  console.log("   - 4 Work Item Edges");
  console.log("   - 2 Branches (1 main + 1 fork)");
  console.log("   - 6 Messages");
  console.log("   - 3 Artifacts (Plan, Spec, Checklist)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
