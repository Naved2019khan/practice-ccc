'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Luggage,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { ILeadAttachment } from '@/models/Lead';

interface LeadAttachmentsManagerProps {
  leadId: string;
  attachments: ILeadAttachment[];
  onAttachmentChange: (updatedAttachments: ILeadAttachment[]) => void;
  disabled?: boolean;
}

export const LeadAttachmentsManager: React.FC<LeadAttachmentsManagerProps> = ({
  leadId,
  attachments = [],
  onAttachmentChange,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Preview & Delete modal states
  const [previewItem, setPreviewItem] = useState<ILeadAttachment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ILeadAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    // Validate size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 25MB.`);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/leads/${leadId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload ticket attachment');
      }

      const updated = [...attachments, data.attachment];
      onAttachmentChange(updated);
      setUploadSuccess(`"${file.name}" uploaded successfully!`);
      toast.success('Ticket Document Uploaded', `"${file.name}" attached to flight lead.`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      toast.error('Upload Failed', err.message || 'Could not upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/leads/${leadId}/attachments?attachmentId=${deleteTarget.id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete attachment');
      }

      const updated = attachments.filter((a) => a.id !== deleteTarget.id);
      onAttachmentChange(updated);
      setUploadSuccess(`"${deleteTarget.originalName}" removed.`);
      toast.info('Ticket Removed', `"${deleteTarget.originalName}" removed from lead.`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not remove attachment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card elevated className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ember-border">
        <div>
          <h3 className="text-sm font-bold font-display text-ember-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-ember-primary" />
            <span>E-Tickets & Travel Documents</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-ember-surface-raised text-ember-text-secondary">
              {attachments.length} Attached
            </span>
          </h3>
          <p className="text-xs text-ember-text-secondary mt-0.5">
            Attach official airline PDF e-tickets, boarding passes, or itinerary images. Automatically included in customer emails.
          </p>
        </div>

        {!disabled && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ticket File</span>
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag and Drop Zone */}
      {!disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-btn p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-ember-primary bg-ember-primary/5 scale-[1.005]'
              : 'border-ember-border hover:border-ember-primary hover:bg-ember-surface/60'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-ember-primary/10 text-ember-primary flex items-center justify-center mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-ember-text-primary">
            {isDragging ? 'Drop ticket file to attach' : 'Drag & drop PDF / Image tickets or click to browse'}
          </p>
          <span className="text-[11px] text-ember-neutral mt-0.5">
            Supports: PDF, PNG, JPG, WEBP (Max 25MB)
          </span>
        </div>
      )}

      {/* Alerts */}
      {uploadSuccess && (
        <div className="p-2.5 rounded-btn bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-2.5 rounded-btn bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="py-6 text-center text-ember-neutral space-y-1">
          <Luggage className="w-8 h-8 text-stone-400 mx-auto" />
          <p className="text-xs font-semibold text-ember-text-secondary">No tickets or documents attached yet.</p>
          <p className="text-[11px] text-ember-neutral">Upload PDF e-tickets above to make them available for download and email delivery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {attachments.map((file) => {
            const isPdf = file.fileType?.includes('pdf') || file.originalName?.endsWith('.pdf');
            return (
              <div
                key={file.id}
                className="p-3 rounded-btn bg-ember-surface-raised border border-ember-border hover:border-ember-primary/40 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded bg-white border border-ember-border flex items-center justify-center text-ember-primary shrink-0 shadow-sm">
                    {isPdf ? <FileText className="w-4 h-4 text-red-600" /> : <Eye className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-ember-text-primary truncate" title={file.originalName}>
                      {file.originalName}
                    </h4>
                    <span className="text-[10px] font-mono text-ember-neutral">
                      {file.formattedSize} &bull; {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewItem(file)}
                    className="p-1.5 h-auto text-xs"
                    title="Preview Document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <a
                    href={file.url}
                    download={file.originalName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-btn bg-white border border-ember-border hover:bg-ember-surface text-ember-text-primary transition-colors inline-flex items-center justify-center"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {!disabled && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(file)}
                      className="p-1.5 h-auto text-xs"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced Centered Preview Modal */}
      <Modal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.originalName || 'Ticket Document Preview'}
        maxWidth="5xl"
      >
        {previewItem && (
          <div className="space-y-4">
            <div className="relative w-full h-[72vh] bg-stone-950 rounded-card overflow-hidden flex items-center justify-center border border-stone-800 p-2 shadow-inner">
              {previewItem.fileType?.includes('pdf') || previewItem.originalName?.endsWith('.pdf') ? (
                <iframe
                  src={previewItem.url}
                  className="w-full h-full border-0 rounded"
                  title="PDF Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewItem.url}
                    alt={previewItem.originalName}
                    className="max-h-full max-w-full object-contain rounded shadow-lg transition-transform duration-200"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-ember-border">
              <div className="flex items-center gap-2 text-xs text-ember-neutral">
                <span className="font-mono">{previewItem.formattedSize}</span>
                <span>&bull;</span>
                <span>Uploaded: {new Date(previewItem.uploadedAt).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-btn bg-ember-surface-raised hover:bg-ember-border text-ember-text-primary text-xs font-bold flex items-center gap-1.5 transition-colors border border-ember-border"
                >
                  <Eye className="w-3.5 h-3.5 text-ember-primary" />
                  <span>Open Full Size</span>
                </a>
                <a
                  href={previewItem.url}
                  download={previewItem.originalName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-btn bg-ember-primary text-white text-xs font-bold flex items-center gap-1.5 hover:bg-ember-primary-hover transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </a>
                <Button variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete Document"
        maxWidth="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-xs text-ember-text-primary">
              Are you sure you want to permanently delete{' '}
              <strong className="font-bold">{deleteTarget.originalName}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-ember-border">
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
              >
                Delete File
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};
