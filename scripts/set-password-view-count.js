#!/usr/bin/env node
/* One-time script to set password page view count (e.g. migrate from PHP/YML) */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TARGET = parseInt(process.argv[2] || "25035", 10);

async function main() {
  await prisma.siteSetting.upsert({
    where: { key: "password_view_count" },
    create: { key: "password_view_count", value: String(TARGET) },
    update: { value: String(TARGET) },
  });
  console.log(`Set password_view_count to ${TARGET}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
