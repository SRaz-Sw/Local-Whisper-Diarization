# Web Transcription Implementation Plan

## Project Overview

Create a browser-based speech transcription feature with **speaker diarization** for the nextjs-v1 Next.js application. The feature will use Whisper for transcription and pyannote for speaker segmentation, running entirely client-side using Transformers.js.

## Current State Analysis

### Existing Project Structure

- **Framework**: Next.js 15 with React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadCN UI components (fully set up)
- **Target Directory**: `/src/app/web-transc/` (already created with subfolders)
- **Package Manager**: Bun

### Reference Projects

1. **whisper-speaker-diarization** (Primary Feature Source)
   - Uses `@huggingface/transformers` v3.0.0
   - Features:
     - Whisper transcription with word-level timestamps
     - Speaker diarization using pyannote-segmentation-3.0
     - WebGPU support (196MB) / WebAssembly fallback (77MB)
     - Clean UI with drag-and-drop media input
     - Real-time progress tracking
     - Interactive transcript with speaker labels
     - Export functionality
   - Components:
     - `WhisperDiarization.jsx` - Main component
     - `WhisperMediaInput.jsx` - Audio/video input handler
     - `WhisperTranscript.jsx` - Transcript display with speaker labels
     - `WhisperProgress.jsx` - Loading progress
     - `WhisperLanguageSelector.jsx` - Language selection
   - Worker: `whisperDiarization.worker.js` - Handles ML processing

2. **whisper-web** (UI/UX Reference)
   - Uses `@xenova/transformers` v2.7.0
   - Clean TypeScript implementation
   - Comprehensive documentation
   - Multiple input methods (file, URL, recording)
   - Model selection UI

## Implementation Strategy

### Phase 1: Basic Implementation (Keep it Simple)

**Goal**: Get the diarization feature working quickly without modifications

**Steps**:

1. Copy files from `whisper-speaker-diarization` as-is (.jsx files)
2. Create minimal Next.js page wrapper
3. Install only required dependencies
4. Test functionality
5. Fix any critical issues

**Time Estimate**: 1-2 hours

### Phase 2: Verification & Testing

**Goal**: Ensure everything works correctly

**Steps**:

1. Test file upload (audio/video)
2. Test model loading and caching
3. Test transcription with speaker labels
4. Test export functionality
5. Test WebGPU vs WebAssembly fallback
6. Document any issues

**Time Estimate**: 30 minutes

### Phase 3: TypeScript Migration & shadCN Integration

**Goal**: Convert to project standards and improve UI

**Steps**:

1. Convert .jsx files to .tsx
2. Add proper TypeScript types
3. Replace basic UI elements with shadCN components
4. Improve layout and styling
5. Add error boundaries
6. Optimize performance

**Time Estimate**: 2-3 hours

### Phase 4: PWA Enhancement & Polish

**Goal**: Make it production-ready

**Steps**:

1. Add PWA manifest configuration
2. Implement offline-first strategy
3. Add proper error handling
4. Add loading states
5. Improve accessibility
6. Add analytics (if needed)
7. Documentation

**Time Estimate**: 1-2 hours

## Detailed Implementation Plan

---

## Phase 1: Basic Implementation

### 1.1 Install Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.0.0"
  }
}
```

### 1.2 File Structure

```
src/app/web-transc/
├── page.tsx                          # Next.js page wrapper (NEW)
├── components/
│   ├── WhisperDiarization.jsx        # Copied from source
│   ├── WhisperMediaInput.jsx         # Copied from source
│   ├── WhisperTranscript.jsx         # Copied from source
│   ├── WhisperProgress.jsx           # Copied from source
│   └── WhisperLanguageSelector.jsx   # Copied from source
├── hooks/
│   └── (empty for now)
└── workers/
    └── whisperDiarization.worker.js  # Copied from source
```

Note: Worker needs to be in `public/workers/` for Next.js

### 1.3 Copy Files

**Files to copy**:

1. `WhisperDiarization.jsx` → `src/app/web-transc/components/`
2. `WhisperMediaInput.jsx` → `src/app/web-transc/components/`
3. `WhisperTranscript.jsx` → `src/app/web-transc/components/`
4. `WhisperProgress.jsx` → `src/app/web-transc/components/`
5. `WhisperLanguageSelector.jsx` → `src/app/web-transc/components/`
6. `whisperDiarization.worker.js` → `public/workers/`

### 1.4 Create Next.js Page

**File**: `src/app/web-transc/page.tsx`

```tsx
"use client";

import WhisperDiarization from "./components/WhisperDiarization";

export default function WebTranscriptionPage() {
  return <WhisperDiarization />;
}
```

### 1.5 Modify Worker Path

In `WhisperDiarization.jsx`, change:

```javascript
// FROM:
worker.current = new Worker(
  new URL("./whisperDiarization.worker.js", import.meta.url),
  { type: "module" },
);

// TO:
worker.current = new Worker("/workers/whisperDiarization.worker.js", {
  type: "module",
});
```

### 1.6 Next.js Configuration

Update `next.config.ts` to support Web Workers:

```typescript
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },

  // Headers for SharedArrayBuffer support (WebGPU)
  async headers() {
    return [
      {
        source: "/workers/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};
```

### 1.7 Test Basic Functionality

1. Run `bun install`
2. Run `bun dev`
3. Navigate to `/web-transc`
4. Test:
   - Page loads without errors
   - Can select audio/video file
   - Model loads (check browser console)
   - Transcription runs
   - Results display with speaker labels

---

## Phase 2: Verification & Testing

### 2.1 Test Checklist

- [ ] **Page Load**
  - [ ] No console errors
  - [ ] UI renders correctly
  - [ ] Tailwind styles apply

- [ ] **File Input**
  - [ ] Drag and drop works
  - [ ] Click to browse works
  - [ ] Example video loads
  - [ ] Audio files work
  - [ ] Video files work

- [ ] **Model Loading**
  - [ ] First-time download shows progress
  - [ ] Models cache in IndexedDB
  - [ ] Subsequent loads are instant
  - [ ] WebGPU detection works
  - [ ] WebAssembly fallback works

- [ ] **Transcription**
  - [ ] Transcription completes successfully
  - [ ] Word-level timestamps appear
  - [ ] Speaker labels display correctly
  - [ ] Transcript is accurate
  - [ ] Timing matches audio

- [ ] **UI Interactions**
  - [ ] Language selector works
  - [ ] Clicking words seeks audio
  - [ ] Current word highlights
  - [ ] Download transcript works
  - [ ] JSON export is valid

- [ ] **Performance**
  - [ ] Page is responsive during load
  - [ ] No UI freezing
  - [ ] Memory usage acceptable
  - [ ] Model download is resumable

### 2.2 Browser Compatibility Testing

Test in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (WebGPU may not work)

### 2.3 Known Issues from Source Project

1. **Safari M1/M2**: ONNX runtime errors - show helpful message
2. **WebGPU**: Not supported in all browsers - fallback to WebAssembly
3. **Large files**: May run out of memory - add file size check
4. **Worker MIME type**: Ensure server serves .js with correct type

### 2.4 Document Issues

Create `WEB_TRANSC_ISSUES.md` documenting:

- What works
- What doesn't work
- Workarounds needed
- Browser-specific issues

---

## Phase 3: TypeScript Migration & shadCN Integration

### 3.1 TypeScript Conversion

**Priority order**:

1. `WhisperProgress.tsx` (simplest)
2. `WhisperLanguageSelector.tsx`
3. `WhisperMediaInput.tsx`
4. `WhisperTranscript.tsx`
5. `WhisperDiarization.tsx` (most complex)

**For each component**:

1. Rename `.jsx` → `.tsx`
2. Add type annotations
3. Define interfaces for props
4. Type state variables
5. Type event handlers
6. Export types for use in other components

### 3.2 Type Definitions

Create `src/app/web-transc/types/index.ts`:

```typescript
export interface AudioData {
  buffer: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface TranscriptChunk {
  text: string;
  timestamp: [number, number];
}

export interface SpeakerSegment {
  id: number;
  label: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResult {
  transcript: {
    text: string;
    chunks: TranscriptChunk[];
  };
  segments: SpeakerSegment[];
}

export interface ProgressItem {
  file: string;
  progress: number;
  total: number;
  loaded: number;
  status: string;
  name: string;
}

export type TranscriptionStatus = null | "loading" | "ready" | "running";

export interface WorkerMessage {
  status:
    | "loading"
    | "initiate"
    | "progress"
    | "done"
    | "loaded"
    | "complete";
  data?: any;
  file?: string;
  progress?: number;
  total?: number;
  result?: TranscriptionResult;
  time?: number;
}
```

### 3.3 shadCN Component Replacements

**Existing shadCN components to use**:

1. **Button** (`@/components/ui/button`)
   - Replace: Basic `<button>` in WhisperDiarization
   - Props: `variant`, `size`, `disabled`

2. **Progress** (`@/components/ui/progress`)
   - Replace: WhisperProgress component
   - Props: `value`, `className`

3. **Select** (`@/components/ui/select`)
   - Replace: WhisperLanguageSelector
   - Components: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`

4. **Card** (`@/components/ui/card`)
   - Wrap: Transcript display
   - Components: `Card`, `CardHeader`, `CardTitle`, `CardContent`

5. **Dialog** (`@/components/ui/dialog`)
   - Optional: Add settings modal

6. **Badge** (`@/components/ui/badge`)
   - For: Speaker labels

7. **ScrollArea** (`@/components/ui/scroll-area`)
   - For: Transcript scrolling

### 3.4 Component Redesign

**WhisperProgress.tsx** (Use shadCN):

```tsx
import { Progress } from "@/components/ui/progress";

interface WhisperProgressProps {
  text: string;
  percentage: number;
  total: number;
}

export default function WhisperProgress({
  text,
  percentage,
  total,
}: WhisperProgressProps) {
  const displayPercentage = percentage ?? 0;

  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{text}</span>
        <span>{displayPercentage.toFixed(0)}%</span>
      </div>
      <Progress value={displayPercentage} className="h-2" />
      {total && (
        <div className="text-muted-foreground mt-1 text-xs">
          {(total / 1024 / 1024).toFixed(2)} MB
        </div>
      )}
    </div>
  );
}
```

**WhisperLanguageSelector.tsx** (Use shadCN):

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WhisperLanguageSelectorProps {
  language: string;
  setLanguage: (lang: string) => void;
  className?: string;
}

export default function WhisperLanguageSelector({
  language,
  setLanguage,
  className,
}: WhisperLanguageSelectorProps) {
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    // ... more languages
  ];

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map(({ code, name }) => (
          <SelectItem key={code} value={code}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 3.5 Layout Improvements

**Create wrapper with better layout**:

`src/app/web-transc/page.tsx`:

```tsx
"use client";

import { Card } from "@/components/ui/card";
import WhisperDiarization from "./components/WhisperDiarization";

export default function WebTranscriptionPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          Speech Transcription with Speaker Diarization
        </h1>
        <p className="text-muted-foreground">
          Powered by Whisper and Pyannote • Runs entirely in your browser
        </p>
      </div>

      <Card>
        <WhisperDiarization />
      </Card>

      <div className="text-muted-foreground mt-4 text-center text-sm">
        Models are cached locally • Works offline after first use
      </div>
    </div>
  );
}
```

### 3.6 Custom Hooks

Create `src/app/web-transc/hooks/useWebGPU.ts`:

```typescript
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
```

Create `src/app/web-transc/hooks/useTranscriptionWorker.ts`:

```typescript
import { useEffect, useRef, useCallback } from "react";
import type { WorkerMessage } from "../types";

type MessageHandler = (message: WorkerMessage) => void;

export function useTranscriptionWorker(onMessage: MessageHandler) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        "/workers/whisperDiarization.worker.js",
        {
          type: "module",
        },
      );
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

  return { postMessage };
}
```

---

## Phase 4: PWA Enhancement & Polish

### 4.1 PWA Configuration

**Install PWA package**:

```bash
bun add next-pwa
```

**Update `next.config.ts`**:

```typescript
import withPWA from "next-pwa";

const nextConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/huggingface\.co\/.*$/,
      handler: "CacheFirst",
      options: {
        cacheName: "transformers-models",
        expiration: {
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});
```

**Create manifest** (`public/manifest.json`):

```json
{
  "name": "Web Transcription - NextjsV1",
  "short_name": "Transcription",
  "description": "Browser-based speech transcription with speaker diarization",
  "start_url": "/web-transc",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 4.2 Error Boundaries

Create `src/app/web-transc/components/ErrorBoundary.tsx`:

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

### 4.3 Loading States

Add skeleton loaders using shadCN:

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export function TranscriptSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
```

### 4.4 Accessibility Improvements

1. **Keyboard Navigation**
   - Ensure all interactive elements are keyboard accessible
   - Add proper focus states

2. **ARIA Labels**
   - Add aria-labels to buttons
   - Add aria-live regions for status updates
   - Add aria-describedby for progress

3. **Screen Reader Support**
   - Announce transcription progress
   - Announce completion
   - Proper heading hierarchy

### 4.5 Performance Optimizations

1. **Code Splitting**

   ```typescript
   const WhisperDiarization = dynamic(
     () => import('./components/WhisperDiarization'),
     {
       loading: () => <LoadingSkeleton />,
       ssr: false
     }
   );
   ```

2. **Memoization**
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for event handlers
   - Use `React.memo` for components

3. **Worker Pooling** (Optional for batch processing)
   - Create multiple workers for parallel processing
   - Implement queue system

### 4.6 Documentation

Create `src/app/web-transc/README.md`:

```markdown
# Web Transcription Feature

## Overview

Browser-based speech transcription with speaker diarization.

## Features

- Whisper-based transcription
- Speaker diarization (pyannote)
- Word-level timestamps
- Interactive transcript
- Export to JSON
- Offline support

## Usage

1. Navigate to `/web-transc`
2. Upload audio/video file
3. Click "Load model" (first time only)
4. Select language
5. Click "Run model"
6. View results with speaker labels

## Technical Details

- Models: whisper-base (77-196MB) + pyannote (6MB)
- Runs entirely client-side
- Uses WebGPU when available, falls back to WebAssembly
- Models cached in IndexedDB

## Browser Support

- Chrome/Edge: Full support (WebGPU)
- Firefox: Full support (WebAssembly)
- Safari: Limited support (WebAssembly only)

## Known Issues

See WEB_TRANSC_ISSUES.md

## Development

- Source: `src/app/web-transc/`
- Worker: `public/workers/whisperDiarization.worker.js`
```

---

## Implementation Checklist

### Phase 1: Basic Implementation

- [ ] Install `@huggingface/transformers`
- [ ] Copy all component files
- [ ] Copy worker file to `public/workers/`
- [ ] Create Next.js page wrapper
- [ ] Update worker path in component
- [ ] Configure Next.js for Web Workers
- [ ] Test basic functionality

### Phase 2: Verification

- [ ] Test all input methods
- [ ] Test model loading
- [ ] Test transcription
- [ ] Test speaker diarization
- [ ] Test export
- [ ] Test in multiple browsers
- [ ] Document issues

### Phase 3: TypeScript Migration

- [ ] Create type definitions
- [ ] Convert WhisperProgress to TypeScript
- [ ] Convert WhisperLanguageSelector to TypeScript
- [ ] Convert WhisperMediaInput to TypeScript
- [ ] Convert WhisperTranscript to TypeScript
- [ ] Convert WhisperDiarization to TypeScript
- [ ] Replace with shadCN components
- [ ] Create custom hooks
- [ ] Improve layout

### Phase 4: PWA Enhancement

- [ ] Add PWA support
- [ ] Create manifest
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Improve accessibility
- [ ] Optimize performance
- [ ] Write documentation

---

## Success Criteria

1. ✅ Feature works in all major browsers
2. ✅ Models load and cache correctly
3. ✅ Transcription is accurate with speaker labels
4. ✅ UI is responsive and intuitive
5. ✅ Code follows project standards (TypeScript, shadCN)
6. ✅ Offline functionality works
7. ✅ Performance is acceptable (no freezing)
8. ✅ Accessible to keyboard and screen readers
9. ✅ Well documented

---

## Estimated Timeline

- **Phase 1**: 1-2 hours
- **Phase 2**: 30 minutes
- **Phase 3**: 2-3 hours
- **Phase 4**: 1-2 hours

**Total**: 5-8 hours

---

## Dependencies to Install

```bash
bun add @huggingface/transformers@^3.0.0
```

Optional for PWA:

```bash
bun add next-pwa
```

---

## Notes

1. **WebGPU Support**: Experimental, may not work in all browsers
2. **Model Size**: First download is ~200MB, but cached
3. **Privacy**: All processing is client-side, no data sent to servers
4. **Offline**: Works completely offline after models are cached
5. **Mobile**: May have memory issues on low-end devices

---

## Future Enhancements

1. **Model Selection**: Allow users to choose model size
2. **Real-time Recording**: Add microphone input
3. **Batch Processing**: Process multiple files
4. **Custom Models**: Support fine-tuned models
5. **Better Speakers**: Improve speaker identification
6. **Editing**: Allow manual correction of transcript
7. **Search**: Search within transcript
8. **Subtitles**: Export as SRT/VTT format

---

## Resources

- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [Whisper Model](https://huggingface.co/onnx-community/whisper-base_timestamped)
- [Pyannote Model](https://huggingface.co/onnx-community/pyannote-segmentation-3.0)
- [Original whisper-speaker-diarization](../../whisper-speaker-diarization/whisper-speaker-diarization/)
- [whisper-web Reference](../../whisper-web/)

---

**Created**: 2025-10-10
**Status**: Ready to implement
