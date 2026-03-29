"use client";

import { createPortal } from "react-dom";
import Link from "next/link";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const TICKET_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={20} height={20} aria-hidden>
    <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z" />
    <path d="M2 12h4M18 12h4" />
  </svg>
);

const DISCORD_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20} aria-hidden>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .372.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.364 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const SHIELD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={20} height={20} aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export type MembershipInstructionType = "leak_protection" | "premium_annual";

export interface MembershipInstructionModalProps {
  type: MembershipInstructionType;
  onClose: () => void;
  discordUrl?: string;
}

function LeakProtectionContent({ discordUrl }: { discordUrl: string }) {
  return (
    <>
      <ol className="membership-instruction-steps">
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>
            {DISCORD_ICON}
          </span>
          <span>
            <strong>Join our Discord server</strong> if you haven’t already.
            {discordUrl && (
              <>
                {" "}
                <Link href={discordUrl} target="_blank" rel="noopener noreferrer" className="membership-instruction-link">
                  Join Discord →
                </Link>
              </>
            )}
          </span>
        </li>
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>
            {TICKET_ICON}
          </span>
          <span><strong>Open a ticket</strong> in the server.</span>
        </li>
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>
            {SHIELD_ICON}
          </span>
          <span>
            <strong>Clarify the purpose</strong> of the ticket. Use one of these:
            <span className="membership-instruction-pills">
              <span className="membership-instruction-pill">Leak Protection monthly</span>
              <span className="membership-instruction-pill">Leak Protection yearly</span>
            </span>
            <mark className="membership-instruction-highlight">Please state monthly or yearly — it’s a must.</mark>
          </span>
        </li>
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>4.</span>
          <span>
            <strong>Provide these in your ticket:</strong>
            <ul className="membership-instruction-sublist">
              <li>Your <strong>TikTok profile link</strong></li>
              <li>Your <strong>Payhip or shop link</strong> that you want to be protected</li>
            </ul>
          </span>
        </li>
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>5.</span>
          <span><strong>Wait for a staff member</strong> to assist you with more information.</span>
        </li>
      </ol>
    </>
  );
}

function PremiumAnnualContent({ discordUrl }: { discordUrl: string }) {
  return (
    <>
      <ol className="membership-instruction-steps">
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>
            {DISCORD_ICON}
          </span>
          <span>
            <strong>Join our Discord server</strong> if you haven’t already.
            {discordUrl && (
              <>
                {" "}
                <Link href={discordUrl} target="_blank" rel="noopener noreferrer" className="membership-instruction-link">
                  Join Discord →
                </Link>
              </>
            )}
          </span>
        </li>
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>
            {TICKET_ICON}
          </span>
          <span><strong>Open a ticket</strong> in the server.</span>
        </li>
        <li>
          <span className="membership-instruction-step-icon" aria-hidden>
            {SHIELD_ICON}
          </span>
          <span>
            <strong>Clarify the purpose:</strong>{" "}
            <span className="membership-instruction-pill membership-instruction-pill-emphasis">Premium Annual</span>
            <br />
            <span className="membership-instruction-muted">Staff will assist you with more information.</span>
          </span>
        </li>
      </ol>
    </>
  );
}

export function MembershipInstructionModal({ type, onClose, discordUrl = "" }: MembershipInstructionModalProps) {
  const isLeak = type === "leak_protection";
  const title = isLeak ? "How to get Leak Protection" : "How to get Premium Annual";

  const content = typeof document !== "undefined" && (
    <div
      className="requests-modal-overlay membership-instruction-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-instruction-title"
    >
      <div className="requests-modal-popup membership-instruction-popup" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="requests-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          {CLOSE_ICON}
        </button>
        <h2 id="membership-instruction-title" className="membership-instruction-title">
          {title}
        </h2>
        <p className="membership-instruction-intro">
          {isLeak
            ? "Follow these steps to subscribe via our Discord server:"
            : "Follow these steps to subscribe to Premium Annual:"}
        </p>
        {isLeak ? <LeakProtectionContent discordUrl={discordUrl} /> : <PremiumAnnualContent discordUrl={discordUrl} />}
        <div className="membership-instruction-actions">
          <button
            type="button"
            className="membership-plan-cta membership-plan-cta-primary"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  return content ? createPortal(content, document.body) : null;
}
