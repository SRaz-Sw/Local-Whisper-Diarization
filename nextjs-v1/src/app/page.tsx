"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Download,
  Globe,
  Mic,
  Users,
  Zap,
  Shield,
  Sparkles,
  ChevronRight,
} from "lucide-react";

type Platform = "mac-arm" | "mac-intel" | "windows" | "linux" | "unknown";

export default function LandingPage() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("mac")) {
      // Detect Apple Silicon vs Intel
      // Modern way to detect Apple Silicon
      const isAppleSilicon =
        (navigator as any).userAgentData?.platform === "macOS" ||
        (userAgent.includes("mac") && "ontouchstart" in window);

      setPlatform(isAppleSilicon ? "mac-arm" : "mac-intel");
    } else if (userAgent.includes("win")) {
      setPlatform("windows");
    } else if (userAgent.includes("linux")) {
      setPlatform("linux");
    } else {
      setPlatform("unknown");
    }
  }, []);

  const getDownloadInfo = () => {
    const baseUrl =
      "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v0.1.0";

    switch (platform) {
      case "mac-arm":
        return {
          url: `${baseUrl}/Whisper-Diarization-0.1.0-arm64.dmg`,
          label: "Download for macOS (Apple Silicon)",
          size: "~200MB",
        };
      case "mac-intel":
        return {
          url: `${baseUrl}/Whisper-Diarization-0.1.0-x64.dmg`,
          label: "Download for macOS (Intel)",
          size: "~210MB",
        };
      case "windows":
        return {
          url: `${baseUrl}/Whisper-Diarization-Setup-0.1.0.exe`,
          label: "Download for Windows",
          size: "~180MB",
        };
      case "linux":
        return {
          url: `${baseUrl}/Whisper-Diarization-0.1.0.AppImage`,
          label: "Download for Linux",
          size: "~190MB",
        };
      default:
        return {
          url: "#",
          label: "Download Desktop App",
          size: "",
        };
    }
  };

  const features = [
    {
      icon: Mic,
      title: "Accurate Transcription",
      description:
        "Powered by OpenAI's Whisper model for state-of-the-art speech recognition",
    },
    {
      icon: Users,
      title: "Speaker Diarization",
      description:
        "Automatically identifies and separates different speakers in your audio",
    },
    {
      icon: Globe,
      title: "100+ Languages",
      description:
        "Supports transcription in over 100 languages with automatic language detection",
    },
    {
      icon: Zap,
      title: "WebGPU Accelerated",
      description:
        "Leverages your GPU for blazing-fast transcription performance",
    },
    {
      icon: Shield,
      title: "Complete Privacy",
      description:
        "Works 100% offline - your audio never leaves your device",
    },
    {
      icon: Sparkles,
      title: "Export to LLMs",
      description:
        "Ready-to-use templates for ChatGPT, Claude, Gemini, and more",
    },
  ];

  const downloadInfo = getDownloadInfo();

  return (
    <div className="from-background to-muted min-h-screen bg-gradient-to-b">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="bg-primary/10 mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Mic className="text-primary h-10 w-10" />
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Whisper <span className="text-primary">Diarization</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
            Professional speech-to-text with speaker identification. Works
            completely offline with state-of-the-art AI models.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isClient && (
              <Button
                size="lg"
                className="group relative overflow-hidden px-8 py-6 text-lg"
                asChild
              >
                <a href={downloadInfo.url}>
                  <Download className="mr-2 h-5 w-5" />
                  {downloadInfo.label}
                  <span className="ml-2 text-sm opacity-70">
                    {downloadInfo.size}
                  </span>
                  <div className="from-primary/0 via-primary/50 to-primary/0 absolute inset-0 -z-10 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className="group px-8 py-6 text-lg"
              asChild
            >
              <Link href="/web-transc">
                <Globe className="mr-2 h-5 w-5" />
                Use Web Version
                <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Platform Links */}
          <div className="text-muted-foreground mt-6 text-sm">
            <p>
              Other platforms:{" "}
              <a
                href="https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View all downloads
              </a>
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Why Choose Whisper Diarization?
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group transition-all hover:shadow-lg"
              >
                <CardContent className="pt-6">
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors">
                    <feature.icon className="text-primary h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Comparison Section */}
        <div className="mt-24">
          <div className="bg-card mx-auto max-w-4xl rounded-2xl p-8 shadow-lg">
            <h2 className="mb-8 text-center text-3xl font-bold">
              Desktop App vs Web Version
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {/* Desktop App */}
              <div className="border-primary bg-primary/5 rounded-lg border-2 p-6">
                <div className="mb-4 flex items-center">
                  <Download className="text-primary mr-2 h-6 w-6" />
                  <h3 className="text-xl font-bold">Desktop App</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>
                      Best performance with direct hardware access
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Optimized memory management</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Native file system integration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Works completely offline</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Persistent model caching</span>
                  </li>
                </ul>
              </div>

              {/* Web Version */}
              <div className="bg-background rounded-lg border p-6">
                <div className="mb-4 flex items-center">
                  <Globe className="mr-2 h-6 w-6" />
                  <h3 className="text-xl font-bold">Web Version</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>No installation required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Works on any device with a browser</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Try it instantly</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Same privacy - runs locally</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-muted-foreground mr-2">○</span>
                    <span className="text-muted-foreground">
                      Limited by browser capabilities
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-16 text-center">
          <details className="bg-card mx-auto max-w-2xl rounded-lg border p-6">
            <summary className="cursor-pointer font-semibold">
              System Requirements
            </summary>
            <div className="mt-4 space-y-4 text-left text-sm">
              <div>
                <h4 className="font-medium">Operating Systems</h4>
                <ul className="text-muted-foreground mt-2 space-y-1">
                  <li>• macOS 10.13 or later (Intel & Apple Silicon)</li>
                  <li>• Windows 10 or later</li>
                  <li>• Ubuntu 18.04 or later (and most Linux distros)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Hardware</h4>
                <ul className="text-muted-foreground mt-2 space-y-1">
                  <li>• 4GB RAM minimum (8GB+ recommended)</li>
                  <li>• 500MB disk space for app + models</li>
                  <li>
                    • GPU with WebGPU support (optional but recommended)
                  </li>
                </ul>
              </div>
            </div>
          </details>
        </div>

        {/* Footer CTA */}
        <div className="mt-24 text-center">
          <h2 className="mb-4 text-2xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Choose your preferred way to use Whisper Diarization
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isClient && (
              <Button size="lg" className="px-8" asChild>
                <a href={downloadInfo.url}>
                  <Download className="mr-2 h-5 w-5" />
                  Download Desktop App
                </a>
              </Button>
            )}
            <Button size="lg" variant="outline" className="px-8" asChild>
              <Link href="/web-transc">
                <Globe className="mr-2 h-5 w-5" />
                Try Web Version
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-muted-foreground mt-24 border-t pt-8 text-center text-sm">
          <p>
            Built with{" "}
            <a
              href="https://github.com/openai/whisper"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAI Whisper
            </a>{" "}
            •{" "}
            <a
              href="https://huggingface.co/docs/transformers.js"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Transformers.js
            </a>{" "}
            • 100% Open Source
          </p>
        </footer>
      </div>
    </div>
  );
}
