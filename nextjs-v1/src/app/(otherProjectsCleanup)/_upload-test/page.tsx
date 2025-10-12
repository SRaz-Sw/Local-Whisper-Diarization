"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import FileUploader from "@/components/upload/FileUploader";
import { getStorageService, resetStorageService } from "@/lib/storage/index";
import { StorageProviderType } from "@/lib/storage/types";
import { ACTIVE_STORAGE_PROVIDER } from "@/config/storage";
import Image from "next/image";

export default function UploadTestPage() {
  const [activeProvider, setActiveProvider] = useState<StorageProviderType>(ACTIVE_STORAGE_PROVIDER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  
  // Initialize the page
  useEffect(() => {
    const initialize = async () => {
      try {
        // Try to initialize the storage service to validate config
        await getStorageService(activeProvider);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error initializing storage service:", err);
        setError(`Failed to initialize ${activeProvider} provider. Please check your configuration.`);
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [activeProvider]);
  
  // Handle provider change
  const handleProviderChange = async (provider: StorageProviderType) => {
    setIsLoading(true);
    setError(null);
    setUploadedUrl(null);
    
    // Reset the current storage service to force re-initialization with the new provider
    resetStorageService();
    
    // Update the active provider
    setActiveProvider(provider);
  };
  
  // Handle upload complete
  const handleUploadComplete = (url: string) => {
    console.log("Upload completed:", url);
    setUploadedUrl(url);
  };
  
  // Handle upload error
  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    setError(error.message);
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Storage Provider Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Storage Provider</CardTitle>
          <CardDescription>
            Choose which storage provider to use for file uploads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={activeProvider}
            onValueChange={(value) => handleProviderChange(value as StorageProviderType)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Select a storage provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uploadthing">UploadThing</SelectItem>
              <SelectItem value="cloudinary">Cloudinary</SelectItem>
              <SelectItem value="mock">Mock (Testing)</SelectItem>
            </SelectContent>
          </Select>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Current provider: <strong>{activeProvider}</strong>
          </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload a File</CardTitle>
          <CardDescription>
            Test uploading a file using the selected storage provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <FileUploader
                type="image"
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                buttonText={`Upload Image with ${activeProvider}`}
                variant="default"
                allowedTypes={['image/jpeg', 'image/png', 'image/gif']}
                maxSize={4 * 1024 * 1024} // 4MB max
                showProgress={true}
              />
              
              {uploadedUrl && (
                <div className="mt-6 p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Uploaded Image</h3>
                  <div className="aspect-video relative bg-muted rounded-md overflow-hidden">
                    <Image
                      src={uploadedUrl}
                      alt="Uploaded image"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {uploadedUrl}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-2">
          <div className="flex items-start gap-2">
            <InfoIcon className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>When using <strong>Cloudinary</strong>, make sure you have set the following environment variables:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</li>
                <li>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <InfoIcon className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>When using <strong>UploadThing</strong>, ensure your server is running and the endpoints are configured.</p>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 