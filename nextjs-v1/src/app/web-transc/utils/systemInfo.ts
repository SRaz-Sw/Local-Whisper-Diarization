/**
 * System Information Utilities
 * Detect GPU capabilities, memory, and cached models
 */

export interface SystemCapabilities {
  hasWebGPU: boolean;
  gpuMemoryMB?: number;
  maxBufferSizeMB?: number;
  estimatedRAMGB?: number;
  recommendedDevice: "webgpu" | "wasm";
}

export interface CachedModelInfo {
  modelId: string;
  isCached: boolean;
  sizeBytes?: number;
}

/**
 * Get GPU capabilities and memory info
 */
export async function getSystemCapabilities(): Promise<SystemCapabilities> {
  const result: SystemCapabilities = {
    hasWebGPU: false,
    recommendedDevice: "wasm",
  };

  // Check WebGPU support
  if (!navigator.gpu) {
    return result;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return result;
    }

    result.hasWebGPU = true;
    result.recommendedDevice = "webgpu";

    // Request device to get limits
    const device = await adapter.requestDevice();
    const limits = device.limits;

    // Convert bytes to MB
    result.maxBufferSizeMB = Math.floor(
      limits.maxBufferSize / (1024 * 1024),
    );

    // Estimate GPU memory (this is approximate)
    // Most modern GPUs have at least 2GB, high-end have 8GB+
    // We can't directly query VRAM, but we can infer from max buffer size
    if (result.maxBufferSizeMB > 2000) {
      result.gpuMemoryMB = 8192; // Likely 8GB+ GPU
    } else if (result.maxBufferSizeMB > 1000) {
      result.gpuMemoryMB = 4096; // Likely 4GB GPU
    } else {
      result.gpuMemoryMB = 2048; // Likely 2GB GPU
    }

    // Clean up device
    device.destroy();
  } catch (error) {
    console.error("Error detecting GPU capabilities:", error);
  }

  // Estimate system RAM (very approximate)
  // navigator.deviceMemory is available in some browsers (Chrome)
  if ("deviceMemory" in navigator) {
    result.estimatedRAMGB = (navigator as any).deviceMemory;
  }

  return result;
}

/**
 * Check if a model is cached using the Cache API
 * Transformers.js caches models using the browser's Cache API
 */
export async function checkCachedModels(
  modelIds: string[],
): Promise<CachedModelInfo[]> {
  const results: CachedModelInfo[] = modelIds.map((modelId) => ({
    modelId,
    isCached: false,
  }));

  try {
    // Check if Cache API is available
    if (!("caches" in window)) {
      console.log("Cache API not available");
      return results;
    }

    // Get all cache names
    const cacheNames = await caches.keys();
    console.log("Available caches:", cacheNames);

    // Look for transformers.js cache (usually named "transformers-cache" or similar)
    const transformersCache = cacheNames.find(
      (name) =>
        name.includes("transformers") ||
        name.includes("huggingface") ||
        name.includes("onnx"),
    );

    if (!transformersCache) {
      console.log("No transformers cache found");
      return results;
    }

    // Open the cache
    const cache = await caches.open(transformersCache);

    // Get all cached requests
    const requests = await cache.keys();
    console.log(`Found ${requests.length} cached items`);

    // Check each model
    for (let i = 0; i < modelIds.length; i++) {
      const modelId = modelIds[i];
      const modelShortName = modelId.replace("onnx-community/", "");

      // Check if any cached URL contains this model ID
      const isCached = requests.some((request) => {
        const url = request.url;
        return (
          url.includes(modelId) ||
          url.includes(modelShortName) ||
          url.includes(encodeURIComponent(modelId)) ||
          url.includes(encodeURIComponent(modelShortName))
        );
      });

      results[i].isCached = isCached;
      if (isCached) {
        console.log(`✓ Model ${modelId} is cached`);
      }
    }
  } catch (error) {
    console.error("Error checking cached models:", error);
  }

  return results;
}

/**
 * Get recommended model based on system capabilities
 */
export function getRecommendedModel(
  capabilities: SystemCapabilities,
): string[] {
  const recommendations: string[] = [];

  if (capabilities.hasWebGPU && capabilities.gpuMemoryMB) {
    if (capabilities.gpuMemoryMB >= 8192) {
      recommendations.push(
        "onnx-community/whisper-large-v3_timestamped",
        "onnx-community/whisper-medium_timestamped",
      );
    } else if (capabilities.gpuMemoryMB >= 4096) {
      recommendations.push(
        "onnx-community/whisper-medium_timestamped",
        "onnx-community/whisper-small_timestamped",
      );
    } else {
      recommendations.push(
        "onnx-community/whisper-small_timestamped",
        "onnx-community/whisper-base_timestamped",
      );
    }
  } else {
    // WASM mode - recommend smaller models
    if (capabilities.estimatedRAMGB && capabilities.estimatedRAMGB >= 16) {
      recommendations.push(
        "onnx-community/whisper-small_timestamped",
        "onnx-community/whisper-base_timestamped",
      );
    } else {
      recommendations.push(
        "onnx-community/whisper-base_timestamped",
        "onnx-community/whisper-tiny_timestamped",
      );
    }
  }

  return recommendations;
}
