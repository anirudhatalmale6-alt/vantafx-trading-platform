import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function upsertUser(opts: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN";
  balance: number;
  country?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 12);
  return db.user.upsert({
    where: { email: opts.email },
    // Re-running the seed must not wipe a balance somebody has been trading with.
    update: { role: opts.role, firstName: opts.firstName, lastName: opts.lastName },
    create: {
      email: opts.email,
      passwordHash,
      firstName: opts.firstName,
      lastName: opts.lastName,
      role: opts.role,
      balance: opts.balance,
      country: opts.country ?? null,
    },
  });
}

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";

  const admin = await upsertUser({
    email: adminEmail,
    password: adminPassword,
    firstName: "Platform",
    lastName: "Admin",
    role: "ADMIN",
    balance: 0,
  });

  const demo = await upsertUser({
    email: "demo@example.com",
    password: "DemoTrader1",
    firstName: "Demo",
    lastName: "Trader",
    role: "USER",
    balance: 10_000,
    country: "United Kingdom",
  });

  const thread = await db.chatThread.upsert({
    where: { userId: demo.id },
    update: {},
    create: { userId: demo.id },
  });

  if ((await db.chatMessage.count({ where: { threadId: thread.id } })) === 0) {
    await db.chatMessage.create({
      data: {
        threadId: thread.id,
        authorId: admin.id,
        fromAdmin: true,
        body: "Welcome to VantaFX. The support desk is open 24/5 - just type here and we'll reply.",
      },
    });
    await db.chatThread.update({
      where: { id: thread.id },
      data: { unreadForUser: 1, lastMessageAt: new Date() },
    });
  }

  console.log("Seed complete.");
  console.log(`  admin : ${adminEmail} / ${adminPassword}`);
  console.log("  client: demo@example.com / DemoTrader1");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
