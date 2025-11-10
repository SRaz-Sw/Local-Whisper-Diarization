/**
 * Tests for audioFormatDetector utility
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  detectCompressionCapabilities,
  getBestSupportedFormat,
  isAlreadyCompressed,
  estimateBitrate,
  shouldSkipCompression,
  isCompressionAvailable,
} from "../../utils/audioFormatDetector";
import {
  setupMediaRecorderMock,
  setupAudioContextMock,
} from "../helpers/testUtils";

// Setup mocks for Node.js environment
beforeAll(() => {
  setupMediaRecorderMock();
  setupAudioContextMock();
});

describe("audioFormatDetector", () => {
  describe("detectCompressionCapabilities", () => {
    it("should detect browser capabilities", () => {
      const capabilities = detectCompressionCapabilities();

      expect(capabilities).toHaveProperty("isSupported");
      expect(capabilities).toHaveProperty("supportedFormats");
      expect(capabilities).toHaveProperty("bestFormat");
      expect(capabilities).toHaveProperty("hasWebAudio");
      expect(capabilities).toHaveProperty("hasMediaRecorder");
    });

    it("should return supported formats as an array", () => {
      const capabilities = detectCompressionCapabilities();

      expect(Array.isArray(capabilities.supportedFormats)).toBe(true);
    });

    it("should mark as supported if both Web Audio and MediaRecorder are available", () => {
      const capabilities = detectCompressionCapabilities();

      if (capabilities.hasWebAudio && capabilities.hasMediaRecorder) {
        expect(capabilities.isSupported).toBe(true);
      }
    });

    it("should provide best format if supported", () => {
      const capabilities = detectCompressionCapabilities();

      if (capabilities.isSupported) {
        expect(capabilities.bestFormat).toBeTruthy();
        expect(typeof capabilities.bestFormat).toBe("string");
      }
    });
  });

  describe("getBestSupportedFormat", () => {
    it("should return a MIME type string or null", () => {
      const format = getBestSupportedFormat();

      if (format !== null) {
        expect(typeof format).toBe("string");
        expect(format).toMatch(/audio\/(webm|ogg)/);
      }
    });

    it("should honor preferred format if available", () => {
      const format = getBestSupportedFormat("opus");

      if (format !== null) {
        expect(format).toContain("opus");
      }
    });

    it("should return null if compression is not supported", () => {
      // Mock unsupported environment
      const originalMediaRecorder = (global as any).MediaRecorder;
      delete (global as any).MediaRecorder;

      const format = getBestSupportedFormat();
      expect(format).toBeNull();

      // Restore
      (global as any).MediaRecorder = originalMediaRecorder;
    });
  });

  describe("isAlreadyCompressed", () => {
    it("should detect MP3 format", () => {
      expect(isAlreadyCompressed("audio/mpeg")).toBe(true);
      expect(isAlreadyCompressed("audio/mp3")).toBe(true);
    });

    it("should detect AAC format", () => {
      expect(isAlreadyCompressed("audio/aac")).toBe(true);
      expect(isAlreadyCompressed("audio/mp4")).toBe(true);
    });

    it("should detect Opus format", () => {
      expect(isAlreadyCompressed("audio/opus")).toBe(true);
      expect(isAlreadyCompressed("audio/webm")).toBe(true);
    });

    it("should detect OGG format", () => {
      expect(isAlreadyCompressed("audio/ogg")).toBe(true);
    });

    it("should return false for WAV format", () => {
      expect(isAlreadyCompressed("audio/wav")).toBe(false);
      expect(isAlreadyCompressed("audio/x-wav")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isAlreadyCompressed("AUDIO/MPEG")).toBe(true);
      expect(isAlreadyCompressed("Audio/Mp3")).toBe(true);
    });

    it("should return false for unknown formats", () => {
      expect(isAlreadyCompressed("audio/unknown")).toBe(false);
      expect(isAlreadyCompressed("")).toBe(false);
    });
  });

  describe("estimateBitrate", () => {
    it("should calculate bitrate correctly", () => {
      const blob = new Blob(["x".repeat(100000)], { type: "audio/mp3" });
      const duration = 10; // 10 seconds

      const bitrate = estimateBitrate(blob, duration);

      expect(bitrate).toBeTruthy();
      expect(bitrate).toBeGreaterThan(0);
      // Bitrate (kbps) = (100000 bytes * 8) / (10 seconds * 1000) = 80 kbps
      expect(bitrate).toBeCloseTo(80, 0);
    });

    it("should return null if duration is not provided", () => {
      const blob = new Blob(["test"], { type: "audio/mp3" });

      expect(estimateBitrate(blob)).toBeNull();
      expect(estimateBitrate(blob, 0)).toBeNull();
    });

    it("should handle small files", () => {
      const blob = new Blob(["test"], { type: "audio/mp3" });
      const duration = 1;

      const bitrate = estimateBitrate(blob, duration);

      expect(bitrate).toBeTruthy();
      expect(bitrate).toBeGreaterThan(0);
    });
  });

  describe("shouldSkipCompression", () => {
    it("should skip compression for Opus blobs", () => {
      const blob = new Blob(["test"], { type: "audio/webm;codecs=opus" });

      const result = shouldSkipCompression(blob, 24);

      expect(result).toBe(true);
    });

    it("should skip compression for WebM blobs", () => {
      const blob = new Blob(["test"], { type: "audio/webm" });

      const result = shouldSkipCompression(blob, 24);

      expect(result).toBe(true);
    });

    it("should not skip compression for MP3 blobs", () => {
      const blob = new Blob(["test"], { type: "audio/mpeg" });

      const result = shouldSkipCompression(blob, 24);

      expect(result).toBe(false);
    });

    it("should not skip compression for WAV blobs", () => {
      const blob = new Blob(["test"], { type: "audio/wav" });

      const result = shouldSkipCompression(blob, 24);

      expect(result).toBe(false);
    });

    it("should not skip compression for AAC blobs", () => {
      const blob = new Blob(["test"], { type: "audio/aac" });

      const result = shouldSkipCompression(blob, 24);

      expect(result).toBe(false);
    });
  });

  describe("isCompressionAvailable", () => {
    it("should return true if compression is supported", () => {
      const available = isCompressionAvailable();

      expect(typeof available).toBe("boolean");
    });

    it("should return false if MediaRecorder is not available", () => {
      const originalMediaRecorder = (global as any).MediaRecorder;
      delete (global as any).MediaRecorder;

      const available = isCompressionAvailable();

      expect(available).toBe(false);

      // Restore
      (global as any).MediaRecorder = originalMediaRecorder;
    });

    it("should return false if AudioContext is not available", () => {
      const originalAudioContext = (global as any).AudioContext;
      delete (global as any).AudioContext;

      const available = isCompressionAvailable();

      expect(available).toBe(false);

      // Restore
      (global as any).AudioContext = originalAudioContext;
    });
  });
});
