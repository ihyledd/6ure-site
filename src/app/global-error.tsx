"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(true);
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
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
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            background: "rgba(26, 26, 29, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "48px 32px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              fontWeight: 800,
              lineHeight: 1,
              color: "#f0b232",
              letterSpacing: "-0.04em",
              marginBottom: 16,
              textShadow: "0 0 40px rgba(240, 178, 50, 0.25)",
            }}
          >
            Oops
          </div>
          <h1
            style={{
              fontSize: "1.35rem",
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
              fontSize: "0.95rem",
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            We may be updating or something went wrong on our end. Please try again in a moment.
          </p>
          <div style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setShowDetails((d) => !d)}
              style={{
                background: "none",
                border: "none",
                color: "#8b8d90",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {showDetails ? "Hide" : "Show"} technical details
            </button>
            {showDetails && (
              <pre
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  color: "#b9bbbe",
                  textAlign: "left",
                  overflow: "auto",
                  maxHeight: 200,
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
                background: "#5865f2",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "14px 28px",
                background: "#5865f2",
                color: "#fff",
                borderRadius: 12,
                fontSize: "1rem",
                fontWeight: 600,
                textDecoration: "none",
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
