import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "./client.js";
import { PrismaUserRepository } from "./prisma-user-repository.js";

describe.skipIf(!process.env.DATABASE_URL)("PrismaUserRepository", () => {
  let client: PrismaClient;
  let repository: PrismaUserRepository;

  beforeAll(() => {
    client = createPrismaClient();
    repository = new PrismaUserRepository(client);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it("finds a seeded fixed user by id", async () => {
    const user = await repository.findById("11111111-1111-4111-8111-111111111111");

    expect(user).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "admin",
      role: "admin",
    });
  });

  it("returns null for an unknown id", async () => {
    expect(await repository.findById("does-not-exist")).toBeNull();
  });
});
