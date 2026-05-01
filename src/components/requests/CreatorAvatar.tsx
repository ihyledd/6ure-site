"use client";

import { useState, useEffect } from "react";
import { getCreatorAvatarUrl } from "@/lib/requests-utils";

type Props = {
  url: string | null | undefined;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** Social media creator avatar: shows image from requests.creator_avatar or nothing. No fallback icon. */
export function CreatorAvatar({ url, size = 20, className, style }: Props) {
  const [error, setError] = useState(false);
  const displayUrl = getCreatorAvatarUrl(url);

  useEffect(() => {
    setError(false);
  }, [url]);

  if (!displayUrl || error) {
    return null;
  }

  return (
    <img
      src={displayUrl}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "50%", objectFit: "cover", ...style }}
      onError={() => setError(true)}
    />
  );
}
