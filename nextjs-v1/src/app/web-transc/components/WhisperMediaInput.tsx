import {
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useCallback,
} from "react";
import type {
  WhisperMediaInputProps,
  WhisperMediaInputRef,
} from "../types";

const EXAMPLE_URL =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/hopper.webm";

const WhisperMediaInput = forwardRef<
  WhisperMediaInputRef,
  WhisperMediaInputProps
>(({ onInputChange, onTimeUpdate, className, ...props }, ref) => {
  // UI states
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create a reference to the audio and video elements
  const audioElement = useRef<HTMLAudioElement>(null);
  const videoElement = useRef<HTMLVideoElement>(null);

  const currentTimeRef = useRef(0);
  useImperativeHandle(ref, () => ({
    setMediaTime(time: number) {
      if (audioElement.current?.src) {
        audioElement.current.currentTime = time;
      } else if (videoElement.current?.src) {
        videoElement.current.currentTime = time;
      }
      currentTimeRef.current = time;
    },
  }));

  const onBufferLoad = (arrayBuffer: ArrayBuffer, type: string) => {
    const blob = new Blob([arrayBuffer.slice(0)], { type: type });
    const url = URL.createObjectURL(blob);
    processFile(arrayBuffer);

    // Create a URL for the Blob
    if (type.startsWith("audio/")) {
      // Dispose the previous source
      if (videoElement.current) {
        videoElement.current.pause();
        videoElement.current.removeAttribute("src");
        videoElement.current.load();
      }

      if (audioElement.current) {
        audioElement.current.src = url;
      }
    } else if (type.startsWith("video/")) {
      // Dispose the previous source
      if (audioElement.current) {
        audioElement.current.pause();
        audioElement.current.removeAttribute("src");
        audioElement.current.load();
      }

      if (videoElement.current) {
        videoElement.current.src = url;
      }
    } else {
      alert(`Unsupported file type: ${type}`);
    }
  };

  const readFile = (file: File | null | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && e.target.result instanceof ArrayBuffer) {
        onBufferLoad(e.target.result, file.type);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    readFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    readFile(event.dataTransfer.files[0]);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "VIDEO" || target.tagName === "AUDIO") {
      e.preventDefault();
      fileInputRef.current?.click();
    } else if (target.tagName === "INPUT") {
      e.stopPropagation();
    } else {
      fileInputRef.current?.click();
      e.stopPropagation();
    }
  };

  const processFile = async (buffer: ArrayBuffer) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 16_000 });

    try {
      const audioBuffer = await audioContext.decodeAudioData(buffer);
      let audio: Float32Array;
      if (audioBuffer.numberOfChannels === 2) {
        // Merge channels
        const SCALING_FACTOR = Math.sqrt(2);
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        audio = new Float32Array(left.length);
        for (let i = 0; i < audioBuffer.length; ++i) {
          audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
        }
      } else {
        audio = audioBuffer.getChannelData(0);
      }
      onInputChange(audio);
    } catch (e) {
      alert(e);
    }
  };

  const requestRef = useRef<number>();

  const updateTime = useCallback(() => {
    let elem: HTMLAudioElement | HTMLVideoElement | null = null;
    if (audioElement.current?.src) {
      elem = audioElement.current;
    } else if (videoElement.current?.src) {
      elem = videoElement.current;
    }

    if (elem && currentTimeRef.current !== elem.currentTime) {
      currentTimeRef.current = elem.currentTime;
      onTimeUpdate(elem.currentTime);
    }

    // Request the next frame
    requestRef.current = requestAnimationFrame(updateTime);
  }, [onTimeUpdate]);

  useEffect(() => {
    // Start the animation
    requestRef.current = requestAnimationFrame(updateTime);

    return () => {
      // Cleanup on component unmount
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [updateTime]);

  return (
    <div
      {...props}
      className={className}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
    >
      <input
        type="file"
        accept="audio/*,video/*"
        onChange={handleInputChange}
        ref={fileInputRef}
        className="hidden"
      />
      <audio
        ref={audioElement}
        controls
        style={{
          display: audioElement.current?.src ? "block" : "none",
        }}
        className="max-h-full w-full"
      />
      <video
        ref={videoElement}
        controls
        style={{
          display: videoElement.current?.src ? "block" : "none",
        }}
        className="max-h-full w-full"
      />
      {!audioElement.current?.src && !videoElement.current?.src && (
        <div
          className="flex h-[250px] w-full flex-col items-center justify-center rounded-md border-2 border-dashed"
          style={{
            borderColor: dragging ? "blue" : "lightgray",
          }}
        >
          <span className="text-center text-gray-600 dark:text-gray-300">
            <u>Drag & drop</u> or <u>click</u>
            <br />
            to select media
          </span>
          <span
            className="mt-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={async (e) => {
              e.stopPropagation();
              const buffer = await fetch(EXAMPLE_URL).then((r) =>
                r.arrayBuffer(),
              );
              if (videoElement.current) {
                videoElement.current.src = URL.createObjectURL(
                  new Blob([buffer], {
                    type: "video/mp4",
                  }),
                );
              }
              onBufferLoad(buffer, "video/mp4");
            }}
          >
            (or <u>try an example</u>)
          </span>
        </div>
      )}
    </div>
  );
});

WhisperMediaInput.displayName = "WhisperMediaInput";

export default WhisperMediaInput;

