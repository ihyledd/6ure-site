"use client";

import { useState } from "react";
import { getUserAvatarUrl, getAvatarDecorationUrl } from "@/lib/requests-utils";

type Props = {
  avatar: string | null | undefined;
  userId: string | null | undefined;
  avatarDecoration?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Display name for initial fallback when no avatar URL */
  displayName?: string | null;
};

/**
 * Renders user avatar with optional Discord decoration overlay.
 * When no avatar URL or image fails, shows initial (first letter) or placeholder.
 */
export function UserAvatar({
  avatar,
  userId,
  avatarDecoration,
  size = 32,
  className = "",
  style,
  displayName,
}: Props) {
  const [error, setError] = useState(false);
  const [decorationError, setDecorationError] = useState(false);
  const avatarUrl = getUserAvatarUrl(avatar, userId);
  const decorationUrl = getAvatarDecorationUrl(avatarDecoration, userId);

  const showAvatar = avatarUrl && !error;
  const showInitial = !showAvatar && (displayName || userId);
  const initial = displayName ? displayName[0].toUpperCase() : (userId ? "?" : "?");

  return (
    <div
      className={`ure-user-avatar-wrap ${className}`.trim()}
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        overflow: "hidden",
        ...style,
      }}
    >
      {showAvatar ? (
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          className="ure-user-avatar-img"
          style={{ borderRadius: "50%", objectFit: "cover", width: "100%", height: "100%" }}
          onError={() => setError(true)}
        />
      ) : showInitial ? (
        <span
          className="ure-user-avatar-initial"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(10, size * 0.45),
            background: "var(--bg-tertiary, #333)",
            color: "var(--text-secondary, #999)",
          }}
        >
          {initial}
        </span>
      ) : null}
      {decorationUrl && !decorationError && (showAvatar || showInitial) ? (
        <img
          src={decorationUrl}
          alt=""
          width={size}
          height={size}
          className="ure-user-avatar-decoration"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            transform: "scale(1.15)",
          }}
          onError={() => setDecorationError(true)}
        />
      ) : null}
    </div>
  );
}
