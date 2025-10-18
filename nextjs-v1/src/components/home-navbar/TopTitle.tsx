"use client";

import { useRouterStore } from "@/app/web-transc/store/useRouterStore";
import { useTranscripts } from "@/app/web-transc/hooks/useTranscripts";

function TopTitle() {
  const currentView = useRouterStore((state) => state.currentView);
  const params = useRouterStore((state) => state.params);
  const { transcripts: savedTranscripts, loading: transcriptsLoading } =
    useTranscripts();

  const DEFAULT_TITLE = "תמלול עם הפרדת דוברים";

  // If we're viewing a transcript, find it and display its name
  if (currentView === "transcript" && params?.id) {
    if (transcriptsLoading) {
      return (
        <div>
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      );
    }

    const currentTranscript = savedTranscripts.find(
      (item) => item.id === params.id,
    );

    if (currentTranscript) {
      const title =
        currentTranscript.metadata.conversationName ||
        currentTranscript.metadata.fileName;

      return (
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
      );
    }
  }

  // Default title for all other views
  return (
    <div>
      <h1 className="text-2xl font-bold">{DEFAULT_TITLE}</h1>
    </div>
  );
}

export default TopTitle;
