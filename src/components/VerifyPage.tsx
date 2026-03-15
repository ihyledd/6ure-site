"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const DISCORD_INVITE = "https://discord.gg/6ure";

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function accountYearFromSnowflake(id: string): number | null {
  try {
    const ms = Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000));
    return new Date(ms).getFullYear();
  } catch {
    return null;
  }
}

function formatJoinDate(iso: string): string | null {
  try {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return null;
  }
}

type UserData = {
  id: string;
  username?: string;
  global_name?: string;
  avatar?: string | null;
};

type GuildData = {
  joined_at?: string | null;
};

const STEPS = [
  { num: 1, title: "Go to #・verify", desc: "Head to the verification channel in the 6ure Discord server." },
  { num: 2, title: "Click Verify", desc: "The bot will send a message - click the button to start the authorization." },
  { num: 3, title: "Authorize", desc: "Approve 6ure™ Verification authorization. Once done, You'll be redirected here automatically." },
];

function LandingView() {
  return (
    <div className="v2-verify">
      <div className="v2-verify-card v2-landing">
        <div className="v2-landing-head">
          <div className="v2-landing-icon" aria-hidden>
            <DiscordIcon size={32} />
          </div>
          <h1 className="v2-landing-title">Discord Verification</h1>
          <p className="v2-landing-sub">Verify your Discord account to access the 6ure server. Follow the steps below.</p>
        </div>

        <div className="v2-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className="v2-step">
              <div className="v2-step-indicator">
                <span className="v2-step-num">{s.num}</span>
                {i < STEPS.length - 1 && <span className="v2-step-connector" aria-hidden />}
              </div>
              <div className="v2-step-content">
                <strong>{s.title}</strong>
                <span>{s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <a href={DISCORD_INVITE} className="v2-cta" target="_blank" rel="noopener noreferrer">
          <DiscordIcon size={20} />
          Join 6ure Discord
        </a>

        <p className="v2-legal">
          By verifying, you agree to our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}

function VerificationView({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/verify/user?id=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user.");
      const data: UserData = await res.json();
      if (!data.id || (!data.username && !data.global_name)) {
        throw new Error("Invalid user data.");
      }
      setUser(data);
      setBurst(true);

      try {
        const gRes = await fetch(`/api/verify/guild-member?user_id=${userId}`);
        if (gRes.ok) {
          const gData: GuildData = await gRes.json();
          setGuild(gData);
        }
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="v2-verify">
        <div className="v2-verify-card v2-error">
          <div className="v2-error-icon" aria-hidden>!</div>
          <h1 className="v2-error-title">Verification Failed</h1>
          <p className="v2-error-message">{error}</p>
          <p className="v2-support">
            Need help? <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a>
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="v2-verify">
        <div className="v2-verify-card v2-loading">
          <div className="v2-loading-spinner" aria-hidden />
          <h2 className="v2-loading-title">Verifying...</h2>
          <p className="v2-loading-sub">Verifying your Discord account. Please wait.</p>
        </div>
      </div>
    );
  }

  const displayName = user.global_name || user.username || "User";
  const username = user.username || "";
  const ext = user.avatar?.startsWith("a_") ? "gif" : "png";
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`
    : "https://cdn.discordapp.com/embed/avatars/1.png";
  const year = accountYearFromSnowflake(user.id);
  const joinedAt = guild?.joined_at ? formatJoinDate(guild.joined_at) : null;

  return (
    <div className="v2-verify">
      <div className={`v2-verify-card v2-success ${burst ? "v2-success-burst" : ""}`}>
        <div className="v2-success-profile">
          <div className={`v2-success-avatar ${burst ? "v2-success-avatar-pop" : ""}`}>
            <Image src={avatarUrl} alt="" width={72} height={72} className="v2-avatar-img" unoptimized />
          </div>
          <div className="v2-success-info">
            <h1 className="v2-success-name">{displayName}</h1>
            {username && <p className="v2-success-username">@{username}</p>}
            <div className="v2-success-badges">
              {year && <span className="v2-badge v2-badge-mint">Member since {year}</span>}
              {joinedAt && <span className="v2-badge v2-badge-blurple">Joined {joinedAt}</span>}
              <span className="v2-badge v2-badge-success">Verified</span>
            </div>
          </div>
        </div>

        <div className="v2-success-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>Your Discord account has been successfully verified.</span>
        </div>

        <a href={DISCORD_INVITE} className="v2-cta" target="_blank" rel="noopener noreferrer">
          <DiscordIcon size={20} />
          Join 6ure Discord
        </a>
        <Link href="/" className="v2-home-link">Go to 6ure website</Link>

        <p className="v2-legal">
          By completing verification, you agree to our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}

export function VerifyPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("state");

  return (
    <div className="verify-page-wrap">
      <Link href="/" className="verify-back-link" aria-label="Back to home">
        ← Back to home
      </Link>
      {userId ? <VerificationView userId={userId} /> : <LandingView />}
    </div>
  );
}
