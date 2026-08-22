'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  AlertTriangle,
  FileText,
  CheckCircle2,
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  ShieldAlert,
  HardDrive,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { S3FileItem } from '@/lib/s3';

interface S3ManagerProps {
  envStatus?: any;
}

export const S3Manager: React.FC<S3ManagerProps> = ({ envStatus }) => {
  const [files, setFiles] = useState<S3FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [folderPrefix, setFolderPrefix] = useState('');
  const [targetFolder, setTargetFolder] = useState('uploads');

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<S3FileItem | null>(null);

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<S3FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch files from S3
  const fetchFiles = useCallback(async (prefix = '') => {
    try {
      setRefreshing(true);
      const url = prefix ? `/api/dev/s3/list?prefix=${encodeURIComponent(prefix)}` : '/api/dev/s3/list';
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.configured !== false) {
        setFiles(data.files || []);
      } else {
        setFiles([]);
        if (data.error && data.configured === false) {
          setUploadError(data.error);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch S3 files:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(folderPrefix);
  }, [fetchFiles, folderPrefix]);

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Upload file via API
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    // Validate size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 25MB.`);
      return;
    }

    // Validate image format
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'avif', 'bmp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExtensions.includes(fileExt) && !file.type.startsWith('image/')) {
      setUploadError(`Unsupported file format. Please upload JPG, PNG, WEBP, SVG, or GIF images.`);
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', targetFolder);

    try {
      setUploadProgress(50);
      const res = await fetch('/api/dev/s3/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image to S3');
      }

      setUploadProgress(100);
      setUploadSuccess(`"${file.name}" uploaded successfully!`);

      // Immediately add the new file to the list at the top
      if (data.file) {
        setFiles((prev) => [data.file, ...prev.filter((f) => f.key !== data.file.key)]);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Handle Copy to Clipboard
  const handleCopyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/dev/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: deleteTarget.key }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete file from S3');
      }

      // Immediately update UI
      setFiles((prev) => prev.filter((f) => f.key !== deleteTarget.key));
      setDeleteTarget(null);
      setUploadSuccess(`Deleted "${deleteTarget.name}" from S3.`);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter files by search query
  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const s3Config = envStatus?.s3;
  const isS3Configured = s3Config?.isConfigured;

  return (
    <div className="space-y-6">
      {/* S3 Environment Status Banner */}
      <Card elevated className="p-4 bg-ember-surface/80 border-ember-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-btn bg-ember-primary/10 text-ember-primary flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ember-text-primary flex items-center gap-2">
                <span>AWS S3 Configuration</span>
                {isS3Configured ? (
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Configuration Required
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4 text-xs text-ember-text-secondary mt-1 flex-wrap font-mono">
                <span>
                  Bucket:{' '}
                  <strong className="text-ember-text-primary">
                    {s3Config?.bucket || 'Not configured'}
                  </strong>
                </span>
                <span>
                  Region:{' '}
                  <strong className="text-ember-text-primary">
                    {s3Config?.region || 'us-east-1'}
                  </strong>
                </span>
                <span>
                  Access Key ID:{' '}
                  <strong className="text-ember-text-primary">
                    {s3Config?.maskedAccessKey || 'Not configured'}
                  </strong>
                </span>
                {s3Config?.customDomain && (
                  <span>
                    CDN: <strong className="text-ember-text-primary">{s3Config.customDomain}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchFiles(folderPrefix)}
              isLoading={refreshing}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Files</span>
            </Button>
          </div>
        </div>

        {!isS3Configured && (
          <div className="mt-4 p-3 rounded-btn bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">AWS S3 environment variables are incomplete:</p>
              <p className="text-[11px] text-amber-800">
                Please add <code className="font-mono font-bold">AWS_ACCESS_KEY_ID</code>,{' '}
                <code className="font-mono font-bold">AWS_SECRET_ACCESS_KEY</code>, and{' '}
                <code className="font-mono font-bold">AWS_S3_BUCKET</code> to your <code className="font-mono">.env</code> file.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Drag & Drop Upload Zone */}
      <Card elevated className="p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-ember-border">
          <div>
            <h2 className="text-sm font-bold text-ember-text-primary flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-ember-primary" />
              <span>Upload Image to S3</span>
            </h2>
            <p className="text-xs text-ember-text-secondary">
              Drag & drop images or click to browse. Max size: 25MB.
            </p>
          </div>

          {/* Folder Category Select */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ember-neutral font-semibold">Target Folder:</span>
            <select
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              className="px-2.5 py-1 rounded-btn bg-ember-bg border border-ember-border text-ember-text-primary font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-ember-primary"
            >
              <option value="uploads">uploads/</option>
              <option value="leads">leads/</option>
              <option value="branding">branding/</option>
              <option value="avatars">avatars/</option>
              <option value="itineraries">itineraries/</option>
            </select>
          </div>
        </div>

        {/* Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-ember-primary bg-ember-primary/5 scale-[1.005]'
              : 'border-ember-border hover:border-ember-primary hover:bg-ember-surface/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-full bg-ember-primary/10 text-ember-primary flex items-center justify-center mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h4 className="text-sm font-bold text-ember-text-primary">
            {isDragging ? 'Drop image here to upload' : 'Click to browse or drag & drop image'}
          </h4>
          <p className="text-xs text-ember-neutral mt-1">
            Supports: JPG, PNG, WEBP, SVG, GIF (Up to 25MB)
          </p>

          <div className="mt-4">
            <Button size="sm" variant="secondary" className="pointer-events-none gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse Files</span>
            </Button>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mt-4 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex justify-between text-xs font-semibold text-ember-text-primary">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-ember-primary" />
                Uploading to S3...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-ember-primary transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success / Error Alerts */}
        {uploadSuccess && (
          <div className="mt-3 p-3 rounded-btn bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
            <button
              onClick={() => setUploadSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {uploadError && (
          <div className="mt-3 p-3 rounded-btn bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-red-700 hover:text-red-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </Card>

      {/* Image / File List Explorer */}
      <Card elevated className="space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ember-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ember-text-primary">
              S3 Objects ({filteredFiles.length})
            </h2>
            {folderPrefix && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-ember-surface-raised text-ember-neutral font-mono">
                Prefix: {folderPrefix}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-ember-neutral absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search files or keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-btn bg-ember-bg border border-ember-border focus:outline-none focus:ring-1 focus:ring-ember-primary placeholder:text-stone-400"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-ember-surface-raised p-0.5 rounded-btn border border-ember-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-ember-primary shadow-sm font-bold'
                    : 'text-ember-neutral hover:text-ember-text-primary'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-ember-primary shadow-sm font-bold'
                    : 'text-ember-neutral hover:text-ember-text-primary'
                }`}
                title="Table View"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-ember-primary border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-ember-neutral font-semibold">Connecting to AWS S3 bucket...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-ember-surface-raised flex items-center justify-center mx-auto text-ember-neutral">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-ember-text-primary">No Images Found in Bucket</h4>
            <p className="text-xs text-ember-neutral max-w-sm mx-auto">
              {searchQuery
                ? `No objects match "${searchQuery}". Try clearing your search term.`
                : 'Upload your first image above to store and manage it in AWS S3.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map((file) => {
              const isCopied = copiedKey === file.key;
              return (
                <div
                  key={file.key}
                  className="group bg-ember-bg border border-ember-border rounded-card overflow-hidden hover:shadow-card-hover transition-all flex flex-col"
                >
                  {/* Thumbnail / Image Container */}
                  <div
                    className="relative aspect-video bg-stone-900/5 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => setPreviewFile(file)}
                  >
                    {file.isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.previewUrl || file.url}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to placeholder if broken
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="p-4 text-center">
                        <FileText className="w-8 h-8 text-ember-neutral mx-auto mb-1" />
                        <span className="text-[10px] text-ember-neutral uppercase font-bold">
                          {file.contentType}
                        </span>
                      </div>
                    )}

                    {/* Overlay Action Bar */}
                    <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile(file);
                        }}
                        className="p-2 rounded-full bg-white/90 text-stone-900 hover:bg-white transition-colors"
                        title="Preview Image"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(file.url, file.key);
                        }}
                        className="p-2 rounded-full bg-white/90 text-stone-900 hover:bg-white transition-colors"
                        title="Copy Public URL"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(file);
                        }}
                        className="p-2 rounded-full bg-red-600/90 text-white hover:bg-red-600 transition-colors"
                        title="Delete from S3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Info */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h4
                        className="text-xs font-bold text-ember-text-primary truncate"
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                      <p
                        className="text-[11px] text-ember-neutral font-mono truncate"
                        title={file.key}
                      >
                        {file.key}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-ember-text-secondary pt-2 border-t border-ember-border/50">
                      <span>{file.formattedSize}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyUrl(file.url, file.key)}
                          className={`p-1 rounded hover:bg-ember-surface text-ember-neutral hover:text-ember-text-primary transition-colors ${
                            isCopied ? 'text-emerald-600 font-bold' : ''
                          }`}
                          title="Copy URL"
                        >
                          {isCopied ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Copied
                            </span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(file)}
                          className="p-1 rounded hover:bg-red-50 text-ember-neutral hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-btn border border-ember-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ember-surface border-b border-ember-border text-ember-neutral uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Thumbnail</th>
                  <th className="py-2.5 px-3">File Name / Key</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ember-border/60">
                {filteredFiles.map((file) => {
                  const isCopied = copiedKey === file.key;
                  return (
                    <tr key={file.key} className="hover:bg-ember-surface/50 transition-colors">
                      <td className="py-2 px-3 w-12">
                        <div
                          className="w-10 h-10 rounded bg-stone-100 overflow-hidden flex items-center justify-center cursor-pointer border border-ember-border shrink-0"
                          onClick={() => setPreviewFile(file)}
                        >
                          {file.isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.previewUrl || file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <FileText className="w-4 h-4 text-ember-neutral" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-ember-text-primary truncate max-w-xs" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[11px] text-ember-neutral font-mono truncate max-w-xs" title={file.key}>
                          {file.key}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-ember-text-secondary whitespace-nowrap">
                        {file.formattedSize}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-ember-surface-raised text-[10px] font-mono text-ember-neutral">
                          {file.contentType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-ember-neutral whitespace-nowrap">
                        {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 h-auto text-xs"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopyUrl(file.url, file.key)}
                            className={`p-1.5 h-auto text-xs ${isCopied ? 'text-emerald-700 bg-emerald-50' : ''}`}
                            title="Copy URL"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(file)}
                            className="p-1.5 h-auto text-xs"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Image Preview Modal */}
      <Modal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name || 'Image Preview'}
        description={previewFile ? `Key: ${previewFile.key}` : ''}
        maxWidth="2xl"
      >
        {previewFile && (
          <div className="space-y-4">
            <div className="relative aspect-video max-h-[60vh] bg-stone-900 rounded-btn overflow-hidden flex items-center justify-center">
              {previewFile.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.previewUrl || previewFile.url}
                  alt={previewFile.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-white text-center p-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold">Preview not available for this file type.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-ember-bg rounded-btn border border-ember-border space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-ember-text-secondary">
                <div>
                  <span className="font-semibold text-ember-neutral block">Size:</span>
                  <span className="font-mono text-ember-text-primary">{previewFile.formattedSize}</span>
                </div>
                <div>
                  <span className="font-semibold text-ember-neutral block">Content Type:</span>
                  <span className="font-mono text-ember-text-primary">{previewFile.contentType}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-ember-neutral block mb-1">Public S3 URL:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={previewFile.url}
                    className="flex-1 px-2.5 py-1.5 rounded bg-white border border-ember-border text-xs font-mono text-ember-text-primary select-all"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopyUrl(previewFile.url, previewFile.key)}
                    className="shrink-0 gap-1"
                  >
                    {copiedKey === previewFile.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === previewFile.key ? 'Copied' : 'Copy'}</span>
                  </Button>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-btn bg-ember-surface-raised hover:bg-ember-border text-ember-text-primary transition-colors shrink-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-ember-border">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const target = previewFile;
                  setPreviewFile(null);
                  setDeleteTarget(target);
                }}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPreviewFile(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Confirm File Deletion"
        maxWidth="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-btn text-red-900 text-xs">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Permanent S3 Object Deletion</h4>
                <p className="mt-1 text-red-800">
                  Are you sure you want to permanently delete{' '}
                  <strong className="font-mono text-red-950">{deleteTarget.name}</strong> from your AWS S3 bucket?
                </p>
                <p className="mt-1 text-[11px] text-red-700 font-mono break-all">
                  Key: {deleteTarget.key}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-ember-border">
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isDeleting}
                onClick={handleDeleteConfirm}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete from S3</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
