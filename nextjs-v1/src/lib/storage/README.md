# File Storage Abstraction

This directory contains a flexible file storage abstraction layer that allows the application to easily switch between different file storage providers without significant code changes.

## Overview

The storage abstraction provides a unified interface for file operations like uploading, downloading, and deleting files. It supports multiple storage providers through adapter implementations.

### Core Components:

1. **FileStorageService Interface**: Defines the contract that all storage adapters must implement
2. **Provider Adapters**: Implementations for specific storage providers (UploadThing, etc.)
3. **Storage Factory**: Creates and configures the appropriate adapter based on application configuration
4. **UI Components**: React components that work with the abstraction

## Usage

### Basic Usage

To upload a file programmatically:

```typescript
import { initializeStorageService } from "@/lib/storage";

async function uploadFile(file: File) {
  const storageService = await initializeStorageService();
  
  try {
    const response = await storageService.uploadFile(file, {
      type: 'image',
      maxFileSize: 4 * 1024 * 1024, // 4MB
    });
    
    console.log("File uploaded successfully:", response.url);
    return response.url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}
```

### Using the FileUploader Component

The `FileUploader` component provides a ready-to-use UI for file uploads:

```tsx
import FileUploader from "@/components/upload/FileUploader";

function MyComponent() {
  const handleUploadComplete = (url: string) => {
    console.log("File uploaded to:", url);
    // Update your application state with the URL
  };
  
  return (
    <FileUploader
      type="image"
      onUploadComplete={handleUploadComplete}
      buttonText="Upload Image"
      allowedTypes={['image/jpeg', 'image/png', 'image/gif']}
      maxSize={4 * 1024 * 1024} // 4MB
    />
  );
}
```

### Configuration

The storage provider can be configured in the `.env` file:

```
# Use uploadthing (default)
NEXT_PUBLIC_STORAGE_PROVIDER=uploadthing

# Or use a different provider when implemented
# NEXT_PUBLIC_STORAGE_PROVIDER=cloudinary
# NEXT_PUBLIC_STORAGE_PROVIDER=s3
```

## Supported Providers

### UploadThing (Default)

The default provider is UploadThing, which offers:
- Client-side uploads with progress tracking
- Server-side validation
- Auto-generated URLs

### Future Providers

The abstraction is designed to support additional providers in the future:

- **Cloudinary**: For advanced image transformations
- **AWS S3**: For direct Amazon S3 storage
- **Firebase Storage**: For Firebase integration

## Extending

To add a new storage provider:

1. Create a new adapter in `src/lib/storage/providers/`
2. Implement the `FileStorageService` interface
3. Update the factory in `src/lib/storage/index.ts` to support the new provider
4. Add any necessary configuration to `src/config/storage.ts`

## Error Handling

The storage abstraction includes comprehensive error handling:

- Validation errors for file types and sizes
- Upload progress tracking with error states
- Fallbacks when providers are unavailable

## Best Practices

- Always specify `maxSize` and `allowedTypes` to prevent inappropriate uploads
- Use the `onProgress` callback to provide feedback during uploads
- Implement proper error handling with user-friendly messages 