"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function SvgIcon({ d, extra }: { d: string; extra?: React.ReactNode }) {
  return (
    <svg className="dashboard-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
      {extra}
    </svg>
  );
}

const NAV: NavGroup[] = [
  {
    label: "Wiki",
    items: [
      { href: "/dashboard", label: "Pages", icon: <SvgIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" extra={<polyline points="14 2 14 8 20 8" />} /> },
      { href: "/dashboard/categories", label: "Categories", icon: <SvgIcon d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /> },
      { href: "/dashboard/settings", label: "Settings", icon: <SvgIcon d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" extra={<circle cx="12" cy="12" r="3" />} /> },
      { href: "/dashboard/updates", label: "Updates", icon: <SvgIcon d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /> },
      { href: "/dashboard/messages", label: "Messages", icon: <SvgIcon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" extra={<polyline points="22,6 12,13 2,6" />} /> },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/dashboard/theme", label: "Theme", icon: <SvgIcon d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /> },
      { href: "/dashboard/content", label: "Site Content", icon: <SvgIcon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" extra={<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />} /> },
      { href: "/dashboard/staff", label: "Staff", icon: <SvgIcon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" extra={<><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} /> },
      { href: "/dashboard/users", label: "Users", icon: <SvgIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" extra={<><circle cx="9" cy="7" r="4" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} /> },
      { href: "/dashboard/forms", label: "Forms", icon: <SvgIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" extra={<><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} /> },
      { href: "/dashboard/applications", label: "Applications", icon: <SvgIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" extra={<><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} /> },
      { href: "/dashboard/export-requests", label: "Export Requests", icon: <SvgIcon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" extra={<><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} /> },
    ],
  },
  {
    label: "Requests",
    items: [
      { href: "/dashboard/requests", label: "Request queue", icon: <SvgIcon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
      { href: "/dashboard/requests/faqs", label: "FAQs", icon: <SvgIcon d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" /> },
      { href: "/dashboard/requests/announcements", label: "Announcements", icon: <SvgIcon d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M5.436 13.683A4.001 4.001 0 0 1 7 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 0 1-1.564-.317z" /> },
      { href: "/dashboard/requests/promo-popup", label: "Promo popup", icon: <SvgIcon d="M4 6h16M4 12h16M4 18h7" /> },
      { href: "/dashboard/requests/protection", label: "Protection", icon: <SvgIcon d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" /> },
      { href: "/dashboard/requests/settings", label: "Requests settings", icon: <SvgIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.065 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" extra={<circle cx="12" cy="12" r="3" />} /> },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/dashboard/subscriptions", label: "Subscriptions", icon: <SvgIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
      { href: "/dashboard/subscriptions/analytics", label: "Analytics", icon: <SvgIcon d="M3 3v18h18" extra={<path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />} /> },
      { href: "/dashboard/subscriptions/promo-codes", label: "Promo Codes", icon: <SvgIcon d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" extra={<line x1="7" y1="7" x2="7.01" y2="7" />} /> },
    ],
  },
  {
    label: "Promotions",
    items: [
      { href: "/dashboard/promotions", label: "Overview", icon: <SvgIcon d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" extra={<path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />} /> },
      { href: "/dashboard/promotions/campaigns", label: "Campaigns", icon: <SvgIcon d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /> },
      { href: "/dashboard/promotions/links", label: "Download Links", icon: <SvgIcon d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /> },
      { href: "/dashboard/promotions/analytics", label: "Ad Analytics", icon: <SvgIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/pages");
  if (href === "/dashboard/requests") return pathname === "/dashboard/requests";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <div className="dashboard-sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          </svg>
        </div>
        <h1 className="dashboard-sidebar-title">Dashboard</h1>
        <p className="dashboard-sidebar-subtitle">Edit site content</p>
      </div>
      {pathname?.startsWith("/dashboard/requests") && (
        <Link
          href="/dashboard"
          className="dashboard-nav-item dashboard-nav-back-link"
        >
          <svg className="dashboard-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>Main dashboard</span>
          <svg className="dashboard-nav-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      )}
      <nav className="dashboard-nav">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="dashboard-nav-group-label">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`dashboard-nav-item${isActive(pathname, item.href) ? " active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="dashboard-nav-badge">{item.badge}</span>
                )}
                <svg className="dashboard-nav-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
