"use client";

import WhisperDiarization from "./components/WhisperDiarization";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function WebTranscriptionPage() {
  return (
    <ErrorBoundary>
      <WhisperDiarization />
    </ErrorBoundary>
  );
}
