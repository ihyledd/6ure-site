"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <title>Something went wrong · 6ure</title>
        <link rel="icon" type="image/x-icon" href="https://images.6ureleaks.com/logos/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 24,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#0a0a0b",
          color: "#fff",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          backgroundImage:
            "radial-gradient(ellipse 120% 80% at 20% 20%, rgba(88, 101, 242, 0.12) 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 80% 80%, rgba(88, 101, 242, 0.06) 0%, transparent 50%)",
        }}
      >
        {/* Floating orb */}
        <div
          style={{
            position: "fixed",
            top: "-10%",
            left: "10%",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(88, 101, 242, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: "-5%",
            right: "5%",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(114, 137, 218, 0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
            background: "rgba(26, 26, 29, 0.45)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 24,
            padding: "56px 36px 48px",
            boxShadow: "0 12px 48px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: 24 }}>
            <img
              src="https://images.6ureleaks.com/logos/Untitled10.png"
              alt="6ure"
              width={64}
              height={64}
              style={{
                objectFit: "contain",
                filter:
                  "drop-shadow(0 0 20px rgba(88, 101, 242, 0.3)) drop-shadow(0 4px 12px rgba(88, 101, 242, 0.4))",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "3.5rem",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              marginBottom: 8,
              background: "linear-gradient(135deg, #fff 10%, #f0b232 60%, #ffd700 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Oops
          </div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              marginBottom: 12,
              letterSpacing: "-0.02em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#b9bbbe",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            We may be updating or something unexpected happened. Please try again in a moment.
          </p>
          <div style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setShowDetails((d) => !d)}
              style={{
                background: "none",
                border: "none",
                color: "#72767d",
                fontSize: "0.82rem",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "inherit",
              }}
            >
              {showDetails ? "Hide" : "Show"} technical details
            </button>
            {showDetails && (
              <pre
                style={{
                  marginTop: 10,
                  padding: 14,
                  background: "rgba(0,0,0,0.35)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "0.78rem",
                  color: "#b9bbbe",
                  textAlign: "left",
                  overflow: "auto",
                  maxHeight: 200,
                  fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                }}
              >
                {error.message}
                {error.digest ? `\n(digest: ${error.digest})` : ""}
              </pre>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg, #5865f2 0%, #7289da 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(88, 101, 242, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                background: "rgba(255, 255, 255, 0.06)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: "0.95rem",
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
            >
              Back to 6ure
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
