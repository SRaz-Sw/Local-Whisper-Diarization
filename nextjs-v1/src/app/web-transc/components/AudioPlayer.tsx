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
}

export interface AudioPlayerRef {
  setTime: (time: number) => void;
  getCurrentTime: () => number;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ src, onTimeUpdate, className, transcriptId }, ref) => {
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
      <div className={cn("w-full", className)}>
        <div className="flex flex-row items-center justify-center gap-2">
          <div className="ms-4 flex items-center gap-2 truncate">
            {mediaType === "audio" && (
              <Music className="text-primary h-4 w-4" />
            )}
            {mediaType === "video" && (
              <Video className="h-4 w-4 text-purple-500" />
            )}
            <span className="truncate">{filename}</span>
          </div>
          <div className="text-muted-foreground ms-auto me-4 text-xs">
            {fileSize}
          </div>
        </div>
        {/* Audio player */}
        <audio
          ref={audioElement}
          controls
          src={mediaUrl}
          onPlay={handlePlay}
          className={cn(
            "w-full",
            mediaType === "audio" ? "block" : "hidden",
          )}
        />

        {/* Video player */}
        <video
          ref={videoElement}
          controls
          src={mediaUrl}
          onPlay={handlePlay}
          className={cn(
            "max-h-[500px] w-full",
            mediaType === "video" ? "block" : "hidden",
          )}
        />

        {/* Playback speed controls */}
        <div className="dark:border-background/10 dark:bg-background/[0.02] border-accent bg-muted-foreground/5 flex items-center justify-center gap-2 border-t p-3">
          <span className="text-foreground/70 dark:text-foreground/40 text-xs font-medium">
            Speed:
          </span>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => changePlaybackSpeed(speed)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                playbackSpeed === speed
                  ? "bg-primary text-background shadow-sm"
                  : "bg-background dark:bg-background/5 dark:hover:bg-background/10 text-secondary-foreground hover:bg-accent dark:text-gray-300",
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
