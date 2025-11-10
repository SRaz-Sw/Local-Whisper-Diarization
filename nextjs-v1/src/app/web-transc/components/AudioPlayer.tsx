"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatFileSize } from "../utils/templateStorage";
import { Music, Video, RefreshCw } from "lucide-react";
import { useGlobalPlayerStore } from "../store/useGlobalPlayerStore";
import { compressAudio } from "@/features/audioCompressor";
import { blobStorage } from "@/lib/localStorage/storage";
import { transcripts } from "@/lib/localStorage/collections";
import { toast } from "sonner";

export interface AudioPlayerProps {
  src: File | Blob | string | null;
  onTimeUpdate?: (time: number) => void;
  className?: string;
  transcriptId?: string; // Optional: For global player coordination
  onEditConversation?: () => void; // Optional: Edit conversation name
  onEditSpeakers?: () => void; // Optional: Edit speaker names
  audioFileId?: string; // Optional: ID of audio file in storage for compression
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
      audioFileId,
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
    const [isCompressing, setIsCompressing] = useState<boolean>(false);

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

    // Handler for compression/sync
    const handleCompress = useCallback(async () => {
      if (!transcriptId || !audioFileId) {
        toast.error("Cannot compress: missing transcript or audio ID");
        return;
      }

      if (isCompressing) {
        return; // Already compressing
      }

      try {
        setIsCompressing(true);
        toast.info("Starting compression...", {
          id: `compress-${transcriptId}`,
        });

        // Get the transcript
        const transcript = await transcripts.get(transcriptId);
        if (!transcript) {
          throw new Error("Transcript not found");
        }

        // Check if already compressed
        if (transcript.compressedAudioFileId) {
          toast.info("Audio already compressed!", {
            id: `compress-${transcriptId}`,
          });
          setIsCompressing(false);
          return;
        }

        // Get the audio blob
        const audioBlob = await blobStorage.get(audioFileId);
        if (!audioBlob) {
          throw new Error("Audio file not found in storage");
        }

        console.log(
          `🗜️ Starting compression for transcript ${transcriptId}`,
        );

        // Compress the audio
        const compressedBlob = await compressAudio(audioBlob, {
          bitrate: 24,
          sampleRate: 16000,
          channels: 1,
          codec: "opus",
          onProgress: (progress) => {
            toast.info(`Compressing: ${Math.round(progress.percent)}%`, {
              id: `compress-${transcriptId}`,
            });
          },
        });

        // Save compressed audio
        const compressedAudioFileId = `audio-compressed-${transcriptId}`;
        await blobStorage.save(compressedAudioFileId, compressedBlob);

        // Update transcript with compressed audio ID
        transcript.compressedAudioFileId = compressedAudioFileId;
        await transcripts.set(transcriptId, transcript);

        // Calculate compression ratio
        const ratio = (compressedBlob.size / audioBlob.size) * 100;

        toast.success(
          `Compressed to ${Math.round(ratio)}% of original size!`,
          { id: `compress-${transcriptId}` },
        );

        console.log(
          `✅ Compression complete: ${audioBlob.size} → ${compressedBlob.size} bytes (${ratio.toFixed(1)}%)`,
        );
      } catch (error) {
        console.error("❌ Compression failed:", error);
        toast.error(
          `Compression failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { id: `compress-${transcriptId}` },
        );
      } finally {
        setIsCompressing(false);
      }
    }, [transcriptId, audioFileId, isCompressing]);

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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80",
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-row items-center justify-between gap-2 px-4 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2.5 truncate">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {mediaType === "audio" && (
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-1.5">
                  <Music className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              {mediaType === "video" && (
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 p-1.5">
                  <Video className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </motion.div>
            <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {filename}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit buttons - only show if callbacks provided */}
            {(onEditConversation || onEditSpeakers) && (
              <div className="flex gap-1">
                {onEditConversation && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onEditConversation}
                    className="flex-shrink-0 rounded-lg bg-gray-100 p-1.5 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
                  </motion.button>
                )}
                {onEditSpeakers && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onEditSpeakers}
                    className="flex-shrink-0 rounded-lg bg-gray-100 p-1.5 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
                  </motion.button>
                )}
              </div>
            )}

            {/* Compress/Sync button - only show if transcriptId and audioFileId are provided */}
            {transcriptId && audioFileId && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCompress}
                disabled={isCompressing}
                className={cn(
                  "flex-shrink-0 rounded-lg p-1.5 transition-colors",
                  isCompressing
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
                title={
                  isCompressing
                    ? "Compressing..."
                    : "Compress & backup audio"
                }
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    isCompressing && "animate-spin",
                  )}
                />
              </motion.button>
            )}

            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {fileSize}
            </div>
          </div>
        </motion.div>
        {/* Audio player */}
        <motion.audio
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          ref={audioElement}
          controls
          src={mediaUrl}
          onPlay={handlePlay}
          className={cn(
            "w-full bg-transparent px-2",
            mediaType === "audio" ? "block" : "hidden",
          )}
          style={{ height: "48px", outline: "none" }}
        />

        {/* Video player */}
        <motion.video
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          ref={videoElement}
          controls
          src={mediaUrl}
          onPlay={handlePlay}
          className={cn(
            "mx-2 my-1 max-h-[500px] w-full rounded-lg bg-black/5 dark:bg-white/5",
            mediaType === "video" ? "block" : "hidden",
          )}
        />

        {/* Playback speed controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-1.5 bg-gray-50/50 px-4 py-2.5 backdrop-blur-sm dark:bg-gray-800/30"
        >
          <span className="mr-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
            Speed
          </span>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <motion.button
              key={speed}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => changePlaybackSpeed(speed)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                playbackSpeed === speed
                  ? "bg-primary text-primary-foreground ring-primary/20 shadow-md ring-1"
                  : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {speed}×
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    );
  },
);

AudioPlayer.displayName = "AudioPlayer";
