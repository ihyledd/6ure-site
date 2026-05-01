---
title: Moderator Guide
lang: en-GB
outline: deep
lastUpdated: true
search: false
---
# Moderator's Guide {moderator}
This guide outlines moderation standards, procedures, and responsibilities.  
All moderators are expected to **understand and follow this fully**.

## General Moderation Information {#general-information}

### Expectations
- **Read and understand all server rules** (rough memorisation recommended)
- Set server notifications to **Mentions Only** (recommended) or **All Messages**
- Be familiar with **all server channels** and their purposes

### Staff Strikes System
- Strikes are given for **improper staff behaviour** or **rule violations**
- **3 strikes = demotion**

### Chat Management
- Redirect conversations to the correct channels
- Prevent spam or flooding (especially GIFs/images in chat channels)

### Ticket Support
- Respond to tickets **as quickly as possible**
- **One staff member per ticket**
- The **first staff member** to respond handles and closes the ticket

### Moderation Actions
- Use punishment commands in the channel where the incident occurred  
  *(or `#・staff-cmd` if necessary)*
- Always check previous history using: `!cases @user`

### General Guidelines
- Maintain a **family-friendly environment**
- Use **common sense**
- **Have fun :)**

## Moderation Procedures {#punishment}

### Verbal Warnings

::: info
**Trainees:** Observe how current moderators issue verbal warnings and take inspiration from their approach.
:::

- **Disrespectful behaviour**  
→ Verbal warn → 12h mute if continued

- **Arguments**  
→ Send `!fight` → 30m mute if continued

- **NSFW conversations**  
→ Verbal warn

- **Speaking in a different language**  
→ Verbal warn

### Normal Warnings

| Offence | Action / Reason |
|------|------|
| Asking for pirated content | Verbal warn + `piracy` |
| Sharing pirated content | `sendingpiracy` |
| Spamming across channels | `channelspam` |
| Pinging helpers outside help channels | Verbal warn + `outsideping` |
| NSFW | `nsfw` |
| Self-promo outside [#・promo](https://discord.com/channels/1118862694980788276/1430412012743037058) | Verbal warn + `selfpromo` |
| Payhip advertising in edits | Verbal warn + `payhippromo` |
| Requests outside [#・request](https://discord.com/channels/1118862694980788276/1253224549152198777) | Verbal warn + `outsidereq` |
| Posting ads more than once | `doublead` |
| Toxic / rude behaviour | `toxicity` |
| Empty or ignored tickets | `ticket` |
| Pinging staff for requests | `requestping` |

### Kicks
***Required Role: Moderator or higher***

- Selling or buying accounts → `accounts`
- DM advertising → `dmad`

### Bans
***Moderator or higher required - proof is mandatory***

- Trade scams → `trade` / `tradescam`
- Sending nudity, gore, etc → `nsfwban`
- Hate speech or slurs → `hatespeech`
- Racism → `racism`
- Under 13 → `underage`
- Doxxing → `doxxing`
- Raiding → `raiding`
- Alt accounts to bypass punishment → `alts`
- Password sharing → `password`
- Phishing or harmful files → `hacked`
- Anti-leak hypocrisy → `hypocrisy` 

### Additional Notes
- **Do not warn new members** for simple mistakes - redirect them first
- If behaviour repeats, then issue a warning
- Custom reasons (`!warn (user id) (reason)`) **require approval from other moderators**

> Words like `this` are predefined reasons  
> Learn them here: [Predefined Reasons](#what-are-the-predefined-reasons)

**Ban Duration Guide**
 Type | Duration |
|------|------|
| DM Advertising | 1 Day |
| Suicide Encouragement | 1 Week |
| Doxxing | Permanent |
| NSFW Content | Permanent |
| Racism | Permanent |
Always check history before action: `!cases (user id)`

## Evidence & Proof Requirements {#evidence}

### Evidence Standards
All moderation actions **must be backed by valid proof**, except verbal redirects.

Acceptable Proof:
-	Message links (preferred)
-	Screenshots showing username + user ID
-	Screen recordings
-	Bot logs (cases, warnings, deletions)

Unacceptable Proof
- Cropped screenshots without context
- Screenshots without usernames or IDs
- “Trust me” or verbal claims
- Third-party screenshots without verification

## Predefined Reasons {#what-are-the-predefined-reasons}
  
### How to Use

::: info
Predefined reasons work with **Warns, Timeouts, Kicks, and Bans**
:::

Example:  
```
!warn 617249450867425301 selfpromo
```
Syntax:  
```
!warn [user id] [duration] [reason]
```

### Available Reasons

https://6ureleaks.com/wiki/guide/predefined-reasons

## Moderator Responsibilities {#responsibilities}

### Ticket Handling
Tickets may include:
- Reports
- Support questions
- Staff or partner applications
- Sponsorships or giveaways

**Rules:**
- Respond promptly
- One moderator per ticket
- Transfer using `/transfer` if needed
- Close resolved or inactive tickets

::: warning
You **must warn** members who leave tickets empty or unresponsive.
:::   

### Message Deletion

Delete messages that include:
- NSFW content
- Hate speech
- Racism or discrimination
- Spam or self-promotion
- Wrong-channel messages

### Activity Requirements

- **Minimum:** 24 hours per week

**Trainee must:**
- Engage actively
- Help members
- Use **at least 5 mod commands** properly
  
### Core Duties
- Enforce rules
- Moderate chats
- Handle conflicts
- Maintain a positive environment

**Key Skills**
- Communication
- Fair judgement
- Patience
- Professionalism

## Moderation Commands {#moderation-commands}

  - `!warn @mention/id reason` - Issues a warning to the mentioned user.
  - `!sp @mention/id proof` - Set proof to the most recent case tied to your action. (Attach a file or link/message link)
  - `!mute @mention/id 1h reason` - Mutes the mentioned user for 1 hour. *(Default: 1 hour)*
  - `!tempmute @mention/id 1h reason` - Temporarily mutes the mentioned user for 1 hour. *(Default: 1 hour)*
  - `!ban @mention/id reason` - Bans the mentioned user. *(Default: No duration)*
  - `!tempban @mention/id 1d reason` - Temporarily bans the mentioned user for 1 day. *(Default: Unknown duration)*
  - `!warnings @mention/id` - Displays the warning history of the mentioned user.
  - `!cases @mention/id` - Displays the cases history of the mentioned user.
 
**Note:** These are examples of the basic commands you'll use for moderation.

## Server-Specific Information {#server-related}

### Tickets
If no response after **12 hours**, warn and close the ticket.

### Duplicate Requests
Check:
- [#・duplicates](https://discord.com/channels/1118862694980788276/1395469507014951063)

Delete or ignore duplicates as appropriate.

### Preset Download Issues
Greyed-out buttons mean the thread is archived.  
Run:
`/reopen`

### 1-Month Account Whitelist

**Requirements**
- Screenshot of TikTok/Instagram/Youtube profile
- Must be an editing account
- Screenshot must show **Edit Profile**

**Verification Steps**
- Search their username on TikTok/Instagram/Youtube
- Check post history, followers, authenticity
- Deny or question suspicious accounts

Command:
`/leak whitelist`
