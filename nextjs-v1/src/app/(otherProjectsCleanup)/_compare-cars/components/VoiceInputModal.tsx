import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Loader2,
  Mic,
  AlertCircle,
  X,
  Volume2,
  Globe,
  ChevronDown,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SiriOrb from "./siriOrbTs";

// TypeScript interfaces
interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (transcript: string) => void;
}

interface LanguageOption {
  value: string;
  label: string;
}

type PermissionState = "prompt" | "granted" | "denied";

// Voice Input Modal Component with Siri Orb
export default function VoiceInputModal({
  isOpen,
  onClose,
  onTranscriptReady,
}: VoiceInputModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [permissionState, setPermissionState] =
    useState<PermissionState>("prompt");
  const [selectedLanguage, setSelectedLanguage] = useState("auto");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalTranscriptRef = useRef("");

  // Comprehensive cleanup function
  const cleanup = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      analyserRef.current = null;
      microphoneRef.current = null;
      setIsListening(false);
      setAudioLevel(0);
      setIsInitializing(false);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isOpen) return;

    setTranscript("");
    finalTranscriptRef.current = "";
    setPermissionState("prompt");

    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome or Safari.",
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      // Set language based on selection
      const language =
        selectedLanguage === "auto"
          ? navigator.language || "en-US"
          : selectedLanguage;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (
        event: SpeechRecognitionEvent,
      ) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscriptRef.current += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscriptRef.current + interimTranscript);
      };

      recognitionRef.current.onerror = (
        event: SpeechRecognitionErrorEvent,
      ) => {
        console.error("Speech recognition error:", event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        setIsInitializing(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsInitializing(false);
      };
    } catch (error) {
      console.error("Failed to initialize speech recognition:", error);
      setError("Failed to initialize speech recognition.");
    }

    return cleanup;
  }, [isOpen, cleanup, selectedLanguage]);

  const startListening = async () => {
    if (isInitializing || isListening) return;

    try {
      setIsInitializing(true);
      setError("");
      setTranscript("");
      finalTranscriptRef.current = "";

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setPermissionState("granted");
      streamRef.current = stream;

      // Setup audio visualization
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!analyserRef.current || !isListening) return;

        try {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average of all frequencies
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          // Update audio level state
          setAudioLevel(Math.round(average));

          animationFrameRef.current =
            requestAnimationFrame(updateAudioLevel);
        } catch (error) {
          console.error("Audio level update error:", error);
        }
      };

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        updateAudioLevel();
      }
    } catch (err) {
      console.error("Microphone access error:", err);
      setError(
        "Microphone access denied. Please allow microphone access and try again.",
      );
      setPermissionState("denied");
      setIsListening(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } catch (error) {
      console.error("Stop listening error:", error);
    }
  }, [isListening]);

  const handleUseTranscript = () => {
    if (transcript.trim()) {
      onTranscriptReady(transcript.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    stopListening();
    cleanup();
    setTranscript("");
    finalTranscriptRef.current = "";
    setError("");
    setPermissionState("prompt");
    onClose();
  };

  const handleClearTranscript = () => {
    setTranscript("");
    finalTranscriptRef.current = "";
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  // Language options
  const languageOptions: LanguageOption[] = [
    { value: "auto", label: "Auto Detect" },
    { value: "en-US", label: "English (US)" },
    { value: "he-IL", label: "עברית (Hebrew)" },
    { value: "es-ES", label: "Español" },
    { value: "fr-FR", label: "Français" },
    { value: "de-DE", label: "Deutsch" },
    { value: "it-IT", label: "Italiano" },
    { value: "pt-PT", label: "Português" },
    { value: "ru-RU", label: "Русский" },
    { value: "zh-CN", label: "中文 (简体)" },
    { value: "ja-JP", label: "日本語" },
    { value: "ko-KR", label: "한국어" },
  ];

  const currentLanguage =
    languageOptions.find((lang) => lang.value === selectedLanguage) ||
    languageOptions[0];

  // Memoize orb colors to prevent unnecessary re-renders of SiriOrb
  const getOrbColors = useMemo(() => {
    if (isInitializing) {
      return {
        c1: "oklch(70% 0.1 200)", // Blue tones
        c2: "oklch(75% 0.08 220)",
        c3: "oklch(65% 0.12 240)",
      };
    }
    if (isListening) {
      return {
        c1: "oklch(75% 0.15 350)", // More vibrant when listening
        c2: "oklch(80% 0.12 10)", // Red-pink tones
        c3: "oklch(78% 0.14 30)",
      };
    }
    if (permissionState === "denied") {
      return {
        c1: "oklch(60% 0.1 0)", // Muted red
        c2: "oklch(65% 0.08 20)",
        c3: "oklch(55% 0.12 40)",
      };
    }
    return undefined; // Use default colors from SiriOrb component
  }, [isInitializing, isListening, permissionState]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={handleClose}
        onEscapeKeyDown={handleClose}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Waves className="text-primary/90 h-5 w-5" />
            Voice Input
          </DialogTitle>
          <DialogDescription>
            Speak naturally about the car you're interested in
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Language Selector */}
          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-foreground/90 flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4" />
                Language
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    {currentLanguage.label}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {languageOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSelectedLanguage(option.value)}
                      className={`text-sm ${
                        selectedLanguage === option.value
                          ? "bg-primary/10 text-primary font-medium"
                          : ""
                      }`}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Siri Orb */}
          <div className="relative">
            <div
              onClick={isListening ? stopListening : startListening}
              className={`cursor-pointer transition-all duration-300 ${
                isInitializing
                  ? "cursor-not-allowed opacity-75"
                  : "hover:scale-105"
              }`}
            >
              <SiriOrb
                size="120px"
                colors={getOrbColors}
                animationDuration={15}
                isListening={isListening}
                audioLevel={audioLevel}
              />
            </div>

            {/* Central Icon */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {isInitializing ? (
                <Loader2 className="text-info h-8 w-8 animate-spin" />
              ) : isListening ? (
                <div className="bg-destructive flex h-8 w-8 animate-pulse items-center justify-center rounded-full">
                  <div className="bg-background h-3 w-3 rounded-sm"></div>
                </div>
              ) : (
                <div className="bg-background/90 flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur-sm">
                  <Mic className="text-primary/90 h-5 w-5" />
                </div>
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="space-y-2 text-center">
            <p className="text-foreground text-lg font-medium">
              {isInitializing ? (
                "Initializing microphone..."
              ) : isListening ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="bg-destructive inline-block h-2 w-2 animate-pulse rounded-full"></span>
                  Listening...
                </span>
              ) : permissionState === "denied" ? (
                "Microphone access denied"
              ) : (
                "Tap to start speaking"
              )}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-destructive/20 bg-destructive/10 w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground/90 flex items-center gap-2 text-sm font-medium">
                  <Volume2 className="h-4 w-4" />
                  What you said:
                </Label>
                <div className="from-accent/10 to-primary/10 border-info/20 max-h-[120px] min-h-[80px] overflow-y-auto rounded-lg border bg-gradient-to-r p-4">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {transcript}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUseTranscript}
                  className="from-primary to-primary/90 hover:bg-primary/80 flex-1 bg-gradient-to-r text-white"
                  disabled={!transcript.trim()}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Use This Text
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearTranscript}
                  className="px-4"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Helpful Examples */}
          {!transcript && !isListening && !isInitializing && (
            <div className="w-full space-y-3">
              <Label className="text-foreground/90 text-sm font-medium">
                Try saying:
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "I'm looking at a Tesla Model Y 2024",
                  "Toyota Camry hybrid 2023",
                  "BMW X3 with financing options",
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onTranscriptReady(example);
                      handleClose();
                    }}
                    className="bg-secondary hover:bg-secondary border-border hover:border-accent rounded-lg border p-3 text-left text-sm transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Permission Help */}
          {permissionState === "denied" && (
            <div className="bg-warning/10 border-warning/20 w-full rounded-lg border p-4">
              <h4 className="text-warning-foreground mb-2 font-medium">
                Microphone Permission Required
              </h4>
              <p className="text-warning mb-3 text-sm">
                To use voice input, please allow microphone access in your
                browser settings.
              </p>
              <Button
                onClick={() => {
                  setPermissionState("prompt");
                  setError("");
                }}
                size="sm"
                variant="outline"
                className="border-warning/30 text-warning hover:bg-warning/20"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
