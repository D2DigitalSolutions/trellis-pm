import { PrismaClient, type Label } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: "alex@example.com",
      name: "Alex Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "sam@example.com",
      name: "Sam Wilson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sam",
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "jordan@example.com",
      name: "Jordan Lee",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jordan",
    },
  });

  console.log("✅ Created users");

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description:
        "Complete overhaul of the company website with modern design and improved UX",
      slug: "website-redesign",
      ownerId: user1.id,
      members: {
        create: [
          { userId: user1.id, role: "OWNER" },
          { userId: user2.id, role: "MEMBER" },
        ],
      },
      labels: {
        create: [
          { name: "Frontend", color: "#3b82f6" },
          { name: "Backend", color: "#10b981" },
          { name: "Design", color: "#8b5cf6" },
          { name: "Bug", color: "#ef4444" },
          { name: "Feature", color: "#f59e0b" },
        ],
      },
    },
    include: {
      labels: true,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App MVP",
      description: "First version of the mobile application for iOS and Android",
      slug: "mobile-app-mvp",
      ownerId: user2.id,
      members: {
        create: [
          { userId: user2.id, role: "OWNER" },
          { userId: user1.id, role: "ADMIN" },
          { userId: user3.id, role: "MEMBER" },
        ],
      },
      labels: {
        create: [
          { name: "iOS", color: "#000000" },
          { name: "Android", color: "#4ade80" },
          { name: "UI", color: "#ec4899" },
          { name: "API", color: "#06b6d4" },
        ],
      },
    },
    include: {
      labels: true,
    },
  });

  console.log("✅ Created projects");

  // Get labels for project 1
  const frontendLabel = project1.labels.find((l: Label) => l.name === "Frontend");
  const backendLabel = project1.labels.find((l: Label) => l.name === "Backend");
  const designLabel = project1.labels.find((l: Label) => l.name === "Design");
  const featureLabel = project1.labels.find((l: Label) => l.name === "Feature");

  // Suppress unused variable warnings
  void frontendLabel;
  void backendLabel;
  void designLabel;
  void featureLabel;

  // Create tasks for project 1
  await prisma.task.createMany({
    data: [
      {
        title: "Design new homepage mockup",
        description:
          "Create wireframes and high-fidelity mockups for the new homepage design",
        status: "DONE",
        priority: "HIGH",
        position: 0,
        projectId: project1.id,
        creatorId: user1.id,
        assigneeId: user1.id,
      },
      {
        title: "Implement responsive navigation",
        description:
          "Build a mobile-first responsive navigation component with hamburger menu",
        status: "IN_PROGRESS",
        priority: "HIGH",
        position: 0,
        projectId: project1.id,
        creatorId: user1.id,
        assigneeId: user2.id,
      },
      {
        title: "Set up CI/CD pipeline",
        description:
          "Configure GitHub Actions for automated testing and deployment",
        status: "TODO",
        priority: "MEDIUM",
        position: 0,
        projectId: project1.id,
        creatorId: user1.id,
        assigneeId: null,
      },
      {
        title: "Optimize images for web",
        description: "Compress and convert images to WebP format for better performance",
        status: "TODO",
        priority: "LOW",
        position: 1,
        projectId: project1.id,
        creatorId: user2.id,
        assigneeId: user1.id,
      },
      {
        title: "Write API documentation",
        description: "Document all REST endpoints using OpenAPI/Swagger",
        status: "IN_REVIEW",
        priority: "MEDIUM",
        position: 0,
        projectId: project1.id,
        creatorId: user1.id,
        assigneeId: user2.id,
      },
    ],
  });

  // Create tasks for project 2
  await prisma.task.createMany({
    data: [
      {
        title: "Set up React Native project",
        description: "Initialize the React Native project with TypeScript and Expo",
        status: "DONE",
        priority: "HIGH",
        position: 0,
        projectId: project2.id,
        creatorId: user2.id,
        assigneeId: user2.id,
      },
      {
        title: "Design authentication flow",
        description: "Create login, register, and password reset screens",
        status: "IN_PROGRESS",
        priority: "HIGH",
        position: 0,
        projectId: project2.id,
        creatorId: user2.id,
        assigneeId: user3.id,
      },
      {
        title: "Implement push notifications",
        description: "Set up Firebase Cloud Messaging for push notifications",
        status: "TODO",
        priority: "MEDIUM",
        position: 0,
        projectId: project2.id,
        creatorId: user2.id,
        assigneeId: null,
      },
    ],
  });

  console.log("✅ Created tasks");

  // Create some comments
  const tasks = await prisma.task.findMany({
    where: { projectId: project1.id },
    take: 2,
  });

  if (tasks[0]) {
    await prisma.comment.create({
      data: {
        content:
          "Looking great! Just a few minor tweaks needed on the color palette.",
        taskId: tasks[0].id,
        authorId: user2.id,
      },
    });
  }

  if (tasks[1]) {
    await prisma.comment.create({
      data: {
        content: "I've started working on this. Should be ready for review tomorrow.",
        taskId: tasks[1].id,
        authorId: user2.id,
      },
    });
  }

  console.log("✅ Created comments");

  // Create activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        action: "PROJECT_CREATED",
        projectId: project1.id,
        userId: user1.id,
        metadata: { projectName: project1.name },
      },
      {
        action: "TASK_CREATED",
        projectId: project1.id,
        userId: user1.id,
        metadata: { taskTitle: "Design new homepage mockup" },
      },
      {
        action: "MEMBER_ADDED",
        projectId: project1.id,
        userId: user1.id,
        metadata: { memberName: user2.name },
      },
    ],
  });

  console.log("✅ Created activity logs");

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
