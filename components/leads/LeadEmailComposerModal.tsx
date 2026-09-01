'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Calendar,
  Plane,
  Eye,
  Check,
  ChevronDown,
  ChevronRight,
  LayoutTemplate,
  Code2,
  Table,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/context/ToastContext';
import { ILeadAttachment } from '@/models/Lead';
import {
  buildTemplateVariables,
  substituteTemplateVariables,
  extractTemplateVariables,
  TemplateVariables,
} from '@/lib/templateUtils';

interface LeadEmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onEmailSent?: (updatedLead: any) => void;
}

interface StoredTemplate {
  _id: string;
  name: string;
  category: string;
  subject: string;
  bodyHtml: string;
}

export const LeadEmailComposerModal: React.FC<LeadEmailComposerModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEmailSent,
}) => {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  // 'branded' | 'stored' | 'custom'
  const [emailMode, setEmailMode] = useState<'branded' | 'stored' | 'custom'>('branded');
  const [customHtml, setCustomHtml] = useState('');
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Stored templates state
  const [storedTemplates, setStoredTemplates] = useState<StoredTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [previewTab, setPreviewTab] = useState<'rendered' | 'variables' | 'raw'>('rendered');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [showVariableDrawer, setShowVariableDrawer] = useState(true);

  // Fetch templates once on mount
  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        const tmpls: StoredTemplate[] = data.templates || [];
        setStoredTemplates(tmpls);
      })
      .catch(() => {});
  }, []);

  // Compute lead template variables
  const leadVariables: TemplateVariables = useMemo(() => {
    if (!lead) return {};
    const token = lead.customerPortal?.trackingToken || 'preview-token';
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
    const baseUrl = (typeof window !== 'undefined' && !isLocalhost)
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') ? process.env.NEXT_PUBLIC_APP_URL : 'http://crm.airlinesconsolidator.com');
    return buildTemplateVariables(
      lead,
      lead.agentName || (lead.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo.name : '') || 'Concierge Team',
      lead.assignedTo?.email || '',
      lead.assignedTo?.phone || '',
      undefined,
      undefined,
      `${baseUrl}/portal/${token}`,
      undefined,
      `${baseUrl}/api/portal/${token}/authorize`
    );
  }, [lead]);

  // Selected template object
  const selectedTemplate = useMemo(() => {
    return storedTemplates.find((t) => t._id === selectedTemplateId) || null;
  }, [storedTemplates, selectedTemplateId]);

  // Template variables extracted from selected template
  const templateVariablesList = useMemo(() => {
    if (!selectedTemplate) return [];
    const combined = `${selectedTemplate.subject} ${selectedTemplate.bodyHtml}`;
    return extractTemplateVariables(combined);
  }, [selectedTemplate]);

  // Substituted HTML and Subject for preview
  const resolvedSubject = useMemo(() => {
    if (!selectedTemplate) return '';
    return substituteTemplateVariables(selectedTemplate.subject, leadVariables);
  }, [selectedTemplate, leadVariables]);

  const resolvedHtml = useMemo(() => {
    if (!selectedTemplate) return '';
    return substituteTemplateVariables(selectedTemplate.bodyHtml, leadVariables);
  }, [selectedTemplate, leadVariables]);

  // When stored template is selected, update subject
  useEffect(() => {
    if (emailMode === 'stored' && selectedTemplate) {
      setSubject(resolvedSubject || selectedTemplate.subject);
    }
  }, [selectedTemplateId, emailMode, resolvedSubject, selectedTemplate]);

  // Initialize values when lead or modal opens
  useEffect(() => {
    if (lead) {
      setRecipientEmail(lead.email || '');
      setSubject(
        `Flight Itinerary & Travel Confirmation: ${lead.origin} → ${lead.destination} (${lead.pnr || 'REF: ' + (lead._id ? lead._id.toString().slice(-6).toUpperCase() : 'PENDING')})`
      );
      setCustomMessage(
        `Dear ${lead.name},\n\nPlease find your updated flight quotation, itinerary schedule, and electronic travel documents attached below.`
      );
      // Select all uploaded attachments by default
      const attIds = (lead.attachments || []).map((a: any) => a.id);
      setSelectedAttachmentIds(attIds);
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [lead, isOpen]);

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !subject) return;

    setIsSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: Record<string, any> = {
        to: recipientEmail,
        subject,
        selectedAttachmentIds,
      };

      if (emailMode === 'stored') {
        if (!selectedTemplateId) {
          setErrorMsg('Please select a template.');
          setIsSending(false);
          return;
        }
        payload.templateId = selectedTemplateId;
        payload.useDefaultBrandedTemplate = false;
      } else if (emailMode === 'branded') {
        payload.useDefaultBrandedTemplate = true;
        payload.customMessage = customMessage;
      } else {
        payload.useDefaultBrandedTemplate = false;
        payload.customHtml = customHtml;
      }

      const res = await fetch(`/api/leads/${lead._id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch email');
      }

      setSuccessMsg('Email dispatched successfully with tracking & attachments!');
      toast.success('Email Dispatched', `Itinerary and tickets sent to ${recipientEmail}.`);
      if (onEmailSent && data.lead) {
        onEmailSent(data.lead);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send email');
      toast.error('Email Dispatch Failed', err.message || 'Could not send email');
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  const travelDateFormatted = lead.travelDate
    ? new Date(lead.travelDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Pending';

  const priceFormatted =
    lead.priceQuoted && lead.priceQuoted > 0
      ? `${lead.currency || 'USD'} ${Number(lead.priceQuoted).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}`
      : 'Quotation in Review';

  const attachments: ILeadAttachment[] = lead.attachments || [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => !isSending && onClose()}
        title="Email Customer (Flight Itinerary & Tickets)"
        description={`Dispatch verified flight details, payment authorization, or e-tickets to ${lead.name}`}
        maxWidth="3xl"
      >
        <form onSubmit={handleSend} className="space-y-4">
          {/* Auto-populated Lead Summary Header */}
          <div className="p-3 bg-ember-bg border border-ember-border rounded-btn text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-ember-text-primary">
              <span className="flex items-center gap-1.5 text-ember-primary font-bold">
                <Plane className="w-3.5 h-3.5" />
                {lead.origin} &rarr; {lead.destination} ({lead.tripType || 'Round Trip'})
              </span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Fare: {priceFormatted}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-ember-text-secondary pt-1 border-t border-ember-border/60">
              <div>
                <span className="text-ember-neutral block">Passenger:</span>
                <strong className="text-ember-text-primary">{lead.name}</strong>
              </div>
              <div>
                <span className="text-ember-neutral block">Departure:</span>
                <strong className="text-ember-text-primary">{travelDateFormatted}</strong>
              </div>
              <div>
                <span className="text-ember-neutral block">PNR / Ref:</span>
                <strong className="font-mono text-ember-text-primary">{lead.pnr || 'PENDING'}</strong>
              </div>
              <div>
                <span className="text-ember-neutral block">Passengers:</span>
                <strong className="text-ember-text-primary">{lead.pax || 1} Pax</strong>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="p-3 rounded-btn bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-btn bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Recipient & Subject Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Recipient Email Address *"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="passenger@example.com"
              required
            />
            <Input
              label="Subject Line *"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Flight Itinerary..."
              required
            />
          </div>

          {/* Template Style Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-bold text-ember-text-primary">
              Email Format &amp; Styling
            </label>
            <div className="flex bg-ember-surface-raised p-0.5 rounded-btn border border-ember-border text-xs">
              <button
                type="button"
                onClick={() => setEmailMode('branded')}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  emailMode === 'branded' ? 'bg-white text-ember-primary shadow-sm' : 'text-ember-neutral'
                }`}
              >
                Branded Template
              </button>
              <button
                type="button"
                onClick={() => setEmailMode('stored')}
                className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1 ${
                  emailMode === 'stored' ? 'bg-white text-ember-primary shadow-sm' : 'text-ember-neutral'
                }`}
              >
                <LayoutTemplate className="w-3 h-3" />
                Saved Templates ({storedTemplates.length})
              </button>
              <button
                type="button"
                onClick={() => setEmailMode('custom')}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  emailMode === 'custom' ? 'bg-white text-ember-primary shadow-sm' : 'text-ember-neutral'
                }`}
              >
                Custom HTML
              </button>
            </div>
          </div>

          {/* Mode 1: Branded Template */}
          {emailMode === 'branded' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ember-text-primary">
                Personalized Concierge Message / Notes
              </label>
              <Textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add personal notes or special instructions for the customer..."
                className="text-xs"
              />
              <p className="text-[10px] text-ember-neutral">
                The customer will receive the luxury flight itinerary, booking reference, total price, and online tracking portal link automatically.
              </p>
            </div>
          )}

          {/* Mode 2: Saved Templates with Template Picker & Variable Preview */}
          {emailMode === 'stored' && (
            <div className="space-y-3">
              {storedTemplates.length === 0 ? (
                <div className="text-xs text-ember-neutral bg-ember-surface-raised p-3 rounded-btn border border-ember-border">
                  No saved templates found. Create custom email templates in the{' '}
                  <a href="/templates" target="_blank" className="text-ember-primary font-semibold hover:underline">
                    Templates section &rarr;
                  </a>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ember-text-primary">
                      Choose Saved Template *
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full text-xs border border-ember-border rounded-input px-3 py-2 bg-white text-ember-text-primary font-medium focus:outline-none focus:border-ember-primary"
                      required={emailMode === 'stored'}
                    >
                      <option value="">— Select an Email Template —</option>
                      {storedTemplates.map((tmpl) => (
                        <option key={tmpl._id} value={tmpl._id}>
                          [{tmpl.category}] {tmpl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template Details & Live Variable Preview Card */}
                  {selectedTemplate && (
                    <div className="border border-ember-border rounded-btn bg-ember-surface overflow-hidden">
                      {/* Header bar */}
                      <div className="px-3 py-2 bg-ember-surface-raised border-b border-ember-border flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ember-text-primary">{selectedTemplate.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-ember-primary/10 text-ember-primary font-bold uppercase">
                            {selectedTemplate.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Preview Tabs */}
                          <div className="flex bg-white p-0.5 rounded border border-ember-border text-[11px]">
                            <button
                              type="button"
                              onClick={() => setPreviewTab('rendered')}
                              className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                                previewTab === 'rendered' ? 'bg-ember-primary text-white' : 'text-ember-neutral hover:text-ember-text-primary'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              Live Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewTab('variables')}
                              className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                                previewTab === 'variables' ? 'bg-ember-primary text-white' : 'text-ember-neutral hover:text-ember-text-primary'
                              }`}
                            >
                              <Table className="w-3 h-3" />
                              Variables ({templateVariablesList.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewTab('raw')}
                              className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                                previewTab === 'raw' ? 'bg-ember-primary text-white' : 'text-ember-neutral hover:text-ember-text-primary'
                              }`}
                            >
                              <Code2 className="w-3 h-3" />
                              Raw HTML
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsPreviewModalOpen(true)}
                            className="p-1 rounded text-ember-primary hover:bg-ember-primary/10 transition-colors"
                            title="Open Pop-up Preview"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tab 1: Rendered HTML with substituted variables */}
                      {previewTab === 'rendered' && (
                        <div className="p-3 bg-white max-h-56 overflow-auto border-b border-ember-border">
                          <div
                            className="text-xs origin-top scale-95 [&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto break-words"
                            dangerouslySetInnerHTML={{ __html: resolvedHtml }}
                          />
                        </div>
                      )}

                      {/* Tab 2: Variable Substitution Table */}
                      {previewTab === 'variables' && (
                        <div className="p-3 max-h-56 overflow-y-auto bg-stone-50 text-xs">
                          <div className="text-[11px] font-semibold text-ember-text-secondary mb-2 flex items-center justify-between">
                            <span>Dynamic variables detected in this template:</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Substituted with current lead data
                            </span>
                          </div>

                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-stone-200 text-[10px] text-ember-neutral uppercase">
                                <th className="py-1 px-2">Placeholder Tag</th>
                                <th className="py-1 px-2">Resolved Value (Lead Data)</th>
                                <th className="py-1 px-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 text-[11px]">
                              {templateVariablesList.map((tag) => {
                                const val = leadVariables[tag];
                                const hasValue = val !== undefined && val !== '';
                                return (
                                  <tr key={tag} className="hover:bg-white transition-colors">
                                    <td className="py-1.5 px-2 font-mono font-bold text-ember-primary">
                                      {'{{' + tag + '}}'}
                                    </td>
                                    <td className="py-1.5 px-2 font-medium text-stone-800 break-all max-w-[240px]">
                                      {hasValue ? val : <span className="text-stone-400 italic font-normal">Not Provided</span>}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                      {hasValue ? (
                                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold text-[10px]">
                                          <Check className="w-3 h-3" /> Ready
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 text-[10px] font-semibold">
                                          Fallback
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tab 3: Raw HTML */}
                      {previewTab === 'raw' && (
                        <div className="p-3 bg-stone-900 text-stone-200 max-h-56 overflow-y-auto">
                          <pre className="font-mono text-[11px] whitespace-pre-wrap">
                            {selectedTemplate.bodyHtml}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mode 3: Custom HTML Body */}
          {emailMode === 'custom' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ember-text-primary">
                Custom HTML Body
              </label>
              <Textarea
                rows={6}
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
                placeholder="<p>Custom HTML content here...</p>"
                className="font-mono text-xs"
                required
              />
            </div>
          )}

          {/* Attached Tickets Selector */}
          <div className="space-y-2 pt-2 border-t border-ember-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ember-text-primary flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-ember-primary" />
                <span>Include Ticket Attachments ({selectedAttachmentIds.length}/{attachments.length})</span>
              </label>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAttachmentIds.length === attachments.length) {
                      setSelectedAttachmentIds([]);
                    } else {
                      setSelectedAttachmentIds(attachments.map((a) => a.id));
                    }
                  }}
                  className="text-[11px] text-ember-primary font-semibold hover:underline"
                >
                  {selectedAttachmentIds.length === attachments.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {attachments.length === 0 ? (
              <p className="text-[11px] text-ember-neutral bg-ember-surface-raised p-2.5 rounded-btn">
                No tickets uploaded yet. You can attach tickets in the &ldquo;Tickets &amp; Travel Documents&rdquo; section of this lead.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {attachments.map((file) => {
                  const isSelected = selectedAttachmentIds.includes(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleAttachment(file.id)}
                      className={`p-2 rounded-btn border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-ember-surface border-ember-border text-ember-neutral hover:bg-ember-surface-raised'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-ember-neutral'}`} />
                        <span className="truncate" title={file.originalName}>{file.originalName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-[10px] font-mono opacity-80">{file.formattedSize}</span>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-emerald-600 text-white' : 'border border-stone-300'}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-ember-border">
            <span className="text-[11px] text-ember-neutral font-semibold">
              Unique tracking link &amp; 1x1 pixel will be embedded
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSending}
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Tracked Customer Email</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Pop-up Full Rendered Template Preview Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={`Live Email Preview: ${selectedTemplate.name}`}
          description={`Subject: "${resolvedSubject}"`}
          maxWidth="3xl"
        >
          <div className="space-y-3">
            <div className="p-2.5 bg-ember-surface-raised border border-ember-border rounded-btn text-xs flex items-center justify-between">
              <div>
                <span className="text-ember-neutral font-semibold">Recipient: </span>
                <strong className="text-ember-text-primary">{recipientEmail || lead.email}</strong>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                All {'{{variables}}'} populated with lead data
              </span>
            </div>

            <div className="p-4 bg-white rounded-card border border-ember-border max-h-[65vh] overflow-auto shadow-inner">
              <div
                className="[&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto break-words"
                dangerouslySetInnerHTML={{ __html: resolvedHtml }}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsPreviewModalOpen(false)}>Close Preview</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
