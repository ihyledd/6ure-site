/**
 * Sends application responses to Discord via webhook.
 * For forum channels: use thread_name to create a new forum post.
 */

const DISCORD_MAX_CONTENT = 2000;
const SAFE_CONTENT = 1900;

function escapeDiscord(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\~")
    .replace(/\|/g, "\\|")
    .slice(0, 1000); // per block limit
}

function formatBlock(label: string, value: string): string {
  const safeLabel = escapeDiscord(label);
  const safeValue = String(value ?? "").slice(0, 950);
  return `**${safeLabel}**\n${safeValue}\n`;
}

export type DiscordWebhookPayload = {
  webhookUrl: string;
  formTitle: string;
  applicantUsername: string | null;
  applicantUserId: string;
  entries: { label: string; value: string }[];
  /** If true, create a new forum post (thread_name). If false, post to existing channel. */
  asForumPost?: boolean;
};

export async function sendApplicationToDiscord(payload: DiscordWebhookPayload): Promise<boolean> {
  const {
    webhookUrl,
    formTitle,
    applicantUsername,
    applicantUserId,
    entries,
    asForumPost = true,
  } = payload;

  if (!webhookUrl?.startsWith("https://discord.com/api/webhooks/")) {
    return false;
  }

  const header = [
    `**Form:** ${escapeDiscord(formTitle)}`,
    `**Applicant:** ${applicantUsername ?? "Unknown"} (\`${applicantUserId}\`)`,
    `**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    "",
    "---",
    "",
  ].join("\n");

  const blocks = entries.map(({ label, value }) => formatBlock(label, value));
  const fullContent = header + blocks.join("\n");

  const addWait = (url: string) =>
    url.includes("wait=") ? url : `${url}${url.includes("?") ? "&" : "?"}wait=true`;

  const sendChunk = async (
    content: string,
    options: { threadName?: string; threadId?: string } = {}
  ): Promise<{ thread_id?: string } | null> => {
    let urlStr = addWait(webhookUrl);
    if (options.threadId) urlStr += `${urlStr.includes("?") ? "&" : "?"}thread_id=${options.threadId}`;

    const body: Record<string, unknown> = {
      content: content.slice(0, DISCORD_MAX_CONTENT),
      allowed_mentions: { parse: [] },
    };
    if (asForumPost && options.threadName) body.thread_name = options.threadName;

    const res = await fetch(urlStr, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[Discord webhook] error:", res.status, await res.text());
      return null;
    }

    const text = await res.text();
    if (!text) return {};
    try {
      const data = JSON.parse(text);
      return { thread_id: data.thread_id ?? data.channel_id };
    } catch {
      return {};
    }
  };

  try {
    const threadName = `Application: ${(applicantUsername ?? "Unknown").slice(0, 80)}`;

    if (fullContent.length <= SAFE_CONTENT) {
      await sendChunk(fullContent, { threadName });
      return true;
    }

    // Split: first message creates thread, rest go to thread_id
    const firstChunk = fullContent.slice(0, SAFE_CONTENT);
    const result = await sendChunk(firstChunk, { threadName });
    const threadId = result?.thread_id;
    if (!threadId) return true;

    let pos = SAFE_CONTENT;
    while (pos < fullContent.length) {
      const chunk = fullContent.slice(pos, pos + SAFE_CONTENT);
      if (chunk.trim()) await sendChunk(chunk, { threadId });
      pos += SAFE_CONTENT;
    }
    return true;
  } catch (err) {
    console.error("[Discord webhook] failed:", err);
    return false;
  }
}
