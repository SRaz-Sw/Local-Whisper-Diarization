"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { SavedTranscript } from "@/lib/localStorage/schemas";

interface EditSpeakersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: SavedTranscript | null;
  onSave: (speakerNames: Record<string, string>) => Promise<void>;
}

export function EditSpeakersModal({
  open,
  onOpenChange,
  transcript,
  onSave,
}: EditSpeakersModalProps) {
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Extract unique speakers from segments
  const speakers = useMemo(() => {
    if (!transcript) return [];

    const uniqueSpeakers = new Set<string>();
    transcript.segments.forEach((segment) => {
      if (segment.label !== "NO_SPEAKER") {
        uniqueSpeakers.add(segment.label);
      }
    });

    // Sort speakers alphabetically
    return Array.from(uniqueSpeakers).sort();
  }, [transcript]);

  // Initialize speaker names from transcript metadata
  useEffect(() => {
    if (transcript && speakers.length > 0) {
      const initialNames: Record<string, string> = {};
      speakers.forEach((speaker) => {
        initialNames[speaker] =
          transcript.metadata.speakerNames?.[speaker] || speaker;
      });
      setSpeakerNames(initialNames);
    }
  }, [transcript, speakers]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only save non-empty names that differ from the default
      const filteredNames: Record<string, string> = {};
      Object.entries(speakerNames).forEach(([speaker, name]) => {
        const trimmedName = name.trim();
        if (trimmedName && trimmedName !== speaker) {
          filteredNames[speaker] = trimmedName;
        }
      });

      await onSave(filteredNames);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save speaker names:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpeakerNameChange = (speaker: string, name: string) => {
    setSpeakerNames((prev) => ({
      ...prev,
      [speaker]: name,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Speaker Names</DialogTitle>
          <DialogDescription>
            Customize the display names for each speaker in this conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {speakers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No speakers found in this transcript.
            </p>
          ) : (
            speakers.map((speaker) => (
              <div key={speaker} className="grid gap-2">
                <Label htmlFor={speaker} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {speaker}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    Display as:
                  </span>
                </Label>
                <Input
                  id={speaker}
                  value={speakerNames[speaker] || ""}
                  onChange={(e) =>
                    handleSpeakerNameChange(speaker, e.target.value)
                  }
                  placeholder={speaker}
                />
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
