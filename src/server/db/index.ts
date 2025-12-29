import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires adapter or accelerateUrl for connection
// For local development with standard PostgreSQL, use accelerateUrl pattern
// or pass adapter from @prisma/adapter-pg

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // For Prisma Postgres or Accelerate
    accelerateUrl: process.env.DATABASE_URL!,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type { PrismaClient } from "@/generated/prisma/client";
