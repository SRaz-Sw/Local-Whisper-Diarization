"use client";

import WhisperDiarization from "./components/WhisperDiarization";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Router } from "./router/Router";

// Feature flag: Toggle between old and new router
// Set to false to use old WhisperDiarization component
// Set to true to use new view-based router
const USE_NEW_ROUTER = true;

export default function WebTranscriptionPage() {
  return (
    <ErrorBoundary>
      {USE_NEW_ROUTER ? <Router /> : <WhisperDiarization />}
    </ErrorBoundary>
  );
}
