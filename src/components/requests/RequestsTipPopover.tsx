"use client";

import { useState, useEffect } from "react";
import { BiIcon } from "./BiIcon";

const SESSION_KEY = "requests-tip-seen";

export function RequestsTipPopover() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, [mounted]);

  const handleClose = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="requests-tip-popover" role="status" aria-live="polite">
      <p className="requests-tip-text">
        <BiIcon name="lightbulb" size={16} className="requests-tip-icon" aria-hidden />
        Filter by status: All, Pending, Completed. Sort by Recent or Most Upvotes.
      </p>
      <button
        type="button"
        className="requests-tip-close"
        onClick={handleClose}
        aria-label="Dismiss tip"
      >
        <BiIcon name="x" size={16} />
      </button>
    </div>
  );
}
