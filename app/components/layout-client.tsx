"use client";

import * as React from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatusBanner } from "@/components/network-status-banner";

/**
 * Client-side wrapper that adds error boundary and network status banner.
 * Placed inside RootLayout to provide global coverage.
 */
export function LayoutClient({ children }: { children: React.ReactNode }) {
  const [key, setKey] = React.useState(0);

  return (
    <ErrorBoundary key={key}>
      <div className="relative">
        <NetworkStatusBanner />
        {children}
      </div>
    </ErrorBoundary>
  );
}