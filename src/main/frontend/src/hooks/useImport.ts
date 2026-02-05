/**
 * useImport Hook
 *
 * Provides import functionality with SSE progress tracking.
 *
 * @module hooks/useImport
 */

import { useState, useCallback, useRef } from 'react';

export interface ImportProgress {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  currentFile?: string;
  currentFileName?: string;
  filesProcessed: number;
  totalFiles: number;
  activitiesImported: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  lapsImported: number;
  lengthsImported: number;
  hrSamplesImported: number;
  errors: string[];
  eta?: number; // seconds
}

export interface ImportResult {
  success: boolean;
  activitiesImported: number;
  lapsImported: number;
  lengthsImported: number;
  hrSamplesImported: number;
  skipped: number;
  errors: string[];
}

const initialProgress: ImportProgress = {
  status: 'idle',
  progress: 0,
  filesProcessed: 0,
  totalFiles: 0,
  activitiesImported: 0,
  successCount: 0,
  skippedCount: 0,
  errorCount: 0,
  lapsImported: 0,
  lengthsImported: 0,
  hrSamplesImported: 0,
  errors: [],
};

/**
 * Hook for managing file imports with progress tracking.
 *
 * @returns Object with import state and functions
 *
 * @example
 * ```tsx
 * const { progress, result, startImport, cancelImport, reset } = useImport();
 *
 * const handleFiles = (files: File[]) => {
 *   startImport(files);
 * };
 * ```
 */
export function useImport() {
  const [progress, setProgress] = useState<ImportProgress>(initialProgress);
  const [result, setResult] = useState<ImportResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startImport = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Reset state
    setProgress({
      ...initialProgress,
      status: 'uploading',
      totalFiles: files.length,
    });
    setResult(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      // Upload files
      const uploadResponse = await fetch('/api/v1/import/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { importId } = await uploadResponse.json();

      // Start SSE for progress
      setProgress((p) => ({ ...p, status: 'processing' }));

      eventSourceRef.current = new EventSource(`/api/v1/import/${importId}/progress`);

      eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setProgress((p) => ({
            ...p,
            progress: data.progress,
            currentFile: data.currentFile,
            currentFileName: data.currentFile,
            filesProcessed: data.filesProcessed,
            activitiesImported: data.activitiesImported,
            successCount: data.successCount || data.activitiesImported,
            skippedCount: data.skippedCount || 0,
            errorCount: data.errorCount || 0,
            lapsImported: data.lapsImported || 0,
            lengthsImported: data.lengthsImported || 0,
            hrSamplesImported: data.hrSamplesImported || 0,
            eta: data.eta,
          }));
        } else if (data.type === 'error') {
          setProgress((p) => ({
            ...p,
            errors: [...p.errors, data.message],
            errorCount: p.errorCount + 1,
          }));
        } else if (data.type === 'complete') {
          setProgress((p) => ({
            ...p,
            status: 'complete',
            progress: 100,
            successCount: data.activitiesImported,
            lapsImported: data.lapsImported,
            lengthsImported: data.lengthsImported,
            hrSamplesImported: data.hrSamplesImported,
            skippedCount: data.skipped,
          }));
          setResult({
            success: true,
            activitiesImported: data.activitiesImported,
            lapsImported: data.lapsImported,
            lengthsImported: data.lengthsImported,
            hrSamplesImported: data.hrSamplesImported,
            skipped: data.skipped,
            errors: data.errors || [],
          });
          eventSourceRef.current?.close();
        }
      };

      eventSourceRef.current.onerror = () => {
        setProgress((p) => ({ ...p, status: 'error', errors: [...p.errors, 'Connection lost'] }));
        eventSourceRef.current?.close();
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setProgress((p) => ({ ...p, status: 'idle' }));
      } else {
        setProgress((p) => ({
          ...p,
          status: 'error',
          errors: [...p.errors, (error as Error).message],
        }));
      }
    }
  }, []);

  const cancelImport = useCallback(() => {
    abortControllerRef.current?.abort();
    eventSourceRef.current?.close();
    setProgress((p) => ({ ...p, status: 'idle' }));
  }, []);

  const reset = useCallback(() => {
    setProgress(initialProgress);
    setResult(null);
  }, []);

  return {
    progress,
    result,
    startImport,
    cancelImport,
    reset,
    isImporting: progress.status === 'uploading' || progress.status === 'processing',
    isIdle: progress.status === 'idle',
    isUploading: progress.status === 'uploading',
    isProcessing: progress.status === 'processing',
    isComplete: progress.status === 'complete',
    isError: progress.status === 'error',
  };
}

export default useImport;
