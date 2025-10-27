"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "../utils/templateStorage";
import { Music, Video } from "lucide-react";
import { useGlobalPlayerStore } from "../store/useGlobalPlayerStore";

export interface AudioPlayerProps {
  src: File | Blob | string | null;
  onTimeUpdate?: (time: number) => void;
  className?: string;
  transcriptId?: string; // Optional: For global player coordination
  onEditConversation?: () => void; // Optional: Edit conversation name
  onEditSpeakers?: () => void; // Optional: Edit speaker names
}

export interface AudioPlayerRef {
  setTime: (time: number) => void;
  getCurrentTime: () => number;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  (
    {
      src,
      onTimeUpdate,
      className,
      transcriptId,
      onEditConversation,
      onEditSpeakers,
    },
    ref,
  ) => {
    const [mediaType, setMediaType] = useState<"audio" | "video" | null>(
      null,
    );
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [filename, setFilename] = useState<string>("");
    const [fileSize, setFileSize] = useState<string>("");

    const audioElement = useRef<HTMLAudioElement>(null);
    const videoElement = useRef<HTMLVideoElement>(null);
    const currentTimeRef = useRef(0);
    const requestRef = useRef<number>(0);

    // Global player coordination (only if transcriptId is provided)
    const { activePlayerId, setActivePlayer } = useGlobalPlayerStore();

    // Auto-pause when another player starts (if transcriptId is provided)
    useEffect(() => {
      if (!transcriptId) return;

      if (activePlayerId && activePlayerId !== transcriptId) {
        if (audioElement.current && !audioElement.current.paused) {
          audioElement.current.pause();
        }
        if (videoElement.current && !videoElement.current.paused) {
          videoElement.current.pause();
        }
      }
    }, [activePlayerId, transcriptId]);

    // Handler for when this player starts playing
    const handlePlay = useCallback(() => {
      if (transcriptId) {
        setActivePlayer(transcriptId);
      }
    }, [transcriptId, setActivePlayer]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      setTime(time: number) {
        if (audioElement.current?.src) {
          audioElement.current.currentTime = time;
        } else if (videoElement.current?.src) {
          videoElement.current.currentTime = time;
        }
      },
      getCurrentTime() {
        if (audioElement.current?.src) {
          return audioElement.current.currentTime;
        } else if (videoElement.current?.src) {
          return videoElement.current.currentTime;
        }
        return 0;
      },
    }));

    // Create object URL from File/Blob
    useEffect(() => {
      if (!src) {
        setMediaUrl(null);
        setMediaType(null);
        setFilename("");
        setFileSize("");
        return;
      }

      if (typeof src === "string") {
        setMediaUrl(src);
        setFilename(src.split("/").pop() || "");
        setFileSize("");
        // Try to detect type from URL
        if (src.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
          setMediaType("audio");
        } else if (src.match(/\.(mp4|webm|mov|avi)$/i)) {
          setMediaType("video");
        }
        return;
      }

      // File or Blob
      const url = URL.createObjectURL(src);
      setMediaUrl(url);

      if (src instanceof File) {
        setFilename(src.name);
        setFileSize(formatFileSize(src.size));
        if (src.type.startsWith("audio/")) {
          setMediaType("audio");
        } else if (src.type.startsWith("video/")) {
          setMediaType("video");
        }
      } else {
        setFilename("");
        setFileSize("");
      }

      return () => {
        URL.revokeObjectURL(url);
      };
    }, [src]);

    // Time update loop
    const updateTime = useCallback(() => {
      let elem: HTMLAudioElement | HTMLVideoElement | null = null;

      if (audioElement.current?.src) {
        elem = audioElement.current;
      } else if (videoElement.current?.src) {
        elem = videoElement.current;
      }

      if (elem && currentTimeRef.current !== elem.currentTime) {
        currentTimeRef.current = elem.currentTime;
        onTimeUpdate?.(elem.currentTime);
      }

      requestRef.current = requestAnimationFrame(updateTime);
    }, [onTimeUpdate]);

    useEffect(() => {
      requestRef.current = requestAnimationFrame(updateTime);
      return () => {
        if (requestRef.current !== undefined) {
          cancelAnimationFrame(requestRef.current);
        }
      };
    }, [updateTime]);

    // Playback speed control
    const changePlaybackSpeed = useCallback((speed: number) => {
      setPlaybackSpeed(speed);
      if (audioElement.current) {
        audioElement.current.playbackRate = speed;
      }
      if (videoElement.current) {
        videoElement.current.playbackRate = speed;
      }
    }, []);

    if (!mediaUrl) {
      return null;
    }

    return (
      <div
        className={cn(
          "bg-muted/30 border-border w-full overflow-hidden rounded-lg border shadow-sm",
          className,
        )}
      >
        <div className="border-border/40 flex flex-row items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 truncate">
            {mediaType === "audio" && (
              <Music className="text-primary h-4 w-4" />
            )}
            {mediaType === "video" && (
              <Video className="h-4 w-4 text-purple-500" />
            )}
            <span className="truncate">{filename}</span>
          </div>
          <div className="ms-auto me-4 flex items-center gap-2">
            {/* Edit buttons - only show if callbacks provided */}
            {(onEditConversation || onEditSpeakers) && (
              <div className="flex gap-1">
                {onEditConversation && (
                  <button
                    onClick={onEditConversation}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 rounded p-1 transition-colors"
                    title="Edit conversation name"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                )}
                {onEditSpeakers && (
                  <button
                    onClick={onEditSpeakers}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 rounded p-1 transition-colors"
                    title="Edit speaker names"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <div className="text-muted-foreground text-xs">{fileSize}</div>
          </div>
        </div>
        {/* Audio player */}
        <audio
          ref={audioElement}
          controls
          src={mediaUrl}
          onPlay={handlePlay}
          className={cn(
            "w-full bg-transparent",
            mediaType === "audio" ? "block" : "hidden",
          )}
          style={{ height: "40px", outline: "none" }}
        />

        {/* Video player */}
        <video
          ref={videoElement}
          controls
          src={mediaUrl}
          onPlay={handlePlay}
          className={cn(
            "max-h-[500px] w-full bg-transparent",
            mediaType === "video" ? "block" : "hidden",
          )}
        />

        {/* Playback speed controls */}
        <div className="border-border/40 flex items-center justify-center gap-1.5 border-t px-3 py-1.5">
          <span className="text-muted-foreground text-[11px] font-medium">
            Speed:
          </span>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => changePlaybackSpeed(speed)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-all hover:scale-105",
                playbackSpeed === speed
                  ? "bg-primary text-primary-foreground ring-primary/20 shadow-md ring-1"
                  : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    );
  },
);

AudioPlayer.displayName = "AudioPlayer";
