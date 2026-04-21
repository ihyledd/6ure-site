import Link from "next/link";
import Image from "next/image";

import { getSiteSetting } from "@/lib/site-settings";
import { FooterContactTrigger } from "@/components/FooterContactTrigger";

const LOGO_SRC = "https://images.6ureleaks.com/logos/Untitled10.png";

export async function Footer() {
  const discordUrl = await getSiteSetting("discord_url");

  return (
    <footer className="ure-footer">
      <div className="ure-footer-content">
        <div className="ure-footer-brand">
          <Image src={LOGO_SRC} alt="6ure" className="ure-footer-logo" width={60} height={60} unoptimized />
          <div className="ure-footer-brand-text">
            <h3>6ure</h3>
            <p>Your premium community for the latest content and support.</p>
          </div>
        </div>
        <div className="ure-footer-links">
          <div className="ure-footer-column">
            <h4>Sites</h4>
            <Link href="/requests">Requests</Link>
            <Link href="/requests/protected">Protected</Link>
            <Link href="/wiki">Wiki</Link>
            <Link href="/password">Password</Link>
            <Link href="/verify">Verify</Link>
            <Link href="/membership">Membership</Link>
            <Link href="/requests/account">Account</Link>
          </div>
          <div className="ure-footer-column">
            <h4>Community</h4>
            {discordUrl && (
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                Discord
              </a>
            )}
            <Link href="/">About</Link>
          </div>
          <div className="ure-footer-column">
            <h4>Legal</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/dmca">DMCA & Copyright</Link>
          </div>
          <div className="ure-footer-column">
            <h4>Contact</h4>
            <FooterContactTrigger />
            <a href="mailto:contact@6ureleaks.com">Email</a>
          </div>
        </div>
      </div>
      <div className="ure-footer-bottom">
        <p className="ure-footer-copyright">
          &copy; 2026 6ure. All rights reserved.
        </p>
        <p className="ure-footer-made-with">Made with ❤️ by ihyledd</p>
      </div>
    </footer>
  );
}
