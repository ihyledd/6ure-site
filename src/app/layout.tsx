import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";

import { Suspense } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SearchProvider } from "@/contexts/SearchContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingActions } from "@/components/FloatingActions";
import { DiscordLinkedHandler } from "@/components/DiscordLinkedHandler";
import { WhatsNewBanner } from "@/components/WhatsNewBanner";
import { SiteThemeSync } from "@/components/SiteThemeSync";
import { PromoPopupBanner } from "@/components/PromoPopupBanner";
import { AnnouncementBarGate } from "@/components/AnnouncementBarGate";
import { CookieNoticeBanner } from "@/components/CookieNoticeBanner";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://6ureleaks.com";
const OG_IMAGE = "https://images.6ureleaks.com/logos/Untitled10.png";

function resolveThemeFromCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): "dark" | "light" | null {
  const themeCookie = cookieStore.get("6ure-theme");
  if (themeCookie?.value === "light" || themeCookie?.value === "dark") {
    return themeCookie.value;
  }
  return null;
}

export const metadata: Metadata = {
  title: { default: "6ure", template: "%s - 6ure" },
  description: "Your premium community for the latest content and support.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "6ure",
    description: "Your premium community for the latest content and support.",
    url: SITE_URL,
    siteName: "6ure",
    images: [{ url: OG_IMAGE, width: 512, height: 512, alt: "6ure" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "6ure",
    description: "Your premium community for the latest content and support.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, session] = await Promise.all([cookies(), auth()]);
  const initialTheme = resolveThemeFromCookie(cookieStore);

  return (
    <html
      lang="en"
      className={inter.variable}
      data-theme={initialTheme ?? undefined}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var s=localStorage.getItem('settings-theme');
              var c=document.cookie.split('; ').find(function(r){return r.startsWith('6ure-theme=');});
              var t=s||(c?c.split('=')[1]:null)||localStorage.getItem('wiki-theme');
              if(t==='system')t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
              if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
              else document.documentElement.setAttribute('data-theme','dark');
            })();`,
          }}
        />
        <link
          rel="icon"
          href="https://images.6ureleaks.com/gen/6urelogo.png"
          type="image/png"
        />
      </head>
      <body className="ure-glow">
        <SiteThemeSync />
        <Suspense fallback={null}>
          <DiscordLinkedHandler />
        </Suspense>
        {session?.user && <WhatsNewBanner hasSession={true} />}
        <SessionProvider>
        <ThemeProvider>
          <SearchProvider>
            <div className="wiki-app">
              <Header />
              <div className="wiki-main-wrap">
                <div className="header-spacer" aria-hidden="true" />
                <AnnouncementBarGate />
                <main className="wiki-main">{children}</main>
                <PromoPopupBanner />
                <Footer />
              </div>
              <FloatingActions />
              <CookieNoticeBanner />
            </div>
          </SearchProvider>
        </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
