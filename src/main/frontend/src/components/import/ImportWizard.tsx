/**
 * ImportWizard Component
 *
 * A multi-step import wizard with drag-and-drop upload, progress tracking,
 * and detailed result summary.
 *
 * Features:
 * - Drag & drop or click to upload
 * - Real-time progress with ETA
 * - Success/Skip/Error counters
 * - Detailed final report
 *
 * @module components/import/ImportWizard
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  FileArchive,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  Layers,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

import { GlassCard, Button, ProgressBar, ProgressRing, Badge } from '../ui';
import { useImport } from '../../hooks';
import { formatEta, formatNumber } from '../../utils/formatters';

export interface ImportWizardProps {
  /** Callback when import is complete */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ImportWizard component for file upload and import tracking.
 *
 * @example
 * ```tsx
 * <ImportWizard onComplete={() => navigate('/dashboard')} />
 * ```
 */
export const ImportWizard: React.FC<ImportWizardProps> = ({
  onComplete,
  className,
}) => {
  const { t } = useTranslation();
  const {
    progress,
    startImport,
    reset,
    isIdle,
    isUploading,
    isProcessing,
    isComplete,
    isError,
  } = useImport();

  const [isDragging, setIsDragging] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const zipFile = files.find((f) => f.name.endsWith('.zip'));

      if (zipFile) {
        startImport([zipFile]);
      }
    },
    [startImport]
  );

  // Handle file input
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.endsWith('.zip')) {
        startImport([file]);
      }
    },
    [startImport]
  );

  // Render dropzone (idle state)
  const renderDropzone = () => (
    <motion.div
      className={clsx(
        'relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-surface-hover'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <input
        type="file"
        accept=".zip"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center gap-4">
        <motion.div
          className={clsx(
            'w-16 h-16 rounded-2xl flex items-center justify-center',
            isDragging ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
          )}
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
        >
          {isDragging ? (
            <FileArchive className="w-8 h-8" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </motion.div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t('import.dropzone.title')}
          </h3>
          <p className="text-sm text-muted mb-2">
            {t('import.dropzone.subtitle')}
          </p>
          <p className="text-xs text-muted">
            {t('import.dropzone.formats')}
          </p>
        </div>
      </div>
    </motion.div>
  );

  // Render progress (uploading/processing state)
  const renderProgress = () => (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Main progress indicator */}
      <div className="flex items-center justify-center gap-8">
        <ProgressRing
          progress={progress.progress}
          size={120}
          strokeWidth={8}
          color="primary"
          showValue
        />

        <div className="text-left">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {isUploading ? t('import.progress.validating') : t('import.progress.processing')}
          </h3>
          {progress.currentFileName && (
            <p className="text-sm text-muted mb-1">
              {progress.currentFileName}
            </p>
          )}
          <p className="text-sm text-muted">
            {t('import.progress.filesProcessed')}: {progress.currentFile} / {progress.totalFiles}
          </p>
          {progress.eta && progress.eta > 0 && (
            <p className="text-sm text-primary flex items-center gap-1 mt-2">
              <Clock className="w-4 h-4" />
              {t('import.progress.eta')}: {formatEta(progress.eta)}
            </p>
          )}
        </div>
      </div>

      {/* Linear progress bar */}
      <ProgressBar
        progress={progress.progress}
        color="gradient"
        size="lg"
        animated
        striped
      />

      {/* Live counters */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-success mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold">{progress.successCount}</span>
          </div>
          <p className="text-xs text-muted">{t('common.success')}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-warning mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">{progress.skippedCount}</span>
          </div>
          <p className="text-xs text-muted">{t('import.result.skipped')}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-error mb-1">
            <XCircle className="w-4 h-4" />
            <span className="font-semibold">{progress.errorCount}</span>
          </div>
          <p className="text-xs text-muted">{t('import.result.errors')}</p>
        </div>
      </div>
    </motion.div>
  );

  // Render complete state
  const renderComplete = () => (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Success header */}
      <div className="text-center">
        <motion.div
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <CheckCircle className="w-10 h-10 text-success" />
        </motion.div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {t('import.result.title')}
        </h3>
        <p className="text-muted">
          {t('import.result.success')} {progress.successCount} {t('common.selected')}
        </p>
      </div>

      {/* Result stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-tile p-4">
          <Activity className="w-6 h-6 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {formatNumber(progress.activitiesImported)}
          </p>
          <p className="text-xs text-muted">{t('import.result.activities')}</p>
        </div>
        <div className="stat-tile p-4">
          <Layers className="w-6 h-6 text-secondary mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {formatNumber(progress.lapsImported)}
          </p>
          <p className="text-xs text-muted">{t('import.result.laps')}</p>
        </div>
        <div className="stat-tile p-4">
          <svg className="w-6 h-6 text-accent mb-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <p className="text-2xl font-bold text-foreground">
            {formatNumber(progress.lengthsImported)}
          </p>
          <p className="text-xs text-muted">{t('import.result.lengths')}</p>
        </div>
        <div className="stat-tile p-4">
          <Heart className="w-6 h-6 text-error mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {formatNumber(progress.hrSamplesImported)}
          </p>
          <p className="text-xs text-muted">{t('import.result.hrSamples')}</p>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap justify-center gap-2">
        <Badge variant="success" icon={<CheckCircle className="w-3 h-3" />}>
          {progress.successCount} {t('import.result.success')}
        </Badge>
        {progress.skippedCount > 0 && (
          <Badge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>
            {progress.skippedCount} {t('import.result.skipped')}
          </Badge>
        )}
        {progress.errorCount > 0 && (
          <Badge variant="error" icon={<XCircle className="w-3 h-3" />}>
            {progress.errorCount} {t('import.result.errors')}
          </Badge>
        )}
      </div>

      {/* Error details (collapsible) */}
      {progress.errors.length > 0 && (
        <div className="glass-card p-4">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setShowErrors(!showErrors)}
          >
            <span className="font-medium text-error">
              {progress.errors.length} {t('import.result.errors')}
            </span>
            {showErrors ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <AnimatePresence>
            {showErrors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {progress.errors.map((error: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                      {error}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="ghost" onClick={reset}>
          {t('import.title')}
        </Button>
        <Button variant="primary" onClick={onComplete}>
          {t('nav.dashboard')}
        </Button>
      </div>
    </motion.div>
  );

  // Render error state
  const renderError = () => (
    <motion.div
      className="text-center space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-error/20 flex items-center justify-center">
        <XCircle className="w-10 h-10 text-error" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {t('common.error')}
        </h3>
        <p className="text-muted">
          {progress.errors[progress.errors.length - 1] ?? t('errors.generic')}
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        {t('common.retry')}
      </Button>
    </motion.div>
  );

  return (
    <GlassCard className={clsx('max-w-2xl mx-auto', className)} padding="lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {t('import.title')}
        </h2>
        <p className="text-muted">{t('import.subtitle')}</p>
      </div>

      <AnimatePresence mode="wait">
        {isIdle && renderDropzone()}
        {(isUploading || isProcessing) && renderProgress()}
        {isComplete && renderComplete()}
        {isError && renderError()}
      </AnimatePresence>
    </GlassCard>
  );
};

export default ImportWizard;
