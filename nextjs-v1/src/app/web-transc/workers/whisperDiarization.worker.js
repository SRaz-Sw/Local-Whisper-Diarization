import {
  pipeline,
  AutoProcessor,
  AutoModelForAudioFrameClassification,
  WhisperTextStreamer,
} from "@huggingface/transformers";

const PER_DEVICE_CONFIG = {
  webgpu: {
    dtype: {
      encoder_model: "fp32",
      decoder_model_merged: "q4",
    },
    device: "webgpu",
  },
  wasm: {
    dtype: "q8",
    device: "wasm",
  },
};

// Backup state management
let backupIntervalId = null;
let currentBackupState = null;
const BACKUP_INTERVAL_MS = 20000; // 20 seconds
const BACKUP_STORAGE_KEY = "whisper_diarization_backup";

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class PipelineSingeton {
  static asr_model_id = "onnx-community/whisper-base_timestamped"; // Default model
  static asr_instance = null;

  static segmentation_model_id =
    "onnx-community/pyannote-segmentation-3.0";
  static segmentation_instance = null;
  static segmentation_processor = null;

  /**
   * Set the ASR model ID. If a different model is set, the instance is cleared.
   */
  static setAsrModel(modelId) {
    if (this.asr_model_id !== modelId) {
      console.log(
        `🔄 Changing ASR model from ${this.asr_model_id} to ${modelId}`,
      );
      this.asr_model_id = modelId;
      this.asr_instance = null; // Clear cached instance to force reload
    }
  }

  static async getInstance(progress_callback = null, device = "webgpu") {
    this.asr_instance ??= pipeline(
      "automatic-speech-recognition",
      this.asr_model_id,
      {
        ...PER_DEVICE_CONFIG[device],
        progress_callback,
      },
    );

    this.segmentation_processor ??= AutoProcessor.from_pretrained(
      this.segmentation_model_id,
      {
        progress_callback,
      },
    );
    this.segmentation_instance ??=
      AutoModelForAudioFrameClassification.from_pretrained(
        this.segmentation_model_id,
        {
          // NOTE: WebGPU is not currently supported for this model
          // See https://github.com/microsoft/onnxruntime/issues/21386
          device: "wasm",
          dtype: "fp32",
          progress_callback,
        },
      );

    return Promise.all([
      this.asr_instance,
      this.segmentation_processor,
      this.segmentation_instance,
    ]);
  }
}

async function load({ device, model }) {
  // Set the model if provided
  if (model) {
    PipelineSingeton.setAsrModel(model);
  }

  self.postMessage({
    status: "loading",
    data: `Loading ${PipelineSingeton.asr_model_id} (${device})...`,
  });

  // Load the pipeline and save it for future use.
  const [transcriber, segmentation_processor, segmentation_model] =
    await PipelineSingeton.getInstance((x) => {
      // We also add a progress callback to the pipeline so that we can
      // track model loading.
      self.postMessage(x);
    }, device);

  if (device === "webgpu") {
    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    await transcriber(new Float32Array(16_000), {
      language: "en",
    });
  }

  self.postMessage({ status: "loaded" });
}

async function segment(processor, model, audio) {
  const inputs = await processor(audio);
  const { logits } = await model(inputs);
  const segments = processor.post_process_speaker_diarization(
    logits,
    audio.length,
  )[0];

  // Attach labels
  for (const segment of segments) {
    segment.label = model.config.id2label[segment.id];
  }

  return segments;
}

async function run({ audio, language, resumeFromBackup = false }) {
  const [transcriber, segmentation_processor, segmentation_model] =
    await PipelineSingeton.getInstance();

  const start = performance.now();
  const totalSeconds = audio.length / 16000; // Sample rate is 16kHz
  let processedSeconds = 0;
  let accumulatedChunks = [];
  let processingStartTime = Date.now();

  // Track chunk count and offset for sliding window
  const chunk_length_s = 30;
  const stride_length_s = 5;
  let chunk_count = 0;

  // Send status update that transcription is starting
  self.postMessage({
    status: "update",
    data: "Transcribing audio...",
  });

  // Send initial progress with totalSeconds immediately
  self.postMessage({
    status: "processing_progress",
    processedSeconds: 0,
    totalSeconds,
    estimatedTimeRemaining: null,
  });

  // Initialize backup state
  currentBackupState = {
    audio,
    language,
    totalSeconds,
    processedSeconds: 0,
    partialResult: null,
    timestamp: Date.now(),
  };

  // Start backup interval
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
  }
  backupIntervalId = setInterval(() => {
    if (currentBackupState) {
      try {
        // Save to IndexedDB
        saveBackupToIndexedDB(currentBackupState);
        console.log("💾 Backup saved at", new Date().toLocaleTimeString());
      } catch (error) {
        console.error("Failed to save backup:", error);
      }
    }
  }, BACKUP_INTERVAL_MS);

  // Create WhisperTextStreamer for real-time transcription updates
  const streamer = new WhisperTextStreamer(transcriber.tokenizer, {
    skip_prompt: true,
    time_precision: 0.02,
    callback_function: (text) => {
      console.log("🔥 WORKER: Streamer callback fired with text:", text);
      // Send streaming text updates with timestamp
      self.postMessage({
        status: "transcribing",
        data: {
          text: text,
          timestamp: Date.now(),
        },
      });
    },
    on_chunk_start: (startTimestamp) => {
      // Calculate offset based on which window we're processing
      const offset = (chunk_length_s - stride_length_s) * chunk_count;
      // Cap at totalSeconds to prevent going over 100%
      const actualAudioPosition = Math.min(offset + startTimestamp, totalSeconds);

      // Only update if progress moves forward (prevent backwards movement)
      const newProcessedSeconds = Math.max(processedSeconds, actualAudioPosition);

      console.log(`🔥 WORKER: Chunk started - Window ${chunk_count}, Offset: ${offset}, Timestamp: ${startTimestamp}, Actual Position: ${actualAudioPosition}, Progress: ${processedSeconds} -> ${newProcessedSeconds}`);

      // Only send progress update if it moved forward
      if (newProcessedSeconds > processedSeconds) {
        processedSeconds = newProcessedSeconds;
        self.postMessage({
          status: "processing_progress",
          processedSeconds,
          totalSeconds,
          estimatedTimeRemaining: null,
        });
      }

      self.postMessage({
        status: "chunk_start",
        data: actualAudioPosition,
      });
    },
    on_chunk_end: (endTimestamp) => {
      // Calculate offset based on which window we're processing
      const offset = (chunk_length_s - stride_length_s) * chunk_count;
      // Cap at totalSeconds to prevent going over 100%
      const actualAudioPosition = Math.min(offset + endTimestamp, totalSeconds);

      console.log(`🔥 WORKER: Chunk ended - Window ${chunk_count}, Offset: ${offset}, Timestamp: ${endTimestamp}, Actual Position: ${actualAudioPosition}`);

      // Update progress with actual audio position (capped), always move forward only
      processedSeconds = Math.max(processedSeconds, actualAudioPosition);

      // Calculate ETA based on actual progress
      const elapsedMs = Date.now() - processingStartTime;
      const processingRate = processedSeconds / (elapsedMs / 1000);
      const remainingSeconds = Math.max(0, totalSeconds - processedSeconds);
      const estimatedTimeRemaining =
        processingRate > 0 && remainingSeconds > 0
          ? remainingSeconds / processingRate
          : null;

      // Send accurate progress update
      self.postMessage({
        status: "processing_progress",
        processedSeconds,
        totalSeconds,
        estimatedTimeRemaining,
      });

      // Update backup state
      if (currentBackupState) {
        currentBackupState.processedSeconds = processedSeconds;
      }

      self.postMessage({
        status: "chunk_end",
        data: actualAudioPosition,
      });
    },
    on_finalize: () => {
      console.log("🔥 WORKER: Transcription finalized, incrementing chunk count");
      chunk_count++;
    },
  });

  console.log(
    "🔥 WORKER: Created WhisperTextStreamer, starting transcription...",
  );

  // Run transcription with streaming
  const transcript = await transcriber(audio, {
    language,
    return_timestamps: true,  // Changed from "word" - needed for chunk callbacks
    chunk_length_s: 30,
    stride_length_s: 5,  // Sliding window overlap - REQUIRED for chunk callbacks
    force_full_sequences: false,  // Enable streaming
    streamer, // Use WhisperTextStreamer instead of callback_function
  });

  // Show diarization status AFTER transcription completes
  self.postMessage({
    status: "update",
    data: "Identifying speakers...",
  });

  // Run segmentation after transcription
  const segments = await segment(
    segmentation_processor,
    segmentation_model,
    audio,
  );

  console.table(segments, ["start", "end", "id", "label", "confidence"]);

  const end = performance.now();

  // Clear backup interval and state
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
  }
  currentBackupState = null;

  // Delete backup from storage
  deleteBackupFromIndexedDB();

  // Send final complete result with diarization
  self.postMessage({
    status: "complete",
    result: { transcript, segments },
    time: end - start,
  });
}

// IndexedDB backup functions
function openBackupDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("WhisperDiarizationBackup", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("backups")) {
        db.createObjectStore("backups");
      }
    };
  });
}

async function saveBackupToIndexedDB(backupState) {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["backups"], "readwrite");
    const store = transaction.objectStore("backups");
    const request = store.put(backupState, BACKUP_STORAGE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

async function loadBackupFromIndexedDB() {
  try {
    const db = await openBackupDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["backups"], "readonly");
      const store = transaction.objectStore("backups");
      const request = store.get(BACKUP_STORAGE_KEY);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("Failed to load backup:", error);
    return null;
  }
}

async function deleteBackupFromIndexedDB() {
  try {
    const db = await openBackupDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["backups"], "readwrite");
      const store = transaction.objectStore("backups");
      const request = store.delete(BACKUP_STORAGE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("Failed to delete backup:", error);
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  console.log("🔧 Worker received message:", type, data);

  try {
    switch (type) {
      case "load":
        await load(data);
        break;

      case "run":
        await run(data);
        break;

      case "check_backup":
        const backup = await loadBackupFromIndexedDB();
        self.postMessage({
          status: "backup_check",
          hasBackup: !!backup,
          backup: backup,
        });
        break;

      case "clear_backup":
        await deleteBackupFromIndexedDB();
        self.postMessage({
          status: "backup_cleared",
        });
        break;

      default:
        console.warn("Unknown message type:", type);
    }
  } catch (error) {
    console.error("❌ Worker error:", error);
    self.postMessage({
      status: "error",
      error: error.message,
    });
  }
});
