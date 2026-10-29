"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Replaces the root layout when it fails itself, so no fonts, theme or translations: plain and in both languages.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#18181a" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "15vh 16px" }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.15 }}>Baanto couldn’t load.</h1>
          <p style={{ fontSize: 18, color: "#55555a" }}>Nothing you did caused this. Try again in a minute.</p>
          <p lang="hi" style={{ fontSize: 18, color: "#55555a" }}>बाँटो लोड नहीं हो पाया। एक मिनट बाद फिर से कोशिश करें।</p>
          {error.digest && <p style={{ fontSize: 14, color: "#55555a" }}>Reference: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, minHeight: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#18181a", color: "#fff", fontSize: 16 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
