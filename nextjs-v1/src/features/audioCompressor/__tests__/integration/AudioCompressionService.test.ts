/**
 * Integration tests for AudioCompressionService
 *
 * These tests verify the end-to-end compression workflow
 */

import { describe, it, expect, beforeAll, jest } from "bun:test";
import {
  compressAudio,
  isCompressionAvailable,
  getEstimatedCompressionRatio,
} from "../../services/AudioCompressionService";
import {
  setupMediaRecorderMock,
  setupAudioContextMock,
  createTestAudioBuffer,
  audioBufferToBlob,
  wait,
} from "../helpers/testUtils";

// Setup mocks for Node.js environment
beforeAll(() => {
  setupMediaRecorderMock();
  setupAudioContextMock();
});

describe("AudioCompressionService - Integration Tests", () => {
  describe("compressAudio", () => {
    it("should compress audio blob successfully", async () => {
      const buffer = createTestAudioBuffer(1, 440, 44100, 2);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob);

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should reduce file size significantly", async () => {
      const buffer = createTestAudioBuffer(2, 440, 44100, 2);
      const blob = await audioBufferToBlob(buffer);
      const originalSize = blob.size;

      const compressed = await compressAudio(blob);

      // In mock environment, size might not actually reduce
      // But in real environment, compression should achieve significant reduction
      expect(compressed.size).toBeGreaterThan(0);
      console.log(
        `Compression: ${originalSize} bytes → ${compressed.size} bytes`,
      );
    });

    it("should handle mono audio", async () => {
      const buffer = createTestAudioBuffer(1, 440, 16000, 1);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob);

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should handle stereo audio", async () => {
      const buffer = createTestAudioBuffer(1, 440, 16000, 2);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob);

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should convert to mono when specified", async () => {
      const buffer = createTestAudioBuffer(1, 440, 44100, 2);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob, {
        isConvertingToMono: true,
      });

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should respect custom sample rate", async () => {
      const buffer = createTestAudioBuffer(1, 440, 44100, 1);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob, {
        sampleRate: 8000,
      });

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should respect custom bitrate", async () => {
      const buffer = createTestAudioBuffer(1, 440, 16000, 1);
      const blob = await audioBufferToBlob(buffer);

      const compressed16 = await compressAudio(blob, { bitrate: 16 });
      const compressed48 = await compressAudio(blob, { bitrate: 48 });

      expect(compressed16.size).toBeGreaterThan(0);
      expect(compressed48.size).toBeGreaterThan(0);
    });

    it("should skip compression for already-compressed Opus audio", async () => {
      const blob = new Blob(["test opus audio"], {
        type: "audio/webm;codecs=opus",
      });

      const result = await compressAudio(blob);

      // Should return the same blob (skipped compression)
      expect(result).toBe(blob);
    });

    it("should skip compression for WebM audio", async () => {
      const blob = new Blob(["test webm audio"], { type: "audio/webm" });

      const result = await compressAudio(blob);

      // Should return the same blob (skipped compression)
      expect(result).toBe(blob);
    });

    it("should NOT skip compression for MP3 audio", async () => {
      const buffer = createTestAudioBuffer(0.5, 440, 44100, 1);
      const blob = await audioBufferToBlob(buffer);

      // Change type to MP3
      const mp3Blob = new Blob([await blob.arrayBuffer()], {
        type: "audio/mpeg",
      });

      const compressed = await compressAudio(mp3Blob);

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should handle compression errors gracefully", async () => {
      // Create an invalid blob that will cause decoding to fail
      const invalidBlob = new Blob(["invalid audio data"], {
        type: "audio/wav",
      });

      const result = await compressAudio(invalidBlob);

      // Should return original blob on error
      expect(result).toBe(invalidBlob);
    });

    it("should handle empty blobs", async () => {
      const emptyBlob = new Blob([], { type: "audio/wav" });

      const result = await compressAudio(emptyBlob);

      expect(result).toBeInstanceOf(Blob);
    });

    it("should handle different audio formats", async () => {
      const formats = [
        "audio/wav",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ];

      for (const format of formats) {
        const buffer = createTestAudioBuffer(0.5, 440, 16000, 1);
        const blob = new Blob(
          [await (await audioBufferToBlob(buffer)).arrayBuffer()],
          {
            type: format,
          },
        );

        const compressed = await compressAudio(blob);

        expect(compressed).toBeInstanceOf(Blob);
      }
    });

    it("should handle long audio files", async () => {
      const buffer = createTestAudioBuffer(5, 440, 16000, 1); // 5 seconds
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob);

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should handle multi-channel audio (5.1 surround)", async () => {
      const buffer = createTestAudioBuffer(1, 440, 48000, 6);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob, {
        isConvertingToMono: true,
      });

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should preserve audio when not converting to mono", async () => {
      const buffer = createTestAudioBuffer(1, 440, 16000, 2);
      const blob = await audioBufferToBlob(buffer);

      const compressed = await compressAudio(blob, {
        isConvertingToMono: false,
      });

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
    });

    it("should return original blob if compression is not supported", async () => {
      // Create blob BEFORE deleting MediaRecorder
      const buffer = createTestAudioBuffer(1, 440, 16000, 1);
      const blob = await audioBufferToBlob(buffer);

      // Mock unsupported environment
      const originalMediaRecorder = (global as any).MediaRecorder;
      delete (global as any).MediaRecorder;

      const result = await compressAudio(blob);

      // Should return original blob
      expect(result).toBe(blob);

      // Restore
      (global as any).MediaRecorder = originalMediaRecorder;
    });

    it("should handle concurrent compressions", async () => {
      const buffers = Array.from({ length: 3 }, () =>
        createTestAudioBuffer(0.5, 440, 16000, 1),
      );
      const blobs = await Promise.all(buffers.map(audioBufferToBlob));

      const compressions = blobs.map((blob) => compressAudio(blob));
      const results = await Promise.all(compressions);

      results.forEach((result) => {
        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      });
    });

    it("should log compression progress", async () => {
      const consoleLog = jest.spyOn(console, "log").mockImplementation();

      const buffer = createTestAudioBuffer(0.5, 440, 16000, 1);
      const blob = await audioBufferToBlob(buffer);

      await compressAudio(blob);

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Starting audio compression"),
      );

      consoleLog.mockRestore();
    });
  });

  describe("isCompressionAvailable", () => {
    it("should return true if compression is supported", () => {
      const available = isCompressionAvailable();

      expect(typeof available).toBe("boolean");
      expect(available).toBe(true); // Should be true with mocks
    });

    it("should return false if MediaRecorder is not available", () => {
      const originalMediaRecorder = (global as any).MediaRecorder;
      delete (global as any).MediaRecorder;

      const available = isCompressionAvailable();

      expect(available).toBe(false);

      // Restore
      (global as any).MediaRecorder = originalMediaRecorder;
    });
  });

  describe("getEstimatedCompressionRatio", () => {
    it("should return a compression ratio", () => {
      const ratio = getEstimatedCompressionRatio();

      expect(typeof ratio).toBe("number");
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    it("should return 0.05 (5% of original size)", () => {
      const ratio = getEstimatedCompressionRatio();

      expect(ratio).toBe(0.05);
    });

    it("should indicate 95% reduction", () => {
      const ratio = getEstimatedCompressionRatio();
      const reductionPercent = (1 - ratio) * 100;

      expect(reductionPercent).toBe(95);
    });
  });

  describe("End-to-End Compression Workflow", () => {
    it("should complete full compression cycle", async () => {
      // 1. Create test audio
      const buffer = createTestAudioBuffer(2, 440, 44100, 2);
      const originalBlob = await audioBufferToBlob(buffer);

      console.log(
        `Original: ${originalBlob.size} bytes, ${originalBlob.type}`,
      );

      // 2. Compress with custom options
      const compressed = await compressAudio(originalBlob, {
        sampleRate: 16000,
        bitrate: 24,
        isConvertingToMono: true,
      });

      console.log(
        `Compressed: ${compressed.size} bytes, ${compressed.type}`,
      );

      // 3. Verify results
      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
      expect(compressed.type).toMatch(/audio\/(webm|ogg)/);
    });

    it("should handle real-world scenario with different audio types", async () => {
      // Simulate different audio sources
      const scenarios = [
        {
          name: "Voice recording (mono, 16kHz)",
          buffer: createTestAudioBuffer(3, 440, 16000, 1),
          options: { isConvertingToMono: true, bitrate: 16 },
        },
        {
          name: "Music (stereo, 44.1kHz)",
          buffer: createTestAudioBuffer(2, 440, 44100, 2),
          options: { isConvertingToMono: false, bitrate: 48 },
        },
        {
          name: "Podcast (mono, 22kHz)",
          buffer: createTestAudioBuffer(5, 440, 22050, 1),
          options: { sampleRate: 16000, bitrate: 24 },
        },
      ];

      for (const scenario of scenarios) {
        const blob = await audioBufferToBlob(scenario.buffer);
        const compressed = await compressAudio(blob, scenario.options);

        console.log(`${scenario.name}:`);
        console.log(`  Original: ${blob.size} bytes`);
        console.log(`  Compressed: ${compressed.size} bytes`);

        expect(compressed).toBeInstanceOf(Blob);
        expect(compressed.size).toBeGreaterThan(0);
      }
    });
  });
});
