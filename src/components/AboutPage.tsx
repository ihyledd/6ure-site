"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";

type StaffMember = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  description?: string;
  roles: string[];
  /** Discord presence: online, idle, dnd, offline (if available from bot) */
  presence?: "online" | "idle" | "dnd" | "offline";
  /** Social profile URLs: tiktok, instagram, youtube, twitter, twitch, github */
  socials?: Record<string, string>;
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  founder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Founder">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
    </svg>
  ),
  developer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Developer">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  co_founder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Co-Founder">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  manager: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Manager">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  exec_mod: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Executive Mod">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  moderator: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Moderator">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

const ROLE_COLORS: Record<string, string> = {
  founder: "#ffd700",
  co_founder: "#b8860b",
  "co-founder": "#b8860b",
  developer: "#8b9aff",
  manager: "#ed4245",
  exec_mod: "#e67e22",
  moderator: "#57f287",
};

const WEBSITES = [
  { href: "/resources", title: "Presets", desc: "Browse and download premium video editing packs, presets, templates and more.", link: "6ureleaks.com/resources", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" },
  { href: "/requests", title: "Requests", desc: "Request and discover content.", link: "6ureleaks.com/requests", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
  { href: "/password", title: "Password", desc: "Access and password hub.", link: "6ureleaks.com/password", icon: "M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z M7 11V7a5 5 0 0 1 10 0v4" },
  { href: "/wiki", title: "Wiki", desc: "Guides and documentation.", link: "6ureleaks.com/wiki", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" },
  { href: "/verify", title: "Verify", desc: "Verify your membership.", link: "6ureleaks.com/verify", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
];

const PRESETS_CARD = {
  title: "Presets",
  desc: "Curated presets hosted in our Discord server.",
  link: "Discord",
};

type AboutContent = {
  hero_headline: string;
  hero_description: string;
  about_story: string;
  about_mission: string;
  about_vision: string;
  stat_downloads: number;
  stat_presets: number;
  stat_support_label: string;
};

const STATS_DURATION = 1800;

const DEFAULT_CONTENT: AboutContent = {
  hero_headline: "Welcome to 6ure",
  hero_description: "Your hub for editing presets, plugins, and resources - curated, organised, and built for creators.",
  about_story: "6ure was originally established to provide a more comfortable and structured space to navigate presets, bringing resources from various sources into one organised and simplified space. Before 6ure, finding quality presets meant jumping between scattered sources, inconsistent formats, and unreliable access. We wanted to change that - a single place where creators and editors could discover, download, and share without the clutter. Today, 6ure has grown into a premium community: curated presets, Resources, Requests, Wiki, and round-the-clock support, all in one ecosystem.",
  about_mission: "To provide the best premium content experience with transparency, reliability, and an unmatched community atmosphere.",
  about_vision: "A community where quality content meets genuine support - no shortcuts, no compromises.",
  stat_downloads: 0,
  stat_presets: 0,
  stat_support_label: "24/7",
};

function useStatsSectionStart() {
  const [startTime, setStartTime] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setStartTime(performance.now());
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, startTime };
}

function useSyncedStat(target: number, startTime: number | null) {
  const [value, setValue] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (startTime === null) return;
    let rafId: number;
    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / STATS_DURATION, 1);
      const ease = 1 - Math.pow(1 - progress, 2);
      const t = targetRef.current;
      const next = progress >= 1 ? t : Math.round(t * ease);
      setValue(next);
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [startTime]);

  return value;
}

function useSyncedStatAsync(target: number | null, startTime: number | null) {
  const [value, setValue] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (startTime === null || target === null) return;
    let rafId: number;
    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / STATS_DURATION, 1);
      const ease = 1 - Math.pow(1 - progress, 2);
      const t = targetRef.current ?? target;
      const next = progress >= 1 ? t : Math.round(t * ease);
      setValue(next);
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [startTime, target]);

  return value;
}

const ROLE_LABELS: Record<string, string> = {
  founder: "Founder",
  co_founder: "Co-Founder",
  "co-founder": "Co-Founder",
  developer: "Developer",
  manager: "Manager",
  exec_mod: "Exec Mod",
  moderator: "Moderator",
};

const PRESENCE_LABELS: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

function ensureUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

const SOCIAL_PLATFORMS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "tiktok", label: "TikTok", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg> },
  { key: "instagram", label: "Instagram", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg> },
  { key: "youtube", label: "YouTube", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg> },
  { key: "twitter", label: "X (Twitter)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
  { key: "twitch", label: "Twitch", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" /></svg> },
  { key: "github", label: "GitHub", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg> },
];

function StaffCard({ s }: { s: StaffMember }) {
  const discordUrl = `https://discord.com/users/${s.id}`;
  const roles = (s.roles ?? []).filter(Boolean);
  const socialEntries = (s.socials && typeof s.socials === "object")
    ? SOCIAL_PLATFORMS.filter((p) => {
      const v = s.socials![p.key];
      return typeof v === "string" && v.trim();
    })
    : [];
  return (
    <div className="about-staff-card">
      <a
        href={discordUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="about-staff-card-main"
        aria-label={`View ${s.name} on Discord`}
      >
        <div className="about-staff-card-avatar">
          {s.avatar ? (
            <img src={s.avatar} alt="" width={96} height={96} loading="lazy" />
          ) : (
            <span className="about-staff-card-avatar-initial">{(s.name ?? "?")[0].toUpperCase()}</span>
          )}
          {s.presence && (
            <span
              className={`about-staff-card-presence about-staff-card-presence-${s.presence}`}
              title={PRESENCE_LABELS[s.presence] ?? s.presence}
              aria-label={PRESENCE_LABELS[s.presence] ?? s.presence}
            />
          )}
        </div>
        <h3 className="about-staff-card-name">{s.name}</h3>
        {s.username && <span className="about-staff-card-username">@{s.username}</span>}
        {roles.length > 0 && (
          <div className="about-staff-card-roles">
            {roles.map((r) => {
              const label = ROLE_LABELS[r] ?? String(r).replace(/_/g, " ");
              const color = ROLE_COLORS[r] ?? "#72767d";
              return (
                <span
                  key={r}
                  className="about-staff-card-role"
                  style={{
                    background: `${color}22`,
                    borderColor: color,
                    color: color,
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
        {s.description && <p className="about-staff-card-desc">{s.description}</p>}
        <span className="about-staff-card-hint">View on Discord →</span>
      </a>
      {socialEntries.length > 0 && (
        <div className="about-staff-card-socials" onClick={(e) => e.stopPropagation()}>
          {socialEntries.map((p) => {
            const url = ensureUrl(String(s.socials![p.key]).trim());
            return (
              <a
                key={p.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="about-staff-card-social-link"
                aria-label={p.label}
                title={p.label}
              >
                {p.icon}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function AboutPage({
  discordUrl,
  hasActiveForms = false,
}: {
  discordUrl?: string | null;
  hasActiveForms?: boolean;
}) {
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const { ref: statsSectionRef, startTime: statsStartTime } = useStatsSectionStart();
  const membersValue = useSyncedStatAsync(memberCount, statsStartTime);
  const onlineValue = useSyncedStatAsync(onlineCount, statsStartTime);
  const downloadsValue = useSyncedStat(content.stat_downloads, statsStartTime);
  const presetsValue = useSyncedStat(content.stat_presets, statsStartTime);

  useEffect(() => {
    fetch(`/api/about/content?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data && (typeof data.stat_downloads === "number" || typeof data.stat_presets === "number")) {
          setContent({
            hero_headline: data.hero_headline ?? DEFAULT_CONTENT.hero_headline,
            hero_description: data.hero_description ?? DEFAULT_CONTENT.hero_description,
            about_story: data.about_story ?? DEFAULT_CONTENT.about_story,
            about_mission: data.about_mission ?? DEFAULT_CONTENT.about_mission,
            about_vision: data.about_vision ?? DEFAULT_CONTENT.about_vision,
            stat_downloads: typeof data.stat_downloads === "number" ? data.stat_downloads : DEFAULT_CONTENT.stat_downloads,
            stat_presets: typeof data.stat_presets === "number" ? data.stat_presets : DEFAULT_CONTENT.stat_presets,
            stat_support_label: data.stat_support_label ?? DEFAULT_CONTENT.stat_support_label,
          });
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch(`/api/about/staff?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.staff)) {
          setStaff(data.staff);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch("/api/about/discord-stats")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.members === "number") setMemberCount(data.members);
        if (typeof data.online === "number") setOnlineCount(data.online);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const el = document.querySelector(".about-container");
    if (!el) return;
    const targets = el.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("about-reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [staff.length]);

  return (
    <div className="about-container">
      <section className="about-hero">
        <div className="about-hero-logo">
          <Image
            src="https://images.6ureleaks.com/logos/Untitled10.png"
            alt="6ure"
            width={120}
            height={120}
            unoptimized
          />
        </div>
        <h1 className="about-hero-title">{content.hero_headline}</h1>
        <p className="about-hero-sub">{content.hero_description}</p>
        <div className="about-hero-btns">
          <a
            href={discordUrl || "https://discord.gg/wFPsTezjeq"}
            target="_blank"
            rel="noopener noreferrer"
            className="about-btn about-btn-primary"
          >
            Join Discord
          </a>
        </div>
      </section>

      <section ref={statsSectionRef} className="about-stats about-reveal" data-reveal aria-label="Community stats">
        <div className="about-stat-card">
          <span className="about-stat-icon" aria-hidden="true"><DiscordIcon /></span>
          <div className="about-stat-value">
            {memberCount !== null ? membersValue.toLocaleString() : "-"}
          </div>
          <div className="about-stat-label">Discord Members</div>
        </div>

        <div className="about-stat-card">
          <span className="about-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><circle cx="20" cy="4" r="2" fill="currentColor" /></svg>
          </span>
          <div className="about-stat-value">
            {onlineCount !== null && onlineCount > 0 ? onlineValue.toLocaleString() : "-"}
          </div>
          <div className="about-stat-label">Online Now</div>
        </div>

        <Link href="/resources" className="about-stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="about-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </span>
          <div className="about-stat-value">{downloadsValue.toLocaleString()}</div>
          <div className="about-stat-label">Downloads</div>
        </Link>

        <Link href="/resources" className="about-stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="about-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          </span>
          <div className="about-stat-value">{presetsValue.toLocaleString()}</div>
          <div className="about-stat-label">Resources</div>
        </Link>

        <div className="about-stat-card">
          <span className="about-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
          </span>
          <div className="about-stat-value">{content.stat_support_label}</div>
          <div className="about-stat-label">Support</div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-story-card about-reveal" data-reveal>
          <header className="about-story-hero">
            <div className="about-story-badges" role="list">
              <span className="about-story-badge" role="listitem">Our Story</span>
              <span className="about-story-badge" role="listitem">Community</span>
              <span className="about-story-badge" role="listitem">Presets</span>
            </div>
            <h2 className="about-story-title">About</h2>
            <p className="about-story-tagline">Where curated presets, community, and support come together in one organised space.</p>
          </header>
          <div className="about-story-content">
            {content.about_story && <p className="about-story-lead">{content.about_story}</p>}
            <div className="about-story-summary-box">
              <h3 className="about-story-summary-title">In short</h3>
              <ul>
                <li>We bring <strong>presets</strong> and resources from various sources into one organised, simplified hub.</li>
                <li>Our <strong>Resources</strong> section provides a vast library of premium video editing packs, presets, and templates.</li>
                <li>Our <strong>Requests</strong> platform lets you request content; our <strong>Wiki</strong> holds guides and documentation.</li>
                <li>We&apos;re <strong>community-first</strong> - transparent, reliable, and built for creators and editors.</li>
              </ul>
            </div>
            {content.about_mission && (
              <div className="about-story-block">
                <h3 className="about-story-block-title">Mission</h3>
                <p>{content.about_mission}</p>
              </div>
            )}
            {content.about_vision && (
              <div className="about-story-block">
                <h3 className="about-story-block-title">Vision</h3>
                <p>{content.about_vision}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2 className="about-section-title">Meet the people behind the team</h2>
        {staff.length > 0 ? (
          <div className="about-staff-grid about-reveal" data-reveal>
            {staff.map((s) => (
              <StaffCard key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <div className="about-card about-staff-empty about-reveal" data-reveal>
            <p className="about-staff-empty-text">
              Meet the people behind 6ure. Staff members will appear here once added.
            </p>
          </div>
        )}
      </section>

      <section className="about-section about-apply-section">
        <div className="about-apply-card about-reveal" data-reveal>
          <span className="about-apply-label">Join the Team</span>
          <h2 className="about-apply-title">Want to be part of 6ure?</h2>
          <p className="about-apply-desc">
            We&apos;re looking for editors, curators, and contributors who share our passion for presets and editing culture. Share your work or ideas - we&apos;d love to hear from you.
          </p>
          <button
            type="button"
            className="about-apply-btn"
            onClick={() => setApplyModalOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Apply
          </button>
        </div>
      </section>

      {applyModalOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="contact-backdrop"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setApplyModalOpen(false); }}
          >
            <div className="apply-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="apply-modal-header">
                <h2 className="apply-modal-title">Applications</h2>
                <button type="button" className="contact-modal-close" onClick={() => setApplyModalOpen(false)} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
              <div className="apply-modal-body">
                {hasActiveForms ? (
                  <>
                    <p>Applications are open! Fill out the form to apply.</p>
                    <Link href="/apply" className="btn-primary" onClick={() => setApplyModalOpen(false)}>
                      Go to Applications
                    </Link>
                    <button type="button" className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => setApplyModalOpen(false)}>
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <p>We are not accepting any applications at the moment. Check back later - we&apos;ll announce when applications open again.</p>
                    <button type="button" className="btn-primary" onClick={() => setApplyModalOpen(false)}>Got it</button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <section className="about-section about-websites-section">
        <h2 className="about-section-title">Our Websites</h2>
        <p className="about-websites-lead">All 6ure platforms in one place.</p>
        <div className="about-websites-grid about-reveal" data-reveal>
          {WEBSITES.map((w) => (
            <Link key={w.href} href={w.href} className="about-website-card">
              <span className="about-website-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={w.icon} />
                </svg>
              </span>
              <h3 className="about-website-title">{w.title}</h3>
              <p className="about-website-desc">{w.desc}</p>
              <span className="about-website-link">{w.link} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="about-section about-contact-section">
        <h2 className="about-section-title">Get in Touch</h2>
        <p className="about-contact-lead">We&apos;re here to help. Reach us via Discord or email.</p>
        <div className="about-contact-grid about-reveal" data-reveal>
          <a
            href={discordUrl || "https://discord.gg/wFPsTezjeq"}
            target="_blank"
            rel="noopener noreferrer"
            className="about-contact-card"
          >
            <span className="about-contact-icon" aria-hidden="true"><DiscordIcon /></span>
            <h3 className="about-contact-card-title">Discord Community</h3>
            <p className="about-contact-card-desc">Join our server for support, announcements, and the community.</p>
            <span className="about-contact-card-link">Join Discord →</span>
          </a>
          <a href="mailto:contact@6ureleaks.com" className="about-contact-card">
            <span className="about-contact-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </span>
            <h3 className="about-contact-card-title">Email Support</h3>
            <p className="about-contact-card-desc">For partnerships, questions, or anything that needs a written reply.</p>
            <span className="about-contact-card-link">contact@6ureleaks.com →</span>
          </a>
        </div>
      </section>
    </div>
  );
}
