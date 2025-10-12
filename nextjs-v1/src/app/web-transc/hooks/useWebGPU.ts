/// <reference types="@webgpu/types" />

import { useState, useEffect } from "react";

export function useWebGPU() {
  const [hasGPU, setHasGPU] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkWebGPU() {
      if (!navigator.gpu) {
        setHasGPU(false);
        setIsChecking(false);
        return;
      }

      try {
        const adapter = await navigator.gpu.requestAdapter();
        setHasGPU(!!adapter);
      } catch {
        setHasGPU(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkWebGPU();
  }, []);

  return { hasGPU, isChecking };
}
