'use client';

import React, { useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { FileText, Search, Trash2, Loader2, FileAudio, FileVideo, FileImage, MessageSquare, FileType, Info, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner"; // Using sonner instead of hooks/use-toast
import { Progress } from '@/components/ui/progress';

// Import the Zustand store
import { usePreviewModalStore } from './stores/previewModalStore';
import { useSourceModalStore } from './stores/sourceModalStore';

// Import types from our types file
import { UploadedFile, SearchResult, ContractInfo, formatBytes } from '@/types/file-types';

// Import the useFilesUploader hook
import useFilesUploader, { UploadProgress } from './hooks/useFilesUploader';

// Commented out imports that might not be available
// import { extractContractInformation } from '@/ai/flows/extract-contract-info';
// import { addFileRecord, updateFileRecord, deleteFileRecord, getFileRecords } from '@/services/firestore';
// import type { UploadedFile, ContractInfo, SearchResult } from '@/types/file-types';
// import { FileDetailModal } from '@/components/file-detail-modal';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // Example: 100MB limit

// Basic implementation of a FileDetailModal if the one from the project is not available
const FileDetailModal = ({ isOpen, onClose, file, getFileIcon }: { 
  isOpen: boolean; 
  onClose: () => void; 
  file: UploadedFile; 
  getFileIcon: (mimeType?: string) => React.ReactNode;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {getFileIcon(file.mimeType)}
            {file.fileName}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </div>
        <div className="space-y-3">
          <p><span className="font-medium">Size:</span> {formatBytes(file.size)}</p>
          <p><span className="font-medium">Type:</span> {file.mimeType}</p>
          <p><span className="font-medium">Uploaded:</span> {file.uploadDate.toLocaleString()}</p>
          <p><span className="font-medium">Status:</span> {file.status}</p>
          
          {file.contractInfo && (
            <>
              <hr />
              <h4 className="font-semibold">Contract Information</h4>
              <p><span className="font-medium">Has Contract:</span> {file.contractInfo.hasContract ? 'Yes' : 'No'}</p>
              {file.contractInfo.contractSummary && (
                <p><span className="font-medium">Summary:</span> {file.contractInfo.contractSummary}</p>
              )}
              {file.contractInfo.relevantTerms && file.contractInfo.relevantTerms.length > 0 && (
                <div>
                  <span className="font-medium">Relevant Terms:</span>
                  <ul className="list-disc pl-5 mt-1">
                    {file.contractInfo.relevantTerms.map((term, idx) => (
                      <li key={idx}>{term}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          
          {file.status === 'error' && (
            <p className="text-destructive"><span className="font-medium">Error:</span> {file.errorMessage}</p>
          )}
        </div>
        <div className="mt-6">
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  // Local state for search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Remove local file state as we'll derive it from uploadProgress
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  // Get the open function from the Zustand stores
  const { open: openFilePreview } = usePreviewModalStore();
  const { open: openSourceModal } = useSourceModalStore();

  const queryClient = useQueryClient();

  // Initialize file uploader hook
  const { 
    uploadFiles, 
    cancelUpload, 
    pauseUpload,
    resumeUpload,
    isUploading, 
    uploadProgress,
    clearUploadProgressEntry
  } = useFilesUploader({
    onSuccess: (uploadedFiles) => {
      // Just show success notification - our UI will update from uploadProgress
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      // Invalidate queries to refresh any server-side data
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  });

  // Convert uploadProgress to filesToDisplay array for the UI
  const filesToDisplay = useMemo(() => {
    return Object.values(uploadProgress)
      .map((progress): UploadedFile => {
        // Map the UploadProgress to our UI UploadedFile format
        let status: "pending" | "processing" | "completed" | "error" = "pending";
        
        // Map the progress status to our UI status
        if (progress.status === 'complete') status = "completed";
        else if (progress.status === 'error') status = "error"; 
        else if (progress.status === 'processing') status = "processing";
        else if (progress.status === 'queued') status = "pending";
        else if (progress.status === 'uploading') status = "pending"; // Show as pending while uploading
        else if (progress.status === 'paused') status = "pending"; // Show as pending while paused
        
        return {
          id: progress.fileId,
          fileName: progress.finalFileName || progress.file.name,
          mimeType: progress.finalMimeType || progress.file.type,
          size: progress.finalSize || progress.file.size,
          uploadDate: progress.uploadDate,
          status,
          preview: progress.fileUrl,
          contractInfo: progress.contractInfo,
          errorMessage: progress.error?.message
        };
      })
      // Sort by upload date, newest first
      .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  }, [uploadProgress]);

  // Update the handleFileUpload function to just use the hook
  const handleFileUpload = useCallback((url: string, file?: File, textContent?: string) => {
    if (!file) {
      // If we only have the URL but not the file object,
      // we can create a basic file entry from the URL
      toast.error("URL-only uploads not supported");
      return;
    }
    
    // Use our hook to upload the file
    uploadFiles([file]);
  }, [uploadFiles]);

  // Update the removeFile function to use clearUploadProgressEntry
  const removeFile = useCallback((id: string) => {
    // If the file is currently uploading, cancel it first
    if (uploadProgress[id] && ['uploading', 'queued', 'paused'].includes(uploadProgress[id].status)) {
      cancelUpload(id);
    }
    
    // If the file was successfully uploaded, we may need to call delete API
    if (uploadProgress[id]?.status === 'complete' && uploadProgress[id]?.fileUrl) {
      // Here we could call an API to delete the file from the server
      // For now, just log it
      console.log(`Would delete file with URL: ${uploadProgress[id].fileUrl}`);
    }
    
    // Remove from our hook's state
    clearUploadProgressEntry(id);
    toast.success("File removed");
  }, [cancelUpload, uploadProgress, clearUploadProgressEntry]);
  
  // Get upload status text for the UI
  const getUploadStatusText = useCallback((fileId: string) => {
    const progress = uploadProgress[fileId];
    if (!progress) return null;
    
    switch (progress.status) {
      case 'queued':
        return <Badge variant="outline" className="text-xs shrink-0">Queued</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="text-xs shrink-0">
          Uploading {progress.progress}%
        </Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-xs shrink-0">Processing</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs shrink-0">Paused</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs shrink-0" title={progress.error?.message}>Error</Badge>;
      case 'complete':
        return <Badge variant="outline" className="bg-green-100 text-green-800 text-xs shrink-0">Complete</Badge>;
      default:
        return null;
    }
  }, [uploadProgress]);

  // Set up event listener for source added events
  useEffect(() => {
    const handleSourceAdded = (event: Event) => {
      const { url, file, textContent } = (event as CustomEvent).detail;
      handleFileUpload(url, file, textContent);
    };

    window.addEventListener('sourceAdded', handleSourceAdded);
    
    return () => {
      window.removeEventListener('sourceAdded', handleSourceAdded);
    };
  }, [handleFileUpload]);

  // Helper function to guess file type from URL
  const getFileTypeFromUrl = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (!extension) return 'application/octet-stream';
    
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt': return 'text/plain';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      default: return 'application/octet-stream';
    }
  };

  // Search Logic
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const lowerSearchTerm = searchTerm.toLowerCase();
    const results: SearchResult[] = [];

    // Basic Filtering Logic - use filesToDisplay
    filesToDisplay.forEach(file => {
      let score = 0;
      const fileNameLower = file.fileName.toLowerCase();

      // Check filename
      if (fileNameLower.includes(lowerSearchTerm)) {
        score += 10;
      }

      // Check for contract information
      if (file.contractInfo) {
        if (lowerSearchTerm === 'contract' || lowerSearchTerm === 'contracts') {
          if (file.contractInfo.hasContract) score += 50;
        }
        if (file.contractInfo.contractSummary?.toLowerCase().includes(lowerSearchTerm)) {
          score += 20;
        }
        file.contractInfo.relevantTerms?.forEach((term: string) => {
          if (term.toLowerCase().includes(lowerSearchTerm)) score += 5;
        });
      }

      if (score > 0) {
        results.push({ file, score });
      }
    });

    results.sort((a, b) => b.score - a.score);
    setSearchResults(results);
    setIsSearching(false);

    if (results.length === 0) {
      toast.error(`No files found matching "${searchTerm}"`);
    }
  };

  // Utility Functions
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileType className="h-6 w-6 text-gray-500" />;
    if (mimeType.startsWith('application/pdf')) return <FileText className="h-6 w-6 text-red-600" />;
    if (mimeType.includes('wordprocessingml')) return <FileText className="h-6 w-6 text-blue-600" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-purple-600" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="h-6 w-6 text-orange-600" />;
    if (mimeType.startsWith('image/')) return <FileImage className="h-6 w-6 text-green-600" />;
    if (mimeType.startsWith('text/')) return <MessageSquare className="h-6 w-6 text-gray-600" />;
    return <FileType className="h-6 w-6 text-gray-500" />;
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  };

  const handleFileClick = (file: UploadedFile) => {
    // Show the detail modal for the file
    setSelectedFile(file);
    setDetailModalOpen(true);
    
    // Or use the global preview modal if applicable
    if (file.status === 'completed' && file.preview) {
      // Convert the local file format to the expected format for the FileUploadedData
      const fileData = {
        id: file.id,
        fileType: file.mimeType.split('/')[0], 
        fileUrl: file.preview,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        contentTypeHighLevel: file.contractInfo?.hasContract ? ['contract'] : ['document'],
        uploadAt: file.uploadDate,
        modifiedAt: file.uploadDate,
        status: file.status,
        userId: '123',
        entities: file.contractInfo?.hasContract 
          ? [
              {
                id: `entity-${Date.now()}`,
                category: 'organization',
                name: 'Sample Organization',
                keywords: ['contract', 'agreement'],
                fileUploadedId: file.id
              }
            ] 
          : [],
      };
      
      // Open the preview modal directly using the Zustand store
      openFilePreview(fileData);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Lawyer&apos;s Lens</h1>
        <p className="text-muted-foreground">Intelligent document analysis for legal professionals.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* Left Column: File Upload and List */}
        <Card className="lg:w-1/3 flex flex-col">
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Add files or text content to analyze.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Button to open the source modal */}
            <Button 
              onClick={openSourceModal}
              className="w-full py-12 flex flex-col text-muted-foreground items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Plus size={24} className="font-bold" />
              <span className="text-sm font-medium">Add sources</span>
              <p className="text-xs text-muted-foreground/40">Drag & drop files or click to browse</p>
            </Button>

            <p className="text-sm font-medium text-foreground mb-[-8px]">Uploaded Files ({filesToDisplay.length})</p>
            <ScrollArea className="flex-1 border rounded-md p-2 bg-secondary/30 min-h-[100px]">
              {isUploading && filesToDisplay.length === 0 && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Uploading files...</p>
                </div>
              )}
              {!isUploading && filesToDisplay.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No files uploaded yet.</p>
              )}
              {filesToDisplay.length > 0 && (
                <ul className="space-y-2">
                  {filesToDisplay.map((f) => (
                    <li key={f.id} className="flex items-center justify-between p-2 bg-card rounded-md shadow-sm group">
                      <button
                        className="flex items-center gap-3 overflow-hidden flex-1 text-left hover:bg-accent/10 rounded transition-colors p-1 -m-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        onClick={() => handleFileClick(f)}
                        aria-label={`View details for ${f.fileName}`}
                        disabled={uploadProgress[f.id]?.status === 'queued' || uploadProgress[f.id]?.status === 'uploading'}
                      >
                        {getFileIcon(f.mimeType)}
                        <div className="flex-1 overflow-hidden">
                          <span className="text-sm font-medium truncate block" title={f.fileName}>
                          {f.fileName}
                        </span>
                          
                          {/* Show upload progress if available */}
                          {uploadProgress[f.id] && (uploadProgress[f.id].status === 'uploading' || uploadProgress[f.id].status === 'processing') && (
                            <div className="w-full mt-1">
                              <Progress value={uploadProgress[f.id].progress} className="h-1" />
                            </div>
                          )}
                          
                          {/* Show contract info if available */}
                          {f.contractInfo?.hasContract && (
                            <p className="text-xs text-teal-700 truncate" title={f.contractInfo.contractSummary}>
                              Summary: {f.contractInfo.contractSummary || 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        {/* Show appropriate status indicator */}
                        {getUploadStatusText(f.id) || (
                          <>
                            {f.status === 'pending' && <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>}
                            {f.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                            {f.status === 'completed' && f.contractInfo?.hasContract && (
                              <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-300 text-xs shrink-0">Contract</Badge>
                            )}
                            {f.status === 'error' && (
                              <Badge variant="destructive" className="text-xs shrink-0" title={f.errorMessage}>Error</Badge>
                            )}
                          </>
                        )}
                      </button>
                      <div className="flex items-center ml-2">
                        {/* Add pause/resume buttons for uploads in progress */}
                        {uploadProgress[f.id] && (
                          <>
                            {uploadProgress[f.id].status === 'uploading' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-primary group-hover:opacity-100 md:opacity-0 transition-opacity focus:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pauseUpload(f.id);
                                }}
                                title="Pause Upload"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <rect x="6" y="4" width="4" height="16"></rect>
                                  <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                              </Button>
                            )}
                            {uploadProgress[f.id].status === 'paused' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-primary group-hover:opacity-100 md:opacity-0 transition-opacity focus:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resumeUpload(f.id);
                                }}
                                title="Resume Upload"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </Button>
                            )}
                          </>
                        )}
                        
                        {(f.status === 'completed' || f.status === 'error' || uploadProgress[f.id]?.status === 'error' || uploadProgress[f.id]?.status === 'complete') &&
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary group-hover:opacity-100 md:opacity-0 transition-opacity focus:opacity-100"
                            onClick={() => handleFileClick(f)}
                            title="View Details"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        }
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive group-hover:opacity-100 md:opacity-0 transition-opacity focus:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          title="Remove File"
                        >
                          {uploadProgress[f.id]?.status === 'uploading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column: Search and Results */}
        <Card className="lg:w-2/3 flex flex-col">
          <CardHeader>
            <CardTitle>Search Documents</CardTitle>
            <CardDescription>Enter names, dates (e.g., &quot;June 2020&quot;), or keywords like &quot;contract&quot;.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex gap-2">
              <Input
                type="search"
                placeholder="Search files..."
                className="flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                aria-label="Search documents"
              />
              <Button onClick={handleSearch} disabled={isSearching} aria-label="Perform search">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>

            <p className="text-sm font-medium text-foreground mb-[-8px]">Search Results ({searchResults.length})</p>
            <ScrollArea className="flex-1 border rounded-md p-2 bg-secondary/30 min-h-[200px]">
              {isSearching && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Searching...</p>
                </div>
              )}
              {!isSearching && searchResults.length === 0 && searchTerm && (
                <p className="text-sm text-muted-foreground text-center py-4">No results found for &quot;{searchTerm}&quot;.</p>
              )}
              {!isSearching && searchResults.length === 0 && !searchTerm && (
                <p className="text-sm text-muted-foreground text-center py-4">Enter a search term above to find documents.</p>
              )}
              {!isSearching && searchResults.length > 0 && (
                <ul className="space-y-2">
                  {searchResults.map(({ file: f, score }) => (
                    <li key={f.id} className="flex items-center justify-between p-2 bg-card rounded-md shadow-sm group">
                      <button
                        className="flex items-center gap-3 overflow-hidden flex-1 text-left hover:bg-accent/10 rounded transition-colors p-1 -m-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        onClick={() => handleFileClick(f)}
                        aria-label={`View details for ${f.fileName}`}
                      >
                        {getFileIcon(f.mimeType)}
                        <div className="flex-1 overflow-hidden">
                          <span className="text-sm font-medium truncate block" title={f.fileName}>
                            {f.fileName}
                          </span>
                          {f.contractInfo?.hasContract && (
                            <p className="text-xs text-teal-700 truncate" title={f.contractInfo.contractSummary}>
                              Summary: {f.contractInfo.contractSummary || 'N/A'}
                            </p>
                          )}
                          {f.contractInfo?.relevantTerms && f.contractInfo.relevantTerms.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate" title={f.contractInfo.relevantTerms.join(', ')}>
                              Terms: {f.contractInfo.relevantTerms.join(', ')}
                            </p>
                          )}
                          {f.status === 'error' && <p className="text-xs text-destructive">Processing Error</p>}
                        </div>
                      </button>
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2" title={`Relevance Score: ${score}`}>Score: {score}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* File Detail Modal */}
      {selectedFile && (
        <FileDetailModal 
          isOpen={detailModalOpen} 
          onClose={() => setDetailModalOpen(false)} 
          file={selectedFile}
          getFileIcon={getFileIcon}
        />
      )}
    </div>
  );
}
