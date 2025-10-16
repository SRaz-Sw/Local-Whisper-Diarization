"use client";

import { useState, useEffect } from "react";
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
import type { SavedTranscript } from "@/lib/localStorage/schemas";

interface EditConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: SavedTranscript | null;
  onSave: (conversationName: string) => Promise<void>;
}

export function EditConversationModal({
  open,
  onOpenChange,
  transcript,
  onSave,
}: EditConversationModalProps) {
  const [conversationName, setConversationName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Update form when transcript changes
  useEffect(() => {
    if (transcript) {
      setConversationName(
        transcript.metadata.conversationName || transcript.metadata.fileName
      );
    }
  }, [transcript]);

  const handleSave = async () => {
    if (!conversationName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(conversationName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save conversation name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Conversation Name</DialogTitle>
          <DialogDescription>
            Give this conversation a custom name. The original filename will be
            preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="conversationName">Conversation Name</Label>
            <Input
              id="conversationName"
              value={conversationName}
              onChange={(e) => setConversationName(e.target.value)}
              placeholder="Enter conversation name..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            {transcript && (
              <p className="text-muted-foreground text-xs">
                Original filename: {transcript.metadata.fileName}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !conversationName.trim()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
