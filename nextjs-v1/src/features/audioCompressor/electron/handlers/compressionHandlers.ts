/**
 * Electron Compression Handlers
 *
 * IPC handlers for native FFmpeg compression in Electron main process
 */

import { ipcMain, IpcMainInvokeEvent } from "electron";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";
import { execSync } from "child_process";
import type {
  CompressionOptions,
  CompressionResult,
  CompressionError,
  CompressionProgress,
} from "../../core/types";

/**
 * Active compression processes (for cancellation)
 */
const activeProcesses = new Map<string, ffmpeg.FfmpegCommand>();

/**
 * Get FFmpeg path
 */
function getFFmpegPath(): string | null {
  // Try to use system FFmpeg first
  try {
    // Check if ffmpeg is in PATH
    execSync("ffmpeg -version", { stdio: "ignore" });
    return "ffmpeg"; // Use system FFmpeg
  } catch {
    // Try bundled FFmpeg (if available)
    if (process.resourcesPath) {
      const bundledPath = path.join(
        process.resourcesPath,
        "ffmpeg",
        process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
      );
      if (fs.existsSync(bundledPath)) {
        return bundledPath;
      }
    }
  }
  return null;
}

/**
 * Get MIME type for codec
 */
function getMimeTypeForCodec(codec: CompressionOptions["codec"]): string {
  switch (codec) {
    case "opus":
      return "audio/opus";
    case "mp3":
      return "audio/mpeg";
    case "aac":
      return "audio/aac";
    default:
      return "audio/opus";
  }
}

/**
 * Get FFmpeg codec name
 */
function getFFmpegCodec(codec: CompressionOptions["codec"]): string {
  switch (codec) {
    case "opus":
      return "libopus";
    case "mp3":
      return "libmp3lame";
    case "aac":
      return "aac";
    default:
      return "libopus";
  }
}

/**
 * Get file extension for codec
 */
function getFileExtension(codec: CompressionOptions["codec"]): string {
  switch (codec) {
    case "opus":
      return "opus";
    case "mp3":
      return "mp3";
    case "aac":
      return "m4a";
    default:
      return "opus";
  }
}

/**
 * Handle compression request
 */
async function handleCompressionRequest(
  event: IpcMainInvokeEvent,
  args: {
    audioData: Uint8Array;
    options: CompressionOptions;
    compressionId: string;
  },
): Promise<{
  bufferData: number[];
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  codec: string;
}> {
  const { audioData, options, compressionId } = args;
  const startTime = Date.now();

  // Set FFmpeg path if available
  const ffmpegPath = getFFmpegPath();
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  }

  // Create temporary files
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${compressionId}.tmp`);
  const outputPath = path.join(
    tempDir,
    `output-${compressionId}.${getFileExtension(options.codec)}`,
  );

  try {
    // Write input file
    fs.writeFileSync(inputPath, audioData);

    // Set up FFmpeg command
    const codec = getFFmpegCodec(options.codec || "opus");
    const bitrate = options.bitrate || 24;
    const sampleRate = options.sampleRate || 16000;
    const channels = options.channels || 1;

    return new Promise<{
      bufferData: number[];
      mimeType: string;
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
      duration: number;
      codec: string;
    }>((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .audioCodec(codec)
        .audioBitrate(`${bitrate}k`)
        .audioFrequency(sampleRate)
        .audioChannels(channels)
        .output(outputPath)
        .on("start", (commandLine) => {
          console.log("FFmpeg started:", commandLine);
        })
        .on("progress", (progress) => {
          // Send progress update to renderer
          const progressData: CompressionProgress = {
            percent: progress.percent || 0,
            currentTime: progress.timemark,
            estimatedTimeRemaining: progress.targetSize
              ? undefined
              : undefined, // FFmpeg doesn't provide this directly
          };

          event.sender.send("compression-progress", {
            compressionId,
            progress: progressData,
          });
        })
        .on("end", () => {
          try {
            // Read output file
            const outputData = fs.readFileSync(outputPath);
            const compressedSize = outputData.length;

            // Calculate result
            // Return buffer data - renderer will create blob
            const duration = Date.now() - startTime;
            const originalSize = audioData.length;
            const compressionRatio = compressedSize / originalSize;

            // Convert buffer to Uint8Array for IPC transfer
            const outputArray = new Uint8Array(outputData);

            // Return result with buffer data (will be converted to blob in renderer)
            const result = {
              bufferData: Array.from(outputArray), // Convert to regular array for IPC
              mimeType: getMimeTypeForCodec(options.codec || "opus"),
              originalSize,
              compressedSize,
              compressionRatio,
              duration,
              codec: codec,
            };

            // Clean up
            activeProcesses.delete(compressionId);
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);

            resolve(result);
          } catch (error) {
            activeProcesses.delete(compressionId);
            reject({
              code: "OUTPUT_READ_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to read output file",
              originalError: error instanceof Error ? error : undefined,
            });
          }
        })
        .on("error", (error) => {
          activeProcesses.delete(compressionId);
          reject({
            code: "FFMPEG_ERROR",
            message: error.message || "FFmpeg compression failed",
            originalError: error,
          });
        });

      // Store command for potential cancellation
      activeProcesses.set(compressionId, command);

      // Run FFmpeg
      command.run();
    });
  } catch (error) {
    // Clean up temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {
      // Ignore cleanup errors
    }

    throw {
      code: "SETUP_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to set up compression",
      originalError: error instanceof Error ? error : undefined,
    } as CompressionError;
  }
}

/**
 * Handle compression cancellation
 */
async function handleCancellationRequest(
  event: IpcMainInvokeEvent,
  args: { compressionId: string },
): Promise<boolean> {
  const { compressionId } = args;
  const command = activeProcesses.get(compressionId);

  if (command) {
    try {
      command.kill("SIGKILL");
      activeProcesses.delete(compressionId);
      return true;
    } catch (error) {
      console.error("Failed to cancel compression:", error);
      return false;
    }
  }

  return false;
}

/**
 * Register compression IPC handlers
 */
export function registerCompressionHandlers(): void {
  console.log("Registering compression IPC handlers...");

  ipcMain.handle("compress-audio", handleCompressionRequest);
  ipcMain.handle("cancel-compression", handleCancellationRequest);

  console.log("Compression IPC handlers registered");
}
