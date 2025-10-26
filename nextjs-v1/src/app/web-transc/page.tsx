"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect from legacy /web-transc route to root with upload view
 * This maintains backward compatibility for old bookmarks and links
 */
export default function WebTranscRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to root with upload view
    router.replace("/#upload");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting to app...</p>
    </div>
  );
}
