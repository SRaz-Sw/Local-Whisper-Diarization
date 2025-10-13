/// <reference types="@webgpu/types" />

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import WhisperProgress from "./WhisperProgress";
import MediaFileUpload from "./MediaFileUpload";
import WhisperTranscript from "./WhisperTranscript";
import WhisperLanguageSelector from "./WhisperLanguageSelector";
import { StreamingTranscript } from "./StreamingTranscript";
import { IntroSection } from "./IntroSection";
import { ThemeToggle } from "./ThemeToggle";
import { ModelSelector } from "./ModelSelector";
import { DEFAULT_MODEL, getModelSize } from "../config/modelConfig";
import { remapSpeakerLabels } from "../utils/transcriptFormatter";
import type {
  TranscriptionStatus,
  ProgressItem,
  TranscriptionResult,
  DeviceType,
  WhisperMediaInputRef,
} from "../types";

async function hasWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function WhisperDiarization() {
  // Create a reference to the worker object.
  const worker = useRef<Worker | null>(null);

  // Model loading and progress
  const [status, setStatus] = useState<TranscriptionStatus>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const mediaInputRef = useRef<WhisperMediaInputRef>(null);
  const [audio, setAudio] = useState<Float32Array | null>(null);
  const [language, setLanguage] = useState("en");

  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [streamingWords, setStreamingWords] = useState<
    Array<{ text: string; timestamp: number }>
  >([]);
  const [time, setTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processedSeconds, setProcessedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    number | null
  >(null);

  const [device, setDevice] = useState<DeviceType>("webgpu"); // Try use WebGPU first
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [modelSize, setModelSize] = useState(77); // Default to WASM size, will update after WebGPU check

  useEffect(() => {
    hasWebGPU().then((b) => {
      const detectedDevice = b ? "webgpu" : "wasm";
      setDevice(detectedDevice);
      setModelSize(getModelSize(model, detectedDevice));
    });
  }, []);

  // Update model size when model changes
  useEffect(() => {
    setModelSize(getModelSize(model, device));
  }, [model, device]);

  // We use the `useEffect` hook to setup the worker as soon as the `WhisperDiarization` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      try {
        // In production (Electron), use the bundled worker from /workers
        // In development, use the source worker
        const isDev = process.env.NODE_ENV === "development";

        if (isDev) {
          worker.current = new Worker(
            new URL(
              "../workers/whisperDiarization.worker.js",
              import.meta.url,
            ),
            {
              type: "module",
            },
          );
        } else {
          // Production: use bundled worker (not a module)
          // publicPath is set to "auto" so webpack will figure out the correct path
          worker.current = new Worker(
            "/workers/whisperDiarization.worker.js",
          );
        }
        console.log("✅ Worker created successfully");
      } catch (error) {
        console.error("❌ Failed to create worker:", error);
        alert(
          `Failed to initialize worker: ${error?.message || "Unknown error"}. Check console for details.`,
        );
        return;
      }
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent) => {
      console.log("📨 Worker message received:", e.data);

      switch (e.data.status) {
        case "loading":
          // Model file start load: add a new progress item to the list.
          setStatus("loading");
          setLoadingMessage(e.data.data || "Loading models...");
          console.log("🔄 Loading started:", e.data.data);
          break;

        case "initiate":
          console.log("🆕 Initiating download:", e.data.file);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            }),
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          console.log("✅ Download complete:", e.data.file);
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file),
          );
          break;

        case "loaded":
          // Pipeline ready: the worker is ready to accept messages.
          console.log("✅ Models loaded and ready");
          setStatus("ready");
          setProgressItems([]);
          break;

        case "update":
          // Processing status update
          console.log("🔄 Update:", e.data.data);
          setProcessingMessage(e.data.data);
          break;

        case "transcribing":
          // Streaming transcription words from WhisperTextStreamer
          console.log("📝 Transcribing text received:", e.data.data);
          console.log("📝 Current status:", status);
          // Accumulate words with timestamps
          if (e.data.data?.text) {
            setStreamingWords((prev) => [
              ...prev,
              {
                text: e.data.data.text,
                timestamp: e.data.data.timestamp,
              },
            ]);
          }
          break;

        case "chunk_start":
          console.log("🎬 Chunk started:", e.data.data);
          break;

        case "chunk_end":
          console.log("🎬 Chunk ended:", e.data.data);
          break;

        case "processing_progress":
          console.log("📊 Processing progress:", e.data);
          setProcessedSeconds(e.data.processedSeconds || 0);
          setTotalSeconds(e.data.totalSeconds || 0);
          setEstimatedTimeRemaining(e.data.estimatedTimeRemaining || null);
          break;

        case "complete":
          console.log("✅ Transcription complete");
          // Remap speaker labels to start from SPEAKER_1
          const remappedResult = {
            ...e.data.result,
            segments: remapSpeakerLabels(e.data.result.segments),
          };
          setResult(remappedResult);
          setStreamingWords([]); // Clear streaming words
          setTime(e.data.time);
          setStatus("ready");
          setProcessingMessage("");
          setProcessedSeconds(0);
          setTotalSeconds(0);
          setEstimatedTimeRemaining(null);
          break;

        case "backup_check":
          console.log("💾 Backup check result:", e.data.hasBackup);
          if (e.data.hasBackup && e.data.backup) {
            const backup = e.data.backup;
            const backupDate = new Date(backup.timestamp).toLocaleString();
            const shouldResume = confirm(
              `Found a backup from ${backupDate}.\n` +
                `Progress: ${Math.round((backup.processedSeconds / backup.totalSeconds) * 100)}% ` +
                `(${formatTime(backup.processedSeconds)} / ${formatTime(backup.totalSeconds)})\n\n` +
                `Would you like to resume from this backup?`,
            );
            if (shouldResume) {
              // Resume from backup - restore state
              setAudio(backup.audio);
              setLanguage(backup.language);
              alert(
                "Backup loaded. Click 'Run model' to continue transcription.\n" +
                  "Note: The model will restart from the beginning, but this is the full audio file.",
              );
            } else {
              // Clear backup
              worker.current?.postMessage({ type: "clear_backup" });
            }
          }
          break;

        case "backup_cleared":
          console.log("🗑️ Backup cleared");
          break;

        case "error":
          console.error("❌ Worker error:", e.data.error);
          alert(`Error: ${e.data.error}`);
          setStatus(null);
          setProgressItems([]);
          setProcessingMessage("");
          setProcessedSeconds(0);
          setTotalSeconds(0);
          setEstimatedTimeRemaining(null);
          break;

        default:
          console.log("⚠️ Unknown status:", e.data.status, e.data);
      }
    };

    // Worker error handler
    const onError = (error: ErrorEvent) => {
      console.error("❌ Worker error:", error);
      alert(`Worker error: ${error.message}`);
      setStatus(null);
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);
    worker.current.addEventListener("error", onError);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current?.removeEventListener("message", onMessageReceived);
      worker.current?.removeEventListener("error", onError);
    };
  }, []);

  const handleClick = useCallback(() => {
    setResult(null);
    setStreamingWords([]);
    setTime(null);
    setProcessingMessage("");
    setProcessedSeconds(0);
    setTotalSeconds(0);
    setEstimatedTimeRemaining(null);
    if (status === null) {
      console.log(
        "🚀 Loading models with device:",
        device,
        "model:",
        model,
      );
      setStatus("loading");
      setLoadingMessage("Initializing...");
      worker.current?.postMessage({
        type: "load",
        data: { device, model },
      });
    } else {
      console.log("🎤 Running transcription...");
      setStatus("running");
      setProcessingMessage("Starting transcription...");
      worker.current?.postMessage({
        type: "run",
        data: { audio, language },
      });
    }
  }, [status, audio, language, device, model]);

  // Check for backup on mount (after model is loaded)
  useEffect(() => {
    if (status === "ready" && !audio) {
      worker.current?.postMessage({ type: "check_backup" });
    }
  }, [status, audio]);

  const handleModelChange = useCallback(
    (newModel: string) => {
      console.log("🔄 Model changed to:", newModel);
      setModel(newModel);

      // If model is already loaded, we need to reload
      if (status !== null) {
        setStatus(null);
        setResult(null);
        setStreamingWords([]);
        setTime(null);
        setProcessingMessage("");
        alert(
          "Model changed. Please click 'Load model' to load the new model before transcribing.",
        );
      }
    },
    [status],
  );

  const handleReset = useCallback(() => {
    // Reset media component
    mediaInputRef.current?.reset();
    // Reset all states
    setAudio(null);
    setResult(null);
    setStreamingWords([]);
    setTime(null);
    setProcessingMessage("");
    setCurrentTime(0);
    setProcessedSeconds(0);
    setTotalSeconds(0);
    setEstimatedTimeRemaining(null);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, hsl(var(--chart-2) / 0.15) 0%, transparent 50%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, hsl(var(--chart-3) / 0.1) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(var(--chart-4) / 0.1) 0%, transparent 50%)",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <div className="w-[90%] max-w-[500px] space-y-4">
              <p className="mb-3 text-center text-lg font-semibold text-white">
                {loadingMessage || "Loading models..."}
              </p>
              {progressItems.length > 0 ? (
                progressItems.map(({ file, progress, total }, i) => (
                  <WhisperProgress
                    key={i}
                    text={file}
                    percentage={progress}
                    total={total}
                  />
                ))
              ) : (
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                  <p className="mt-3 text-sm text-gray-300">
                    Initializing worker and downloading models...
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    This may take a few moments on first load
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="my-auto space-y-8">
          {/* Theme toggle button - fixed position */}
          <div className="fixed top-4 right-4 z-50 sm:top-6 sm:right-6">
            <ThemeToggle />
          </div>

          {/* Modern header with gradient */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <motion.h1
              className="from-foreground via-foreground/90 to-foreground/70 mb-4 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Whisper Diarization
            </motion.h1>
            <motion.p
              className="text-muted-foreground max-w-2xl px-4 text-base sm:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              In-browser automatic speech recognition with word-level
              timestamps and speaker segmentation
            </motion.p>
          </motion.div>

          <Card className="border-muted/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex min-h-[220px] w-full flex-col items-center justify-center space-y-6">
                <div className="w-full">
                  <MediaFileUpload
                    ref={mediaInputRef}
                    onInputChange={(audio) => {
                      setResult(null);
                      setAudio(audio);
                    }}
                    onTimeUpdate={(time) => setCurrentTime(time)}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative flex w-full flex-col items-center justify-center gap-4"
                >
                  {/* Main action buttons */}
                  <div className="flex flex-wrap justify-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleClick}
                        disabled={
                          status === "running" ||
                          (status !== null && audio === null)
                        }
                        size="lg"
                        className="shadow-lg transition-shadow hover:shadow-xl"
                      >
                        {status === null
                          ? "Load model"
                          : status === "running"
                            ? "Running..."
                            : "Run model"}
                      </Button>
                    </motion.div>

                    {audio && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={handleReset}
                          disabled={status === "running"}
                          size="lg"
                          variant="outline"
                          className="shadow-lg transition-shadow hover:shadow-xl"
                        >
                          Reset
                        </Button>
                      </motion.div>
                    )}

                    {/* Model selector - show always */}
                    <ModelSelector
                      currentModel={model}
                      device={device}
                      disabled={status === "running"}
                      onModelChange={handleModelChange}
                    />
                  </div>

                  {/* Language selector - show when model is loaded */}
                  {status !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center space-y-1"
                    >
                      <span className="text-muted-foreground text-xs">
                        Language:
                      </span>
                      <WhisperLanguageSelector
                        className="w-[120px]"
                        language={language}
                        setLanguage={setLanguage}
                      />
                    </motion.div>
                  )}
                </motion.div>

                {/* Show processing message and progress when running */}
                {status === "running" && (
                  <div className="w-full space-y-3">
                    {processingMessage && (
                      <div className="text-center">
                        <p className="text-muted-foreground animate-pulse text-sm">
                          {processingMessage}
                        </p>
                      </div>
                    )}
                    {totalSeconds > 0 && (
                      <div className="w-full">
                        <WhisperProgress
                          text={`Processing audio: ${formatTime(processedSeconds)} / ${formatTime(totalSeconds)}`}
                          percentage={
                            (processedSeconds / totalSeconds) * 100
                          }
                          total={totalSeconds}
                          estimatedTimeRemaining={estimatedTimeRemaining}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Show streaming transcription with new component */}
                <StreamingTranscript
                  words={streamingWords}
                  isActive={status === "running"}
                />

                {/* Show final result with speaker diarization */}
                {result && time && (
                  <div className="w-full space-y-2">
                    <Card>
                      <WhisperTranscript
                        className="p-4"
                        transcript={result.transcript}
                        segments={result.segments}
                        currentTime={currentTime}
                        setCurrentTime={(time) => {
                          setCurrentTime(time);
                          mediaInputRef.current?.setMediaTime(time);
                        }}
                      />
                    </Card>
                    <p className="text-muted-foreground text-end text-xs">
                      Generation time:{" "}
                      <span className="font-semibold">
                        {time.toFixed(2)}ms
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-center text-xs sm:text-sm"
          >
            <span className="bg-background/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm sm:px-3">
              <svg
                className="h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Models cached locally
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="bg-background/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm sm:px-3">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
              Works offline
            </span>
          </motion.div>
        </div>
        {/* Intro section - show only when no audio is loaded */}
        {!audio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="- mt-100 mb-8">
              <IntroSection modelSize={modelSize} currentModel={model} />
            </div>{" "}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default WhisperDiarization;
