"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import FileUploader from "./FileUploader";

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  username?: string;
  onUploadComplete: (imageUrl: string) => void;
  buttonVariant?: "ghost" | "outline" | "default";
}

export default function ProfileImageUpload({
  currentImageUrl,
  username,
  onUploadComplete,
  buttonVariant = "outline"
}: ProfileImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Effect to update preview when currentImageUrl changes
  useEffect(() => {
    if (currentImageUrl && currentImageUrl !== previewImage) {
      console.log("Current image URL updated:", currentImageUrl);
    }
  }, [currentImageUrl, previewImage]);

  // Reset errors when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setUploadError(null);
    }
  }, [isOpen]);

  // Handle successful upload
  const handleUploadComplete = (imageUrl: string) => {
    console.log("Profile image uploaded:", imageUrl);
    
    // Set the preview image
    setPreviewImage(imageUrl);
    
    // Call the parent handler with the new URL
    onUploadComplete(imageUrl);
    
    // Show success toast
    toast.success("Profile picture updated!");
    
    // Close dialog after successful upload with a slight delay
    setTimeout(() => setIsOpen(false), 2000);
  };

  // Handle upload errors
  const handleUploadError = (error: Error) => {
    console.error("Error uploading image:", error);
    setUploadError(error.message || "An error occurred while uploading the image.");
    toast.error("Failed to upload image. Please try again.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className="mt-2">
          Change Photo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={previewImage || currentImageUrl || '/avatar-placeholder.png'} 
              alt={username || "User"} 
            />
            <AvatarFallback className="bg-primary/10">
              <UserIcon className="h-12 w-12 text-primary/80" />
            </AvatarFallback>
          </Avatar>
          
          <div className="grid w-full gap-2">
            <FileUploader
              type="avatar"
              endpoint="imageUploader"
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              buttonText="Upload New Photo"
              variant="default"
              allowedTypes={['image/jpeg', 'image/png', 'image/gif']}
              maxSize={4 * 1024 * 1024} // 4MB max
              showProgress={true}
            />
          </div>
          
          {uploadError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {uploadError}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-4">
            <p>Allowed formats: JPEG, PNG, GIF</p>
            <p>Maximum size: 4MB</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 