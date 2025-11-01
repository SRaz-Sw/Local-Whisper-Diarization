"use client";

/**
 * API Settings Modal
 *
 * Configuration UI for API sync and audio compression settings.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Cloud,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { settings } from "@/lib/localStorage/collections";
import type { AppSettings } from "@/lib/localStorage/schemas";
import { backgroundSyncService } from "../services/ApiSyncService";

interface ApiSettingsModalProps {
  disabled?: boolean;
}

export function ApiSettingsModal({ disabled }: ApiSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Form state
  const [apiEnabled, setApiEnabled] = useState(false);
  const [compressAudio, setCompressAudio] = useState(true);

  // Load current settings on mount for indicator display
  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const appSettings = await settings.get("app");

      if (appSettings) {
        setApiEnabled(appSettings.apiEnabled ?? false);
        setCompressAudio(appSettings.compressAudio ?? true);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Get existing settings or create new
      const existingSettings = await settings.get("app");
      const updatedSettings: AppSettings = {
        ...(existingSettings || {
          theme: "system" as const,
          defaultLanguage: "en",
          autoSave: false,
          keepAudioFiles: true,
        }),
        apiEnabled,
        compressAudio,
      };

      await settings.set("app", updatedSettings);

      toast.success("Settings saved successfully", {
        description: apiEnabled
          ? "API sync is now enabled"
          : "Settings updated",
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const response = await fetch(
        "http://localhost:3010/api/transcripts/health",
        {
          method: "GET",
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok") {
          setTestResult({
            success: true,
            message: "Connection successful!",
          });
          toast.success("Connection test passed");
        } else {
          setTestResult({
            success: false,
            message: "Connection failed",
          });
          toast.error("Connection test failed");
        }
      } else {
        setTestResult({
          success: false,
          message: `Connection failed: ${response.status}`,
        });
        toast.error("Connection test failed");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      setTestResult({
        success: false,
        message: `Connection failed: ${message}`,
      });
      toast.error("Connection test failed", {
        description: message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const queueSize = backgroundSyncService.getQueueSize();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="relative"
        >
          <Settings className="h-5 w-5" />
          {apiEnabled && (
            <span className="bg-primary absolute top-1 right-1 h-2 w-2 rounded-full" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">API Settings</DialogTitle>
          <DialogDescription>
            Configure API sync for automatic transcript processing and
            audio compression settings.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Audio Compression Setting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compress-audio" className="text-base">
                    Audio Compression
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Compress audio to smaller MP3 files before saving
                  </p>
                </div>
                <Switch
                  id="compress-audio"
                  checked={compressAudio}
                  onCheckedChange={setCompressAudio}
                />
              </div>
            </div>

            <div className="border-t pt-4" />

            {/* API Sync Enable */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="api-enabled" className="text-base">
                    Enable API Sync
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Automatically sync transcripts to external API
                  </p>
                </div>
                <Switch
                  id="api-enabled"
                  checked={apiEnabled}
                  onCheckedChange={setApiEnabled}
                />
              </div>
            </div>

            {/* Test Connection Button (shown when enabled) */}
            {apiEnabled && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Cloud className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  {/* Test Result */}
                  {testResult && (
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-green-600 dark:text-green-400">
                            {testResult.message}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="text-destructive h-5 w-5" />
                          <span className="text-destructive text-sm">
                            {testResult.message}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
              <AlertCircle className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">How API Sync Works</p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1">
                  <li>
                    Transcripts are sent to API server (localhost:3010)
                  </li>
                  <li>Sync happens in the background (non-blocking)</li>
                  <li>Failed syncs are automatically retried</li>
                  <li>Compressed audio is included in the sync payload</li>
                  <li>Authentication via x-access-token header</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
