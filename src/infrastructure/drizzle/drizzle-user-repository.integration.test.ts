import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDrizzleClient, type DrizzleClient } from "./client.js";
import { DrizzleUserRepository } from "./drizzle-user-repository.js";

describe.skipIf(!process.env.DATABASE_URL)("DrizzleUserRepository", () => {
  let client: DrizzleClient;
  let repository: DrizzleUserRepository;

  beforeAll(() => {
    client = createDrizzleClient();
    repository = new DrizzleUserRepository(client);
  });

  afterAll(async () => {
    await client.$client.end();
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
