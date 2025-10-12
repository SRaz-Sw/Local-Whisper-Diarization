"use client";

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Link, 
  File, 
  X, 
  FileType, 
  Upload,
  MessageSquare,
  ArrowUpIcon 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Define the props
interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: (url: string, file?: File, textContent?: string) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function SourceModal({ isOpen, onClose, onSourceAdded }: SourceModalProps) {
  const [activeTab, setActiveTab] = useState<string>("file");
  const [textContent, setTextContent] = useState<string>("");
  const [isSubmittingText, setIsSubmittingText] = useState<boolean>(false);
  // Add a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add state for drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Validate files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name} (exceeds size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
        return;
      }
      
      validFiles.push(file);
    });
    
    // Notify about invalid files
    if (invalidFiles.length > 0) {
      toast.error(`Some files couldn't be added: ${invalidFiles.join(', ')}`);
    }
    
    // Process valid files
    if (validFiles.length > 0) {
      // Call onSourceAdded for each file and immediately close the modal
      validFiles.forEach(file => {
        onSourceAdded('', file);
      });
      
      // Close the modal immediately
      onClose();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmitText = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter some text content");
      return;
    }

    setIsSubmittingText(true);
    try {
      // Create a blob of text content
      const blob = new Blob([textContent], { type: 'text/plain' });
      // Create a file name for the text content
      const fileName = `text-note-${new Date().toISOString().slice(0, 10)}.txt`;
      
      // Convert blob to file without using the File constructor
      const blobWithName = new Blob([blob], { type: 'text/plain' });
      Object.defineProperty(blobWithName, 'name', {
        value: fileName,
        writable: false
      });
      
      onSourceAdded('', blobWithName as File, textContent);
      setTextContent("");
      onClose();
    } catch (error) {
      console.error("Error submitting text:", error);
      toast.error("Failed to save text content");
    } finally {
      setIsSubmittingText(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add sources</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            Sources let NotebookLM base its responses on the information that matters most to you.
            (Examples: marketing plans, course reading, research notes, meeting transcripts, sales documents, etc.)
          </p>
          
          <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileType className="h-4 w-4" />
                <span>Upload File</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Paste Text</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="mt-2">
              <div 
                className={`border rounded-lg p-6 bg-muted/30 ${isDragging ? "border-primary border-dashed" : "border-dashed border-muted-foreground/30"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/mpeg,audio/wav,video/mp4,video/quicktime,image/jpeg,image/png,image/gif"
                />
                
                <div 
                  className="flex flex-col items-center justify-center py-10 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">
                    Drag & drop files or click to browse
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload documents, images, audio, or videos
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Supported file types: PDF, txt, Markdown, Audio (e.g. mp3), Word documents
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="mt-2">
              <div className="border rounded-lg p-6 bg-muted/30">
                <Textarea
                  placeholder="Paste or type your text here..."
                  className="min-h-[200px] resize-none"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={handleSubmitText} 
                    disabled={isSubmittingText || !textContent.trim()}
                    className="gap-2"
                  >
                    {isSubmittingText ? (
                      <>Submitting...</>
                    ) : (
                      <>
                        <ArrowUpIcon className="h-4 w-4" />
                        Submit Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 border-t pt-4">
          <div className="flex items-center gap-1">
            Source limit <span className="ml-auto">0 / 50</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SourceModal; 