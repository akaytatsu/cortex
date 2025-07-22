import { PrismaClient } from "@prisma/client";
import { config } from "./config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.node.env === "development" ? ["query"] : ["error"],
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

if (config.node.env !== "production") globalForPrisma.prisma = prisma;
