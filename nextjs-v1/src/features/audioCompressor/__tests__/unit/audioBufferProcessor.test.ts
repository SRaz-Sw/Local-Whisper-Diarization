/**
 * Tests for audioBufferProcessor utility
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  decodeAudioBlob,
  convertToMono,
  createAudioBufferFromData,
  createProcessedBuffer,
  getAudioBufferInfo,
} from "../../utils/audioBufferProcessor";
import {
  setupAudioContextMock,
  createTestAudioBuffer,
  getAudioBufferStats,
} from "../helpers/testUtils";

// Setup mocks for Node.js environment
beforeAll(() => {
  setupAudioContextMock();
});

describe("audioBufferProcessor", () => {
  describe("decodeAudioBlob", () => {
    it("should decode audio blob to AudioBuffer", async () => {
      const blob = new Blob(["test audio data"], { type: "audio/webm" });
      const sampleRate = 16000;

      const audioBuffer = await decodeAudioBlob(blob, sampleRate);

      expect(audioBuffer).toBeTruthy();
      expect(audioBuffer.sampleRate).toBe(sampleRate);
      expect(audioBuffer.numberOfChannels).toBeGreaterThan(0);
    });

    it("should handle different sample rates", async () => {
      const blob = new Blob(["test audio data"], { type: "audio/webm" });

      const buffer16k = await decodeAudioBlob(blob, 16000);
      expect(buffer16k.sampleRate).toBe(16000);

      const buffer44k = await decodeAudioBlob(blob, 44100);
      expect(buffer44k.sampleRate).toBe(44100);
    });

    it("should close AudioContext after decoding", async () => {
      const blob = new Blob(["test audio data"], { type: "audio/webm" });

      // Should not throw even after context is closed
      await expect(decodeAudioBlob(blob, 16000)).resolves.toBeTruthy();
    });
  });

  describe("convertToMono", () => {
    it("should convert stereo to mono by averaging", () => {
      const stereoBuffer = createTestAudioBuffer(0.1, 440, 44100, 2);

      const monoData = convertToMono(stereoBuffer);

      expect(monoData).toBeInstanceOf(Float32Array);
      expect(monoData.length).toBe(stereoBuffer.length);
    });

    it("should return original data for mono buffer", () => {
      const monoBuffer = createTestAudioBuffer(0.1, 440, 44100, 1);

      const monoData = convertToMono(monoBuffer);

      expect(monoData).toBe(monoBuffer.getChannelData(0));
    });

    it("should average all channels correctly", () => {
      const multiChannelBuffer = createTestAudioBuffer(0.1, 440, 44100, 4);

      const monoData = convertToMono(multiChannelBuffer);

      // Check that values are averaged (should be within reasonable range)
      const stats = getAudioBufferStats(multiChannelBuffer);
      const monoRms = Math.sqrt(
        Array.from(monoData).reduce((sum, val) => sum + val * val, 0) /
          monoData.length,
      );

      // Mono RMS should be similar to average of channel RMS values
      const avgRms =
        stats.rms.reduce((a, b) => a + b, 0) / stats.rms.length;
      expect(monoRms).toBeCloseTo(avgRms, 1);
    });

    it("should preserve audio duration", () => {
      const buffer = createTestAudioBuffer(1, 440, 44100, 2);
      const monoData = convertToMono(buffer);

      expect(monoData.length).toBe(buffer.length);
    });
  });

  describe("createAudioBufferFromData", () => {
    it("should create AudioBuffer from mono channel data", () => {
      const channelData = new Float32Array(1000).fill(0.5);
      const sampleRate = 44100;

      const buffer = createAudioBufferFromData([channelData], sampleRate);

      expect(buffer.numberOfChannels).toBe(1);
      expect(buffer.length).toBe(1000);
      expect(buffer.sampleRate).toBe(sampleRate);
    });

    it("should create AudioBuffer from stereo channel data", () => {
      const leftChannel = new Float32Array(1000).fill(0.5);
      const rightChannel = new Float32Array(1000).fill(-0.5);
      const sampleRate = 44100;

      const buffer = createAudioBufferFromData(
        [leftChannel, rightChannel],
        sampleRate,
      );

      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.length).toBe(1000);
      expect(buffer.sampleRate).toBe(sampleRate);
    });

    it("should preserve channel data values", () => {
      const channelData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const sampleRate = 44100;

      const buffer = createAudioBufferFromData([channelData], sampleRate);
      const outputData = buffer.getChannelData(0);

      for (let i = 0; i < channelData.length; i++) {
        expect(outputData[i]).toBeCloseTo(channelData[i], 5);
      }
    });
  });

  describe("createProcessedBuffer", () => {
    it("should return original buffer if no processing needed", async () => {
      const buffer = createTestAudioBuffer(0.1, 440, 16000, 1);

      const processed = await createProcessedBuffer(buffer, {
        sampleRate: 16000,
        isConvertingToMono: false,
      });

      expect(processed).toBe(buffer);
    });

    it("should resample audio to target sample rate", async () => {
      const buffer = createTestAudioBuffer(0.1, 440, 44100, 1);

      const processed = await createProcessedBuffer(buffer, {
        sampleRate: 16000,
        isConvertingToMono: false,
      });

      expect(processed.sampleRate).toBe(16000);
      expect(processed.numberOfChannels).toBe(1);
    });

    it("should convert stereo to mono", async () => {
      const buffer = createTestAudioBuffer(0.1, 440, 44100, 2);

      const processed = await createProcessedBuffer(buffer, {
        sampleRate: 44100,
        isConvertingToMono: true,
      });

      expect(processed.numberOfChannels).toBe(1);
      expect(processed.sampleRate).toBe(44100);
    });

    it("should resample and convert to mono simultaneously", async () => {
      const buffer = createTestAudioBuffer(0.1, 440, 44100, 2);

      const processed = await createProcessedBuffer(buffer, {
        sampleRate: 16000,
        isConvertingToMono: true,
      });

      expect(processed.numberOfChannels).toBe(1);
      expect(processed.sampleRate).toBe(16000);
    });

    it("should preserve multi-channel audio when not converting to mono", async () => {
      const buffer = createTestAudioBuffer(0.1, 440, 44100, 2);

      const processed = await createProcessedBuffer(buffer, {
        sampleRate: 16000,
        isConvertingToMono: false,
      });

      expect(processed.numberOfChannels).toBe(2);
      expect(processed.sampleRate).toBe(16000);
    });

    it("should adjust buffer length when resampling", async () => {
      const buffer = createTestAudioBuffer(1, 440, 44100, 1);

      const processed = await createProcessedBuffer(buffer, {
        sampleRate: 16000,
        isConvertingToMono: false,
      });

      // Length should be approximately proportional to sample rate ratio
      const expectedLength = Math.ceil((buffer.length * 16000) / 44100);
      expect(processed.length).toBeCloseTo(expectedLength, -2); // Within 100 samples
    });
  });

  describe("getAudioBufferInfo", () => {
    it("should return formatted info string", () => {
      const buffer = createTestAudioBuffer(1.5, 440, 44100, 2);

      const info = getAudioBufferInfo(buffer);

      expect(info).toBe("2ch, 44100Hz, 1.50s");
    });

    it("should handle mono audio", () => {
      const buffer = createTestAudioBuffer(0.5, 440, 16000, 1);

      const info = getAudioBufferInfo(buffer);

      expect(info).toBe("1ch, 16000Hz, 0.50s");
    });

    it("should format duration with 2 decimal places", () => {
      const buffer = createTestAudioBuffer(0.123, 440, 44100, 1);

      const info = getAudioBufferInfo(buffer);

      expect(info).toMatch(/\d+ch, \d+Hz, \d+\.\d{2}s/);
    });

    it("should handle multi-channel audio", () => {
      const buffer = createTestAudioBuffer(1, 440, 48000, 6);

      const info = getAudioBufferInfo(buffer);

      expect(info).toBe("6ch, 48000Hz, 1.00s");
    });
  });
});
