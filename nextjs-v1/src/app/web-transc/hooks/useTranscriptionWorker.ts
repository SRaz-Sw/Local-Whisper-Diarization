import { useEffect, useRef, useCallback } from "react";
import type { WorkerMessage } from "../types";

type MessageHandler = (message: WorkerMessage) => void;

export function useTranscriptionWorker(onMessage: MessageHandler) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker("/workers/whisperDiarization.worker.js", {
        type: "module",
      });
    }

    const worker = workerRef.current;

    const handleMessage = (e: MessageEvent<WorkerMessage>) => {
      onMessage(e.data);
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [onMessage]);

  const postMessage = useCallback((message: any) => {
    workerRef.current?.postMessage(message);
  }, []);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return { postMessage, terminate, worker: workerRef };
}

