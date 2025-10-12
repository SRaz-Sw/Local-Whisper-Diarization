"use client";

import { motion } from "framer-motion";
import { Mic, Sparkles, Globe, Zap } from "lucide-react";
import { AVAILABLE_MODELS } from "../config/modelConfig";

interface IntroSectionProps {
  modelSize: number;
  currentModel: string;
}

export function IntroSection({
  modelSize,
  currentModel,
}: IntroSectionProps) {
  const modelConfig = AVAILABLE_MODELS[currentModel];
  const modelName = modelConfig ? modelConfig.name : "Whisper Base";

  const features = [
    {
      icon: Mic,
      title: "Voice Recognition",
      description: "Powered by OpenAI's Whisper",
    },
    {
      icon: Sparkles,
      title: "Speaker Detection",
      description: "Identify different speakers",
    },
    {
      icon: Globe,
      title: "100+ Languages",
      description: "Multilingual support",
    },
    {
      icon: Zap,
      title: "Fast & Private",
      description: "Runs entirely in your browser",
    },
  ];

  return (
    <div className="bg-card relative overflow-hidden rounded-2xl border p-4 shadow-lg sm:p-6 lg:p-8">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <motion.div
          className="absolute -top-[20%] -left-[20%] h-[140%] w-[140%] opacity-30"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 50%, hsl(var(--chart-2)) 0%, transparent 50%)",
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -right-[20%] -bottom-[20%] h-[140%] w-[140%] opacity-20"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, hsl(var(--chart-3)) 0%, transparent 50%), radial-gradient(circle at 70% 50%, hsl(var(--chart-4)) 0%, transparent 50%)",
          }}
          animate={{
            rotate: [360, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-3 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-background/50 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm backdrop-blur-sm"
          >
            <Sparkles className="text-primary h-4 w-4" />
            <span className="font-medium">AI-Powered Transcription</span>
          </motion.div>

          <h2 className="from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            Transform Speech into Text
          </h2>

          <p className="text-muted-foreground mx-auto max-w-2xl px-4 text-sm leading-relaxed sm:px-0 sm:text-base">
            Download powerful AI models (
            <a
              href={`https://huggingface.co/${currentModel}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary font-medium underline underline-offset-4 transition-colors"
            >
              {modelName}
            </a>{" "}
            and{" "}
            <a
              href="https://huggingface.co/onnx-community/pyannote-segmentation-3.0"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary font-medium underline underline-offset-4 transition-colors"
            >
              Pyannote
            </a>
            ) to transcribe audio with word-level timestamps and speaker
            identification. Models are cached locally ({modelSize}MB + 6MB)
            and work completely offline after initial download.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="group bg-background/50 hover:border-primary/50 relative overflow-hidden rounded-xl border p-3 backdrop-blur-sm transition-all hover:shadow-lg sm:p-4"
            >
              <div className="space-y-2">
                <div className="bg-primary/10 text-primary group-hover:bg-primary/20 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tech stack badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-1.5 pt-2 sm:gap-2"
        >
          <span className="text-muted-foreground text-xs sm:text-sm">
            Powered by
          </span>
          <a
            href="https://huggingface.co/docs/transformers.js"
            target="_blank"
            rel="noreferrer"
            className="bg-background/80 hover:bg-background inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all hover:shadow-sm"
          >
            🤗 Transformers.js
          </a>
          <span className="bg-muted-foreground/30 h-1 w-1 rounded-full" />
          <span className="bg-background/80 rounded-md px-2.5 py-1 text-xs font-medium">
            ONNX Runtime
          </span>
          <span className="bg-muted-foreground/30 h-1 w-1 rounded-full" />
          <span className="bg-background/80 rounded-md px-2.5 py-1 text-xs font-medium">
            WebGPU
          </span>
        </motion.div>

        {/* Privacy note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>100% private • No data leaves your device</span>
        </motion.div>
      </div>
    </div>
  );
}
