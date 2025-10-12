/**
 * Type definitions for file handling and document analysis
 */

export interface ContractInfo {
  hasContract?: boolean;
  contractSummary?: string;
  relevantTerms?: string[];
}

export interface UploadedFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
  preview?: string;
  contractInfo?: ContractInfo;
  errorMessage?: string;
}

export interface SearchResult {
  file: UploadedFile;
  score: number;
}

/**
 * Helper function to format bytes into human-readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 