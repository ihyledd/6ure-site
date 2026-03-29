"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BiIcon } from "./BiIcon";
import { UserAvatar } from "./UserAvatar";
import "@/styles/protected-page.css";

type ProtectedUser = {
  userId: string;
  username: string | null;
  avatar: string | null;
  avatar_decoration?: string | null;
  displayName: string | null;
  subscriptionEndsAt: string | null;
  socialLink: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  creatorPlatform: string | null;
  followerCount: number;
  videoCount: number | null;
  likesCount: number | null;
  verified: boolean | null;
  creatorBio: string | null;
  creatorBioLink: string | null;
};

function formatSubscriptionDuration(endsAt: string | null): string {
  if (!endsAt) return "-";
  const d = new Date(endsAt);
  if (isNaN(d.getTime())) return endsAt;
  const now = new Date();
  if (d < now) return `Ended ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  const days = Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 30) return `${days} day${days !== 1 ? "s" : ""} left`;
  return `Until ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

function formatCount(count: number | null): string | null {
  if (count == null || count === 0) return null;
  const n = Number(count);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

const FLAG_EMOJI_REGEX = /[\u{1F1E6}-\u{1F1FF}][\u{1F1E6}-\u{1F1FF}]/gu;
const REGIONAL_INDICATOR_BASE = 0x1f1e6;

function flagEmojiToCode(emoji: string): string | null {
  if (!emoji || emoji.length < 2) return null;
  const c0 = emoji.codePointAt(0);
  const c1 = emoji.codePointAt(2) ?? emoji.codePointAt(1);
  if (c0 == null || c1 == null || c0 < REGIONAL_INDICATOR_BASE || c0 > 0x1f1ff || c1 < REGIONAL_INDICATOR_BASE || c1 > 0x1f1ff) return null;
  const l0 = String.fromCharCode(65 + (c0 - REGIONAL_INDICATOR_BASE));
  const l1 = String.fromCharCode(65 + (c1 - REGIONAL_INDICATOR_BASE));
  return l0 + l1;
}

type BioSegment = { type: "text"; value: string } | { type: "flag"; code: string };

function parseBioWithFlags(bio: string): BioSegment[] {
  if (!bio || typeof bio !== "string") return [];
  const trimmed = bio.trim();
  if (!trimmed) return [];
  const segments: BioSegment[] = [];
  let lastIndex = 0;
  FLAG_EMOJI_REGEX.lastIndex = 0;
  let match;
  while ((match = FLAG_EMOJI_REGEX.exec(trimmed)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: trimmed.slice(lastIndex, match.index) });
    }
    const code = flagEmojiToCode(match[0]);
    if (code) segments.push({ type: "flag", code: code.toUpperCase() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < trimmed.length) {
    segments.push({ type: "text", value: trimmed.slice(lastIndex) });
  }
  return segments;
}

function getTikTokHandle(user: ProtectedUser): string | null {
  if (!user.socialLink || user.creatorPlatform !== "tiktok") return null;
  try {
    const url = new URL(user.socialLink);
    const match = url.pathname.match(/\/@([^/]+)/);
    const raw = match?.[1];
    if (!raw) return null;
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function getFlagImageUrl(countryCode: string): string {
  return `https://flagcdn.com/w40/${String(countryCode).toLowerCase()}.png`;
}

export function ProtectedPageClient() {
  const [users, setUsers] = useState<ProtectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "tiktok" | "youtube" | "discord">("all");
  const [sortBy, setSortBy] = useState<"default" | "expiry_asc" | "expiry_desc" | "followers_desc" | "followers_asc">("default");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/protection/users");
        if (!r.ok) throw new Error("Failed to load");
        const data = await r.json();
        setUsers(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError("Failed to load protected list.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const searchMatch =
      !search.trim() ||
      [u.username, u.creatorName, u.displayName].some((s) =>
        s?.toLowerCase().includes(search.toLowerCase())
      );
    const platformMatch =
      platformFilter === "all" ||
      (platformFilter === "tiktok" && u.creatorPlatform === "tiktok") ||
      (platformFilter === "youtube" && u.creatorPlatform === "youtube") ||
      (platformFilter === "discord" && !["tiktok", "youtube"].includes(u.creatorPlatform || ""));
    return searchMatch && platformMatch;
  });

  const dateCompare = (a: ProtectedUser, b: ProtectedUser): number => {
    const dateA = a.subscriptionEndsAt ? new Date(a.subscriptionEndsAt).getTime() : Infinity;
    const dateB = b.subscriptionEndsAt ? new Date(b.subscriptionEndsAt).getTime() : Infinity;
    if (dateA === dateB) return 0;
    if (dateA === Infinity) return 1;
    if (dateB === Infinity) return -1;
    return dateA - dateB;
  };

  const followersCompare = (a: ProtectedUser, b: ProtectedUser): number => {
    const fa = a.followerCount ?? 0;
    const fb = b.followerCount ?? 0;
    return fa - fb;
  };

  const sorted =
    sortBy === "expiry_asc"
      ? [...filtered].sort(dateCompare)
      : sortBy === "expiry_desc"
        ? [...filtered].sort((a, b) => -dateCompare(a, b))
        : sortBy === "followers_desc"
          ? [...filtered].sort((a, b) => -followersCompare(a, b))
          : sortBy === "followers_asc"
            ? [...filtered].sort(followersCompare)
            : filtered;

  if (loading) {
    return (
      <div className="protected-page">
        <Link href="/requests" className="protected-back-link">
          ← Back to requests
        </Link>
        <div className="protected-loading">
          <div className="protected-spinner" />
          <p>Loading protected list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="protected-page">
        <Link href="/requests" className="protected-back-link">
          ← Back to requests
        </Link>
        <div className="protected-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="protected-page">
      <Link href="/requests" className="protected-back-link">
        ← Back to requests
      </Link>
      <div className="protected-hero">
        <BiIcon name="shield-lock-fill" size={48} className="protected-hero-icon" aria-hidden />
        <h1>Protected</h1>
        <p className="protected-hero-subtitle">
          Creators with active protection and subscription duration. This list is visible to everyone.
        </p>
      </div>

      {users.length > 0 && (
        <div className="protected-filter-bar">
          <div className="protected-search-wrap">
            <BiIcon name="search" size={18} className="protected-search-icon" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="protected-search-input"
              aria-label="Search protected users"
            />
          </div>
          <div className="protected-filter-pills">
            <span className="protected-filter-label">Platform:</span>
            {(["all", "tiktok", "youtube", "discord"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`protected-filter-pill ${platformFilter === p ? "active" : ""}`}
                onClick={() => setPlatformFilter(p)}
              >
                {p === "all" ? "All" : p === "discord" ? "Discord" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="protected-sort-pills">
            <span className="protected-filter-label">Sort:</span>
            <button
              type="button"
              className={`protected-filter-pill ${sortBy === "default" ? "active" : ""}`}
              onClick={() => setSortBy("default")}
            >
              Default
            </button>
            <button
              type="button"
              className={`protected-filter-pill ${sortBy === "followers_desc" ? "active" : ""}`}
              onClick={() => setSortBy("followers_desc")}
              title="Most followers first"
            >
              <BiIcon name="people-fill" size={14} /> Most
            </button>
            <button
              type="button"
              className={`protected-filter-pill ${sortBy === "followers_asc" ? "active" : ""}`}
              onClick={() => setSortBy("followers_asc")}
              title="Least followers first"
            >
              <BiIcon name="people-fill" size={14} /> Least
            </button>
            <button
              type="button"
              className={`protected-filter-pill ${sortBy === "expiry_asc" ? "active" : ""}`}
              onClick={() => setSortBy("expiry_asc")}
              title="Earliest expiry first"
            >
              <BiIcon name="calendar-event" size={14} /> Earliest
            </button>
            <button
              type="button"
              className={`protected-filter-pill ${sortBy === "expiry_desc" ? "active" : ""}`}
              onClick={() => setSortBy("expiry_desc")}
              title="Oldest expiry first"
            >
              <BiIcon name="calendar-event" size={14} /> Oldest
            </button>
          </div>
        </div>
      )}

      <div className="protected-list">
        {sorted.length === 0 ? (
          <div className="protected-empty">
            <p>{users.length === 0 ? "No protected users listed yet." : "No results match your filters."}</p>
          </div>
        ) : (
          <div className="protected-list-cards">
            {sorted.map((u) => (
              <div key={u.userId} className="protected-card">
                {(u.creatorPlatform === "tiktok" || u.creatorPlatform === "youtube") && u.socialLink ? (
                  <a
                    href={u.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="protected-card-link"
                  >
                    <div className="protected-card-body">
                      <div className="protected-card-head">
                        <div className="protected-creator-main">
                          {u.creatorAvatar && (
                            <img
                              src={u.creatorAvatar}
                              alt=""
                              className="protected-creator-avatar"
                              width={56}
                              height={56}
                            />
                          )}
                          <div className="protected-creator-meta">
                            <span className="protected-creator-name-row">
                              <span className={`protected-creator-platform ${u.creatorPlatform}`}>
                                <BiIcon
                                  name={u.creatorPlatform === "tiktok" ? "tiktok" : "youtube"}
                                  size={24}
                                  className="protected-creator-icon"
                                />
                                <span className="protected-creator-handle">
                                  {u.creatorPlatform === "tiktok"
                                    ? (getTikTokHandle(u) || u.creatorName || "TikTok")
                                    : (u.creatorName || "YouTube")}
                                </span>
                              </span>
                              {u.verified && (
                                <span title="Verified">
                                  <BiIcon name="check-circle-fill" size={20} className="protected-verified-badge" />
                                </span>
                              )}
                            </span>
                            <div className="protected-stats-row">
                              {u.followerCount > 0 && (
                                <span className="protected-stat-pill protected-stat-followers">
                                  <BiIcon name="people-fill" size={14} className="protected-stat-icon" />
                                  <span>{formatCount(u.followerCount)}</span>
                                </span>
                              )}
                              {(u.videoCount ?? 0) > 0 && (
                                <span className="protected-stat-pill protected-stat-videos">
                                  <BiIcon name="camera-video-fill" size={14} className="protected-stat-icon" />
                                  <span>{formatCount(u.videoCount)}</span>
                                </span>
                              )}
                              {(u.likesCount ?? 0) > 0 && (
                                <span className="protected-stat-pill protected-stat-hearts">
                                  <BiIcon name="heart-fill" size={14} className="protected-stat-icon" />
                                  <span>{formatCount(u.likesCount)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="protected-card-actions">
                          <span className="protected-duration-pill">
                            <BiIcon name="calendar-event" size={14} className="protected-duration-icon" />
                            {formatSubscriptionDuration(u.subscriptionEndsAt)}
                          </span>
                          <span className="protected-link-icon">
                            <BiIcon name="box-arrow-up-right" size={16} />
                          </span>
                        </div>
                      </div>
                      {(u.creatorBio || u.creatorBioLink) && (
                        <div className="protected-bio-box">
                          {u.creatorBio && (
                            <div className="protected-creator-bio" style={{ whiteSpace: "pre-line" }}>
                              {parseBioWithFlags(u.creatorBio).map((seg, i) =>
                                seg.type === "text" ? (
                                  seg.value
                                ) : (
                                  <img
                                    key={`flag-${i}-${seg.code}`}
                                    src={getFlagImageUrl(seg.code)}
                                    alt=""
                                    className="protected-bio-flag"
                                    title={seg.code}
                                  />
                                )
                              )}
                            </div>
                          )}
                          {u.creatorBioLink && (
                            <a
                              href={u.creatorBioLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="protected-bio-link"
                            >
                              <BiIcon name="box-arrow-up-right" size={12} className="protected-bio-link-icon" />
                              Link in Bio
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </a>
                ) : (
                  <div className="protected-card-body">
                    <div className="protected-card-head">
                      <div className="protected-creator-main">
                        <UserAvatar
                          avatar={u.avatar}
                          userId={u.userId}
                          avatarDecoration={u.avatar_decoration ?? null}
                          size={56}
                          className="protected-creator-avatar"
                          displayName={u.username ?? undefined}
                        />
                        <div className="protected-creator-meta">
                          <span className="protected-creator-handle">{u.username || "Unknown"}</span>
                          <span className="protected-duration-pill">
                            <BiIcon name="calendar-event" size={14} className="protected-duration-icon" />
                            {formatSubscriptionDuration(u.subscriptionEndsAt)}
                          </span>
                        </div>
                      </div>
                      {u.socialLink && (
                        <a
                          href={u.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="protected-link-icon-wrap"
                        >
                          <BiIcon name="box-arrow-up-right" size={18} className="protected-link-icon" />
                          Link
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="protected-for-row">
                  <UserAvatar
                    avatar={u.avatar}
                    userId={u.userId}
                    avatarDecoration={u.avatar_decoration ?? null}
                    size={24}
                    className="protected-for-avatar"
                    displayName={u.username ?? undefined}
                  />
                  <span className="protected-for-label">Protected for {u.username || "Unknown"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
