"use client";

import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
  type DragEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileAudio, FileVideo } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  WhisperMediaInputRef,
  WhisperMediaInputProps,
} from "../types";

type FileStatus = "idle" | "dragging" | "processing" | "loaded" | "error";

interface FileError {
  message: string;
  code: string;
}

const EXAMPLE_URL =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/hopper.webm";

const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

const UploadIllustration = () => (
  <div className="relative h-16 w-16">
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-label="Upload illustration"
    >
      <title>Select Media File</title>
      <circle
        cx="50"
        cy="50"
        r="45"
        className="stroke-gray-200 dark:stroke-gray-700"
        strokeWidth="2"
        strokeDasharray="4 4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur="60s"
          repeatCount="indefinite"
        />
      </circle>

      <path
        d="M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        className="fill-blue-100 stroke-blue-500 dark:fill-blue-900/30 dark:stroke-blue-400"
        strokeWidth="2"
      >
        <animate
          attributeName="d"
          dur="2s"
          repeatCount="indefinite"
          values="
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z;
            M30 38H70C75 38 75 43 75 43V68C75 73 70 73 70 73H30C25 73 25 68 25 68V43C25 38 30 38 30 38Z;
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        />
      </path>

      <g className="translate-y-2 transform">
        <line
          x1="50"
          y1="45"
          x2="50"
          y2="60"
          className="stroke-blue-500 dark:stroke-blue-400"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animate
            attributeName="y2"
            values="60;55;60"
            dur="2s"
            repeatCount="indefinite"
          />
        </line>
        <polyline
          points="42,52 50,45 58,52"
          className="stroke-blue-500 dark:stroke-blue-400"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <animate
            attributeName="points"
            values="42,52 50,45 58,52;42,47 50,40 58,47;42,52 50,45 58,52"
            dur="2s"
            repeatCount="indefinite"
          />
        </polyline>
      </g>
    </svg>
  </div>
);

const MediaFileUpload = forwardRef<
  WhisperMediaInputRef,
  WhisperMediaInputProps
>(
  (
    { onInputChange, onTimeUpdate, onFileNameChange, className, ...props },
    ref,
  ) => {
    const [status, setStatus] = useState<FileStatus>("idle");
    const [error, setError] = useState<FileError | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [mediaType, setMediaType] = useState<"audio" | "video" | null>(
      null,
    );
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioElement = useRef<HTMLAudioElement>(null);
    const videoElement = useRef<HTMLVideoElement>(null);
    const currentTimeRef = useRef(0);
    const requestRef = useRef<number>(0);

    useImperativeHandle(
      ref,
      () => ({
        setMediaTime(time: number) {
          if (audioElement.current?.src) {
            audioElement.current.currentTime = time;
          } else if (videoElement.current?.src) {
            videoElement.current.currentTime = time;
          }
          currentTimeRef.current = time;
        },
        reset() {
          if (mediaUrl) {
            URL.revokeObjectURL(mediaUrl);
          }
          setFile(null);
          setStatus("idle");
          setError(null);
          setMediaType(null);
          setMediaUrl(null);
          setPlaybackSpeed(1);
        },
        loadFromBlob(blob: Blob, fileName: string) {
          setError(null);
          setStatus("processing");

          // Create a File object from the blob for consistency
          const file = new File([blob], fileName, { type: blob.type });
          setFile(file);

          // Notify parent component of the file name
          if (onFileNameChange) {
            onFileNameChange(fileName);
          }

          // Convert blob to ArrayBuffer and process
          blob
            .arrayBuffer()
            .then((arrayBuffer) => {
              onBufferLoad(arrayBuffer, blob.type);
            })
            .catch((error) => {
              console.error("Failed to load blob:", error);
              setError({
                message: "Failed to load audio file",
                code: "BLOB_LOAD_ERROR",
              });
              setStatus("error");
            });
        },
        getFile(): File | null {
          return file;
        },
      }),
      [mediaUrl, onFileNameChange, file],
    );

    const updateTime = useCallback(() => {
      let elem: HTMLAudioElement | HTMLVideoElement | null = null;
      if (audioElement.current?.src) {
        elem = audioElement.current;
      } else if (videoElement.current?.src) {
        elem = videoElement.current;
      }

      if (elem && currentTimeRef.current !== elem.currentTime) {
        currentTimeRef.current = elem.currentTime;
        onTimeUpdate(elem.currentTime);
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

    const processFile = async (buffer: ArrayBuffer) => {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16_000 });

      try {
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        let audio: Float32Array;
        if (audioBuffer.numberOfChannels === 2) {
          const SCALING_FACTOR = Math.sqrt(2);
          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.getChannelData(1);
          audio = new Float32Array(left.length);
          for (let i = 0; i < audioBuffer.length; ++i) {
            audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
          }
        } else {
          audio = audioBuffer.getChannelData(0);
        }
        onInputChange(audio);
        setStatus("loaded");
      } catch (e) {
        setError({
          message: "Failed to process audio file",
          code: "PROCESSING_ERROR",
        });
        setStatus("error");
      }
    };

    const onBufferLoad = (arrayBuffer: ArrayBuffer, type: string) => {
      const blob = new Blob([arrayBuffer.slice(0)], { type: type });
      const url = URL.createObjectURL(blob);
      processFile(arrayBuffer);

      setMediaUrl(url);
      if (type.startsWith("audio/")) {
        setMediaType("audio");
      } else if (type.startsWith("video/")) {
        setMediaType("video");
      }
    };

    const readFile = (selectedFile: File | null | undefined) => {
      if (!selectedFile) return;

      setError(null);
      setFile(selectedFile);
      setStatus("processing");

      // Notify parent component of the file name
      if (onFileNameChange) {
        onFileNameChange(selectedFile.name);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && e.target.result instanceof ArrayBuffer) {
          onBufferLoad(e.target.result, selectedFile.type);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    };

    const handleFileSelect = useCallback((selectedFile: File | null) => {
      if (!selectedFile) return;

      if (
        !selectedFile.type.startsWith("audio/") &&
        !selectedFile.type.startsWith("video/")
      ) {
        setError({
          message: "Please select an audio or video file",
          code: "INVALID_FILE_TYPE",
        });
        setStatus("error");
        return;
      }

      readFile(selectedFile);
    }, []);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setStatus((prev) => (prev === "idle" ? "dragging" : prev));
    }, []);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setStatus((prev) => (prev === "dragging" ? "idle" : prev));
    }, []);

    const handleDrop = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setStatus("idle");
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) handleFileSelect(droppedFile);
      },
      [handleFileSelect],
    );

    const handleFileInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        handleFileSelect(selectedFile || null);
        if (e.target) e.target.value = "";
      },
      [handleFileSelect],
    );

    const triggerFileInput = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const resetState = useCallback(() => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
      setFile(null);
      setStatus("idle");
      setError(null);
      setMediaType(null);
      setMediaUrl(null);
      setPlaybackSpeed(1);
    }, [mediaUrl]);

    const changePlaybackSpeed = useCallback((speed: number) => {
      setPlaybackSpeed(speed);
      if (audioElement.current) {
        audioElement.current.playbackRate = speed;
      }
      if (videoElement.current) {
        videoElement.current.playbackRate = speed;
      }
    }, []);

    const loadExample = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setStatus("processing");
      try {
        const buffer = await fetch(EXAMPLE_URL).then((r) =>
          r.arrayBuffer(),
        );
        const fileName = "example.webm";
        setFile(new File([buffer], fileName, { type: "video/webm" }));

        // Notify parent component of the file name
        if (onFileNameChange) {
          onFileNameChange(fileName);
        }

        onBufferLoad(buffer, "video/webm");
      } catch (err) {
        setError({
          message: "Failed to load example",
          code: "EXAMPLE_ERROR",
        });
        setStatus("error");
      }
    };

    const hasMedia = file !== null && status === "loaded";

    return (
      <div
        className={cn("relative mx-auto w-full", className)}
        role="complementary"
        aria-label="Media file upload"
      >
        <div className="group relative w-full rounded-xl bg-white p-0.5 ring-1 ring-gray-200 dark:bg-black dark:ring-white/10">
          <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

          <div className="bg-foreground/20 relative w-full rounded-[10px] p-1.5">
            <div
              className={cn(
                "relative mx-auto w-full overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-white/[0.08] dark:bg-black/50",
                error ? "border-red-500/50" : "",
              )}
            >
              {/* Drag overlay */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-10 transition-opacity duration-300",
                  status === "dragging" ? "opacity-100" : "opacity-0",
                )}
              >
                <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-blue-500/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-blue-500/10 to-transparent" />
                <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-blue-500/10 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-blue-500/10 to-transparent" />
                <div className="absolute inset-[20%] animate-pulse rounded-lg bg-blue-500/5 transition-all duration-300" />
              </div>

              <div className={cn(!hasMedia && "min-h-[240px]")}>
                <AnimatePresence mode="wait">
                  {!hasMedia &&
                  (status === "idle" || status === "dragging") ? (
                    <motion.div
                      key="dropzone"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: status === "dragging" ? 0.8 : 1,
                        y: 0,
                        scale: status === "dragging" ? 0.98 : 1,
                      }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center p-6"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="mb-4">
                        <UploadIllustration />
                      </div>

                      <div className="mb-4 space-y-1.5 text-center">
                        <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                          Drag and drop or
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Audio or video files supported
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="group mb-3 flex w-4/5 items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-all duration-200 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                      >
                        <span>Upload File</span>
                        <UploadCloud className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      </button>

                      <button
                        type="button"
                        onClick={loadExample}
                        className="text-xs text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        or{" "}
                        <span className="underline">try an example</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        onChange={handleFileInputChange}
                        accept="audio/*,video/*"
                        aria-label="File input"
                      />
                    </motion.div>
                  ) : status === "processing" ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center p-6"
                    >
                      <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Processing media...
                      </p>
                    </motion.div>
                  ) : hasMedia ? (
                    <motion.div
                      key="loaded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative"
                    >
                      {/* File info header */}
                      {file && (
                        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                          {file.type.startsWith("audio/") ? (
                            <FileAudio className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileVideo className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      )}

                      {/* Audio player */}
                      <audio
                        ref={audioElement}
                        controls
                        src={mediaUrl || undefined}
                        className={cn(
                          "w-full",
                          mediaType === "audio" ? "block" : "hidden",
                        )}
                      />

                      {/* Video player */}
                      <video
                        ref={videoElement}
                        controls
                        src={mediaUrl || undefined}
                        className={cn(
                          "max-h-[500px] w-full",
                          mediaType === "video" ? "block" : "hidden",
                        )}
                      />

                      {/* Playback speed controls */}
                      <div className="flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Speed:
                        </span>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => changePlaybackSpeed(speed)}
                            className={cn(
                              "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                              playbackSpeed === speed
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
                            )}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 transform rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2"
                  >
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {error.message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MediaFileUpload.displayName = "MediaFileUpload";

export default MediaFileUpload;
