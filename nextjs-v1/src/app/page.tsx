"use client";

import { Router } from "./web-transc/router/Router";
import { ErrorBoundary } from "./web-transc/components/ErrorBoundary";

export default function RootPage() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}
