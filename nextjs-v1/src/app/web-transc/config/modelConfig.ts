/**
 * Whisper Model Configuration
 *
 * Available models from onnx-community with timestamped outputs for speaker diarization.
 * Models are listed from smallest/fastest to largest/most accurate.
 */

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  sizes: {
    webgpu: number; // Size in MB for WebGPU
    wasm: number; // Size in MB for WASM (quantized)
  };
  languages: "multilingual" | "english-only";
  accuracy: "basic" | "good" | "better" | "best" | "excellent";
  speed: "fastest" | "fast" | "medium" | "slow" | "slowest";
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  "onnx-community/whisper-tiny_timestamped": {
    id: "onnx-community/whisper-tiny_timestamped",
    name: "Whisper Tiny",
    description:
      "Smallest and fastest model. Good for quick transcriptions.",
    sizes: {
      webgpu: 103,
      wasm: 41,
    },
    languages: "multilingual",
    accuracy: "basic",
    speed: "fastest",
  },
  "onnx-community/whisper-base_timestamped": {
    id: "onnx-community/whisper-base_timestamped",
    name: "Whisper Base",
    description: "Balanced model. Good accuracy with reasonable speed.",
    sizes: {
      webgpu: 196,
      wasm: 77,
    },
    languages: "multilingual",
    accuracy: "good",
    speed: "fast",
  },
  "onnx-community/whisper-small_timestamped": {
    id: "onnx-community/whisper-small_timestamped",
    name: "Whisper Small",
    description: "Better accuracy. Recommended for most use cases.",
    sizes: {
      webgpu: 635,
      wasm: 249,
    },
    languages: "multilingual",
    accuracy: "better",
    speed: "medium",
  },
  "onnx-community/whisper-medium_timestamped": {
    id: "onnx-community/whisper-medium_timestamped",
    name: "Whisper Medium",
    description: "High accuracy. Slower but more precise transcriptions.",
    sizes: {
      webgpu: 1980,
      wasm: 776,
    },
    languages: "multilingual",
    accuracy: "best",
    speed: "slow",
  },
  "onnx-community/whisper-large-v3_timestamped": {
    id: "onnx-community/whisper-large-v3_timestamped",
    name: "Whisper Large v3",
    description:
      "Most accurate model. Best quality but slowest processing.",
    sizes: {
      webgpu: 3140,
      wasm: 1550,
    },
    languages: "multilingual",
    accuracy: "excellent",
    speed: "slowest",
  },
};

export const DEFAULT_MODEL = "onnx-community/whisper-base_timestamped";

/**
 * Get model display name with size info
 */
export function getModelDisplayName(
  modelId: string,
  device: "webgpu" | "wasm",
): string {
  const model = AVAILABLE_MODELS[modelId];
  if (!model) return modelId;

  const size = device === "webgpu" ? model.sizes.webgpu : model.sizes.wasm;
  return `${model.name} (${size}MB)`;
}

/**
 * Get model size for a specific device
 */
export function getModelSize(
  modelId: string,
  device: "webgpu" | "wasm",
): number {
  const model = AVAILABLE_MODELS[modelId];
  if (!model) return 0;

  return device === "webgpu" ? model.sizes.webgpu : model.sizes.wasm;
}

/**
 * Get sorted model list (smallest to largest)
 */
export function getSortedModels(device: "webgpu" | "wasm"): ModelConfig[] {
  return Object.values(AVAILABLE_MODELS).sort((a, b) => {
    const sizeA = device === "webgpu" ? a.sizes.webgpu : a.sizes.wasm;
    const sizeB = device === "webgpu" ? b.sizes.webgpu : b.sizes.wasm;
    return sizeA - sizeB;
  });
}
