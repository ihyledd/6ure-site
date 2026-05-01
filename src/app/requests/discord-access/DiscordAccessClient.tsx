"use client";

import { useState } from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "what-is", label: "What is Discord?" },
  { id: "how-to-connect", label: "How do I link Discord to Patreon?" },
  { id: "popup-tip", label: "Pop-up not showing?" },
  { id: "join-leave", label: "Joining & leaving the creator's server" },
  { id: "faq", label: "FAQ" },
];

const FAQ_ITEMS = [
  {
    q: "I've linked Discord to Patreon but I'm not on the creator's Discord server. What should I do?",
    a: "We recommend disconnecting and reconnecting Discord to Patreon. Before doing so, log out of Discord and clear your browser cache and cookies to start fresh. Reconnecting will re-establish communication between the two apps. Then go to Patreon → Settings → More → Connected Apps and connect Discord again. After that, check the Discord Apps page on Patreon for the \"Join server\" button for our server.",
  },
  {
    q: "How do I know if the creator offers Discord as a benefit for my membership?",
    a: "Check the creator's Patreon page for the Discord logo on your tier description. If Discord is listed as a benefit for your tier, you can link your account and join the server as described on this page.",
  },
  {
    q: "I don't think I have the correct role. I can't remember what role comes with my membership?",
    a: "On your Recent feed on Patreon, click the active membership for this creator. On their Patreon page, open the Membership tab to see if the Discord role name is mentioned in the tier description. You can also message the creator directly on Patreon-they'll know which roles are assigned to which tiers.",
  },
];

export function DiscordAccessClient({ discordUrl = "https://discord.gg/wFPsTezjeq" }: { discordUrl?: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="discord-access-page">
      <div className="discord-access-bg" aria-hidden="true">
        <div className="discord-access-orb discord-access-orb-1" />
        <div className="discord-access-orb discord-access-orb-2" />
        <div className="discord-access-orb discord-access-orb-3" />
        <div className="discord-access-grid" />
      </div>

      <div className="discord-access-wrap">
        <header className="discord-access-hero">
          <div className="discord-access-hero-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <h1 className="discord-access-hero-title">
            Getting <span className="discord-access-gradient">Discord</span> access
          </h1>
          <p className="discord-access-hero-lead">
            Premium is sold through Patreon. To get access to our Discord community and your Premium benefits, you need to link your Discord account to Patreon. Here’s how.
          </p>
          <nav className="discord-access-toc" aria-label="In this article">
            <span className="discord-access-toc-label">In this article</span>
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <article className="discord-access-article">
          <section id="what-is" className="discord-access-section">
            <h2 className="discord-access-h2">What is Discord?</h2>
            <p className="discord-access-p">
              If you’re not yet familiar with Discord, it’s an all-in-one voice and text chat app where you get access to the creator’s Patreon-exclusive community. Premium membership is sold through Patreon; linking your Discord account to Patreon is how you receive your role and unlock Discord access.
            </p>
          </section>

          <section id="how-to-connect" className="discord-access-section">
            <h2 className="discord-access-h2">How do I link my Discord account to Patreon?</h2>
            <p className="discord-access-p discord-access-p-lead">
              If you need to create a Discord account, you’ll be guided through that during this process. Follow these steps:
            </p>
            <ol className="discord-access-steps">
              <li className="discord-access-step">
                <span className="discord-access-step-num" aria-hidden="true">1</span>
                <div className="discord-access-step-body">
                  <strong>Log in to your Patreon account.</strong>
                </div>
              </li>
              <li className="discord-access-step">
                <span className="discord-access-step-num" aria-hidden="true">2</span>
                <div className="discord-access-step-body">
                  <strong>Click on Settings</strong> from the left side menu.
                </div>
              </li>
              <li className="discord-access-step">
                <span className="discord-access-step-num" aria-hidden="true">3</span>
                <div className="discord-access-step-body">
                  <strong>Click on More</strong> and then <strong>Connected Apps</strong> from the menu bar.
                </div>
              </li>
              <li className="discord-access-step">
                <span className="discord-access-step-num" aria-hidden="true">4</span>
                <div className="discord-access-step-body">
                  <strong>Click on Discord</strong> and then click the <strong>Connect</strong> button.
                </div>
              </li>
              <li className="discord-access-step">
                <span className="discord-access-step-num" aria-hidden="true">5</span>
                <div className="discord-access-step-body">
                  <strong>Enter the email or phone number</strong> you use to log in to Discord and your password, then click <strong>Login</strong>.
                </div>
              </li>
              <li className="discord-access-step">
                <span className="discord-access-step-num" aria-hidden="true">6</span>
                <div className="discord-access-step-body">
                  <strong>Click the Authorize button.</strong> You’ve successfully linked Discord to Patreon. You may need to refresh the page.
                </div>
              </li>
            </ol>
            <div className="discord-access-cta-inline">
              <a href="https://www.patreon.com/settings/apps" target="_blank" rel="noopener noreferrer" className="discord-access-btn discord-access-btn-primary">
                Open Patreon Connected Apps
              </a>
            </div>
          </section>

          <section id="popup-tip" className="discord-access-section discord-access-callout">
            <div className="discord-access-callout-icon" aria-hidden="true">💡</div>
            <h3 className="discord-access-callout-title">I’m not getting the pop-up window to log in to Discord</h3>
            <p className="discord-access-p">
              This typically happens if an ad blocker or browser extension is blocking pop-up windows. Please disable these extensions while connecting Discord to Patreon.
            </p>
          </section>

          <section id="join-leave" className="discord-access-section">
            <h2 className="discord-access-h2">Joining and leaving the creator’s Discord server</h2>
            <p className="discord-access-p">
              Once you’ve connected your Discord and Patreon accounts, any servers you’re eligible to join will appear on the <strong>Discord Apps</strong> settings page on Patreon. Click the <strong>Join server</strong> button to get your role.
            </p>
            <p className="discord-access-p">
              If at any point you’d like to leave the creator’s server, you can click the <strong>Leave server</strong> button to be removed. You can always re-join the server from your Discord app settings later on.
            </p>
          </section>

          <section id="faq" className="discord-access-section">
            <h2 className="discord-access-h2">FAQ</h2>
            <div className="discord-access-faq">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className={`discord-access-faq-item ${openFaq === index ? "discord-access-faq-item-open" : ""}`}
                >
                  <button
                    type="button"
                    className="discord-access-faq-q"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-q-${index}`}
                  >
                    <span>{item.q}</span>
                    <span className="discord-access-faq-chevron" aria-hidden="true" />
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    className="discord-access-faq-a"
                    role="region"
                    aria-labelledby={`faq-q-${index}`}
                  >
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="discord-access-cta-box" aria-label="Need help?">
            <h3 className="discord-access-cta-title">Still need help?</h3>
            <p className="discord-access-cta-desc">
              Reach out on Discord or by email and we’ll get you sorted.
            </p>
            <div className="discord-access-cta-buttons">
              <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="discord-access-btn discord-access-btn-primary">
                Join our Discord
              </a>
              <a href="mailto:contact@6ureleaks.com" className="discord-access-btn discord-access-btn-ghost">
                Email us
              </a>
            </div>
          </section>
        </article>

        <p className="discord-access-back">
          <Link href="/requests">← Back to requests</Link>
        </p>
      </div>
    </main>
  );
}
