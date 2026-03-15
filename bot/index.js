const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, PermissionFlagsBits, REST, Routes, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const { getRequests, updateRequest, getUpvoters, getUpvoterIds, getUser, getRequest, createNotification, getComment, getComments, getRequestByProductUrl, deleteAllRequests, searchRequestsByTitle, getUserRequests, setCommentsLocked, addCommentBan, removeCommentBan, updateUserRoles, getAllUserIds, getDefaultSettings, setDefaultSettings, getEmbedSettings } = require('../bot-server/database');

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://6ureleaks.com';
const BASE_URL = FRONTEND_URL.replace(/\/$/, '');
/** Canonical path for request detail page (used by all embeds and refresh). */
const REQUEST_PATH = '/requests/request';
/** Build the full URL for a request's detail page. Use this everywhere instead of manual /request/ paths. */
function requestUrlFor(requestId) {
  return `${BASE_URL}${REQUEST_PATH}/${requestId}`;
}

/** Ensure image/thumbnail URL is absolute for Discord embeds. Handles relative paths and Discord avatar hashes. */
function toAbsoluteImageUrl(url, userId = null) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${BASE_URL}${u}`;
  if (userId && !u.includes('/')) {
    const ext = u.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${u}.${ext}?size=128`;
  }
  return u;
}

function isStaff(member) {
  if (!member) return false;
  const staffIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!staffIds.length) return false;
  return staffIds.some(id => member.roles.cache.has(id));
}

/** Format display name + Discord mention for embeds/logs. Use everywhere in Discord where a username is shown. */
function formatUserWithMention(user, userId) {
  if (!userId) return 'Anonymous';
  const name = user?.username || user?.global_name || user?.display_name || 'Unknown';
  return `${name} (<@${userId}>)`;
}

/** Parse 0x hex color string to number for Discord embeds. */
function parseEmbedColorHex(v) {
  if (typeof v === 'string' && /^0x[0-9A-Fa-f]+$/.test(v.trim())) return parseInt(v.trim(), 16);
  return null;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

let staffChannel = null;
let newRequestsChannel = null; // Public channel for new requests (DISCORD_NEW_REQUESTS_CHANNEL_ID)
let commentsChannel = null;
let leakForum = null;
/** Premium leak forum (DISCORD_PREMIUM_LEAK_FORUM_ID) – leaks posted here also mark requests as completed */
let premiumLeakForum = null;
/** Set of forum channel IDs we monitor for leak posts (main + premium) */
const leakForumIds = new Set();
const processingRequests = new Set(); // Lock to prevent duplicate message creation

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  
  // Register slash commands locally in the guild
  try {
    const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
    
    if (!guildId) {
      console.error('No GUILD_ID or DISCORD_SERVER_ID found in .env file');
      return;
    }
    
    const requestCmd = new SlashCommandBuilder()
      .setName('request')
      .setDescription('View and manage requests')
      .addSubcommand(s => s.setName('list').setDescription('List requests by status')
        .addStringOption(o => o.setName('status').setDescription('Filter by status').setRequired(false)
          .addChoices({ name: 'Pending', value: 'pending' }, { name: 'Completed', value: 'completed' }, { name: 'Rejected', value: 'rejected' }))
        .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)))
      .addSubcommand(s => s.setName('view').setDescription('View a single request')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)))
      .addSubcommand(s => s.setName('user').setDescription('List requests by user')
        .addUserOption(o => o.setName('user').setDescription('Discord user').setRequired(true))
        .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)))
      .addSubcommand(s => s.setName('search').setDescription('Search requests by title')
        .addStringOption(o => o.setName('query').setDescription('Search text').setRequired(true))
        .addIntegerOption(o => o.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)))
      .addSubcommand(s => s.setName('stats').setDescription('Show request statistics'))
      .addSubcommand(s => s.setName('recent').setDescription('Show recent requests')
        .addIntegerOption(o => o.setName('limit').setDescription('Number of requests').setRequired(false).setMinValue(1).setMaxValue(15)))
      .addSubcommand(s => s.setName('top').setDescription('Show top upvoted requests')
        .addIntegerOption(o => o.setName('limit').setDescription('Number of requests').setRequired(false).setMinValue(1).setMaxValue(15))
        .addStringOption(o => o.setName('status').setDescription('Filter by status').setRequired(false)
          .addChoices({ name: 'Any', value: 'any' }, { name: 'Pending', value: 'pending' }, { name: 'Completed', value: 'completed' })))
      .addSubcommand(s => s.setName('voters').setDescription('List voters for a request')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)))
      .addSubcommand(s => s.setName('comments').setDescription('Show comment count/preview for a request')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)))
      .addSubcommand(s => s.setName('complete').setDescription('Mark request as completed (Staff only)')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true))
        .addStringOption(o => o.setName('link').setDescription('Leak message link').setRequired(false)))
      .addSubcommand(s => s.setName('reject').setDescription('Mark request as rejected (Staff only)')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)))
      .addSubcommand(s => s.setName('lock').setDescription('Lock comments on a request (Staff only)')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)))
      .addSubcommand(s => s.setName('unlock').setDescription('Unlock comments on a request (Staff only)')
        .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)))
      .addSubcommand(s => s.setName('mute').setDescription('Mute a user from commenting on requests (Staff only)')
        .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for mute').setRequired(false))
        .addIntegerOption(o => o.setName('days').setDescription('Mute duration in days (omit for permanent)').setRequired(false).setMinValue(1)))
      .addSubcommand(s => s.setName('unmute').setDescription('Unmute a user from commenting (Staff only)')
        .addUserOption(o => o.setName('user').setDescription('User to unmute').setRequired(true)))
      .addSubcommand(s => s.setName('delete').setDescription('Delete all requests (Admin only)')
        .addStringOption(o => o.setName('confirm').setDescription('Type "DELETE ALL" to confirm').setRequired(true)))
      .addSubcommand(s => s.setName('defaultsettings').setDescription('Configure default settings for new users (Staff only)'));

    const commands = [requestCmd.toJSON()];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    
    // Verify guild exists
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      console.error(`Guild with ID ${guildId} not found. Make sure the bot is in the guild.`);
      return;
    }
    
    console.log(`Registering ${commands.length} slash command(s) in guild: ${guild.name} (${guildId})`);
    
    // Register guild commands (local to guild, visible immediately, no global rate limit)
    const data = await rest.put(
      Routes.applicationGuildCommands(client.user.id, guildId),
      { body: commands }
    );
    
    console.log(`✅ Successfully registered ${data.length} slash command(s) locally in guild.`);
    data.forEach(cmd => {
      console.log(`   - /${cmd.name}${cmd.options?.[0]?.name ? ` ${cmd.options[0].name}` : ''}`);
    });
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
    if (error.code === 50001) {
      console.error('   Missing Access: Bot is not in the guild or lacks permissions.');
    } else if (error.code === 50035) {
      console.error('   Invalid Form Body: Command structure is invalid.');
    }
  }
  
  // Fetch guild to ensure it's available
  const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID).catch(err => {
    console.error('Failed to fetch guild:', err);
    return null;
  });
  
  if (guild) {
    // Fetch staff channel for monitoring requests
    const fetchedStaffChannel = await guild.channels.fetch(process.env.DISCORD_STAFF_CHANNEL_ID).catch(err => {
      console.error('Failed to fetch staff channel:', err);
      return null;
    });
    
    leakForum = await guild.channels.fetch(process.env.DISCORD_LEAK_FORUM_ID).catch(err => {
      console.error('Failed to fetch leak forum:', err);
      return null;
    });
    if (process.env.DISCORD_PREMIUM_LEAK_FORUM_ID) {
      premiumLeakForum = await guild.channels.fetch(process.env.DISCORD_PREMIUM_LEAK_FORUM_ID).catch(err => {
        console.error('Failed to fetch premium leak forum:', err);
        return null;
      });
      if (premiumLeakForum && premiumLeakForum.type === ChannelType.GuildForum) {
        leakForumIds.add(premiumLeakForum.id);
        console.log(`Premium leak forum found: ${premiumLeakForum.name} (${premiumLeakForum.type})`);
      }
    }
    if (leakForum && leakForum.type === ChannelType.GuildForum) {
      leakForumIds.add(leakForum.id);
    }

    // Check if staff channel is a text channel
    if (fetchedStaffChannel) {
      if (fetchedStaffChannel.type === ChannelType.GuildText || fetchedStaffChannel.type === ChannelType.GuildAnnouncement) {
        console.log(`Staff channel found: ${fetchedStaffChannel.name} (${fetchedStaffChannel.type})`);
        staffChannel = fetchedStaffChannel;
      } else {
        console.error(`Staff channel is not a text channel! Type: ${fetchedStaffChannel.type}`);
        staffChannel = null;
      }
    } else {
      console.error(`Staff channel not found! Channel ID: ${process.env.DISCORD_STAFF_CHANNEL_ID}`);
      staffChannel = null;
    }
    
    const newRequestsChannelId = (process.env.DISCORD_NEW_REQUESTS_CHANNEL_ID || '').trim();
    if (newRequestsChannelId && newRequestsChannelId !== (process.env.DISCORD_STAFF_CHANNEL_ID || '').trim()) {
      const fetchedNewRequests = await guild.channels.fetch(newRequestsChannelId).catch(() => null);
      if (fetchedNewRequests && (fetchedNewRequests.type === ChannelType.GuildText || fetchedNewRequests.type === ChannelType.GuildAnnouncement)) {
        newRequestsChannel = fetchedNewRequests;
        console.log(`New requests (public) channel: ${newRequestsChannel.name}`);
      }
    }
    
    // Fetch comments channel for comment notifications
    const fetchedCommentsChannel = await guild.channels.fetch(process.env.DISCORD_COMMENTS_CHANNEL_ID).catch(err => {
      console.error('Failed to fetch comments channel:', err);
      return null;
    });
    
    // Check if comments channel is a text channel
    if (fetchedCommentsChannel) {
      if (fetchedCommentsChannel.type === ChannelType.GuildText || fetchedCommentsChannel.type === ChannelType.GuildAnnouncement) {
        console.log(`Comments channel found: ${fetchedCommentsChannel.name} (${fetchedCommentsChannel.type})`);
        commentsChannel = fetchedCommentsChannel;
      } else {
        console.error(`Comments channel is not a text channel! Type: ${fetchedCommentsChannel.type}`);
        commentsChannel = null;
      }
    } else {
      console.error(`Comments channel not found! Channel ID: ${process.env.DISCORD_COMMENTS_CHANNEL_ID}`);
      commentsChannel = null;
    }
    
    if (!leakForum && leakForumIds.size === 0) {
      console.error(`Leak forum not found! Forum ID: ${process.env.DISCORD_LEAK_FORUM_ID}`);
    } else if (leakForum) {
      console.log(`Leak forum found: ${leakForum.name} (${leakForum.type})`);
    }
  } else {
    console.error(`Guild not found! Guild ID: ${process.env.DISCORD_SERVER_ID}`);
  }
  
  // Start polling for new requests (only if channel is available)
  if (staffChannel) {
    setInterval(pollNewRequests, 5000);
  } else {
    console.error('Cannot start polling - staff channel not available');
  }
  
  // Start monitoring leak forum(s) – main and/or premium
  if (leakForumIds.size > 0) {
    monitorLeakForum();
  }
});

// When a member's roles change, sync staff/premium rights to the app DB instantly
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
  if (!guildId || newMember.guild.id !== guildId) return;

  const oldRoleIds = oldMember.roles.cache.map(r => r.id).sort().join(',');
  const newRoleIds = newMember.roles.cache.map(r => r.id).sort().join(',');
  if (oldRoleIds === newRoleIds) return;

  const roleIds = Array.from(newMember.roles.cache.keys());
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const premiumRoleId = (process.env.DISCORD_PREMIUM_ROLE_ID || '').trim();
  const hasPremiumRole = premiumRoleId && roleIds.includes(premiumRoleId);

  try {
    const updated = await updateUserRoles(newMember.id, roleIds, hasPremiumRole);
    if (updated) {
      const staffNow = staffRoleIds.some(id => roleIds.includes(id));
      const staffBefore = staffRoleIds.some(id => oldMember.roles.cache.has(id));
      const premiumBefore = premiumRoleId && oldMember.roles.cache.has(premiumRoleId);
      console.log('[Role sync]', newMember.user.tag, newMember.id, {
        staff: staffBefore ? (staffNow ? 'still' : 'removed') : (staffNow ? 'added' : 'still none'),
        premium: premiumBefore ? (hasPremiumRole ? 'still' : 'removed') : (hasPremiumRole ? 'added' : 'still none')
      });
    }
  } catch (err) {
    console.error('[Role sync] Failed to update user', newMember.id, err.message);
  }
});

// Poll for new requests without message_id
async function pollNewRequests() {
  // Don't poll if channel is not available
  if (!staffChannel) {
    return;
  }
  
  try {
    const result = await getRequests('pending');
    const requests = result.requests || result; // Support both old array format and new paginated format
    const newRequests = requests.filter(r => !r.message_id && !processingRequests.has(r.id));
    
    for (const request of newRequests) {
      // Add to processing set to prevent duplicates
      processingRequests.add(request.id);
      
      try {
        await createRequestMessage(request);
      } catch (error) {
        console.error(`Error creating message for request ${request.id}:`, error);
        // Remove from processing set on error so it can be retried
        processingRequests.delete(request.id);
      }
    }
  } catch (error) {
    console.error('Error polling requests:', error);
  }
}

// Create Discord message for request in staff channel (and optionally public new-requests channel)
async function createRequestMessage(request) {
  if (processingRequests.has(request.id)) return;
  processingRequests.add(request.id);
  try {
  // Ensure channel is available
  if (!staffChannel) {
    const guild = client.guilds.cache.get(process.env.DISCORD_SERVER_ID);
    if (guild) {
      staffChannel = await guild.channels.fetch(process.env.DISCORD_STAFF_CHANNEL_ID).catch(() => null);
      if (!staffChannel) {
        console.error(`Staff channel not found! Channel ID: ${process.env.DISCORD_STAFF_CHANNEL_ID}`);
        return;
      }
    } else {
      console.error('Guild not found!');
      return;
    }
  }
  const fresh = await getRequest(request.id);
  if (fresh && fresh.message_id) {
    return;
  }

  try {
    const user = request.user_id ? await getUser(request.user_id) : null;
    const requestUrl = requestUrlFor(request.id);
    const embeds = await getEmbedSettings().catch(() => ({}));
    const color = parseEmbedColorHex(embeds.embed_new_request_color) ?? (request.status === 'completed' ? 0x57F287 : request.status === 'rejected' ? 0xED4245 : 0x5865F2);
    // Discord embed requires description and field values to be non-empty (min length 1)
    const title = (request.title && String(request.title).trim()) ? String(request.title).trim().slice(0, 256) : 'Untitled Request';
    const description = (request.description && String(request.description).trim()) ? String(request.description).trim().slice(0, 4096) : '*No description*';
    const footerDate = new Date(request.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const footerText = `Request #${request.id} • ${footerDate}`;
    const footerIcon = (embeds.embed_new_request_footer_icon || '').trim() || undefined;
    const fieldNames = [
      (embeds.embed_new_request_field_1_name || '').trim() || 'Product URL',
      (embeds.embed_new_request_field_2_name || '').trim() || 'Creator',
      (embeds.embed_new_request_field_3_name || '').trim() || 'Status',
      (embeds.embed_new_request_field_4_name || '').trim() || 'Upvotes',
      (embeds.embed_new_request_field_views_name || '').trim() || 'Views',
      (embeds.embed_new_request_field_5_name || '').trim() || 'Request ID',
      (embeds.embed_new_request_field_6_name || '').trim() || 'User'
    ];
    const productLink = request.product_url && String(request.product_url).trim() ? `[View Product](${String(request.product_url).trim()})` : '*No link*';
    const creatorValue = (request.creator_name && String(request.creator_name).trim()) ? `[${String(request.creator_name).trim()}](${request.creator_url || '#'})` : (request.creator_url && String(request.creator_url).trim() ? `[View Creator](${String(request.creator_url).trim()})` : '*—*');
    const staffUserValue = (formatUserWithMention(user, request.user_id) || 'Anonymous') + (request.anonymous ? ' *(submitted anonymously)*' : '');
    const publicUserValue = request.anonymous ? 'Anonymous' : (formatUserWithMention(user, request.user_id) || 'Anonymous');
    const showUserThumbnailStaff = (embeds.embed_new_request_thumbnail_enabled || 'false') === 'true' && user?.avatar;
    const showUserThumbnailPublic = showUserThumbnailStaff && !request.anonymous;

    const buildEmbed = (userFieldValue, useThumbnail) => {
      const emb = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setURL(requestUrl)
        .setColor(color)
        .addFields(
          { name: fieldNames[0], value: productLink, inline: true },
          { name: fieldNames[1], value: creatorValue, inline: true },
          { name: fieldNames[2], value: (request.status && String(request.status).trim()) || 'pending', inline: true },
          { name: fieldNames[3], value: String(request.upvotes ?? 0), inline: true },
          { name: fieldNames[4], value: String(request.views ?? 0), inline: true },
          { name: fieldNames[5], value: `#${request.id}`, inline: true },
          { name: fieldNames[6], value: userFieldValue, inline: true }
        )
        .setTimestamp(new Date(request.created_at))
        .setFooter({ text: footerText, iconURL: footerIcon });
      const authorName = (embeds.embed_new_request_author_name || '').trim();
      if (authorName) {
        emb.setAuthor({ name: authorName, iconURL: (embeds.embed_new_request_author_icon || '').trim() || undefined });
      }
      const imageUrl = toAbsoluteImageUrl(request.image_url);
      if ((embeds.embed_new_request_image_enabled || 'true') === 'true' && imageUrl) {
        emb.setImage(imageUrl);
      }
      const thumbUrl = useThumbnail && user?.avatar ? toAbsoluteImageUrl(user.avatar, request.user_id) : null;
      if (thumbUrl) {
        emb.setThumbnail(thumbUrl);
      }
      return emb;
    };

    const staffEmbed = buildEmbed(staffUserValue, showUserThumbnailStaff);
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`request_complete_${request.id}`)
          .setLabel('✅ Complete')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`request_reject_${request.id}`)
          .setLabel('❌ Reject')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`request_delete_${request.id}`)
          .setLabel('🗑️ Delete')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`request_voters_${request.id}`)
          .setLabel('👥 View Voters')
          .setStyle(ButtonStyle.Secondary)
      );

    const message = await staffChannel.send({
      embeds: [staffEmbed],
      components: [row]
    });
    await updateRequest(request.id, { message_id: message.id });

    if (newRequestsChannel && newRequestsChannel.id !== staffChannel.id) {
      try {
        const publicEmbed = buildEmbed(publicUserValue, showUserThumbnailPublic);
        const publicMsg = await newRequestsChannel.send({
          embeds: [publicEmbed]
        });
        await updateRequest(request.id, { public_message_id: publicMsg.id });
        console.log(`Created public new-request message for request ${request.id}: ${publicMsg.id}`);
      } catch (e) {
        console.warn(`[New request] Failed to post to public channel: ${e.message}`);
      }
    }
    
    console.log(`Created staff message for request ${request.id}: ${message.id}`);
  } catch (error) {
    console.error(`Error creating message for request ${request.id}:`, error);
    throw error; // Re-throw to be caught by pollNewRequests
  }
  } finally {
    processingRequests.delete(request.id);
  }
}

// Update embed in staff channel (and public new-requests channel if set)
async function updateRequestMessage(requestId) {
  try {
    const request = await getRequest(requestId);
    if (!request) return;
    const hasStaff = staffChannel && request.message_id;
    const hasPublic = newRequestsChannel && request.public_message_id;
    if (!hasStaff && !hasPublic) return;

    let message = null;
    if (hasStaff) {
      message = await staffChannel.messages.fetch(request.message_id).catch(() => null);
    }
    
    const user = request.user_id ? await getUser(request.user_id) : null;
    const requestUrl = requestUrlFor(request.id);
    const embeds = await getEmbedSettings().catch(() => ({}));
    const color = parseEmbedColorHex(embeds.embed_new_request_color) ?? (request.status === 'completed' ? 0x57F287 : request.status === 'rejected' ? 0xED4245 : 0x5865F2);
    const title = (request.title && String(request.title).trim()) ? String(request.title).trim().slice(0, 256) : 'Untitled Request';
    const description = (request.description && String(request.description).trim()) ? String(request.description).trim().slice(0, 4096) : '*No description*';
    const footerDate = new Date(request.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const footerText = `Request #${request.id} • ${footerDate}`;
    const footerIcon = (embeds.embed_new_request_footer_icon || '').trim() || undefined;
    const fieldNames = [
      (embeds.embed_new_request_field_1_name || '').trim() || 'Product URL',
      (embeds.embed_new_request_field_2_name || '').trim() || 'Creator',
      (embeds.embed_new_request_field_3_name || '').trim() || 'Status',
      (embeds.embed_new_request_field_4_name || '').trim() || 'Upvotes',
      (embeds.embed_new_request_field_views_name || '').trim() || 'Views',
      (embeds.embed_new_request_field_5_name || '').trim() || 'Request ID',
      (embeds.embed_new_request_field_6_name || '').trim() || 'User'
    ];
    const productLink = request.product_url && String(request.product_url).trim() ? `[View Product](${String(request.product_url).trim()})` : '*No link*';
    const creatorValue = (request.creator_name && String(request.creator_name).trim()) ? `[${String(request.creator_name).trim()}](${request.creator_url || '#'})` : (request.creator_url && String(request.creator_url).trim() ? `[View Creator](${String(request.creator_url).trim()})` : '*—*');
    const staffUserValue = (formatUserWithMention(user, request.user_id) || 'Anonymous') + (request.anonymous ? ' *(submitted anonymously)*' : '');
    const publicUserValue = request.anonymous ? 'Anonymous' : (formatUserWithMention(user, request.user_id) || 'Anonymous');
    const showUserThumbnailStaff = (embeds.embed_new_request_thumbnail_enabled || 'false') === 'true' && user?.avatar;
    const showUserThumbnailPublic = showUserThumbnailStaff && !request.anonymous;

    const buildEmbed = (userFieldValue, useThumbnail) => {
      const emb = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setURL(requestUrl)
        .setColor(color)
        .addFields(
          { name: fieldNames[0], value: productLink, inline: true },
          { name: fieldNames[1], value: creatorValue, inline: true },
          { name: fieldNames[2], value: (request.status && String(request.status).trim()) || 'pending', inline: true },
          { name: fieldNames[3], value: String(request.upvotes ?? 0), inline: true },
          { name: fieldNames[4], value: String(request.views ?? 0), inline: true },
          { name: fieldNames[5], value: `#${request.id}`, inline: true },
          { name: fieldNames[6], value: userFieldValue, inline: true }
        )
        .setTimestamp(new Date(request.created_at))
        .setFooter({ text: footerText, iconURL: footerIcon });
      const authorName = (embeds.embed_new_request_author_name || '').trim();
      if (authorName) {
        emb.setAuthor({ name: authorName, iconURL: (embeds.embed_new_request_author_icon || '').trim() || undefined });
      }
      const imageUrl = toAbsoluteImageUrl(request.image_url);
      if ((embeds.embed_new_request_image_enabled || 'true') === 'true' && imageUrl) {
        emb.setImage(imageUrl);
      }
      const thumbUrl = useThumbnail && user?.avatar ? toAbsoluteImageUrl(user.avatar, request.user_id) : null;
      if (thumbUrl) {
        emb.setThumbnail(thumbUrl);
      }
      return emb;
    };

    const staffEmbed = buildEmbed(staffUserValue, showUserThumbnailStaff);
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`request_complete_${request.id}`)
          .setLabel('✅ Complete')
          .setStyle(ButtonStyle.Success)
          .setDisabled(request.status === 'completed'),
        new ButtonBuilder()
          .setCustomId(`request_reject_${request.id}`)
          .setLabel('❌ Reject')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(request.status === 'rejected'),
        new ButtonBuilder()
          .setCustomId(`request_delete_${request.id}`)
          .setLabel('🗑️ Delete')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`request_voters_${request.id}`)
          .setLabel('👥 View Voters')
          .setStyle(ButtonStyle.Secondary)
      );

    if (message) {
      await message.edit({ embeds: [staffEmbed], components: [row] });
    }
    if (hasPublic) {
      const publicMessage = await newRequestsChannel.messages.fetch(request.public_message_id).catch(() => null);
      if (publicMessage) {
        const publicEmbed = buildEmbed(publicUserValue, showUserThumbnailPublic);
        await publicMessage.edit({ embeds: [publicEmbed] }).catch(e => console.warn(`[Upvote] Failed to update public embed: ${e.message}`));
      }
    }
  } catch (error) {
    console.error(`Error updating message for request ${requestId}:`, error);
  }
}

// Handle /request slash subcommands
async function handleRequestSlash(interaction, subcommand) {
  const ephemeral = true;
  const msg = (text) => ({ content: text, ephemeral });

  try {
    if (subcommand === 'list') {
      const status = interaction.options.getString('status') || null;
      const page = interaction.options.getInteger('page') || 1;
      await interaction.deferReply({ ephemeral });
      const result = await getRequests(status, page, 10);
      const list = result.requests || [];
      const total = result.pagination?.total ?? list.length;
      const totalPages = result.pagination?.totalPages ?? 1;
      const filterLabel = status ? ` *(${status})*` : '';
      const body = list.length === 0
        ? '*No requests match.*'
        : list.map((r, i) => `\`#${r.id}\` **${(r.title || 'Untitled').replace(/\*/g, '').slice(0, 48)}**\n  → \`${r.status}\` · ${r.upvotes || 0} upvotes`).join('\n\n');
      const embed = new EmbedBuilder()
        .setTitle('Request list')
        .setColor(0x5865F2)
        .setDescription(`**Page ${page}** of **${totalPages}**${filterLabel}\n\n${body}`)
        .setFooter({ text: `${total} total · Open: ${FRONTEND_URL}` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'view') {
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request exists with ID **${id}**. Check the number and try again.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      const statusStyle = request.status === 'completed' ? 0x57F287 : request.status === 'rejected' ? 0xED4245 : 0xFEE75C;
      const desc = (request.description || '*No description.*').slice(0, 1000);
      const embed = new EmbedBuilder()
        .setTitle((request.title || 'Untitled').slice(0, 256))
        .setURL(requestUrlFor(id))
        .setColor(statusStyle)
        .setDescription(desc)
        .addFields(
          { name: 'Status', value: `\`${request.status || 'pending'}\``, inline: true },
          { name: 'Upvotes', value: `**${request.upvotes || 0}**`, inline: true },
          { name: 'Comments', value: `**${request.comments_count || 0}**`, inline: true },
          { name: 'Product', value: request.product_url ? `[Open product](${request.product_url})` : '*-*', inline: false },
          { name: 'Creator', value: request.creator_url ? (request.creator_name ? `**${request.creator_name}** - [Open profile](${request.creator_url})` : `[Open creator](${request.creator_url})`) : '*-*', inline: false }
        )
        .setFooter({ text: `Request #${id} · by ${formatUserWithMention({ username: request.username }, request.user_id)}` })
        .setTimestamp(new Date(request.created_at));
      if (request.image_url) embed.setImage(request.image_url);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'user') {
      const user = interaction.options.getUser('user');
      const page = interaction.options.getInteger('page') || 1;
      await interaction.deferReply({ ephemeral });
      const result = await getUserRequests(user.id, page, 10);
      const list = result.requests || [];
      const total = result.pagination?.total ?? 0;
      const totalPages = result.pagination?.totalPages ?? 1;
      const body = list.length === 0
        ? '*This user has not submitted any requests.*'
        : list.map(r => `\`#${r.id}\` **${(r.title || 'Untitled').replace(/\*/g, '').slice(0, 48)}** → \`${r.status}\` (${r.upvotes || 0} upvotes)`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`Requests by ${user.username} (<@${user.id}>)`)
        .setColor(0x5865F2)
        .setDescription(`**Page ${page}** of **${totalPages}**\n\n${body}`)
        .setFooter({ text: `${total} total · ${FRONTEND_URL}` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'search') {
      const query = interaction.options.getString('query');
      const limit = interaction.options.getInteger('limit') || 10;
      await interaction.deferReply({ ephemeral });
      const raw = await searchRequestsByTitle(query);
      const list = (Array.isArray(raw) ? raw : []).slice(0, limit);
      const body = list.length === 0
        ? `*No requests found for* \`${query.slice(0, 50).replace(/`/g, '')}\`*.*`
        : list.map(r => `\`#${r.id}\` **${(r.title || 'Untitled').replace(/\*/g, '').slice(0, 50)}** → \`${r.status}\` · ${r.upvotes || 0} upvotes`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('Search results')
        .setColor(0x5865F2)
        .setDescription(`Query: **${query.slice(0, 80).replace(/\*/g, '')}**\n\n${body}`)
        .setFooter({ text: `${list.length} result(s) · ${FRONTEND_URL}` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'stats') {
      await interaction.deferReply({ ephemeral });
      const [pending, completed, rejected] = await Promise.all([
        getRequests('pending', 1, 1),
        getRequests('completed', 1, 1),
        getRequests('rejected', 1, 1)
      ]);
      const p = pending.pagination?.total ?? 0;
      const c = completed.pagination?.total ?? 0;
      const r = rejected.pagination?.total ?? 0;
      const total = p + c + r;
      const embed = new EmbedBuilder()
        .setTitle('Request statistics')
        .setColor(0x5865F2)
        .setDescription(`**${total}** requests in total.`)
        .addFields(
          { name: 'Pending', value: `\`${p}\``, inline: true },
          { name: 'Completed', value: `\`${c}\``, inline: true },
          { name: 'Rejected', value: `\`${r}\``, inline: true }
        )
        .setFooter({ text: FRONTEND_URL });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'recent') {
      const limit = interaction.options.getInteger('limit') || 5;
      await interaction.deferReply({ ephemeral });
      const result = await getRequests(null, 1, limit);
      const list = result.requests || [];
      const body = list.length === 0
        ? '*No requests yet.*'
        : list.map((r, i) => `${i + 1}. \`#${r.id}\` **${(r.title || 'Untitled').replace(/\*/g, '').slice(0, 45)}** · \`${r.status}\` · ${r.upvotes || 0} upvotes`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`Last ${limit} requests`)
        .setColor(0x5865F2)
        .setDescription(body)
        .setFooter({ text: FRONTEND_URL });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'top') {
      const limit = interaction.options.getInteger('limit') || 5;
      const status = interaction.options.getString('status') || null;
      await interaction.deferReply({ ephemeral });
      const result = await getRequests(status === 'any' ? null : status, 1, limit);
      const list = result.requests || [];
      const filterLabel = status && status !== 'any' ? ` *(${status} only)*` : '';
      const body = list.length === 0
        ? '*No requests.*'
        : list.map((r, i) => `${i + 1}. **${r.upvotes || 0}** upvotes → \`#${r.id}\` ${(r.title || 'Untitled').replace(/\*/g, '').slice(0, 40)}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`Top ${limit} by upvotes${filterLabel}`)
        .setColor(0x5865F2)
        .setDescription(body)
        .setFooter({ text: FRONTEND_URL });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'voters') {
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request with ID **${id}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      const voters = await getUpvoters(id, 1, 25);
      const list = voters?.upvoters || voters || [];
      const total = request.upvotes || 0;
      const body = list.length === 0
        ? '*No voters yet.*'
        : list.map((v, i) => `\`${i + 1}.\` ${v.username || 'Unknown'} (<@${v.id}>)`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`Voters for request #${id}`)
        .setURL(requestUrlFor(id))
        .setColor(0x5865F2)
        .setDescription(body)
        .addFields({ name: 'Total upvotes', value: `**${total}**`, inline: true })
        .setFooter({ text: `Showing up to 25 · ${FRONTEND_URL}` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'comments') {
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request with ID **${id}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      const comments = await getComments(id);
      const count = comments?.length ?? request.comments_count ?? 0;
      const preview = (comments || []).slice(0, 5).map(c => {
        const author = `${c.username || 'Anonymous'} (<@${c.user_id}>)`;
        const text = (c.content || '').slice(0, 80).replace(/\n/g, ' ');
        return `**${author}**\n${text}${(c.content || '').length > 80 ? '…' : ''}`;
      }).join('\n\n');
      const embed = new EmbedBuilder()
        .setTitle(`Comments for request #${id}`)
        .setURL(requestUrlFor(id))
        .setColor(0x5865F2)
        .addFields(
          { name: 'Comment count', value: `**${count}**`, inline: true },
          { name: 'Latest', value: preview || '*No comments yet.*', inline: false }
        )
        .setFooter({ text: `Request: ${request.title || 'Untitled'} · ${FRONTEND_URL}` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'complete') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      const id = interaction.options.getInteger('id');
      const link = interaction.options.getString('link');
      await interaction.deferReply({ ephemeral: true });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request with ID **${id}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      await updateRequest(id, { status: 'completed', ...(link ? { leak_message_url: link } : {}) });
      await updateRequestMessage(id);

      // Notify creator and upvoters (same as modal submit) so they get DM when using /request complete
      const requestAfter = await getRequest(id);
      const requestUrl = requestUrlFor(id);
      const leakLink = link?.trim() || null;
      let notifiedCount = 0;

      if (requestAfter && requestAfter.user_id) {
        const notificationMessage = leakLink
          ? `Your request "${requestAfter.title}" has been marked as completed. [View Leak](${leakLink})`
          : `Your request "${requestAfter.title}" has been marked as completed.`;
        await createNotification(id, 'completed', 'Request Completed', notificationMessage, requestAfter.user_id);
        try {
          const discordUser = await client.users.fetch(requestAfter.user_id);
          const creatorEmbed = await createRequestUpdateEmbed(requestAfter, 'completed', requestUrl, false, leakLink);
          await discordUser.send({ embeds: [creatorEmbed] });
        } catch (error) {
          console.log(`[Request complete] Could not send DM to request creator: ${error.message}`);
        }
      }

      const upvoterIds = await getUpvoterIds(id);
      for (const userId of upvoterIds) {
        if (userId === requestAfter?.user_id) continue;
        try {
          const discordUser = await client.users.fetch(userId);
          const upvoterEmbed = await createRequestUpdateEmbed(requestAfter, 'completed', requestUrl, true, leakLink);
          await discordUser.send({ embeds: [upvoterEmbed] });
          const notificationMessage = leakLink
            ? `A request you upvoted "${requestAfter.title}" has been marked as completed. [View Leak](${leakLink})`
            : `A request you upvoted "${requestAfter.title}" has been marked as completed.`;
          await createNotification(id, 'completed', 'Request Completed', notificationMessage, userId);
          notifiedCount++;
        } catch (error) {
          console.log(`[Request complete] Could not send DM to upvoter ${userId}: ${error.message}`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Request completed')
        .setDescription(`Request **#${id}** has been marked as **completed**. Notified creator and ${notifiedCount} upvoter(s).${link ? `\n\nLeak link: ${link}` : ''}`)
        .setFooter({ text: `"${(request.title || 'Untitled').slice(0, 50)}"` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'reject') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral: true });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request with ID **${id}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      await updateRequest(id, { status: 'rejected' });
      await updateRequestMessage(id);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('Request rejected')
        .setDescription(`Request **#${id}** has been marked as **rejected**.`)
        .setFooter({ text: `"${(request.title || 'Untitled').slice(0, 50)}"` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'lock') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral: true });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request with ID **${id}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      await setCommentsLocked(id, true);
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('Comments locked')
        .setDescription(`Comments for request **#${id}** are now **locked**. No new comments can be added.`)
        .setFooter({ text: `"${(request.title || 'Untitled').slice(0, 50)}"` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'unlock') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      const id = interaction.options.getInteger('id');
      await interaction.deferReply({ ephemeral: true });
      const request = await getRequest(id);
      if (!request) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Request not found')
          .setDescription(`No request with ID **${id}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      await setCommentsLocked(id, false);
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Comments unlocked')
        .setDescription(`Comments for request **#${id}** are now **unlocked**. Users can comment again.`)
        .setFooter({ text: `"${(request.title || 'Untitled').slice(0, 50)}"` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'mute') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || null;
      const days = interaction.options.getInteger('days') || null;
      await interaction.deferReply({ ephemeral: true });
      const targetId = targetUser.id;
      try {
        await addCommentBan(targetId, reason, interaction.user.id, days);
        const duration = days ? ` for **${days}** day(s)` : ' **permanently**';
        const embed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('User muted from commenting')
          .setDescription(`${targetUser.username || targetUser.tag} (<@${targetId}>) has been muted from commenting on requests${duration}.`)
          .addFields({ name: 'Reason', value: reason || '*No reason given*', inline: false })
          .setFooter({ text: `Muted by ${interaction.user.username} (<@${interaction.user.id}>)` })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Error muting user:', err);
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Error')
          .setDescription('Failed to mute user. Please try again.');
        await interaction.editReply({ embeds: [embed] });
      }
      return;
    }

    if (subcommand === 'unmute') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      const targetUser = interaction.options.getUser('user');
      await interaction.deferReply({ ephemeral: true });
      const targetId = targetUser.id;
      const removed = await removeCommentBan(targetId);
      if (!removed) {
        const embed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('User not muted')
          .setDescription(`${targetUser.username || targetUser.tag} (<@${targetId}>) is not currently muted from commenting.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('User unmuted')
        .setDescription(`${targetUser.username || targetUser.tag} (<@${targetId}>) can comment on requests again.`)
        .setFooter({ text: `Unmuted by ${interaction.user.username} (<@${interaction.user.id}>)` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'delete') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply(msg('**Access denied.** You need the **Administrator** permission to delete all requests.'));
        return;
      }
      const confirm = interaction.options.getString('confirm');
      if (confirm !== 'DELETE ALL') {
        await interaction.reply(msg('**Confirmation failed.** You must type exactly `DELETE ALL` (case-sensitive) to confirm.'));
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      const deletedCount = await deleteAllRequests();
      if (staffChannel) {
        try {
          const messages = await staffChannel.messages.fetch({ limit: 100 });
          for (const message of messages.values()) {
            if (message.embeds.length > 0 && message.embeds[0].footer?.text?.startsWith('Request #')) {
              await message.delete().catch(() => {});
            }
          }
        } catch (e) {
          console.error('Error deleting Discord messages:', e);
        }
      }
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('All requests deleted')
        .setDescription(`**${deletedCount}** request(s) and all associated data (upvotes, comments, notifications) have been permanently deleted.`);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'defaultsettings') {
      if (!isStaff(interaction.member)) {
        await interaction.reply(msg('**Access denied.** This command is restricted to staff.'));
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      let defaults = {};
      try {
        defaults = await getDefaultSettings();
      } catch (e) {
        console.error('Error loading default settings:', e);
      }
      const anon = defaults.anonymous === 'true';
      const push = defaults.push === 'true';
      const discordDm = defaults.discordDm === 'true';
      const themeVal = defaults.theme || 'dark';
      const tzVal = defaults.timezone || 'auto';
      const dateVal = defaults.dateFormat || 'relative';

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Default Settings for New Users')
        .setDescription('Use the dropdowns below to select which settings will be applied by default when a new user visits the site.')
        .setFooter({ text: 'Settings apply to users who have not yet set their preferences.' })
        .setTimestamp();

      const toggleSelect = new StringSelectMenuBuilder()
        .setCustomId('defaultsettings_toggles')
        .setPlaceholder('Toggles: Anonymous, Push, Discord DMs')
        .setMinValues(0)
        .setMaxValues(3)
        .addOptions([
          { label: 'Anonymous by default', value: 'anonymous', default: anon },
          { label: 'Push Notifications ON', value: 'push', default: push },
          { label: 'Discord DMs ON', value: 'discordDm', default: discordDm },
        ]);

      const themeSelect = new StringSelectMenuBuilder()
        .setCustomId('defaultsettings_theme')
        .setPlaceholder('Default Theme')
        .addOptions([
          { label: 'Dark', value: 'dark', default: themeVal === 'dark' },
          { label: 'Light', value: 'light', default: themeVal === 'light' },
          { label: 'System', value: 'system', default: themeVal === 'system' },
        ]);

      const tzSelect = new StringSelectMenuBuilder()
        .setCustomId('defaultsettings_timezone')
        .setPlaceholder('Default Timezone')
        .addOptions([
          { label: 'Auto (browser)', value: 'auto', default: tzVal === 'auto' },
          { label: 'UTC', value: 'UTC', default: tzVal === 'UTC' },
          { label: 'Europe/Berlin', value: 'Europe/Berlin', default: tzVal === 'Europe/Berlin' },
          { label: 'America/New York', value: 'America/New_York', default: tzVal === 'America/New_York' },
        ]);

      const dateSelect = new StringSelectMenuBuilder()
        .setCustomId('defaultsettings_dateFormat')
        .setPlaceholder('Default Date Format')
        .addOptions([
          { label: 'Relative (e.g. 2h ago)', value: 'relative', default: dateVal === 'relative' },
          { label: 'Short (DD/MM/YYYY)', value: 'short', default: dateVal === 'short' },
          { label: 'Medium (Jan 15, 2025)', value: 'medium', default: dateVal === 'medium' },
          { label: 'Long (Monday, Jan 15, 2025)', value: 'long', default: dateVal === 'long' },
        ]);

      const rows = [
        new ActionRowBuilder().addComponents(toggleSelect),
        new ActionRowBuilder().addComponents(themeSelect),
        new ActionRowBuilder().addComponents(tzSelect),
        new ActionRowBuilder().addComponents(dateSelect),
      ];

      await interaction.editReply({ embeds: [embed], components: rows });
      return;
    }
  } catch (err) {
    console.error('Slash command error:', err);
    try {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('Something went wrong')
        .setDescription('The command could not be completed. Please try again or contact an administrator.');
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
      } else {
        await interaction.reply({ content: null, embeds: [embed], ephemeral: true }).catch(() => {});
      }
    } catch (e) {}
  }
}

// Handle button interactions, modals, and slash commands
client.on('interactionCreate', async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'request') {
      const subcommand = interaction.options.getSubcommand();
      await handleRequestSlash(interaction, subcommand);
      return;
    }
  }
  
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('complete_modal_')) {
      const requestId = parseInt(interaction.customId.split('_')[2]);
      const leakLink = interaction.fields.getTextInputValue('leak_link') || null;
      
      try {
        // Update request with leak link if provided
        const updateData = { status: 'completed' };
        if (leakLink && leakLink.trim()) {
          updateData.leak_message_url = leakLink.trim();
        }
        
        await updateRequest(requestId, updateData);
        await updateRequestMessage(requestId);
        
        // Create notification and notify all upvoters
        const request = await getRequest(requestId);
        const requestUrl = requestUrlFor(requestId);
        
        // Notify request creator
        if (request && request.user_id) {
          const notificationMessage = leakLink 
            ? `Your request "${request.title}" has been marked as completed. [View Leak](${leakLink})`
            : `Your request "${request.title}" has been marked as completed.`;
          
          await createNotification(requestId, 'completed', 'Request Completed', notificationMessage, request.user_id);
          
          // Send improved DM to creator
          try {
            const discordUser = await client.users.fetch(request.user_id);
            const creatorEmbed = await createRequestUpdateEmbed(request, 'completed', requestUrl, false, leakLink);
            await discordUser.send({ embeds: [creatorEmbed] });
          } catch (error) {
            console.log(`Could not send DM to request creator: ${error.message}`);
          }
        }
        
        // Notify all upvoters
        const upvoterIds = await getUpvoterIds(requestId);
        let notifiedCount = 0;
        for (const userId of upvoterIds) {
          // Skip if it's the request creator (already notified)
          if (userId === request?.user_id) continue;
          
          try {
            const discordUser = await client.users.fetch(userId);
            const upvoterEmbed = await createRequestUpdateEmbed(request, 'completed', requestUrl, true, leakLink);
            await discordUser.send({ embeds: [upvoterEmbed] });
            
            const notificationMessage = leakLink 
              ? `A request you upvoted "${request.title}" has been marked as completed. [View Leak](${leakLink})`
              : `A request you upvoted "${request.title}" has been marked as completed.`;
            
            await createNotification(requestId, 'completed', 'Request Completed', notificationMessage, userId);
            notifiedCount++;
          } catch (error) {
            console.log(`Could not send DM to upvoter ${userId}: ${error.message}`);
          }
        }
        
        await interaction.reply({ 
          content: `✅ Request #${requestId} marked as completed. Notified ${notifiedCount} upvoter(s).`, 
          ephemeral: true 
        });
      } catch (error) {
        console.error('Error completing request:', error);
        await interaction.reply({ content: 'Failed to complete request', ephemeral: true });
      }
      return;
    }
    if (interaction.customId.startsWith('reject_modal_')) {
      const requestId = parseInt(interaction.customId.split('_')[2]);
      const reason = interaction.fields.getTextInputValue('reject_reason') || null;
      const rejectionReason = (reason && reason.trim()) ? reason.trim().slice(0, 2000) : null;
      try {
        await updateRequest(requestId, { status: 'rejected', rejection_reason: rejectionReason });
        await updateRequestMessage(requestId);
        const request = await getRequest(requestId);
        const requestUrl = requestUrlFor(requestId);
        const reasonSuffix = rejectionReason ? ` Reason: ${rejectionReason}` : '';
        if (request && request.user_id) {
          await createNotification(requestId, 'rejected', 'Request Rejected', `Your request "${request.title || 'Untitled'}" has been rejected.${reasonSuffix}`, request.user_id);
          try {
            const discordUser = await client.users.fetch(request.user_id);
            const creatorEmbed = await createRequestUpdateEmbed(request, 'rejected', requestUrl);
            await discordUser.send({ embeds: [creatorEmbed] });
          } catch (e) {
            console.log(`Could not send DM to request creator: ${e.message}`);
          }
        }
        const upvoterIds = await getUpvoterIds(requestId);
        let notifiedCount = 0;
        for (const userId of upvoterIds) {
          if (userId === request?.user_id) continue;
          try {
            const discordUser = await client.users.fetch(userId);
            const upvoterEmbed = await createRequestUpdateEmbed(request, 'rejected', requestUrl, true);
            await discordUser.send({ embeds: [upvoterEmbed] });
            await createNotification(requestId, 'rejected', 'Request Rejected', `A request you upvoted "${request.title || 'Untitled'}" has been rejected.${reasonSuffix}`, userId);
            notifiedCount++;
          } catch (e) {
            console.log(`Could not send DM to upvoter ${userId}: ${e.message}`);
          }
        }
        await interaction.reply({ content: `❌ Request #${requestId} marked as rejected. Notified ${notifiedCount} upvoter(s).`, ephemeral: true });
      } catch (error) {
        console.error('Error rejecting request:', error);
        await interaction.reply({ content: 'Failed to reject request', ephemeral: true });
      }
      return;
    }
    if (interaction.customId.startsWith('delete_modal_')) {
      const requestId = parseInt(interaction.customId.split('_')[2]);
      const reason = (interaction.fields.getTextInputValue('delete_reason') || '').trim().slice(0, 2000);
      const dmRequester = (interaction.fields.getTextInputValue('delete_dm_requester') || '').trim().toLowerCase() === 'yes';
      try {
        const request = await getRequest(requestId);
        if (request && request.message_id && staffChannel) {
          const message = await staffChannel.messages.fetch(request.message_id).catch(() => null);
          if (message) await message.delete();
        }
        await updateRequest(requestId, { message_id: null });
        if (dmRequester && request && request.user_id) {
          try {
            const discordUser = await client.users.fetch(request.user_id);
            const embed = await createRequestDeletedEmbed(request.title || 'Untitled', reason, request.id, request.image_url || null);
            await discordUser.send({ embeds: [embed] });
          } catch (e) {
            console.log(`Could not send deletion DM to requester: ${e.message}`);
          }
        }
        await interaction.reply({
          content: dmRequester ? `🗑️ Request #${requestId} message deleted and requester DMed.` : `🗑️ Request #${requestId} message deleted`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error deleting request message:', error);
        await interaction.reply({ content: 'Failed to delete request message', ephemeral: true });
      }
      return;
    }
  }
  
  // Handle StringSelectMenu (default settings dropdown)
  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    if (customId.startsWith('defaultsettings_')) {
      const field = customId.replace('defaultsettings_', '');
      const values = interaction.values || [];
      try {
        let update = {};
        if (field === 'toggles') {
          update.anonymous = values.includes('anonymous') ? 'true' : 'false';
          update.push = values.includes('push') ? 'true' : 'false';
          update.discordDm = values.includes('discordDm') ? 'true' : 'false';
        } else if (field === 'theme') {
          update.theme = values[0] || 'dark';
        } else if (field === 'timezone') {
          update.timezone = values[0] || 'auto';
        } else if (field === 'dateFormat') {
          update.dateFormat = values[0] || 'relative';
        }
        await setDefaultSettings(update);
        await interaction.reply({ content: '✅ Default settings updated.', ephemeral: true });
      } catch (err) {
        console.error('Error updating default settings:', err);
        await interaction.reply({ content: '❌ Failed to update settings.', ephemeral: true }).catch(() => {});
      }
      return;
    }
  }

  if (!interaction.isButton()) return;
  
  const customId = interaction.customId;
  
  // Handle request management buttons
  if (customId.startsWith('request_complete_')) {
    const requestId = parseInt(customId.split('_')[2]);
    
    // Show modal to enter leak link
    const modal = new ModalBuilder()
      .setCustomId(`complete_modal_${requestId}`)
      .setTitle('Complete Request');
    
    const leakLinkInput = new TextInputBuilder()
      .setCustomId('leak_link')
      .setLabel('Leak Message Link (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://discord.com/channels/...')
      .setRequired(false);
    
    const actionRow = new ActionRowBuilder().addComponents(leakLinkInput);
    modal.addComponents(actionRow);
    
    await interaction.showModal(modal);
    return;
  }
  
  if (customId.startsWith('request_reject_')) {
    const requestId = parseInt(customId.split('_')[2]);
    const modal = new ModalBuilder()
      .setCustomId(`reject_modal_${requestId}`)
      .setTitle('Reject Request');
    const reasonInput = new TextInputBuilder()
      .setCustomId('reject_reason')
      .setLabel('Reason (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g. Does not meet guidelines')
      .setRequired(false);
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
    return;
  }
  
  if (customId.startsWith('request_delete_')) {
    const requestId = parseInt(customId.split('_')[2]);
    const modal = new ModalBuilder()
      .setCustomId(`delete_modal_${requestId}`)
      .setTitle('Delete Request Message');
    const reasonInput = new TextInputBuilder()
      .setCustomId('delete_reason')
      .setLabel('Reason (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g. Duplicate request')
      .setRequired(false);
    const dmInput = new TextInputBuilder()
      .setCustomId('delete_dm_requester')
      .setLabel('Send DM to requester? (yes/no)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('yes')
      .setRequired(false);
    modal.addComponents(
      new ActionRowBuilder().addComponents(reasonInput),
      new ActionRowBuilder().addComponents(dmInput)
    );
    await interaction.showModal(modal);
    return;
  }
  
  // Handle view voters button
  if (customId.startsWith('request_voters_')) {
    const requestId = parseInt(customId.split('_')[2]);
    
    try {
      const result = await getUpvoters(requestId, 1, 20);
      const { upvoters, pagination } = result;
      
      if (upvoters.length === 0) {
        await interaction.reply({ 
          content: `📊 No upvoters for request #${requestId} yet.`, 
          ephemeral: true 
        });
        return;
      }
      
      // Create embed with voter list
      const voterList = upvoters.map((voter, index) => {
        const position = (pagination.page - 1) * pagination.limit + index + 1;
        return `${position}. ${voter.username || 'Unknown'} (<@${voter.id}>)`;
      }).join('\n');
      
      const votersEmbed = new EmbedBuilder()
        .setTitle(`👥 Upvoters for Request #${requestId}`)
        .setDescription(voterList.length > 2000 ? voterList.substring(0, 1997) + '...' : voterList)
        .setColor(0x5865F2)
        .setFooter({ 
          text: `Page ${pagination.page} of ${pagination.totalPages} • Total: ${pagination.total} upvoters` 
        });
      
      // Create pagination buttons if needed
      const components = [];
      if (pagination.totalPages > 1) {
        const row = new ActionRowBuilder();
        
        if (pagination.page > 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`voters_prev_${requestId}_${pagination.page - 1}`)
              .setLabel('◀ Previous')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        
        if (pagination.page < pagination.totalPages) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`voters_next_${requestId}_${pagination.page + 1}`)
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        
        if (row.components.length > 0) {
          components.push(row);
        }
      }
      
      await interaction.reply({ 
        embeds: [votersEmbed], 
        components: components.length > 0 ? components : [],
        ephemeral: true 
      });
    } catch (error) {
      console.error('Error fetching voters:', error);
      await interaction.reply({ content: 'Failed to fetch voters', ephemeral: true });
    }
    return;
  }
  
  // Handle voter pagination
  if (customId.startsWith('voters_prev_') || customId.startsWith('voters_next_')) {
    const parts = customId.split('_');
    const requestId = parseInt(parts[2]);
    const page = parseInt(parts[3]);
    
    try {
      const result = await getUpvoters(requestId, page, 20);
      const { upvoters, pagination } = result;
      
      const voterList = upvoters.map((voter, index) => {
        const position = (pagination.page - 1) * pagination.limit + index + 1;
        return `${position}. ${voter.username || 'Unknown'} (<@${voter.id}>)`;
      }).join('\n');
      
      const votersEmbed = new EmbedBuilder()
        .setTitle(`👥 Upvoters for Request #${requestId}`)
        .setDescription(voterList.length > 2000 ? voterList.substring(0, 1997) + '...' : voterList)
        .setColor(0x5865F2)
        .setFooter({
          text: `Page ${pagination.page} of ${pagination.totalPages} • Total: ${pagination.total} upvoters`
        });
      
      const components = [];
      if (pagination.totalPages > 1) {
        const row = new ActionRowBuilder();
        
        if (pagination.page > 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`voters_prev_${requestId}_${pagination.page - 1}`)
              .setLabel('◀ Previous')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        
        if (pagination.page < pagination.totalPages) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`voters_next_${requestId}_${pagination.page + 1}`)
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        
        if (row.components.length > 0) {
          components.push(row);
        }
      }
      
      await interaction.update({ 
        embeds: [votersEmbed], 
        components: components.length > 0 ? components : []
      });
    } catch (error) {
      console.error('Error fetching voters:', error);
      await interaction.update({ content: 'Failed to fetch voters', embeds: [], components: [] });
    }
    return;
  }
});

// Function to create improved request update embed (completed/rejected DMs)
async function createRequestUpdateEmbed(request, status, requestUrl, isUpvoter = false, leakLink = null) {
  const embeds = await getEmbedSettings().catch(() => ({}));
  const prefix = status === 'rejected' ? 'embed_rejected_dm_' : 'embed_completed_dm_';
  const title = (embeds[prefix + 'title'] || (status === 'rejected' ? 'Request Rejected' : 'Request Completed!')).slice(0, 256);
  const descTemplate = embeds[prefix + 'description'] || (isUpvoter ? (status === 'rejected' ? 'A request you upvoted has been rejected.' : 'A request you upvoted has been completed!') : (status === 'rejected' ? 'Your request has been rejected.' : 'Your request has been marked as completed.'));
  const description = `**${request.title || 'Untitled Request'}**\n\n${descTemplate}`.slice(0, 4096);
  const color = parseEmbedColorHex(embeds[prefix + 'color']) ?? (status === 'rejected' ? 0xED4245 : 0x57F287);
  const footer = (embeds[prefix + 'footer'] || '').replace(/\{requestId\}/g, String(request.id)).slice(0, 2048);
  const footerIcon = (embeds[prefix + 'footer_icon'] || '').trim() || undefined;
  const f1 = (embeds[prefix + 'field_1_name'] || 'Request Details').slice(0, 256);
  const f2 = (embeds[prefix + 'field_2_name'] || 'Request Author').slice(0, 256);
  const f3 = (embeds[prefix + 'field_3_name'] || 'Quick Links').slice(0, 256);
  const requestAuthor = request.user_id ? await getUser(request.user_id) : null;
  const quickLinks = `[View Request](${requestUrl})\n[Product](${request.product_url || 'N/A'})${leakLink ? `\n[View Leak](${leakLink})` : ''}`;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setURL(requestUrl)
    .addFields(
      { name: f1, value: `**ID:** #${request.id}\n**Status:** ${status}\n**Upvotes:** ${request.upvotes || 0}`, inline: true },
      { name: f2, value: formatUserWithMention(requestAuthor, request.user_id), inline: true },
      { name: f3, value: quickLinks, inline: true }
    )
    .setTimestamp();
  if (footer) embed.setFooter({ text: footer, iconURL: footerIcon });
  const authorName = (embeds[prefix + 'author_name'] || '').trim();
  if (authorName) {
    embed.setAuthor({ name: authorName, iconURL: (embeds[prefix + 'author_icon'] || '').trim() || undefined });
  }
  if ((embeds[prefix + 'thumbnail_enabled'] || 'true') === 'true' && request.image_url) {
    embed.setThumbnail(request.image_url);
  }
  return embed;
}

// Request deleted DM embed (customizable via dashboard)
async function createRequestDeletedEmbed(requestTitle, reason, requestId, imageUrl = null) {
  const embeds = await getEmbedSettings().catch(() => ({}));
  const prefix = 'embed_deleted_dm_';
  const title = (embeds[prefix + 'title'] || 'Request Deleted').slice(0, 256);
  const descTemplate = (embeds[prefix + 'description'] || 'Your request was deleted by staff.').slice(0, 4096);
  const description = descTemplate.replace(/\{title\}/g, requestTitle || 'Untitled').replace(/\{reason\}/g, reason || '—');
  const color = parseEmbedColorHex(embeds[prefix + 'color']) ?? 0xED4245;
  const footer = (embeds[prefix + 'footer'] || '').replace(/\{requestId\}/g, String(requestId || '')).slice(0, 2048);
  const footerIcon = (embeds[prefix + 'footer_icon'] || '').trim() || undefined;
  const f1 = (embeds[prefix + 'field_1_name'] || 'Request title').slice(0, 256);
  const f2 = (embeds[prefix + 'field_2_name'] || 'Reason').slice(0, 256);
  const f3 = (embeds[prefix + 'field_3_name'] || 'Request ID').slice(0, 256);
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .addFields(
      { name: f1, value: (requestTitle || 'Untitled').slice(0, 1024), inline: false },
      { name: f2, value: (reason && reason.trim()) ? reason.trim().slice(0, 1024) : '—', inline: false },
      { name: f3, value: requestId ? `#${requestId}` : '—', inline: true }
    )
    .setTimestamp();
  if (footer) embed.setFooter({ text: footer, iconURL: footerIcon });
  const authorName = (embeds[prefix + 'author_name'] || '').trim();
  if (authorName) {
    embed.setAuthor({ name: authorName, iconURL: (embeds[prefix + 'author_icon'] || '').trim() || undefined });
  }
  if ((embeds[prefix + 'thumbnail_enabled'] || 'true') === 'true' && imageUrl) {
    embed.setThumbnail(imageUrl);
  }
  return embed;
}

// Cancellation approved/rejected DM to requester (customizable via dashboard)
async function createCancelDmEmbed(type, requestId, requestTitle, productUrl, staffReason) {
  const embeds = await getEmbedSettings().catch(() => ({}));
  const isApproved = type === 'approved';
  const prefix = isApproved ? 'embed_cancel_approved_dm_' : 'embed_cancel_rejected_dm_';
  const title = (embeds[prefix + 'title'] || (isApproved ? 'Cancellation approved' : 'Cancellation rejected')).slice(0, 256);
  const descKey = prefix + 'description';
  const defaultDesc = isApproved
    ? 'Your cancellation request was approved. The request has been removed.'
    : 'Your cancellation request was rejected. You can request cancellation again after 24 hours.';
  let description = (embeds[descKey] || defaultDesc).slice(0, 4096);
  description = description.replace(/\{requestId\}/g, String(requestId || '')).replace(/\{title\}/g, (requestTitle || 'Untitled').slice(0, 200)).replace(/\{reason\}/g, (staffReason && staffReason.trim()) ? staffReason.trim().slice(0, 500) : 'No reason');
  const color = parseEmbedColorHex(embeds[prefix + 'color']) ?? (isApproved ? 0x57F287 : 0xED4245);
  const requestUrl = requestUrlFor(requestId);
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setURL(requestUrl)
    .setTimestamp();
  if (!isApproved) {
    const staffReasonFieldName = (embeds[prefix + 'field_staff_reason_name'] || "Staff's reason").slice(0, 256);
    const staffReasonValue = (staffReason && staffReason.trim()) ? staffReason.trim().slice(0, 1024) : 'No reason';
    embed.addFields({ name: staffReasonFieldName, value: staffReasonValue, inline: false });
  }
  if (productUrl) {
    embed.addFields({ name: 'Product', value: `[View product](${productUrl})`, inline: false });
  }
  const footer = (embeds[prefix + 'footer'] || 'Request #').replace(/\{requestId\}/g, String(requestId || '')).slice(0, 2048);
  if (footer && footer !== 'Request #') embed.setFooter({ text: footer });
  else embed.setFooter({ text: `Request #${requestId}` });
  return embed;
}

// Monitor leak forum for completed requests
let leakMonitorInitialized = false;

async function monitorLeakForum() {
  if (leakForumIds.size === 0) return;
  if (leakMonitorInitialized) {
    console.log('[Leak Monitor] Already initialized, skipping...');
    return;
  }

  leakMonitorInitialized = true;
  console.log('[Leak Monitor] Initializing leak forum monitoring (main + premium)...');

  client.on('messageCreate', async (message) => {
    // Check if message is in a thread within a monitored leak forum (main or premium)
    if (!message.channel.isThread()) {
      return;
    }
    if (!leakForumIds.has(message.channel.parentId)) {
      return;
    }
    // Note: We allow bot messages since leaks are posted by bots
    // if (message.author.bot) {
    //   console.log('[Leak Monitor] Message is from bot, skipping');
    //   return;
    // }
    
    console.log(`[Leak Monitor] Processing message ${message.id} in thread ${message.channel.name}`);
    
    try {
      // Check if message has embeds (leak posts have embeds)
      if (message.embeds.length === 0) {
        console.log('[Leak Monitor] Message has no embeds, skipping');
        return;
      }
      
      const embed = message.embeds[0];
      
      console.log('[Leak Monitor] Embed details:', {
        hasDescription: !!embed.description,
        hasAuthor: !!embed.author,
        fieldsCount: embed.fields?.length || 0,
        fieldNames: embed.fields?.map(f => f.name) || [],
        hasComponents: !!(message.components && message.components.length > 0)
      });
      
      // Check if embed matches leak structure:
      // - Has description with format **[Leak Name](URL)**
      // - Has fields: Size, Folders, Files
      // - Has download button with customId "download"
      
      if (!embed.description) {
        console.log('[Leak Monitor] Embed has no description, skipping');
        return;
      }
      
      console.log('[Leak Monitor] Embed description:', embed.description);
      
      // Extract URL from description: **[Leak Name](URL)**
      const leakMatch = embed.description.match(/\*\*\[([^\]]+)\]\(([^\)]+)\)\*\*/);
      if (!leakMatch || !leakMatch[2]) {
        console.log('[Leak Monitor] No URL pattern found in description');
        return;
      }
      
      const leakName = leakMatch[1].trim();
      const urlFromDescription = leakMatch[2].trim();
      if (!/^https?:\/\//i.test(urlFromDescription)) {
        console.log('[Leak Monitor] Extracted link is not http(s), skipping:', urlFromDescription?.slice(0, 80));
        return;
      }
      console.log(`[Leak Monitor] Found leak post: "${leakName}" with URL: ${urlFromDescription}`);
      
      // Extract download URL from button with customId "download"
      let downloadUrl = null;
      if (message.components && message.components.length > 0) {
        for (const row of message.components) {
          for (const component of row.components) {
            console.log('[Leak Monitor] Checking component:', {
              customId: component.customId,
              style: component.style,
              url: component.url,
              label: component.label
            });
            
            // Check for button with customId "download"
            if (component.customId === 'download') {
              downloadUrl = component.url || null;
              console.log('[Leak Monitor] Found download button with URL:', downloadUrl);
              break;
            }
          }
          if (downloadUrl) break;
        }
      }
      
      // Extract fields for logging
      const sizeField = embed.fields?.find(f => f.name === 'Size');
      const foldersField = embed.fields?.find(f => f.name === 'Folders');
      const filesField = embed.fields?.find(f => f.name === 'Files');
      
      console.log('[Leak Monitor] Embed fields:', {
        size: sizeField?.value || 'N/A',
        folders: foldersField?.value || 'N/A',
        files: filesField?.value || 'N/A'
      });
      
      // Find matching request by product URL only (name/title is ignored; query/hash in URL are normalized)
      const matchingRequest = await getRequestByProductUrl(urlFromDescription);
      
      if (!matchingRequest) {
        console.log(`[Leak Monitor] No matching request found for product URL: ${urlFromDescription}`);
        return;
      }
      
      // Skip if already completed
      if (matchingRequest.status === 'completed') {
        console.log(`[Leak Monitor] Request #${matchingRequest.id} already completed, skipping`);
        return;
      }
      
      console.log(`[Leak Monitor] ✅ Found matching request #${matchingRequest.id} for leak: "${leakName}"`);
      
      // Process the leak match
      await processLeakMatch(matchingRequest, message, downloadUrl, leakName, sizeField?.value, foldersField?.value, filesField?.value);
    } catch (error) {
      console.error('[Leak Monitor] Error processing message:', error);
      console.error('[Leak Monitor] Error stack:', error.stack);
    }
  });
  
  // Helper function to process leak match
  async function processLeakMatch(matchingRequest, message, downloadUrl, leakName, size, folders, files) {
    try {
      // Update request
      await updateRequest(matchingRequest.id, {
        status: 'completed',
        leak_message_id: message.id,
        leak_message_url: message.url
      });
      
      console.log(`[Leak Monitor] ✅ Updated request #${matchingRequest.id} to completed`);
      
      await updateRequestMessage(matchingRequest.id);
      
      // Get full request data for notifications
      const request = await getRequest(matchingRequest.id);
      const requestUrl = requestUrlFor(matchingRequest.id);
      
      // Notify request creator
      if (request && request.user_id) {
        await createNotification(matchingRequest.id, 'leaked', 'Request Leaked', `Your requested product [**${request.title || 'Untitled Request'}**](${message.url}) has been leaked.`, request.user_id);
        
        try {
          const discordUser = await client.users.fetch(request.user_id);
          const leakEmbed = await createLeakNotificationEmbed(request, message.url, downloadUrl, requestUrl, false, leakName, size, folders, files);
          await discordUser.send({ embeds: [leakEmbed] });
          console.log(`[Leak Monitor] ✅ Notified request creator: ${request.user_id}`);
        } catch (error) {
          console.log(`[Leak Monitor] Could not send DM to request creator ${request.user_id}: ${error.message}`);
        }
      }
      
      // Notify all upvoters
      const upvoterIds = await getUpvoterIds(matchingRequest.id);
      let notifiedCount = 0;
      for (const userId of upvoterIds) {
        // Skip if it's the request creator (already notified)
        if (userId === request?.user_id) continue;
        
        try {
          const discordUser = await client.users.fetch(userId);
          const leakEmbed = await createLeakNotificationEmbed(request, message.url, downloadUrl, requestUrl, true, leakName, size, folders, files);
          await discordUser.send({ embeds: [leakEmbed] });
          await createNotification(matchingRequest.id, 'leaked', 'Request Leaked', `A request you upvoted [**${request.title || 'Untitled Request'}**](${message.url}) has been leaked.`, userId);
          notifiedCount++;
        } catch (error) {
          console.log(`[Leak Monitor] Could not send DM to upvoter ${userId}: ${error.message}`);
        }
      }
      
      console.log(`[Leak Monitor] ✅ Marked request #${matchingRequest.id} as completed. Notified ${notifiedCount} upvoter(s).`);
    } catch (error) {
      console.error(`[Leak Monitor] Error processing leak match for request #${matchingRequest.id}:`, error);
      throw error;
    }
  }
}

// Function to create leak notification embed
async function createLeakNotificationEmbed(request, leakMessageUrl, downloadUrl, requestUrl, isUpvoter = false, leakName = null, size = null, folders = null, files = null) {
  const embeds = await getEmbedSettings().catch(() => ({}));
  const title = (embeds.embed_leak_dm_title || '🎉 Request Leaked!').slice(0, 256);
  const requestTitle = request.title || 'Untitled Request';
  const linkedTitle = `[**${requestTitle}**](${leakMessageUrl})`;
  const description = (isUpvoter
    ? `A request you upvoted ${linkedTitle} has been leaked.`
    : `Your requested product ${linkedTitle} has been leaked.`).slice(0, 4096);
  const color = parseEmbedColorHex(embeds.embed_leak_dm_color) ?? 0x57F287;
  const footer = (embeds.embed_leak_dm_footer || '').replace(/\{requestId\}/g, String(request.id)).slice(0, 2048);
  const footerIcon = (embeds.embed_leak_dm_footer_icon || '').trim() || undefined;
  const f1 = (embeds.embed_leak_dm_field_1_name || 'Request Details').slice(0, 256);
  const f2 = (embeds.embed_leak_dm_field_2_name || 'Request Author').slice(0, 256);
  const f3 = (embeds.embed_leak_dm_field_3_name || 'Links').slice(0, 256);
  const requestAuthor = request.user_id ? await getUser(request.user_id) : null;
  const linksValue = `[View Leak Post](${leakMessageUrl})${downloadUrl ? `\n[Download](${downloadUrl})` : ''}\n[View Request](${requestUrl})`;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setURL(requestUrl)
    .addFields(
      { name: f1, value: `**ID:** #${request.id}\n**Status:** completed\n**Upvotes:** ${request.upvotes || 0}`, inline: true },
      { name: f2, value: formatUserWithMention(requestAuthor, request.user_id), inline: true },
      { name: f3, value: linksValue, inline: true }
    )
    .setTimestamp();
  if (footer) embed.setFooter({ text: footer, iconURL: footerIcon });
  const authorName = (embeds.embed_leak_dm_author_name || '').trim();
  if (authorName) {
    embed.setAuthor({ name: authorName, iconURL: (embeds.embed_leak_dm_author_icon || '').trim() || undefined });
  }
  if ((embeds.embed_leak_dm_thumbnail_enabled || 'true') === 'true' && request.image_url) {
    embed.setThumbnail(request.image_url);
  }
  return embed;
}

// HTTP API server for web server communication
const express = require('express');
const apiServer = express();
apiServer.use(express.json());

// Queue upvote embed updates and process under Discord rate limit (5 edits/5s per channel; we have staff + public = 2 channels).
// Process up to 2 requests every 2s so all upvotes are eventually shown without hitting the limit.
const pendingUpvoteUpdates = new Set();
const UPVOTE_PROCESS_INTERVAL_MS = 2000;
const UPVOTE_BATCH_SIZE = 2;

// Track progress for "refresh all embeds" so dashboard can show progress + ETA and cancel.
let refreshAllTotal = 0;
const refreshAllIds = new Set();

setInterval(async () => {
  if (pendingUpvoteUpdates.size === 0) return;
  const ids = [];
  for (const id of pendingUpvoteUpdates) {
    ids.push(id);
    if (ids.length >= UPVOTE_BATCH_SIZE) break;
  }
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    pendingUpvoteUpdates.delete(id);
    const wasRefresh = refreshAllIds.has(id);
    refreshAllIds.delete(id);
    try {
      if (wasRefresh && i === 0) console.log(`[Embed update] Refresh sample URL: ${requestUrlFor(id)}`);
      await updateRequestMessage(id);
      console.log(`[Embed update] Request #${id} ${wasRefresh ? '(refresh-all)' : '(upvote/embed-update)'} – Discord embed updated`);
    } catch (e) {
      console.warn(`[Upvote queue] Failed to update request ${id}:`, e.message);
    }
  }
}, UPVOTE_PROCESS_INTERVAL_MS);

apiServer.post('/upvote', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }
    pendingUpvoteUpdates.add(String(requestId));
    res.json({ success: true });
  } catch (err) {
    console.error('[Upvote] Failed to queue update:', err.message);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Queue embed update (e.g. when views change). Uses same queue as upvote so views/upvotes stay in sync on Discord.
apiServer.post('/embed-update', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }
    pendingUpvoteUpdates.add(String(requestId));
    res.json({ success: true });
  } catch (err) {
    console.error('[Embed-update] Failed to queue:', err.message);
    res.status(500).json({ error: 'Failed to queue embed update' });
  }
});

// Refresh all Discord embeds that have a message_id (e.g. after adding Views field). Processes via same queue.
apiServer.post('/refresh-all-embeds', async (req, res) => {
  try {
    refreshAllIds.clear();
    let page = 1;
    const limit = 50;
    let total = 0;
    for (;;) {
      const result = await getRequests(null, page, limit);
      const requests = result.requests || result;
      const list = Array.isArray(requests) ? requests : [];
      for (const r of list) {
        if (r.message_id) {
          const id = String(r.id);
          pendingUpvoteUpdates.add(id);
          refreshAllIds.add(id);
          total++;
        }
      }
      const pagination = result.pagination || {};
      if (pagination.totalPages == null || page >= pagination.totalPages || list.length < limit) break;
      page++;
    }
    refreshAllTotal = total;
    console.log(`[Refresh-all-embeds] Queued ${total} request(s) for embed update (request URLs: ${BASE_URL}${REQUEST_PATH}/[id])`);
    res.json({ success: true, queued: total });
  } catch (err) {
    console.error('[Refresh-all-embeds] Failed:', err.message);
    res.status(500).json({ error: 'Failed to queue refresh' });
  }
});

apiServer.get('/refresh-all-embeds-status', (req, res) => {
  const processed = refreshAllTotal - refreshAllIds.size;
  const payload = {
    total: refreshAllTotal,
    processed: Math.min(processed, refreshAllTotal),
    inProgress: refreshAllIds.size > 0
  };
  console.log('[Refresh-all-embeds] Status:', { ...payload, remaining: refreshAllIds.size });
  res.json(payload);
});

apiServer.post('/refresh-all-embeds-cancel', (req, res) => {
  for (const id of refreshAllIds) {
    pendingUpvoteUpdates.delete(id);
  }
  refreshAllIds.clear();
  refreshAllTotal = 0;
  console.log('[Refresh-all-embeds] Cancelled by user');
  res.json({ success: true });
});

// Sync Discord roles for a user (called by web server before creating a request)
apiServer.post('/sync-roles', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
    if (!guildId) {
      return res.json({ success: true });
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.json({ success: true });
    }
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (e) {
      return res.json({ success: true });
    }
    const roleIds = Array.from(member.roles.cache.keys());
    const premiumRoleId = (process.env.DISCORD_PREMIUM_ROLE_ID || '').trim();
    const hasPremiumRole = premiumRoleId && roleIds.includes(premiumRoleId);
    await updateUserRoles(userId, roleIds, hasPremiumRole);
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing roles:', error);
    res.status(500).json({ error: 'Failed to sync roles' });
  }
});

// Sync registered users' roles (called by website on startup). Responds immediately, runs in background.
apiServer.post('/sync-all-roles', async (req, res) => {
  try {
    const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
    if (!guildId) {
      return res.json({ success: true, queued: 0 });
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.json({ success: true, queued: 0 });
    }
    let userIds;
    try {
      userIds = await getAllUserIds();
    } catch (e) {
      console.error('[Sync-all-roles] Failed to get user IDs:', e.message);
      return res.status(500).json({ error: 'Failed to get registered users' });
    }
    if (!userIds || userIds.length === 0) {
      return res.json({ success: true, queued: 0 });
    }
    res.json({ success: true, queued: userIds.length });
    // Run sync in background (no timeout, no blocking)
    setImmediate(async () => {
      const premiumRoleId = (process.env.DISCORD_PREMIUM_ROLE_ID || '').trim();
      let synced = 0;
      for (const userId of userIds) {
        try {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;
          const roleIds = Array.from(member.roles.cache.keys());
          const hasPremiumRole = premiumRoleId && roleIds.includes(premiumRoleId);
          const updated = await updateUserRoles(userId, roleIds, hasPremiumRole);
          if (updated) synced++;
        } catch (e) {
          // ignore per-user errors
        }
      }
      console.log('[Sync-all-roles] Synced', synced, 'registered members');
    });
  } catch (error) {
    console.error('Error in sync-all-roles:', error);
    res.status(500).json({ error: 'Failed to sync all roles' });
  }
});

// When a request is deleted via API (dashboard), delete its messages from staff and public channels
apiServer.post('/request-deleted', async (req, res) => {
  try {
    const { requestId, messageId, publicMessageId } = req.body;
    if (staffChannel && messageId) {
      const message = await staffChannel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await message.delete();
        console.log(`[Request-deleted] Deleted staff channel message ${messageId} for request #${requestId}`);
      }
    }
    if (newRequestsChannel && publicMessageId) {
      const publicMsg = await newRequestsChannel.messages.fetch(publicMessageId).catch(() => null);
      if (publicMsg) {
        await publicMsg.delete();
        console.log(`[Request-deleted] Deleted public channel message ${publicMessageId} for request #${requestId}`);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.warn('[Request-deleted] Failed to delete message:', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Send DM to requester when staff deletes a request (regardless of website settings)
apiServer.post('/send-deletion-dm', async (req, res) => {
  try {
    const { userId, requestTitle, reason, requestId } = req.body;
    if (!userId) {
      return res.json({ success: true });
    }
    const discordUser = await client.users.fetch(userId).catch(() => null);
    if (discordUser) {
      const embed = await createRequestDeletedEmbed(requestTitle || 'Untitled', reason || '', requestId || null, null);
      await discordUser.send({ embeds: [embed] });
      console.log(`[Send-deletion-dm] DM sent to ${userId} for deleted request`);
    }
    res.json({ success: true });
  } catch (err) {
    console.warn('[Send-deletion-dm] Failed:', err.message);
    res.status(500).json({ error: 'Failed to send DM' });
  }
});

// Send DM to requester when staff approves or rejects a cancellation request
apiServer.post('/send-cancel-dm', async (req, res) => {
  try {
    const { type, userId, requestId, requestTitle, product_url, staffReason } = req.body;
    if (!type || !userId || !requestId) {
      return res.json({ success: true });
    }
    if (type !== 'approved' && type !== 'rejected') {
      return res.status(400).json({ error: 'type must be approved or rejected' });
    }
    const discordUser = await client.users.fetch(String(userId)).catch(() => null);
    if (discordUser) {
      const embed = await createCancelDmEmbed(type, requestId, requestTitle || 'Untitled', product_url || null, staffReason || null);
      await discordUser.send({ embeds: [embed] });
      console.log(`[Send-cancel-dm] DM sent to ${userId} for cancellation ${type}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.warn('[Send-cancel-dm] Failed:', err.message);
    res.status(500).json({ error: 'Failed to send DM' });
  }
});

// Log cancellation events (requested / approved / rejected) to staff channel
apiServer.post('/cancel-log', async (req, res) => {
  try {
    const { type, requestId, userId, reason, staffId, staffUsername, requesterUsername } = req.body;
    if (!type || !requestId) {
      return res.status(400).json({ error: 'type and requestId are required' });
    }
    if (!staffChannel) {
      return res.json({ success: true });
    }
    // When request is deleted (staff delete or cancel approved), remove its log message and public embed from Discord
    const shouldDeleteLogMessage = type === 'deleted' || (type === 'approved' && req.body.deleted === true);
    if (shouldDeleteLogMessage) {
      try {
        // Prefer IDs from payload (server sends before deleting request) so we don't race with deleteRequest
        let messageId = req.body.message_id || null;
        let publicMessageId = req.body.public_message_id || null;
        if (!messageId || !publicMessageId) {
          const request = await getRequest(requestId);
          if (request) {
            if (!messageId) messageId = request.message_id || null;
            if (!publicMessageId) publicMessageId = request.public_message_id || null;
          }
        }
        if (messageId && staffChannel) {
          const message = await staffChannel.messages.fetch(messageId).catch(() => null);
          if (message) {
            await message.delete();
            console.log(`[Cancel-log] Deleted request log message ${messageId} for request #${requestId}`);
          }
        }
        if (newRequestsChannel && publicMessageId) {
          const publicMessage = await newRequestsChannel.messages.fetch(publicMessageId).catch(() => null);
          if (publicMessage) {
            await publicMessage.delete();
            console.log(`[Cancel-log] Deleted public request message ${publicMessageId} for request #${requestId}`);
          }
        }
      } catch (err) {
        console.warn('[Cancel-log] Failed to delete request log message:', err.message);
      }
    }
    const requestUrl = requestUrlFor(requestId);
    const { title, product_url } = req.body;
    const titleStr = (title || 'Untitled').slice(0, 1024);
    const productLink = product_url ? `[View product](${product_url})` : '*No link*';
    const embeds = await getEmbedSettings().catch(() => ({}));
    const parseColor = (v) => (typeof v === 'string' && /^0x[0-9A-Fa-f]+$/.test(v) ? parseInt(v, 16) : null);
    let embed;
    const footerText = (key) => {
      let t = (embeds[key] || 'Request #').replace(/\{requestId\}/g, String(requestId));
      if (t === 'Request #') t = `Request #${requestId}`;
      return t || `Request #${requestId}`;
    };
    const footerIcon = (key) => (embeds[key.replace('_footer', '_footer_icon')] || '').trim() || undefined;
    const setAuthorIf = (keyName, keyIcon) => {
      const name = (embeds[keyName] || '').trim();
      if (name) embed.setAuthor({ name, iconURL: (embeds[keyIcon] || '').trim() || undefined });
    };
    if (type === 'requested') {
      const desc = (embeds.embed_cancel_requested_description || 'Requester requested cancellation for request **#{requestId}**.').replace(/\{requestId\}/g, String(requestId));
      const f1 = (embeds.embed_cancel_requested_field_1_name || 'Requester').slice(0, 256);
      const f2 = (embeds.embed_cancel_requested_field_2_name || 'Reason').slice(0, 256);
      const f3 = (embeds.embed_cancel_requested_field_3_name || 'Request title').slice(0, 256);
      const f4 = (embeds.embed_cancel_requested_field_4_name || 'Product URL').slice(0, 256);
      embed = new EmbedBuilder()
        .setColor(parseColor(embeds.embed_cancel_requested_color) ?? 0xFEE75C)
        .setTitle((embeds.embed_cancel_requested_title || 'Cancellation requested').slice(0, 256))
        .setURL(requestUrl)
        .setDescription(desc.slice(0, 4096))
        .addFields(
          { name: f1, value: requesterUsername ? `${requesterUsername} (<@${userId}>)` : `<@${userId}>`, inline: true },
          { name: f2, value: reason || '*No reason*', inline: false },
          { name: f3, value: titleStr, inline: false },
          { name: f4, value: productLink, inline: false }
        )
        .setFooter({ text: footerText('embed_cancel_requested_footer'), iconURL: footerIcon('embed_cancel_requested_footer') })
        .setTimestamp();
      setAuthorIf('embed_cancel_requested_author_name', 'embed_cancel_requested_author_icon');
    } else if (type === 'approved') {
      const desc = (embeds.embed_cancel_approved_description || 'Request **#{requestId}** was cancelled by staff.').replace(/\{requestId\}/g, String(requestId));
      const f1 = (embeds.embed_cancel_approved_field_1_name || 'Requester').slice(0, 256);
      const f2 = (embeds.embed_cancel_approved_field_2_name || 'Approved by').slice(0, 256);
      const f3 = (embeds.embed_cancel_approved_field_3_name || 'Reason').slice(0, 256);
      const f4 = (embeds.embed_cancel_approved_field_4_name || 'Request title').slice(0, 256);
      const f5 = (embeds.embed_cancel_approved_field_5_name || 'Product URL').slice(0, 256);
      embed = new EmbedBuilder()
        .setColor(parseColor(embeds.embed_cancel_approved_color) ?? 0xED4245)
        .setTitle((embeds.embed_cancel_approved_title || 'Cancellation approved').slice(0, 256))
        .setURL(requestUrl)
        .setDescription(desc.slice(0, 4096))
        .addFields(
          { name: f1, value: requesterUsername ? `${requesterUsername} (<@${userId}>)` : `<@${userId}>`, inline: true },
          { name: f2, value: staffUsername ? `${staffUsername} (<@${staffId}>)` : `<@${staffId}>`, inline: true },
          { name: f3, value: reason || '*No reason*', inline: false },
          { name: f4, value: titleStr, inline: false },
          { name: f5, value: productLink, inline: false }
        )
        .setFooter({ text: footerText('embed_cancel_approved_footer'), iconURL: footerIcon('embed_cancel_approved_footer') })
        .setTimestamp();
      setAuthorIf('embed_cancel_approved_author_name', 'embed_cancel_approved_author_icon');
    } else if (type === 'rejected') {
      const cancelReason = (req.body.cancel_reason && String(req.body.cancel_reason).trim()) ? String(req.body.cancel_reason).trim().slice(0, 1024) : null;
      const staffReason = (req.body.rejection_reason && String(req.body.rejection_reason).trim()) ? String(req.body.rejection_reason).trim().slice(0, 1024) : null;
      const desc = (embeds.embed_cancel_rejected_description || 'Cancellation request for **#{requestId}** was rejected by staff.').replace(/\{requestId\}/g, String(requestId));
      const f1 = (embeds.embed_cancel_rejected_field_1_name || 'Requester').slice(0, 256);
      const f2 = (embeds.embed_cancel_rejected_field_2_name || 'Rejected by').slice(0, 256);
      const fReason = (embeds.embed_cancel_rejected_field_reason_name || "Requester's reason").slice(0, 256);
      const fStaffReason = (embeds.embed_cancel_rejected_field_staff_reason_name || "Staff's reason").slice(0, 256);
      const f3 = (embeds.embed_cancel_rejected_field_3_name || 'Request title').slice(0, 256);
      const f4 = (embeds.embed_cancel_rejected_field_4_name || 'Product URL').slice(0, 256);
      embed = new EmbedBuilder()
        .setColor(parseColor(embeds.embed_cancel_rejected_color) ?? 0x57F287)
        .setTitle((embeds.embed_cancel_rejected_title || 'Cancellation rejected').slice(0, 256))
        .setURL(requestUrl)
        .setDescription(desc.slice(0, 4096))
        .addFields(
          { name: f1, value: requesterUsername ? `${requesterUsername} (<@${userId}>)` : `<@${userId}>`, inline: true },
          { name: f2, value: staffUsername ? `${staffUsername} (<@${staffId}>)` : `<@${staffId}>`, inline: true },
          { name: fReason, value: cancelReason || '*No reason given*', inline: false },
          { name: fStaffReason, value: staffReason || 'No reason', inline: false },
          { name: f3, value: titleStr, inline: false },
          { name: f4, value: productLink, inline: false }
        )
        .setFooter({ text: footerText('embed_cancel_rejected_footer'), iconURL: footerIcon('embed_cancel_rejected_footer') })
        .setTimestamp();
      setAuthorIf('embed_cancel_rejected_author_name', 'embed_cancel_rejected_author_icon');
    } else if (type === 'deleted') {
      const deletionReason = (req.body.reason && String(req.body.reason).trim()) ? String(req.body.reason).trim().slice(0, 1024) : null;
      const requesterVal = req.body.userId
        ? (req.body.requesterUsername ? `${req.body.requesterUsername} (<@${req.body.userId}>)` : `<@${req.body.userId}>`)
        : '*Unknown*';
      const fDel = (embeds.embed_cancel_deleted_field_1_name || 'Deleted by').slice(0, 256);
      const fReq = (embeds.embed_cancel_deleted_field_2_name || 'Requester').slice(0, 256);
      const fTitle = (embeds.embed_cancel_deleted_field_3_name || 'Request title').slice(0, 256);
      const fReason = (embeds.embed_cancel_deleted_field_4_name || 'Reason').slice(0, 256);
      const fProduct = (embeds.embed_cancel_deleted_field_5_name || 'Product URL').slice(0, 256);
      const fields = [
        { name: fDel, value: staffUsername ? `${staffUsername} (<@${staffId}>)` : `<@${staffId}>`, inline: true },
        { name: fReq, value: requesterVal, inline: true },
        { name: fTitle, value: titleStr, inline: false },
        { name: fReason, value: deletionReason || '*No reason provided*', inline: false },
        { name: fProduct, value: productLink, inline: false }
      ];
      const descDeleted = (embeds.embed_cancel_deleted_description || '**{title}** was permanently deleted.')
        .replace(/\{requestId\}/g, String(requestId))
        .replace(/\{title\}/g, titleStr);
      embed = new EmbedBuilder()
        .setColor(parseColor(embeds.embed_cancel_deleted_color) ?? 0xED4245)
        .setTitle((embeds.embed_cancel_deleted_title || 'Request deleted by staff').slice(0, 256))
        .setURL(requestUrl)
        .setDescription(descDeleted.slice(0, 4096))
        .addFields(fields)
        .setFooter({ text: footerText('embed_cancel_deleted_footer'), iconURL: footerIcon('embed_cancel_deleted_footer') })
        .setTimestamp();
      setAuthorIf('embed_cancel_deleted_author_name', 'embed_cancel_deleted_author_icon');
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    await staffChannel.send({ embeds: [embed] });
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending cancel log:', error);
    res.status(500).json({ error: 'Failed to log' });
  }
});

// Fallback: send simple new-request embed to staff channel (e.g. when createRequestMessage throws). Sets message_id so poll doesn't double-post.
async function sendNewRequestFallbackEmbed(reqData, viewUrl) {
  if (!staffChannel) return;
  const id = reqData.id;
  const title = (reqData.title || 'Untitled Product').slice(0, 256);
  const description = (reqData.description || '').trim().slice(0, 1024) || '*No description*';
  const price = reqData.price ? String(reqData.price).trim().slice(0, 64) : null;
  const productLine = price ? `${title} — ${price}` : title;
  const upvotes = reqData.upvotes ?? 0;
  const views = reqData.views ?? 0;
  const authorName = reqData.anonymous ? 'Anonymous User' : (reqData.username || 'Anonymous');
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('A new request has been created!')
    .setURL(viewUrl)
    .setDescription(`[View on Website](${viewUrl})`)
    .addFields(
      { name: 'Request ID', value: `#${id}`, inline: true },
      { name: 'Statistics', value: `👍 ${upvotes} upvote${upvotes !== 1 ? 's' : ''} • 👁 ${views} view${views !== 1 ? 's' : ''}`, inline: true },
      { name: 'Information', value: authorName, inline: true },
      { name: 'Product', value: productLine.slice(0, 1024), inline: false },
      { name: 'Description', value: description, inline: false }
    )
    .setFooter({ text: `Request Monitor • ${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}` })
    .setTimestamp();
  const imageUrl = toAbsoluteImageUrl(reqData.image_url);
  if (imageUrl) embed.setImage(imageUrl);
  const thumbUrl = !reqData.anonymous ? toAbsoluteImageUrl(reqData.avatar, reqData.user_id) : null;
  if (thumbUrl) embed.setThumbnail(thumbUrl);
  const message = await staffChannel.send({ embeds: [embed] });
  await updateRequest(id, { message_id: message.id });
}

// Helper: send simple new-request embed to a specific channel (used when staff channel is missing or createRequestMessage fails)
async function sendSimpleNewRequestEmbedToChannel(channel, reqData, viewUrl) {
  const id = reqData.id;
  const title = (reqData.title || 'Untitled Product').slice(0, 256);
  const description = (reqData.description || '').trim().slice(0, 1024) || '*No description*';
  const price = reqData.price ? String(reqData.price).trim().slice(0, 64) : null;
  const productLine = price ? `${title} — ${price}` : title;
  const upvotes = reqData.upvotes ?? 0;
  const views = reqData.views ?? 0;
  const authorName = reqData.anonymous ? 'Anonymous User' : (reqData.username || 'Anonymous');
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('A new request has been created!')
    .setURL(viewUrl)
    .setDescription(`[View on Website](${viewUrl})`)
    .addFields(
      { name: 'Request ID', value: `#${id}`, inline: true },
      { name: 'Statistics', value: `👁 ${views} view${views !== 1 ? 's' : ''} · 👍 ${upvotes} upvote${upvotes !== 1 ? 's' : ''}`, inline: true },
      { name: 'Information', value: authorName, inline: true },
      { name: 'Product', value: productLine.slice(0, 1024), inline: false },
      { name: 'Description', value: description, inline: false }
    )
    .setFooter({ text: `Request Monitor • ${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}` })
    .setTimestamp();
  const imageUrl = toAbsoluteImageUrl(reqData.image_url);
  if (imageUrl) embed.setImage(imageUrl);
  const thumbUrl = !reqData.anonymous ? toAbsoluteImageUrl(reqData.avatar, reqData.user_id) : null;
  if (thumbUrl) embed.setThumbnail(thumbUrl);
  const sentMessage = await channel.send({ embeds: [embed] });
  return sentMessage;
}

// New request notification: if channel is staff channel, create full embed with buttons and set message_id (so upvote updates + delete work)
apiServer.post('/new-request', async (req, res) => {
  try {
    const { channelId, request: reqData, websiteUrl, viewUrl } = req.body;
    if (!channelId || !reqData || !viewUrl) {
      return res.status(400).json({ error: 'channelId, request and viewUrl are required' });
    }
    const staffChannelId = (process.env.DISCORD_STAFF_CHANNEL_ID || '').trim();
    const channelIdStr = String(channelId).trim();
    const isStaffChannel = staffChannelId && channelIdStr === String(staffChannelId) && staffChannel;
    if (isStaffChannel) {
      const request = await getRequest(reqData.id);
      if (request && !request.message_id) {
        try {
          await createRequestMessage(request);
        } catch (err) {
          console.error('[New-request] createRequestMessage failed, sending fallback embed:', err.message);
          if (staffChannel) {
            await sendNewRequestFallbackEmbed(reqData, viewUrl);
          } else {
            const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
            const guild = guildId ? client.guilds.cache.get(guildId) : null;
            const channel = guild ? await guild.channels.fetch(channelId).catch(() => null) : null;
            if (channel && channel.isTextBased()) {
              const sentMessage = await sendSimpleNewRequestEmbedToChannel(channel, reqData, viewUrl);
              await updateRequest(reqData.id, { message_id: sentMessage.id }).catch(() => {});
            }
          }
        }
      } else if (!request) {
        // Request not in DB yet (e.g. replication lag) or channel is staff: still send a log so staff see it
        const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
        const guild = guildId ? client.guilds.cache.get(guildId) : null;
        const channel = guild ? await guild.channels.fetch(channelId).catch(() => null) : null;
        if (channel && channel.isTextBased()) {
          await sendSimpleNewRequestEmbedToChannel(channel, reqData, viewUrl);
        }
      }
      return res.json({ success: true });
    }
    const guildId = process.env.GUILD_ID || process.env.DISCORD_SERVER_ID;
    if (!guildId) {
      return res.json({ success: false, error: 'No guild configured' });
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.json({ success: false, error: 'Guild not found' });
    }
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ error: 'Channel not found or not a text channel' });
    }
    const id = reqData.id;
    const title = (reqData.title || 'Untitled Product').slice(0, 256);
    const description = (reqData.description || '').trim().slice(0, 1024) || '*No description*';
    const price = reqData.price ? String(reqData.price).trim().slice(0, 64) : null;
    const productLine = price ? `${title} — ${price}` : title;
    const upvotes = reqData.upvotes ?? 0;
    const views = reqData.views ?? 0;
    const authorName = reqData.anonymous ? 'Anonymous User' : (reqData.username || 'Anonymous');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('A new request has been created!')
      .setURL(viewUrl)
      .setDescription(`[View on Website](${viewUrl})`)
      .addFields(
        { name: 'Request ID', value: `#${id}`, inline: true },
        { name: 'Statistics', value: `👁 ${views} view${views !== 1 ? 's' : ''} · 👍 ${upvotes} upvote${upvotes !== 1 ? 's' : ''}`, inline: true },
        { name: 'Information', value: authorName, inline: true },
        { name: 'Product', value: productLine.slice(0, 1024), inline: false },
        { name: 'Description', value: description, inline: false }
      )
      .setFooter({ text: `Request Monitor • ${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}` })
      .setTimestamp();
    const imageUrl = toAbsoluteImageUrl(reqData.image_url);
    if (imageUrl) embed.setImage(imageUrl);
    const thumbUrl = !reqData.anonymous ? toAbsoluteImageUrl(reqData.avatar, reqData.user_id) : null;
    if (thumbUrl) embed.setThumbnail(thumbUrl);
    const sentMessage = await channel.send({ embeds: [embed] });
    if (newRequestsChannel && channel.id === newRequestsChannel.id) {
      await updateRequest(id, { public_message_id: sentMessage.id }).catch(e => console.warn('[New-request] Failed to save public_message_id:', e.message));
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[New-request] Failed to send notification:', error);
    res.status(500).json({ error: 'Failed to send new request notification' });
  }
});

// Handle new comment notification
apiServer.post('/comment', async (req, res) => {
  try {
    const { requestId, commentId } = req.body;
    
    if (!requestId || !commentId) {
      return res.status(400).json({ error: 'requestId and commentId are required' });
    }
    
    // Get comment and request data
    const comment = await getComment(commentId);
    const request = await getRequest(requestId);
    
    if (!comment || !request) {
      return res.status(404).json({ error: 'Comment or request not found' });
    }
    
    // Send comment to staff channel
    await sendCommentToStaff(request, comment);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling comment notification:', error);
    res.status(500).json({ error: 'Failed to process comment notification' });
  }
});

// Comment reply: send DM to parent comment author (if sendDm true)
apiServer.post('/comment-reply', async (req, res) => {
  try {
    const { parentAuthorId, sendDm, requestTitle, requestUrl, replyContent, replierUsername, replierId } = req.body;
    if (!parentAuthorId || !requestUrl) {
      return res.status(400).json({ error: 'parentAuthorId and requestUrl are required' });
    }
    if (!sendDm) {
      return res.json({ success: true });
    }
    const replierName = replierUsername || 'Someone';
    const title = (requestTitle || 'Untitled Request').slice(0, 256);
    const preview = (replyContent || '').slice(0, 500).replace(/\n/g, ' ');
    const embeds = await getEmbedSettings().catch(() => ({}));
    const color = parseEmbedColorHex(embeds.embed_comment_reply_color) ?? 0x5865F2;
    const embedTitle = (embeds.embed_comment_reply_title || '💬 Someone replied to your comment').slice(0, 256);
    const descTemplate = embeds.embed_comment_reply_description || 'You received a reply on the request **{requestTitle}**.';
    const embedDescription = descTemplate.replace(/\{requestTitle\}/g, title).slice(0, 4096);
    const footer = (embeds.embed_comment_reply_footer || '6ure Requests · Comment reply').slice(0, 2048);
    const footerIcon = (embeds.embed_comment_reply_footer_icon || '').trim() || undefined;
    const f1 = (embeds.embed_comment_reply_field_1_name || 'Reply').slice(0, 256);
    const f2 = (embeds.embed_comment_reply_field_2_name || 'From').slice(0, 256);
    const f3 = (embeds.embed_comment_reply_field_3_name || 'View comment').slice(0, 256);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(embedTitle)
      .setDescription(embedDescription)
      .setURL(requestUrl)
      .addFields(
        { name: f1, value: preview || '*No text*', inline: false },
        { name: f2, value: replierId ? `${replierName} (<@${replierId}>)` : replierName, inline: true },
        { name: f3, value: `[Open request](${requestUrl})`, inline: true }
      )
      .setFooter({ text: footer, iconURL: footerIcon })
      .setTimestamp();
    const authorName = (embeds.embed_comment_reply_author_name || '').trim();
    if (authorName) {
      embed.setAuthor({ name: authorName, iconURL: (embeds.embed_comment_reply_author_icon || '').trim() || undefined });
    }
    const user = await client.users.fetch(parentAuthorId).catch(() => null);
    if (user) {
      await user.send({ embeds: [embed] });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending comment reply DM:', error);
    res.status(500).json({ error: 'Failed to send comment reply DM' });
  }
});

// Function to send comment to comments channel (top-level comments and replies)
async function sendCommentToStaff(request, comment) {
  if (!commentsChannel) {
    console.error('Comments channel not available for comment notification');
    return;
  }
  
  try {
    const commentAuthor = await getUser(comment.user_id);
    const isReply = !!comment.parent_id;
    let authorLabel = `${commentAuthor?.username || 'Unknown'} (<@${comment.user_id}>) commented`;
    if (isReply) {
      authorLabel = `${commentAuthor?.username || 'Unknown'} (<@${comment.user_id}>) replied to a comment`;
    }
    
    let requestMessage = null;
    if (request.message_id && staffChannel) {
      try {
        requestMessage = await staffChannel.messages.fetch(request.message_id);
      } catch (error) {
        console.log(`Could not fetch request message ${request.message_id}:`, error.message);
      }
    }
    
    const requestAuthor = request.user_id ? await getUser(request.user_id) : null;
    const requestUrl = requestUrlFor(request.id);
    
    let commentContent = comment.content;
    if (commentContent.length > 1500) {
      commentContent = commentContent.substring(0, 1497) + '...';
    }
    
    const fields = [
      { name: '📋 Request Details', value: `**ID:** #${request.id}\n**Status:** ${request.status || 'pending'}\n**Upvotes:** ${request.upvotes || 0}`, inline: true },
      { name: '👤 Request Author', value: formatUserWithMention(requestAuthor, request.user_id), inline: true },
      { name: '🔗 Quick Links', value: `[View Request](${requestUrl})\n[Product](${request.product_url || 'N/A'})`, inline: true }
    ];
    
    if (isReply && comment.parent_id) {
      const parentComment = await getComment(comment.parent_id).catch(() => null);
      if (parentComment) {
        const parentAuthor = await getUser(parentComment.user_id);
        const parentPreview = (parentComment.content || '').slice(0, 300) + ((parentComment.content || '').length > 300 ? '…' : '');
        fields.push({ name: '↩️ In reply to', value: `${formatUserWithMention(parentAuthor, parentComment.user_id)}\n${parentPreview}`, inline: false });
      }
    }
    
    const commentEmbed = new EmbedBuilder()
      .setAuthor({ name: authorLabel, iconURL: commentAuthor?.avatar || undefined, url: requestUrl })
      .setTitle(`💬 ${request.title || 'Untitled Request'}`)
      .setURL(requestUrl)
      .setDescription(`**${commentContent}**`)
      .setColor(0x5865F2)
      .addFields(fields)
      .setThumbnail(commentAuthor?.avatar || null)
      .setFooter({ text: `Comment #${comment.id} • Request #${request.id}${isReply ? ' (reply)' : ''}`, iconURL: requestAuthor?.avatar || undefined })
      .setTimestamp(new Date(comment.created_at));
    
    if (request.image_url) {
      commentEmbed.setImage(request.image_url);
    }
    
    if (requestMessage) {
      commentEmbed.addFields({ name: '📌 Original Request', value: `[View in Staff Channel](${requestMessage.url})`, inline: false });
    }
    
    await commentsChannel.send({ embeds: [commentEmbed] });
    console.log(`Sent comment notification for request ${request.id}, comment ${comment.id} (${isReply ? 'reply' : 'comment'}) to comments channel`);
  } catch (error) {
    console.error('Error sending comment to staff channel:', error);
  }
}

apiServer.listen(3002, () => {
  console.log('Discord bot API server running on port 3002');
});

// Initialize database
const { initialize } = require('../bot-server/database');
initialize().then(() => {
  console.log('Database initialized successfully');
}).catch(error => {
  console.error('Database initialization failed:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
