"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  Zap,
  Target,
  Globe,
  CheckCircle2,
  HardDrive,
  Cpu,
} from "lucide-react";
import {
  AVAILABLE_MODELS,
  getModelDisplayName,
  getSortedModels,
  type ModelConfig,
} from "../config/modelConfig";
import type { DeviceType } from "../types";
import {
  getSystemCapabilities,
  checkCachedModels,
  getRecommendedModel,
  type SystemCapabilities,
  type CachedModelInfo,
} from "../utils/systemInfo";

interface ModelSelectorProps {
  currentModel: string;
  device: DeviceType;
  disabled?: boolean;
  onModelChange: (modelId: string) => void;
}

const speedIcons = {
  fastest: "🚀",
  fast: "⚡",
  medium: "🎯",
  slow: "🐢",
  slowest: "🐌",
};

const accuracyColors = {
  basic: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  good: "bg-green-500/20 text-green-700 dark:text-green-300",
  better: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  best: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  excellent: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
};

export function ModelSelector({
  currentModel,
  device,
  disabled,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [systemCapabilities, setSystemCapabilities] =
    useState<SystemCapabilities | null>(null);
  const [cachedModels, setCachedModels] = useState<CachedModelInfo[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<string[]>([]);

  const models = getSortedModels(device);
  const currentModelConfig = AVAILABLE_MODELS[currentModel];

  // Load system capabilities and cached models when dialog opens
  useEffect(() => {
    if (isOpen) {
      const loadSystemInfo = async () => {
        const capabilities = await getSystemCapabilities();
        setSystemCapabilities(capabilities);

        const recommended = getRecommendedModel(capabilities);
        setRecommendedModels(recommended);

        const modelIds = Object.keys(AVAILABLE_MODELS);
        const cached = await checkCachedModels(modelIds);
        setCachedModels(cached);
      };

      loadSystemInfo();
    }
  }, [isOpen]);

  const handleApply = () => {
    if (selectedModel !== currentModel) {
      onModelChange(selectedModel);
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outline"
            size="lg"
            disabled={disabled}
            className="shadow-lg transition-shadow hover:shadow-xl"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Model Settings
          </Button>
        </motion.div>
      </DialogTrigger>

      <DialogContent className="flex max-h-[70svh] w-[95vw] max-w-4xl flex-col gap-0 p-0 sm:w-[90vw] md:w-[85vw] lg:w-[75vw]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-2xl">Model Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {/* System Capabilities Info */}
          <div className="bg-muted/50 border-primary/50 mb-4 space-y-3 rounded-lg border-1 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="text-primary h-4 w-4" />
              <span className="font-semibold">Current Device:</span>
              <Badge variant="secondary" className="capitalize">
                {device === "webgpu"
                  ? "WebGPU (Hardware Accelerated)"
                  : "WebAssembly"}
              </Badge>
            </div>

            {systemCapabilities && (
              <div className="text-muted-foreground space-y-2 text-xs">
                {systemCapabilities.hasWebGPU && (
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3 w-3" />
                    <span>
                      GPU Memory: ~{systemCapabilities.gpuMemoryMB}MB
                      {systemCapabilities.maxBufferSizeMB &&
                        ` | Max Buffer: ${systemCapabilities.maxBufferSizeMB}MB`}
                    </span>
                  </div>
                )}
                {systemCapabilities.estimatedRAMGB && (
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-3 w-3" />
                    <span>
                      System RAM: ~{systemCapabilities.estimatedRAMGB}GB
                    </span>
                  </div>
                )}
                {recommendedModels.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <span className="text-foreground font-medium">
                      💡 Recommended for your system:{" "}
                    </span>
                    <span>
                      {recommendedModels
                        .map(
                          (id) => AVAILABLE_MODELS[id]?.name || "Unknown",
                        )
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 
            The separate select dropdown here duplicates the functionality of the "All Available Models" list below.
            The only unique logic in this dropdown is that it provides a compact way to select a model, whereas the 
            "All Available Models" section provides additional context (like caching, recommendation, and selection highlighting)
            and clicking on an entry selects the model.
            Since "All Available Models" already supports selecting a model via card clicks AND displays all relevant details,
            we can safely remove this dropdown to eliminate redundancy.
          */}

          {/* Model Details */}
          <AnimatePresence mode="wait">
            {selectedModel && AVAILABLE_MODELS[selectedModel] && (
              <motion.div
                key={selectedModel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card space-y-4 rounded-lg border p-4"
              >
                <ModelDetails
                  model={AVAILABLE_MODELS[selectedModel]}
                  device={device}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Models Comparison */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              All Available Models:
            </h3>
            <div className="space-y-2">
              {models.map((model) => {
                const cachedInfo = cachedModels.find(
                  (c) => c.modelId === model.id,
                );
                const isRecommended = recommendedModels.includes(model.id);
                return (
                  <ModelComparisonCard
                    key={model.id}
                    model={model}
                    device={device}
                    isSelected={selectedModel === model.id}
                    isCurrent={currentModel === model.id}
                    isCached={cachedInfo?.isCached || false}
                    isRecommended={isRecommended}
                    onSelect={() => setSelectedModel(model.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Warning about model change */}
          {selectedModel !== currentModel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4"
            >
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ <strong>Note:</strong> Changing the model will require
                downloading new model files{" "}
                {selectedModel && (
                  <>
                    (~
                    {AVAILABLE_MODELS[selectedModel].sizes[device]}
                    MB)
                  </>
                )}
                . The model will be cached for future use.
              </p>
            </motion.div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedModel === currentModel}
          >
            {selectedModel === currentModel
              ? "No Changes"
              : "Apply Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelDetails({
  model,
  device,
}: {
  model: ModelConfig;
  device: DeviceType;
}) {
  const size = device === "webgpu" ? model.sizes.webgpu : model.sizes.wasm;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{model.name}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {model.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Target className="text-primary h-4 w-4" />
            <span className="font-medium">Accuracy:</span>
          </div>
          <Badge
            className={`${accuracyColors[model.accuracy]} capitalize`}
            variant="secondary"
          >
            {model.accuracy}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="text-primary h-4 w-4" />
            <span className="font-medium">Speed:</span>
          </div>
          <Badge variant="secondary" className="capitalize">
            {speedIcons[model.speed]} {model.speed}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="text-primary h-4 w-4" />
            <span className="font-medium">Languages:</span>
          </div>
          <Badge variant="secondary" className="capitalize">
            {model.languages === "multilingual" ? "100+" : "English Only"}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="text-primary h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="font-medium">Size:</span>
          </div>
          <Badge variant="secondary">{size}MB</Badge>
        </div>
      </div>
    </div>
  );
}

function ModelComparisonCard({
  model,
  device,
  isSelected,
  isCurrent,
  isCached,
  isRecommended,
  onSelect,
}: {
  model: ModelConfig;
  device: DeviceType;
  isSelected: boolean;
  isCurrent: boolean;
  isCached: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const size = device === "webgpu" ? model.sizes.webgpu : model.sizes.wasm;

  return (
    <motion.button
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-muted hover:border-primary/50 hover:bg-muted/50"
      } ${isRecommended ? "ring-2 ring-green-500/20" : ""}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{model.name}</span>
            {isCurrent && (
              <Badge variant="default" className="text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Current
              </Badge>
            )}
            {isCached && (
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-xs text-green-700 dark:text-green-300"
              >
                ✓ Cached
              </Badge>
            )}
            {isRecommended && (
              <Badge
                variant="secondary"
                className="bg-blue-500/20 text-xs text-blue-700 dark:text-blue-300"
              >
                💡 Recommended
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span>{size}MB</span>
            <span>•</span>
            <span className="capitalize">{model.accuracy}</span>
            <span>•</span>
            <span>
              {speedIcons[model.speed]} {model.speed}
            </span>
          </div>
        </div>
        {isSelected && !isCurrent && (
          <CheckCircle2 className="text-primary h-5 w-5" />
        )}
      </div>
    </motion.button>
  );
}
