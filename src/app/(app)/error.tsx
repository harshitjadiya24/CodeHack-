"use client";

import { ErrorView } from "@/components/error-view";

// Inside the app shell, so the header and navigation stay usable.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} inApp />;
}
