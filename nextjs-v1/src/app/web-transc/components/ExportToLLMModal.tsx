"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  Save,
  Trash2,
  FileText,
  Sparkles,
  Users,
  Clock,
  Code2,
  Eye,
} from "lucide-react";

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

// Import commands - need to do this separately since it's not a React component
import {
  getCommands,
  getExtraCommands,
} from "@uiw/react-md-editor/commands";
import { useWhisperStore } from "../store/useWhisperStore";
import {
  formatTranscriptForLLM,
  formatTimestamp,
  getTranscriptDuration,
  getUniqueSpeakerCount,
} from "../utils/transcriptFormatter";
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  DEFAULT_TEMPLATES,
  type PromptTemplate,
} from "../utils/templateStorage";
import type { TranscriptChunk, SpeakerSegment } from "../types";

interface ExportToLLMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chunks: TranscriptChunk[];
  segments: SpeakerSegment[];
}

export function ExportToLLMModal({
  open,
  onOpenChange,
  chunks,
  segments,
}: ExportToLLMModalProps) {
  // Get speaker names from store
  const speakerNames = useWhisperStore(
    (state) => state.transcription.speakerNames,
  );

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    DEFAULT_TEMPLATES[0].id,
  );
  const [customPrompt, setCustomPrompt] = useState(
    DEFAULT_TEMPLATES[0].content,
  );
  const [copied, setCopied] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(
    null,
  );

  const formattedTranscript = formatTranscriptForLLM(
    chunks,
    segments,
    speakerNames,
  );
  const duration = getTranscriptDuration(chunks);
  const speakerCount = getUniqueSpeakerCount(segments);

  // Load templates on mount
  useEffect(() => {
    setTemplates(getTemplates());
  }, [open]);

  // Check if prompt has been modified
  useEffect(() => {
    const currentTemplate = templates.find(
      (t) => t.id === selectedTemplateId,
    );
    if (currentTemplate) {
      setIsModified(customPrompt !== currentTemplate.content);
    }
  }, [customPrompt, selectedTemplateId, templates]);

  // Update prompt when template changes
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setCustomPrompt(template.content);
      setIsModified(false);
    }
  };

  const handleCopy = async () => {
    // Combine the custom prompt with the formatted transcript
    const fullText = `${customPrompt}\n\n${formattedTranscript}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard. Please try again.");
    }
  };

  const handleSaveTemplate = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    saveTemplate(templateName, customPrompt);
    const updatedTemplates = getTemplates();
    setTemplates(updatedTemplates);
    setShowSaveDialog(false);
    setTemplateName("");
    setIsModified(false);

    // Select the newly saved template
    const newTemplate = updatedTemplates.find(
      (t) => t.name === templateName && t.content === customPrompt,
    );
    if (newTemplate) {
      setSelectedTemplateId(newTemplate.id);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete && deleteTemplate(templateToDelete)) {
      const updatedTemplates = getTemplates();
      setTemplates(updatedTemplates);
      // Switch to default template
      setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
      setCustomPrompt(DEFAULT_TEMPLATES[0].content);
    }
    setShowDeleteDialog(false);
    setTemplateToDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85svh] w-[95vw] max-w-4xl min-w-[80svw] flex-col gap-0 p-0 lg:w-[85svw]">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="from-primary/20 to-primary/5 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br">
                <Sparkles className="text-primary h-5 w-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl">
                  Export to LLM
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Create a custom prompt and export your transcription
                </DialogDescription>
              </div>
              {/* Stats badges */}
              <div className="hidden items-center gap-2 sm:flex">
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(duration)}
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Users className="h-3 w-3" />
                  {speakerCount}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Template Selector */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold">
                Prompt Template
              </label>
              <div className="flex gap-2">
                <Select
                  value={selectedTemplateId}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isModified && (
                  <Button
                    onClick={handleSaveTemplate}
                    variant="outline"
                    size="default"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                )}
                {selectedTemplateId !== DEFAULT_TEMPLATES[0].id &&
                  !isModified && (
                    <Button
                      onClick={() =>
                        handleDeleteTemplate(selectedTemplateId)
                      }
                      variant="outline"
                      size="default"
                      className="hover:border-destructive hover:bg-destructive/5 hover:text-destructive gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            </div>

            {/* Editable Prompt Section with Tabs */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold">
                Custom Instructions
              </label>

              <div
                className="overflow-hidden rounded-lg border [&_.w-md-editor-toolbar]:h-[54px]! [&_.w-md-editor-toolbar]:items-center [&_.w-md-editor-toolbar_button]:h-10 [&_.w-md-editor-toolbar_button]:w-10 [&_.w-md-editor-toolbar_button_svg]:mx-auto [&_.w-md-editor-toolbar_button_svg]:my-auto [&_.w-md-editor-toolbar_button_svg]:h-4 [&_.w-md-editor-toolbar_button_svg]:w-4"
                data-color-mode="auto"
                style={{ height: "45svh" }}
              >
                <MDEditor
                  value={customPrompt}
                  onChange={(value) => setCustomPrompt(value || "")}
                  preview="live"
                  hideToolbar={false}
                  enableScroll={true}
                  height="100%"
                  visibleDragbar={false}
                  className="h-full !border-0"
                  textareaProps={{
                    placeholder:
                      "Enter your custom instructions here. Use the toolbar above to format text...",
                    style: { height: "100%" },
                  }}
                  commands={getCommands().filter((cmd) => {
                    // Remove commands we don't want
                    const unwantedCommands = [
                      "italic",
                      "strikethrough",
                      "hr",
                      "title4",
                      "title5",
                      "title6",
                      "quote",
                      "code",
                      "codeBlock",
                      "comment",
                      "image",
                      "unorderedList",
                      "table",
                      "issue",
                      "help",
                    ];
                    return !unwantedCommands.includes(cmd.name || "");
                  })}
                  extraCommands={getExtraCommands()}
                />
              </div>

              {/* Transcript indicator badge */}
              <div className="group from-muted/30 via-muted/20 to-muted/30 hover:border-primary/40 relative overflow-hidden rounded-lg border border-dashed bg-gradient-to-r p-3.5 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
                    <FileText className="text-primary h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold"
                      >
                        {formatTimestamp(duration)} Conversation
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        •
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {speakerCount}{" "}
                        {speakerCount === 1 ? "speaker" : "speakers"}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      Full transcript with timestamps will be inserted here
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10"
            >
              Cancel
            </Button>
            <Button onClick={handleCopy} className="h-10 gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Template</AlertDialogTitle>
            <AlertDialogDescription>
              Give your template a name to save it for future use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name (e.g., Meeting Summary)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleConfirmSave();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateName("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
