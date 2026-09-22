import { createDrizzleClient } from "./client.js";
import { users } from "./schema/user.js";

const FIXED_USERS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "admin", role: "admin" as const },
  { id: "22222222-2222-4222-8222-222222222222", name: "alice", role: "member" as const },
  { id: "33333333-3333-4333-8333-333333333333", name: "bob", role: "member" as const },
];

async function main() {
  const client = createDrizzleClient();
  try {
    for (const user of FIXED_USERS) {
      await client.insert(users).values(user).onConflictDoNothing({ target: users.id });
    }
  } finally {
    await client.$client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
