"use client";

/**
 * ConversationImageUpload Component
 * 
 * This component handles uploading and updating conversation/group images
 * using the FileUploader abstraction to ensure provider agnosticism
 */

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCircle2, Users } from "lucide-react";
import FileUploader from "./FileUploader";

interface ConversationImageUploadProps {
  /**
   * Current image URL if one exists
   */
  currentImageUrl?: string;
  
  /**
   * Conversation name to use as fallback
   */
  conversationName?: string;
  
  /**
   * Whether this is a group conversation (affects the fallback icon)
   */
  isGroup?: boolean;
  
  /**
   * Callback when an image is successfully uploaded
   */
  onUploadComplete: (imageUrl: string) => void;
  
  /**
   * Button variant
   */
  buttonVariant?: "ghost" | "outline" | "default";
  
  /**
   * Button text
   */
  buttonText?: string;
}

export default function ConversationImageUpload({
  currentImageUrl,
  conversationName,
  isGroup = false,
  onUploadComplete,
  buttonVariant = "outline",
  buttonText = "Change Image"
}: ConversationImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Handle successful upload
  const handleUploadComplete = (imageUrl: string) => {
    console.log("Conversation image uploaded:", imageUrl);
    
    // Update preview
    setPreviewImage(imageUrl);
    
    // Notify parent
    onUploadComplete(imageUrl);
    
    // Show success message
    toast.success("Conversation image updated");
    
    // Close the dialog after a delay
    setTimeout(() => setIsOpen(false), 1500);
  };
  
  // Handle upload errors
  const handleUploadError = (error: Error) => {
    console.error("Error uploading conversation image:", error);
    toast.error("Failed to upload image. Please try again.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className="mt-2">
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isGroup ? "Update Group Image" : "Update Conversation Image"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={previewImage || currentImageUrl || undefined} 
              alt={conversationName || "Conversation"} 
            />
            <AvatarFallback className="bg-primary/10">
              {isGroup ? (
                <Users className="h-12 w-12 text-primary/80" />
              ) : (
                <UserCircle2 className="h-12 w-12 text-primary/80" />
              )}
            </AvatarFallback>
          </Avatar>
          
          <FileUploader
            type="image"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            buttonText="Upload New Image"
            variant="default"
            className="w-full"
            maxSize={4 * 1024 * 1024} // 4MB max
            allowedTypes={['image/jpeg', 'image/png', 'image/gif']}
            showProgress={true}
          />
          
          <div className="text-xs text-muted-foreground mt-2">
            <p>Allowed formats: JPEG, PNG, GIF</p>
            <p>Maximum size: 4MB</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 