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

    // Check if model is English-only (doesn't accept language parameter)
    const isEnglishOnly = PipelineSingeton.asr_model_id.includes(".en");
    const warmupOptions = isEnglishOnly ? {} : { language: "en" };

    await transcriber(new Float32Array(16_000), warmupOptions);
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

  // Send status update that transcription is starting
  self.postMessage({
    status: "update",
    data: "Transcribing audio...",
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
    on_chunk_start: (chunkIndex) => {
      console.log("🔥 WORKER: Chunk started:", chunkIndex);
      self.postMessage({
        status: "chunk_start",
        data: chunkIndex,
      });
    },
    on_chunk_end: (chunkIndex) => {
      console.log("🔥 WORKER: Chunk ended:", chunkIndex);

      // Update progress based on chunks (30s per chunk)
      processedSeconds = Math.min((chunkIndex + 1) * 30, totalSeconds);
      const elapsedMs = Date.now() - processingStartTime;
      const processingRate = processedSeconds / (elapsedMs / 1000);
      const remainingSeconds = totalSeconds - processedSeconds;
      const estimatedTimeRemaining = remainingSeconds / processingRate;

      // Send progress update
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
        data: chunkIndex,
      });
    },
    on_finalize: () => {
      console.log("🔥 WORKER: Transcription finalized");
    },
  });

  console.log(
    "🔥 WORKER: Created WhisperTextStreamer, starting transcription...",
  );

  // Check if model is English-only (doesn't accept language parameter)
  const isEnglishOnly = PipelineSingeton.asr_model_id.includes(".en");

  // Build transcription options - only include language for multilingual models
  const transcriptionOptions = {
    return_timestamps: "word",
    chunk_length_s: 30,
    streamer, // Use WhisperTextStreamer instead of callback_function
  };

  // Only add language parameter for multilingual models
  if (!isEnglishOnly && language) {
    transcriptionOptions.language = language;
  }

  let transcript;
  let usedFallback = false;

  // Try word-level timestamps first, fall back to segment-level if alignment_heads are missing
  try {
    // Run transcription with streaming
    const transcriptPromise = transcriber(audio, transcriptionOptions);

    // Show diarization status
    self.postMessage({
      status: "update",
      data: "Identifying speakers...",
    });

    // Run segmentation in parallel with transcription
    const results = await Promise.all([
      transcriptPromise,
      segment(segmentation_processor, segmentation_model, audio),
    ]);

    transcript = results[0];
    const segments = results[1];

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
  } catch (error) {
    // Check if error is due to missing alignment_heads or token_ids
    if (
      error.message &&
      (error.message.includes("alignment_heads") ||
        error.message.includes("token_ids"))
    ) {
      console.warn(
        "⚠️ This model doesn't support proper timestamps. Transcription will continue without timestamps.",
      );

      // Send warning to UI
      self.postMessage({
        status: "warning",
        data: "Model doesn't support timestamps properly. Using basic transcription mode.",
      });

      // Final fallback: Try without any timestamps at all
      // This should work for any Whisper model
      const fallbackOptions = {
        chunk_length_s: 30,
        // No return_timestamps - just get the text
        // No streamer
      };

      // Only add language parameter for multilingual models
      if (!isEnglishOnly && language) {
        fallbackOptions.language = language;
      }

      usedFallback = true;

      console.log(
        "🔧 Attempting basic transcription without timestamps...",
      );

      const transcriptPromise = transcriber(audio, fallbackOptions);

      // Show diarization status
      self.postMessage({
        status: "update",
        data: "Identifying speakers...",
      });

      // Run segmentation in parallel with transcription
      const results = await Promise.all([
        transcriptPromise,
        segment(segmentation_processor, segmentation_model, audio),
      ]);

      transcript = results[0];
      const segments = results[1];

      console.log("✅ Basic transcription completed");
      console.table(segments, [
        "start",
        "end",
        "id",
        "label",
        "confidence",
      ]);

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
      // Note: transcript.chunks will be empty without timestamps, but we have text
      self.postMessage({
        status: "complete",
        result: { transcript, segments },
        time: end - start,
        fallbackUsed: true,
        noTimestamps: true, // Flag to indicate no word/segment timestamps available
      });
    } else {
      // Re-throw other errors
      throw error;
    }
  }
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
