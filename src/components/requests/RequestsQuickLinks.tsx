"use client";

import { useState } from "react";
import Link from "next/link";
import { BiIcon } from "./BiIcon";

const LINKS = [
  { href: "/requests/faq", icon: "question-circle", label: "FAQ" },
  { href: "/requests/your-requests", icon: "person-lines-fill", label: "Your requests" },
  { href: "/membership", icon: "gem", label: "Membership" },
  { href: "/requests/account", icon: "person-circle", label: "Account" },
  { href: "/requests/protected", icon: "shield-lock", label: "Protected" },
] as const;

export function RequestsQuickLinksSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`requests-quick-links-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="requests-quick-links-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand quick links" : "Collapse quick links"}
      >
        <BiIcon name={collapsed ? "chevron-left" : "chevron-right"} size={14} />
      </button>
      <nav className="requests-quick-links-nav">
        {LINKS.map(({ href, icon, label }) => (
          <Link key={href} href={href} className="requests-quick-links-link">
            <BiIcon name={icon} size={16} />
            <span className="requests-quick-links-label">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function RequestsQuickLinksFooter() {
  return (
    <nav className="requests-footer-nav">
      {LINKS.map(({ href, icon, label }) => (
        <Link key={href} href={href}>
          <BiIcon name={icon} size={16} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
