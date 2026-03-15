/**
 * One-time migration: copy requests data from old MySQL DB to PostgreSQL (Prisma).
 * Run from "new complete site" with:
 *   npm install mysql2
 *   MYSQL_DATABASE_URL="mysql://user:pass@host:3306/dbname" node scripts/migrate-requests-from-mysql.js
 *
 * Requires: DATABASE_URL (PostgreSQL) and MYSQL_DATABASE_URL (MySQL) in env.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

let mysqlPool;
async function getMysql() {
  if (mysqlPool) return mysqlPool;
  const url = process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL;
  if (!url) {
    console.error("Set MYSQL_DATABASE_URL (or MYSQL_URL) to your old MySQL connection string.");
    process.exit(1);
  }
  const mysql = await import("mysql2/promise").catch(() => null);
  if (!mysql) {
    console.error("Install mysql2: npm install mysql2");
    process.exit(1);
  }
  mysqlPool = mysql.default.createPool({ uri: url });
  return mysqlPool;
}

function row(r) {
  return r === undefined || r === null ? null : r;
}

async function migrate() {
  const mysql = await getMysql();

  // 1) Users -> requests_users
  console.log("Migrating users -> requests_users...");
  const [users] = await mysql.query(
    "SELECT id, username, discriminator, global_name, display_name, avatar, banner, accent_color, public_flags, premium_type, roles, patreon_premium, guild_nickname, guild_avatar, guild_tag, guild_badge, boost_level, premium_since, created_at, updated_at FROM users"
  );
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const u of users) {
    const roles = u.roles ? (typeof u.roles === "string" ? JSON.parse(u.roles) : u.roles) : null;
    const isStaff = Array.isArray(roles) && staffRoleIds.some((rid) => roles.includes(rid));
    await prisma.requestsUser.upsert({
      where: { id: String(u.id) },
      create: {
        id: String(u.id),
        username: String(u.username || ""),
        discriminator: row(u.discriminator),
        globalName: row(u.global_name),
        displayName: row(u.display_name),
        avatar: row(u.avatar),
        banner: row(u.banner),
        accentColor: row(u.accent_color),
        publicFlags: row(u.public_flags) ?? 0,
        premiumType: row(u.premium_type) ?? 0,
        roles: roles,
        patreonPremium: Boolean(u.patreon_premium),
        guildNickname: row(u.guild_nickname),
        guildAvatar: row(u.guild_avatar),
        guildTag: row(u.guild_tag),
        guildBadge: row(u.guild_badge),
        boostLevel: Number(u.boost_level) || 0,
        premiumSince: u.premium_since ? new Date(u.premium_since) : null,
        isStaff,
        createdAt: u.created_at ? new Date(u.created_at) : new Date(),
        updatedAt: u.updated_at ? new Date(u.updated_at) : new Date(),
      },
      update: {
        username: String(u.username || ""),
        discriminator: row(u.discriminator),
        globalName: row(u.global_name),
        displayName: row(u.display_name),
        avatar: row(u.avatar),
        banner: row(u.banner),
        accentColor: row(u.accent_color),
        publicFlags: row(u.public_flags) ?? 0,
        premiumType: row(u.premium_type) ?? 0,
        roles: roles,
        patreonPremium: Boolean(u.patreon_premium),
        guildNickname: row(u.guild_nickname),
        guildAvatar: row(u.guild_avatar),
        guildTag: row(u.guild_tag),
        guildBadge: row(u.guild_badge),
        boostLevel: Number(u.boost_level) || 0,
        premiumSince: u.premium_since ? new Date(u.premium_since) : null,
        isStaff,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`  ${users.length} users`);

  // 2) Requests
  console.log("Migrating requests...");
  const [requests] = await mysql.query(
    "SELECT id, user_id, creator_url, product_url, title, description, image_url, price, price_numeric, status, thread_id, message_id, leak_message_id, leak_message_url, public_message_id, upvotes, views, comments_locked, creator_name, creator_avatar, creator_platform, anonymous, cancel_requested_at, cancel_reason, cancel_approved_by, cancel_approved_at, cancel_rejected_at, cancel_rejection_reason, rejection_reason, created_at, updated_at FROM requests"
  );
  for (const r of requests) {
    const status = (r.status || "pending").toLowerCase();
    if (!["pending", "completed", "rejected", "cancelled"].includes(status)) continue;
    await prisma.request.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        userId: r.user_id ? String(r.user_id) : null,
        creatorUrl: String(r.creator_url || ""),
        productUrl: String(r.product_url || ""),
        title: row(r.title),
        description: row(r.description),
        imageUrl: row(r.image_url),
        price: row(r.price),
        priceNumeric: r.price_numeric != null ? Number(r.price_numeric) : null,
        status,
        threadId: row(r.thread_id),
        messageId: row(r.message_id),
        leakMessageId: row(r.leak_message_id),
        leakMessageUrl: row(r.leak_message_url),
        publicMessageId: row(r.public_message_id),
        upvotes: Number(r.upvotes) || 0,
        views: Number(r.views) || 0,
        commentsLocked: Boolean(r.comments_locked),
        creatorName: row(r.creator_name),
        creatorAvatar: row(r.creator_avatar),
        creatorPlatform: row(r.creator_platform),
        anonymous: Boolean(r.anonymous),
        cancelRequestedAt: r.cancel_requested_at ? new Date(r.cancel_requested_at) : null,
        cancelReason: row(r.cancel_reason),
        cancelApprovedBy: row(r.cancel_approved_by),
        cancelApprovedAt: r.cancel_approved_at ? new Date(r.cancel_approved_at) : null,
        cancelRejectedAt: r.cancel_rejected_at ? new Date(r.cancel_rejected_at) : null,
        cancelRejectionReason: row(r.cancel_rejection_reason),
        rejectionReason: row(r.rejection_reason),
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
      },
      update: {
        userId: r.user_id ? String(r.user_id) : null,
        creatorUrl: String(r.creator_url || ""),
        productUrl: String(r.product_url || ""),
        title: row(r.title),
        description: row(r.description),
        imageUrl: row(r.image_url),
        price: row(r.price),
        priceNumeric: r.price_numeric != null ? Number(r.price_numeric) : null,
        status,
        threadId: row(r.thread_id),
        messageId: row(r.message_id),
        leakMessageId: row(r.leak_message_id),
        leakMessageUrl: row(r.leak_message_url),
        publicMessageId: row(r.public_message_id),
        upvotes: Number(r.upvotes) || 0,
        views: Number(r.views) || 0,
        commentsLocked: Boolean(r.comments_locked),
        creatorName: row(r.creator_name),
        creatorAvatar: row(r.creator_avatar),
        creatorPlatform: row(r.creator_platform),
        anonymous: Boolean(r.anonymous),
        cancelRequestedAt: r.cancel_requested_at ? new Date(r.cancel_requested_at) : null,
        cancelReason: row(r.cancel_reason),
        cancelApprovedBy: row(r.cancel_approved_by),
        cancelApprovedAt: r.cancel_approved_at ? new Date(r.cancel_approved_at) : null,
        cancelRejectedAt: r.cancel_rejected_at ? new Date(r.cancel_rejected_at) : null,
        cancelRejectionReason: row(r.cancel_rejection_reason),
        rejectionReason: row(r.rejection_reason),
        updatedAt: new Date(),
      },
    });
  }
  console.log(`  ${requests.length} requests`);

  // Reset PostgreSQL sequence for requests
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('requests', 'id'), COALESCE((SELECT MAX(id) FROM requests), 1))`
  );

  // 3) Upvotes
  console.log("Migrating upvotes...");
  const [upvotes] = await mysql.query("SELECT id, request_id, user_id, created_at FROM upvotes");
  for (const v of upvotes) {
    try {
      await prisma.upvote.upsert({
        where: { id: v.id },
        create: {
          id: v.id,
          requestId: v.request_id,
          userId: String(v.user_id),
          createdAt: v.created_at ? new Date(v.created_at) : new Date(),
        },
        update: {},
      });
    } catch (e) {
      if (e.code !== "P2002") throw e; // unique violation, skip
    }
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('upvotes', 'id'), COALESCE((SELECT MAX(id) FROM upvotes), 1))`
  );
  console.log(`  ${upvotes.length} upvotes`);

  // 4) Comments
  console.log("Migrating comments...");
  const [comments] = await mysql.query(
    "SELECT id, request_id, user_id, parent_id, content, created_at, updated_at FROM comments"
  );
  for (const c of comments) {
    await prisma.comment.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        requestId: c.request_id,
        userId: String(c.user_id),
        parentId: row(c.parent_id),
        content: String(c.content || ""),
        createdAt: c.created_at ? new Date(c.created_at) : new Date(),
        updatedAt: c.updated_at ? new Date(c.updated_at) : new Date(),
      },
      update: { content: String(c.content || ""), updatedAt: new Date() },
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('comments', 'id'), COALESCE((SELECT MAX(id) FROM comments), 1))`
  );
  console.log(`  ${comments.length} comments`);

  // 5) Comment bans
  console.log("Migrating comment_bans...");
  const [bans] = await mysql.query(
    "SELECT id, user_id, reason, banned_by, banned_until, created_at FROM comment_bans"
  );
  for (const b of bans) {
    await prisma.commentBan.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        userId: String(b.user_id),
        reason: row(b.reason),
        bannedBy: String(b.banned_by),
        bannedUntil: b.banned_until ? new Date(b.banned_until) : null,
        createdAt: b.created_at ? new Date(b.created_at) : new Date(),
      },
      update: {},
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('comment_bans', 'id'), COALESCE((SELECT MAX(id) FROM comment_bans), 1))`
  );
  console.log(`  ${bans.length} comment_bans`);

  // 6) Notifications
  console.log("Migrating notifications...");
  const [notifs] = await mysql.query(
    "SELECT id, request_id, user_id, type, title, message, `read`, created_at FROM notifications"
  );
  for (const n of notifs) {
    await prisma.notification.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        requestId: row(n.request_id),
        userId: String(n.user_id),
        type: String(n.type || "leak"),
        title: String(n.title || ""),
        message: String(n.message || ""),
        read: Boolean(n.read),
        createdAt: n.created_at ? new Date(n.created_at) : new Date(),
      },
      update: { read: Boolean(n.read) },
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('notifications', 'id'), COALESCE((SELECT MAX(id) FROM notifications), 1))`
  );
  console.log(`  ${notifs.length} notifications`);

  // 7) Request views (optional, can skip if large)
  console.log("Migrating request_views...");
  const [views] = await mysql.query(
    "SELECT id, request_id, user_id, session_id, created_at FROM request_views"
  );
  for (const v of views) {
    try {
      await prisma.requestView.upsert({
        where: { id: v.id },
        create: {
          id: v.id,
          requestId: v.request_id,
          userId: String(v.user_id),
          sessionId: String(v.session_id || ""),
          createdAt: v.created_at ? new Date(v.created_at) : new Date(),
        },
        update: {},
      });
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('request_views', 'id'), COALESCE((SELECT MAX(id) FROM request_views), 1))`
  );
  console.log(`  ${views.length} request_views`);

  // 8) FAQs
  console.log("Migrating faqs...");
  const [faqs] = await mysql.query(
    "SELECT id, question, answer, order_index, category, created_at, updated_at FROM faqs"
  );
  for (const f of faqs) {
    await prisma.faq.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        question: String(f.question || ""),
        answer: String(f.answer || ""),
        orderIndex: Number(f.order_index) || 0,
        category: row(f.category) || "general",
        createdAt: f.created_at ? new Date(f.created_at) : new Date(),
        updatedAt: f.updated_at ? new Date(f.updated_at) : new Date(),
      },
      update: {
        question: String(f.question || ""),
        answer: String(f.answer || ""),
        orderIndex: Number(f.order_index) || 0,
        category: row(f.category) || "general",
        updatedAt: new Date(),
      },
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('faqs', 'id'), COALESCE((SELECT MAX(id) FROM faqs), 1))`
  );
  console.log(`  ${faqs.length} faqs`);

  // 9) Announcements
  console.log("Migrating announcements...");
  const [ann] = await mysql.query(
    "SELECT id, title, message, active, centered, created_at, updated_at FROM announcements"
  );
  for (const a of ann) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        title: String(a.title || ""),
        message: String(a.message || ""),
        active: Boolean(a.active),
        centered: Boolean(a.centered),
        createdAt: a.created_at ? new Date(a.created_at) : new Date(),
        updatedAt: a.updated_at ? new Date(a.updated_at) : new Date(),
      },
      update: {
        title: String(a.title || ""),
        message: String(a.message || ""),
        active: Boolean(a.active),
        centered: Boolean(a.centered),
        updatedAt: new Date(),
      },
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('announcements', 'id'), COALESCE((SELECT MAX(id) FROM announcements), 1))`
  );
  console.log(`  ${ann.length} announcements`);

  // 10) Protected users
  console.log("Migrating protected_users...");
  const [pu] = await mysql.query(
    "SELECT id, user_id, reason, created_by, subscription_ends_at, social_link, display_name, avatar_url, creator_name, creator_avatar, creator_platform, follower_count, video_count, likes_count, verified, creator_bio, creator_bio_link, created_at FROM protected_users"
  );
  for (const p of pu) {
    await prisma.protectedUser.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        userId: String(p.user_id),
        reason: row(p.reason),
        createdBy: row(p.created_by) ? String(p.created_by) : null,
        subscriptionEndsAt: p.subscription_ends_at ? new Date(p.subscription_ends_at) : null,
        socialLink: row(p.social_link),
        displayName: row(p.display_name),
        avatarUrl: row(p.avatar_url),
        creatorName: row(p.creator_name),
        creatorAvatar: row(p.creator_avatar),
        creatorPlatform: row(p.creator_platform),
        followerCount: p.follower_count != null ? BigInt(p.follower_count) : null,
        videoCount: row(p.video_count),
        likesCount: p.likes_count != null ? BigInt(p.likes_count) : null,
        verified: row(p.verified),
        creatorBio: row(p.creator_bio),
        creatorBioLink: row(p.creator_bio_link),
        createdAt: p.created_at ? new Date(p.created_at) : new Date(),
      },
      update: {
        reason: row(p.reason),
        createdBy: row(p.created_by) ? String(p.created_by) : null,
        subscriptionEndsAt: p.subscription_ends_at ? new Date(p.subscription_ends_at) : null,
        socialLink: row(p.social_link),
        displayName: row(p.display_name),
        avatarUrl: row(p.avatar_url),
        creatorName: row(p.creator_name),
        creatorAvatar: row(p.creator_avatar),
        creatorPlatform: row(p.creator_platform),
        followerCount: p.follower_count != null ? BigInt(p.follower_count) : null,
        videoCount: row(p.video_count),
        likesCount: p.likes_count != null ? BigInt(p.likes_count) : null,
        verified: p.verified,
        creatorBio: row(p.creator_bio),
        creatorBioLink: row(p.creator_bio_link),
      },
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('protected_users', 'id'), COALESCE((SELECT MAX(id) FROM protected_users), 1))`
  );
  console.log(`  ${pu.length} protected_users`);

  // 11) Protected links
  console.log("Migrating protected_links...");
  const [pl] = await mysql.query(
    "SELECT id, group_name, link, type, created_at FROM protected_links"
  );
  for (const l of pl) {
    await prisma.protectedLink.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        groupName: String(l.group_name || "default"),
        link: String(l.link || ""),
        type: (l.type || "link") === "keyword" ? "keyword" : "link",
        createdAt: l.created_at ? new Date(l.created_at) : new Date(),
      },
      update: {
        groupName: String(l.group_name || "default"),
        link: String(l.link || ""),
        type: (l.type || "link") === "keyword" ? "keyword" : "link",
      },
    });
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('protected_links', 'id'), COALESCE((SELECT MAX(id) FROM protected_links), 1))`
  );
  console.log(`  ${pl.length} protected_links`);

  // 12) Default settings
  console.log("Migrating default_settings...");
  const [ds] = await mysql.query("SELECT `key`, value, updated_at FROM default_settings");
  for (const d of ds) {
    await prisma.requestDefaultSetting.upsert({
      where: { key: d.key },
      create: {
        key: d.key,
        value: row(d.value),
        updatedAt: d.updated_at ? new Date(d.updated_at) : new Date(),
      },
      update: { value: row(d.value), updatedAt: new Date() },
    });
  }
  console.log(`  ${ds.length} default_settings`);

  // 13) User settings
  console.log("Migrating user_settings...");
  const [us] = await mysql.query("SELECT user_id, `key`, value, updated_at FROM user_settings");
  for (const u of us) {
    await prisma.requestUserSetting.upsert({
      where: { userId_key: { userId: String(u.user_id), key: u.key } },
      create: {
        userId: String(u.user_id),
        key: u.key,
        value: row(u.value),
        updatedAt: u.updated_at ? new Date(u.updated_at) : new Date(),
      },
      update: { value: row(u.value), updatedAt: new Date() },
    });
  }
  console.log(`  ${us.length} user_settings`);

  console.log("Migration done.");
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (mysqlPool) await mysqlPool.end();
  });
