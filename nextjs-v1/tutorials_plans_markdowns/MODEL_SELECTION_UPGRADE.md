# Whisper Model Selection & Upgrade Guide

## Overview

The web transcription app now supports **multiple Whisper models** with an intuitive UI for users to select the model that best fits their needs. Users can choose from 5 different models ranging from smallest/fastest to largest/most accurate.

## Available Models

### 1. **Whisper Tiny** (Fastest)

- **Model ID**: `onnx-community/whisper-tiny_timestamped`
- **Size**: 41MB (WASM) / 103MB (WebGPU)
- **Accuracy**: Basic
- **Speed**: Fastest ⚡
- **Best for**: Quick transcriptions, low-resource devices, testing

### 2. **Whisper Base** (Default)

- **Model ID**: `onnx-community/whisper-base_timestamped`
- **Size**: 77MB (WASM) / 196MB (WebGPU)
- **Accuracy**: Good
- **Speed**: Fast ⚡
- **Best for**: Balanced performance, most general use cases

### 3. **Whisper Small** (Recommended)

- **Model ID**: `onnx-community/whisper-small_timestamped`
- **Size**: 249MB (WASM) / 635MB (WebGPU)
- **Accuracy**: Better
- **Speed**: Medium 🎯
- **Best for**: High-quality transcriptions with acceptable processing time

### 4. **Whisper Medium** (High Quality)

- **Model ID**: `onnx-community/whisper-medium_timestamped`
- **Size**: 776MB (WASM) / 1980MB (WebGPU)
- **Accuracy**: Best
- **Speed**: Slow 🐢
- **Best for**: Professional transcriptions where accuracy is critical

### 5. **Whisper Large v3** (Maximum Accuracy)

- **Model ID**: `onnx-community/whisper-large-v3_timestamped`
- **Size**: 1550MB (WASM) / 3140MB (WebGPU)
- **Accuracy**: Excellent
- **Speed**: Slowest 🐌
- **Best for**: Maximum accuracy, research, professional use with powerful hardware

## Features Implemented

### 1. Model Configuration System

**File**: `src/app/web-transc/config/modelConfig.ts`

- Centralized configuration for all available models
- Metadata for each model (size, accuracy, speed, languages)
- Helper functions to get model display names and sizes
- Default model configuration

### 2. Model Selector UI Component

**File**: `src/app/web-transc/components/ModelSelector.tsx`

- Beautiful modal dialog with model selection dropdown
- Displays detailed information about each model:
  - Model name and description
  - Accuracy level (with color-coded badges)
  - Processing speed (with emoji indicators)
  - Language support (100+ or English-only)
  - Model size for current device
- Model comparison view showing all available models
- Warning about model change requiring download
- Responsive design with animations

### 3. Dynamic Model Loading

**File**: `src/app/web-transc/workers/whisperDiarization.worker.js`

- Updated worker to accept model parameter
- Dynamic model switching with cache invalidation
- Singleton pattern ensures only one model is loaded at a time
- Proper cleanup when switching models

### 4. State Management

**File**: `src/app/web-transc/components/WhisperDiarization.tsx`

- Added model state management
- Dynamic model size calculation based on device type
- Model change handler that resets worker state
- Integration with ModelSelector component

### 5. Dynamic Documentation

**File**: `src/app/web-transc/components/IntroSection.tsx`

- Displays current model name in the intro section
- Links to the correct HuggingFace model page
- Shows accurate model size for current device

## How to Use

### For Users

1. **Open the Application**
   - Navigate to `/web-transc`
   - The default model (Whisper Base) is pre-selected

2. **Open Model Settings**
   - Click the "Model Settings" button (visible before and after loading models)
   - A modal will open showing all available models

3. **Select a Model**
   - Browse through the available models
   - View detailed information about each model
   - Compare accuracy, speed, and size
   - Select the model that best fits your needs

4. **Apply Changes**
   - Click "Apply Changes" button
   - If a model is already loaded, you'll be prompted to reload
   - Click "Load model" to download and initialize the new model

5. **Transcribe Audio**
   - Upload an audio/video file
   - Click "Run model" to transcribe
   - The selected model will be used for transcription

### For Developers

#### Adding a New Model

1. **Add to Model Configuration** (`modelConfig.ts`):

```typescript
"onnx-community/your-new-model": {
  id: "onnx-community/your-new-model",
  name: "Your Model Name",
  description: "Description of the model",
  sizes: {
    webgpu: 1000, // Size in MB
    wasm: 500,    // Size in MB
  },
  languages: "multilingual" | "english-only",
  accuracy: "basic" | "good" | "better" | "best" | "excellent",
  speed: "fastest" | "fast" | "medium" | "slow" | "slowest",
}
```

2. **Test the Model**:
   - Ensure the model exists on HuggingFace
   - Verify it supports timestamped outputs (required for diarization)
   - Test with both WebGPU and WASM devices

#### Modifying Model Settings

**Change Default Model**:

```typescript
// In modelConfig.ts
export const DEFAULT_MODEL = "onnx-community/whisper-small_timestamped";
```

**Add Model Categories/Filters**:

```typescript
// Add to ModelSelector.tsx
const filteredModels = models.filter(
  (m) => m.accuracy === "better" || m.accuracy === "best",
);
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Interface                     │
│              (WhisperDiarization.tsx)                │
│                                                      │
│  ┌────────────────┐      ┌──────────────────┐     │
│  │ Model Selector │─────▶│  Model Config    │     │
│  │   (Modal UI)   │      │  (modelConfig.ts)│     │
│  └────────────────┘      └──────────────────┘     │
│         │                                           │
│         │ onModelChange(newModel)                  │
│         ▼                                           │
│  ┌────────────────────────────────────┐           │
│  │   handleModelChange                │           │
│  │   - Update state                   │           │
│  │   - Reset worker if needed         │           │
│  └────────────────────────────────────┘           │
└─────────────────┬─────────────────────────────────┘
                  │
                  │ postMessage({ type: 'load', model })
                  ▼
┌──────────────────────────────────────────────────────┐
│              Web Worker Thread                        │
│        (whisperDiarization.worker.js)                 │
│                                                       │
│  ┌─────────────────────────────────────┐            │
│  │      PipelineSingleton               │            │
│  │  - setAsrModel(modelId)              │            │
│  │  - getInstance(device)               │            │
│  │  - Cache management                  │            │
│  └─────────────────────────────────────┘            │
│                     │                                │
│                     ▼                                │
│  ┌─────────────────────────────────────┐            │
│  │  @huggingface/transformers           │            │
│  │  - pipeline()                        │            │
│  │  - Model download                    │            │
│  │  - ONNX Runtime                      │            │
│  └─────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │   IndexedDB Cache    │
         │   (Browser Storage)  │
         └──────────────────────┘
```

## Performance Considerations

### Model Size vs. Accuracy Trade-off

| Model    | WASM Size | WebGPU Size | Relative Accuracy | Relative Speed |
| -------- | --------- | ----------- | ----------------- | -------------- |
| Tiny     | 41MB      | 103MB       | 1x (baseline)     | 5x (fastest)   |
| Base     | 77MB      | 196MB       | 1.5x              | 4x             |
| Small    | 249MB     | 635MB       | 2x                | 2x             |
| Medium   | 776MB     | 1980MB      | 2.5x              | 1x             |
| Large v3 | 1550MB    | 3140MB      | 3x (best)         | 0.5x (slowest) |

### Device-Specific Recommendations

**WebGPU-Enabled Devices** (Modern GPUs):

- Use Small or Medium for best balance
- Large v3 is viable for professional use
- Models run significantly faster with GPU acceleration

**WASM-Only Devices** (Older/Mobile):

- Stick with Tiny or Base for acceptable performance
- Small is usable but may be slower
- Avoid Medium and Large on low-resource devices

### First-Time Download

- Models are downloaded once and cached in IndexedDB
- Subsequent loads are instant (from cache)
- Users can clear browser cache to remove cached models
- Each model is cached independently (switching doesn't re-download)

## Technical Details

### Model Format

- All models use **ONNX format** for cross-platform compatibility
- Timestamped versions are required for speaker diarization
- Models are sourced from HuggingFace's `onnx-community` organization

### Quantization

- **WebGPU models**: Mixed precision (fp32 encoder, q4 decoder)
- **WASM models**: int8 quantization (q8)
- Quantization reduces size with minimal accuracy loss

### Browser Compatibility

- **WebGPU**: Chrome 113+, Edge 113+ (best performance)
- **WASM**: All modern browsers (fallback option)
- Automatic device detection and fallback

## Troubleshooting

### Model Download Fails

- **Check internet connection**: First download requires internet
- **Check available storage**: Ensure sufficient disk space
- **Clear cache and retry**: Browser storage might be corrupted

### Model Loading is Slow

- **First load is always slower**: Model downloads take time
- **Use smaller model**: Try Tiny or Base for faster loading
- **Check device type**: WebGPU loads faster than WASM

### Out of Memory Errors

- **Use smaller model**: Reduce from Medium/Large to Small/Base
- **Close other browser tabs**: Free up memory
- **Check device specs**: Large models need powerful hardware

### Transcription Quality is Poor

- **Upgrade to larger model**: Small/Medium/Large offer better accuracy
- **Check audio quality**: Poor audio quality affects all models
- **Select correct language**: Ensure language is set correctly

## Future Enhancements

### Potential Improvements

1. **Automatic model recommendation** based on:
   - Device capabilities (GPU, RAM)
   - Audio file length
   - User's accuracy/speed preference

2. **Model performance metrics**:
   - Display actual WER (Word Error Rate)
   - Show processing time per minute of audio
   - User ratings and feedback

3. **Distil-Whisper support**:
   - Add distil-whisper/distil-medium.en
   - Add distil-whisper/distil-large-v2
   - These are English-only but faster

4. **Custom model support**:
   - Allow users to provide custom model URLs
   - Support for fine-tuned models
   - Domain-specific models (medical, legal, etc.)

5. **Batch processing**:
   - Process multiple files with different models
   - Compare transcriptions from different models
   - A/B testing interface

## References

- **HuggingFace Models**: https://huggingface.co/onnx-community
- **Transformers.js Docs**: https://huggingface.co/docs/transformers.js
- **OpenAI Whisper**: https://openai.com/research/whisper
- **ONNX Runtime**: https://onnxruntime.ai/

## Changelog

### v1.0.0 (2025-01-11)

- ✅ Added model selection UI with dropdown
- ✅ Implemented 5 Whisper models (Tiny to Large v3)
- ✅ Dynamic model loading in worker
- ✅ Model configuration system
- ✅ Beautiful modal with model comparison
- ✅ Dynamic documentation updates
- ✅ Device-specific size display
- ✅ Model change alerts and confirmations

---

**Made with ❤️ using Transformers.js and Next.js**
