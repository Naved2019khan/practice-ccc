'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plane,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Clock,
  Send,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  CheckSquare,
  Shield,
  Trash2,
  Eye,
  Edit2,
  Code,
  Sparkles,
  MessageSquare,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Users,
  X,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AirportInput } from '@/components/ui/AirportInput';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { StageBadge, PaymentBadge, FollowUpBadge, Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';
import { LeadAttachmentsManager } from '@/components/leads/LeadAttachmentsManager';
import { LeadTrackingFeed } from '@/components/leads/LeadTrackingFeed';
import { LeadEmailComposerModal } from '@/components/leads/LeadEmailComposerModal';
import { LeadBillingManager } from '@/components/leads/LeadBillingManager';
import { LeadSpecsPanel } from '@/components/leads/LeadSpecsPanel';
import { useToast } from '@/context/ToastContext';
import { buildTemplateVariables, substituteTemplateVariables } from '@/lib/templateUtils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { lettersAndSpacesOnly } from '@/lib/validation';
import { HtmlPnrConverter } from '@/components/leads/HtmlPnrConverter';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { resolveDateTime } from '@/lib/pnr/enricher';
import {
  BOOKING_TYPES,
  LEAD_STATUSES,
  statusTone,
  bookingTypeShort,
} from '@/lib/leadOptions';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const leadId = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Tabs state: 'email' | 'attachments' | 'activity' | 'notes' | 'comments' | 'tasks'
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'email');

  // Edit Specs State
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Note composer state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Comment composer state
  const [newCommentText, setNewCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Email Composer State
  const [emailMode, setEmailMode] = useState<'template' | 'html'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

  // Email Preview, Confirmation, and Success Popup State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sendSuccessData, setSendSuccessData] = useState<any>(null);

  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskEmailAlert, setNewTaskEmailAlert] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const fetchLeadDetails = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
        if (meData.user?.role === 'admin') {
          const staffRes = await fetch('/api/staff');
          if (staffRes.ok) {
            const staffData = await staffRes.json();
            setStaffList(staffData.staff || []);
          }
        }
      }

      const leadRes = await fetch(`/api/leads/${leadId}`);
      if (!leadRes.ok) {
        throw new Error('Failed to fetch lead');
      }
      const data = await leadRes.json();
      setLead(data.lead);
      setEditForm({
        name: data.lead.name,
        phone: data.lead.phone,
        email: data.lead.email || '',
        source: data.lead.source,
        origin: data.lead.origin,
        destination: data.lead.destination,
        travelDate: data.lead.travelDate ? data.lead.travelDate.split('T')[0] : '',
        returnDate: data.lead.returnDate ? data.lead.returnDate.split('T')[0] : '',
        pax: data.lead.pax,
        tripType: data.lead.tripType,
        bookingType: data.lead.bookingType || 'New Booking',
        status: data.lead.status || 'Open',
        paymentStatus: data.lead.paymentStatus,
        pnr: data.lead.pnr || '',
        pnrHtml: data.lead.pnrHtml || '',
        ticketNumber: data.lead.ticketNumber || '',
        invoiceNumber: data.lead.invoiceNumber || '',
        agentName: data.lead.agentName || (data.lead.assignedTo && typeof data.lead.assignedTo === 'object' ? data.lead.assignedTo.name : '') || currentUser?.name || 'Concierge Team',
        priceQuoted: data.lead.priceQuoted || '',
        currency: data.lead.currency || 'USD',
        nextFollowUpDate: data.lead.nextFollowUpDate
          ? data.lead.nextFollowUpDate.split('T')[0]
          : '',
        passengers: data.lead.passengers || [],
        flightLegs: data.lead.flightLegs || [],
        multiCityRoutes: data.lead.multiCityRoutes || [],
        addOns: data.lead.addOns || { meal: '', baggage: '', seat: '', notes: '' },
        remarks: data.lead.remarks || data.lead.initialNote || '',
        initialNote: data.lead.initialNote || data.lead.remarks || '',
      });

      // Fetch templates
      const tmplRes = await fetch('/api/templates');
      if (tmplRes.ok) {
        const tmplData = await tmplRes.json();
        const list = tmplData.templates || [];
        setTemplates(list);
        if (list.length > 0) {
          const currentTmpl = list.find((t: any) => t._id === selectedTemplateId) || list[0];
          if (currentTmpl) {
            applyTemplate(currentTmpl, data.lead);
          }
        }
      }

      // Fetch tasks for this lead
      const taskRes = await fetch(`/api/tasks?leadId=${leadId}`);
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  // Stage Transitions
  const stages = ['New', 'Contacted', 'Quoted', 'Negotiation', 'Booked', 'Ticketed', 'Lost'];
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);

  const handleStageClick = (newStage: string) => {
    if (lead?.stage === newStage || isChangingStage) return;
    setPendingStage(newStage);
  };

  const executeStageChange = async () => {
    if (!pendingStage) return;
    setIsChangingStage(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: pendingStage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change stage');
      setLead(data.lead);
      toast.success('Stage Updated', `Moved lead to "${pendingStage}" stage.`);
      setPendingStage(null);
      await fetchLeadDetails();
    } catch (e: any) {
      console.error(e);
      toast.error('Stage Update Failed', e.message || 'Could not update lead stage');
    } finally {
      setIsChangingStage(false);
    }
  };

  // Reassignment Handler (Admin only)
  const handleReassign = async (newStaffId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: newStaffId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign lead');
      setLead(data.lead);
      const staffName = staffList.find((s) => s._id === newStaffId)?.name || 'Unassigned';
      toast.success('Lead Reassigned', `Lead assigned to ${staffName}.`);
    } catch (e: any) {
      console.error(e);
      toast.error('Reassignment Failed', e.message || 'Could not reassign lead');
    }
  };

  // Save Spec Edits — show confirm dialog first
  const handleSaveSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSavingSpecs(true);
    try {
      const derivedPax =
        editForm.passengers?.length > 0 ? editForm.passengers.length : editForm.pax || 1;

      // Normalize the folded-in billing card: the API expects expiryMonth /
      // expiryYear, but the edit form captures a single MM/YY string.
      let billing = editForm.billing;
      if (billing?.card) {
        const c = { ...billing.card };
        if (typeof c.expiry === 'string' && c.expiry.includes('/')) {
          const [mm, yy] = c.expiry.split('/').map((s: string) => s.trim());
          const m = parseInt(mm, 10);
          const y = parseInt(yy, 10);
          if (!Number.isNaN(m)) c.expiryMonth = m;
          if (!Number.isNaN(y)) c.expiryYear = y < 100 ? 2000 + y : y;
        }
        billing = { ...billing, card: c };
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // tripType/flightLegs/multiCityRoutes are no longer edited here; the
        // server derives origin/destination from pnrHtml.
        body: JSON.stringify({ ...editForm, billing, pax: derivedPax }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save flight details');
      setShowSaveConfirm(false);
      setIsEditingSpecs(false);
      toast.success('Flight Details Updated', 'All passenger and itinerary details saved successfully.');
      if (data.lead) {
        setLead(data.lead);
        const currentTmpl = templates.find((t: any) => t._id === selectedTemplateId) || templates[0];
        if (currentTmpl) {
          applyTemplate(currentTmpl, data.lead);
        }
      }
      await fetchLeadDetails();
    } catch (e: any) {
      console.error(e);
      toast.error('Update Failed', e.message || 'Could not save flight specifications');
    } finally {
      setIsSavingSpecs(false);
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsAddingNote(true);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newNote: newNoteText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add note');
      setLead(data.lead);
      setNewNoteText('');
      toast.success('Note Added', 'Internal staff note saved to lead timeline.');
    } catch (e: any) {
      console.error(e);
      toast.error('Note Failed', e.message || 'Could not save note');
    } finally {
      setIsAddingNote(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsAddingComment(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newCommentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');
      setLead(data.lead);
      setNewCommentText('');
      toast.success('Comment Posted', 'Comment added to lead discussion.');
    } catch (e: any) {
      console.error(e);
      toast.error('Comment Failed', e.message || 'Could not post comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  // Add Reply to Comment
  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, replyText: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setReplyingToId(null);
        setReplyText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Template Placeholder Replacement
  const applyTemplate = (template: any, currentLead: any) => {
    setSelectedTemplateId(template._id);
    const l = currentLead || lead;
    if (!l) return;

    const token = l.customerPortal?.trackingToken || l._id || 'preview-token';
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
    const baseUrl = (typeof window !== 'undefined' && !isLocalhost)
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') ? process.env.NEXT_PUBLIC_APP_URL : 'http://crm.airlinesconsolidator.com');
    const vars = buildTemplateVariables(
      l,
      l.agentName || (l.assignedTo && typeof l.assignedTo === 'object' ? l.assignedTo.name : '') || currentUser?.name || 'Concierge Team',
      currentUser?.email || (l.assignedTo ? l.assignedTo.email : ''),
      currentUser?.phone || (l.assignedTo ? l.assignedTo.phone : ''),
      undefined,
      undefined,
      `${baseUrl}/portal/${token}`,
      undefined,
      `${baseUrl}/api/portal/${token}/authorize`
    );

    const subject = substituteTemplateVariables(template.subject, vars);
    const bodyHtml = substituteTemplateVariables(template.bodyHtml, vars);

    setEmailSubject(subject);
    setEmailBodyHtml(bodyHtml);
  };

  // Send Email with Tracking - Prompts Confirmation First
  const handleSendEmail = () => {
    if (!lead?.email) {
      toast.warning('Missing Email', 'Passenger does not have an email address specified.');
      return;
    }
    if (!emailSubject.trim() || !emailBodyHtml.trim()) {
      toast.warning('Incomplete Email', 'Subject and email content cannot be empty.');
      return;
    }
    setShowSendConfirm(true);
  };

  const executeSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailSuccessMsg('');

    try {
      const res = await fetch(`/api/leads/${leadId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: emailSubject,
          templateId: selectedTemplateId || undefined,
          customHtml: emailBodyHtml,
          useDefaultBrandedTemplate: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      if (data.lead) {
        setLead(data.lead);
      }
      setShowSendConfirm(false);
      setSendSuccessData({
        email: lead.email,
        subject: emailSubject,
        token: data.lead?.customerPortal?.trackingToken || lead.customerPortal?.trackingToken,
      });
      setEmailSuccessMsg('✅ Email dispatched with live tracking & telemetry!');
      toast.success('Email Dispatched', `Itinerary email sent to ${lead.email} with live tracking.`);
      fetchLeadDetails(); // refresh timeline
    } catch (err: any) {
      toast.error('Email Dispatch Failed', err.message || 'Error sending customer email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Copy HTML to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(emailBodyHtml);
    toast.info('Copied to Clipboard', 'HTML email template copied to clipboard.');
  };

  // Open in Mailto
  const handleOpenMailto = () => {
    if (!lead?.email) return;
    const plainText = emailBodyHtml.replace(/<[^>]*>?/gm, '');
    const mailtoUrl = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(plainText.substring(0, 1000))}`;
    window.open(mailtoUrl, '_blank');
  };

  // Add Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) return;
    setIsAddingTask(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          leadId,
          assignedTo: lead.assignedTo?._id || currentUser?._id,
          priority: newTaskPriority,
          dueDate: newTaskDueDate,
          sendEmailAlert: newTaskEmailAlert,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      setTasks((prev) => [...prev, data.task]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      toast.success('Task Created', `"${newTaskTitle.trim()}" added to task list.`);
    } catch (e: any) {
      console.error(e);
      toast.error('Task Creation Failed', e.message || 'Could not create task');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Toggle Task Status
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
        );
        toast.info('Task Updated', `Task marked as ${nextStatus.toLowerCase()}.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !lead) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-ember-neutral">
          <div className="w-8 h-8 rounded-full border-2 border-ember-primary border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Loading flight lead details...</p>
        </div>
      </AppLayout>
    );
  }

  const travelDateFormatted = lead.travelDate
    ? new Date(lead.travelDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not Specified';

  const returnDateFormatted = lead.returnDate
    ? new Date(lead.returnDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/leads">
              <button className="p-2 rounded-btn bg-ember-surface hover:bg-ember-surface-raised border border-ember-border text-ember-text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold font-display text-ember-text-primary">
                  {lead.name}
                </h1>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-ember-surface-raised text-ember-primary border border-ember-border px-2.5 py-1 rounded shadow-xs" title="Reference Number">
                  Ref: {lead.referenceNumber || lead.invoiceNumber || lead.pnr || `AC-${lead._id?.toString().slice(-6).toUpperCase()}`}
                </span>
                <StageBadge stage={lead.stage} size="md" />
                <FollowUpBadge date={lead.nextFollowUpDate} />

                {/* Mail & IP Telemetry Status Chip */}
                {lead.customerPortal?.lastViewedIp ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm" title={`Device: ${lead.customerPortal.lastViewedDevice || 'N/A'}`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>IP: {lead.customerPortal.lastViewedIp}</span>
                    {lead.customerPortal.lastViewedLocation && (
                      <span className="text-[11px] font-medium text-emerald-700">({lead.customerPortal.lastViewedLocation})</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                    Mail: {lead.customerPortal?.lastSentAt ? 'Dispatched' : 'Draft'}
                  </span>
                )}

                {lead.customerPortal?.history?.some((h: any) => h.event === 'booking_authorized') && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                    ✓ Authorized
                  </span>
                )}
              </div>
              <p className="text-xs text-ember-text-secondary mt-0.5">
                Source: <span className="font-semibold text-ember-text-primary">{lead.source}</span> &bull;
                Created {new Date(lead.createdAt).toLocaleDateString()}
                {lead.customerPortal?.lastSentAt && (
                  <> &bull; Sent: <span className="font-semibold text-blue-700">{new Date(lead.customerPortal.lastSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({lead.customerPortal.viewCount || 0} views)</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPreviewModalOpen(true)}
              className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Mail</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsEmailModalOpen(true)}
              className="gap-1.5 shadow-primary-glow"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Customer</span>
            </Button>
            <Button
              size="sm"
              variant={isEditingSpecs ? 'primary' : 'secondary'}
              onClick={() => setIsEditingSpecs(!isEditingSpecs)}
            >
              {isEditingSpecs ? 'Close Editor' : 'Edit Flight Details'}
            </Button>
          </div>
        </div>

        {/* Pipeline Stage Stepper */}
        <Card className="p-3 bg-ember-surface">
          <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
            {stages.map((st, index) => {
              const isActive = lead.stage === st;
              const isPast = stages.indexOf(lead.stage) > index;
              const isThisPending = isChangingStage && pendingStage === st;

              return (
                <button
                  key={st}
                  type="button"
                  disabled={isChangingStage}
                  onClick={() => handleStageClick(st)}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-btn text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-ember-primary text-white shadow-primary-glow'
                      : isPast
                      ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                      : 'bg-ember-surface-raised/80 text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised'
                  } ${isChangingStage ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isThisPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : isPast ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : null}
                  <span>{st}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Lead Specs & Details Grid — 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Col: Flight Specifications, Passenger Info & Billing */}
          <div className="space-y-4">
            <LeadSpecsPanel
              lead={lead}
              isEditing={isEditingSpecs}
              onStartEdit={() => {
                setEditForm({
                  name: lead.name || '',
                  phone: lead.phone || '',
                  email: lead.email || '',
                  source: lead.source,
                  origin: lead.origin || '',
                  destination: lead.destination || '',
                  pax: lead.pax || 1,
                  bookingType: lead.bookingType || 'New Booking',
                  status: lead.status || 'Open',
                  stage: lead.stage || 'New',
                  paymentStatus: lead.paymentStatus || 'Pending',
                  priceQuoted: lead.priceQuoted || '',
                  currency: lead.currency || 'USD',
                  pnr: lead.pnr || '',
                  pnrHtml: lead.pnrHtml || '',
                  ticketNumber: lead.ticketNumber || '',
                  invoiceNumber: lead.invoiceNumber || '',
                  agentName: lead.agentName || (lead.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo.name : '') || currentUser?.name || 'Concierge Team',
                  nextFollowUpDate: lead.nextFollowUpDate ? lead.nextFollowUpDate.split('T')[0] : '',
                  passengers: lead.passengers || [],
                  billing: lead.billing || {},
                  remarks: lead.remarks || lead.initialNote || '',
                  initialNote: lead.initialNote || lead.remarks || '',
                });
                setIsEditingSpecs(true);
              }}
              onCancelEdit={() => setIsEditingSpecs(false)}
              editForm={editForm}
              setEditForm={setEditForm}
              onSubmit={handleSaveSpecs}
              isSaving={isSavingSpecs}
              currentUser={currentUser}
              staffList={staffList}
              onReassign={handleReassign}
            />

            {/* ── Sent Emails ── */}
            {(() => {
              const sentEvents = (lead.customerPortal?.history || []).filter(
                (h: any) => h.event === 'email_sent'
              );
              const lastSentAt = lead.customerPortal?.lastSentAt;
              const hasSent = sentEvents.length > 0 || !!lastSentAt;
              return (
                <Card elevated className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-ember-border">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-ember-primary" />
                      <h3 className="text-sm font-bold font-display text-ember-text-primary">Sent Emails</h3>
                    </div>
                    {hasSent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {sentEvents.length || 1} sent
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                        Not emailed yet
                      </span>
                    )}
                  </div>

                  {!hasSent ? (
                    <p className="text-xs text-ember-neutral italic">
                      No emails have been sent to this customer yet. Use the Email tab to send one.
                    </p>
                  ) : (
                    <>
                      {lastSentAt && (
                        <div className="text-xs text-ember-text-secondary">
                          <span className="font-semibold text-ember-text-primary">Last sent:</span>{' '}
                          {lead.customerPortal?.lastSentSubject || 'Itinerary email'} ·{' '}
                          {new Date(lastSentAt).toLocaleString()}
                          {lead.customerPortal?.lastSentBy ? ` · by ${lead.customerPortal.lastSentBy}` : ''}
                          {lead.customerPortal?.lastSentTo ? ` · to ${lead.customerPortal.lastSentTo}` : ''}
                        </div>
                      )}
                      {sentEvents.length > 0 && (
                        <div className="space-y-1.5">
                          {sentEvents.slice().reverse().map((ev: any, i: number) => (
                            <div key={ev.id || i} className="flex items-start justify-between gap-3 p-2 rounded-btn bg-ember-surface-raised border border-ember-border text-xs">
                              <div className="flex items-start gap-2 min-w-0">
                                <Mail className="w-3.5 h-3.5 text-ember-primary shrink-0 mt-0.5" />
                                <span className="text-ember-text-primary break-words">{ev.description || 'Email sent'}</span>
                              </div>
                              <span className="text-[10px] text-ember-neutral whitespace-nowrap shrink-0">
                                {new Date(ev.timestamp).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-ember-neutral">
                        Full open/click telemetry is in the Tracking &amp; Telemetry tab.
                      </p>
                    </>
                  )}
                </Card>
              );
            })()}

            {false && (isEditingSpecs ? (
              <Card elevated className="space-y-3">
                <h3 className="text-sm font-bold font-display text-ember-text-primary">
                  Edit Flight Requirements
                </h3>
                <form onSubmit={handleSaveSpecs} className="space-y-3">
                  {/* Booking Type & Operational Status — top priority fields */}
                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-ember-border">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ember-text-primary">Booking Type</label>
                      <select
                        value={editForm.bookingType || 'New Booking'}
                        onChange={(e) => setEditForm({ ...editForm, bookingType: e.target.value })}
                        className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary"
                      >
                        {BOOKING_TYPES.map((bt) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ember-text-primary">Operational Status</label>
                      <select
                        value={editForm.status || 'Open'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary"
                      >
                        {LEAD_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pax Counter with Stepper & Quick Presets */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-ember-text-primary">Pax (Travelers)</label>
                          <span className="text-[10px] text-ember-primary font-bold">
                            {(editForm.passengers || []).length || editForm.pax || 1} Person{(((editForm.passengers || []).length || editForm.pax || 1) > 1) ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const current = (editForm.passengers || []).length || editForm.pax || 1;
                              if (current > 1) {
                                const updated = (editForm.passengers || []).slice(0, current - 1);
                                setEditForm({ ...editForm, passengers: updated, pax: updated.length });
                              }
                            }}
                            className="w-9 h-[38px] rounded-btn bg-ember-surface-raised border border-ember-border hover:bg-ember-surface text-ember-text-primary font-bold flex items-center justify-center transition-colors text-base"
                            title="Decrease Pax"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={(editForm.passengers || []).length || editForm.pax || 1}
                            onChange={(e) => {
                              const target = Math.max(1, parseInt(e.target.value) || 1);
                              let updated = [...(editForm.passengers || [])];
                              if (updated.length < target) {
                                for (let i = updated.length; i < target; i++) {
                                  updated.push({
                                    id: `pax_${Date.now()}_${i}`,
                                    firstName: i === 0 ? editForm.name?.split(' ')[0] || '' : `Passenger ${i + 1}`,
                                    middleName: '',
                                    lastName: i === 0 ? editForm.name?.split(' ').slice(1).join(' ') || '' : '',
                                    type: 'Adult',
                                    dob: '',
                                    gender: '',
                                  });
                                }
                              } else if (updated.length > target) {
                                updated = updated.slice(0, target);
                              }
                              setEditForm({ ...editForm, passengers: updated, pax: target });
                            }}
                            className="flex-1 text-center h-[38px] px-2 bg-ember-surface-raised border border-ember-border rounded-input text-sm font-bold text-ember-text-primary focus:outline-none focus:border-ember-primary"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = (editForm.passengers || []).length || editForm.pax || 1;
                              const next = current + 1;
                              const updated = [
                                ...(editForm.passengers || []),
                                {
                                  id: `pax_${Date.now()}_${next}`,
                                  firstName: `Passenger ${next}`,
                                  middleName: '',
                                  lastName: '',
                                  type: 'Adult',
                                  dob: '',
                                  gender: '',
                                },
                              ];
                              setEditForm({ ...editForm, passengers: updated, pax: updated.length });
                            }}
                            className="w-9 h-[38px] rounded-btn bg-ember-surface-raised border border-ember-border hover:bg-ember-surface text-ember-text-primary font-bold flex items-center justify-center transition-colors text-base"
                            title="Increase Pax"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <Input
                        label="Price Quoted"
                        type="number"
                        placeholder="0.00"
                        value={editForm.priceQuoted}
                        onChange={(e) => setEditForm({ ...editForm, priceQuoted: e.target.value })}
                      />
                      <Select
                        label="Currency"
                        value={editForm.currency || 'USD'}
                        onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="PKR">PKR (Rs)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="SAR">SAR (﷼)</option>
                      </Select>
                    </div>

                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="PNR / Reference"
                      value={editForm.pnr}
                      onChange={(e) => setEditForm({ ...editForm, pnr: e.target.value })}
                    />
                    <Input
                      label="Airline Ticket #"
                      placeholder="e.g. 016-2490123891"
                      value={editForm.ticketNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, ticketNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Invoice #"
                      value={editForm.invoiceNumber}
                      onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    />
                    <Select
                      label="Payment Status"
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Authorized">Authorized</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                      <option value="Refunded">Refunded</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Next Follow-Up"
                      type="date"
                      value={editForm.nextFollowUpDate}
                      onChange={(e) => setEditForm({ ...editForm, nextFollowUpDate: e.target.value })}
                    />
                  </div>

                  {/* ── Passenger Details ──────────────────────────── */}
                  <div className="pt-3 border-t border-ember-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-ember-primary" />
                        <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Passenger Details</span>
                        {(editForm.passengers || []).length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
                            {(editForm.passengers || []).length}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-xs gap-1"
                        onClick={() => {
                          const isFirst = (editForm.passengers || []).length === 0;
                          const nameParts = isFirst ? (editForm.name || '').trim().split(' ') : [];
                          const firstName = nameParts[0] || '';
                          const lastName = nameParts.slice(1).join(' ') || '';
                          const updated = [
                            ...(editForm.passengers || []),
                            { id: `pax_${Date.now()}`, firstName, middleName: '', lastName, type: 'Adult', dob: '', gender: '' },
                          ];
                          setEditForm({ ...editForm, passengers: updated, pax: updated.length });
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Add Passenger
                      </Button>
                    </div>

                    {(editForm.passengers || []).length === 0 && (
                      <p className="text-xs text-ember-neutral italic">No passengers added yet. Click "Add Passenger" to start.</p>
                    )}

                    {(editForm.passengers || []).map((pax: any, idx: number) => (
                      <div key={pax.id || idx} className="rounded-btn border border-ember-border overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-ember-primary/10 border-b border-ember-border">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-ember-primary">
                            Passenger {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editForm.passengers.filter((_: any, i: number) => i !== idx);
                              setEditForm({ ...editForm, passengers: updated, pax: updated.length });
                            }}
                            className="p-1 rounded text-ember-neutral hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              label="First Name"
                              placeholder="First name (letters only)..."
                              value={pax.firstName}
                              onChange={(e) => {
                                const cleanVal = lettersAndSpacesOnly(e.target.value);
                                const updated = [...editForm.passengers];
                                updated[idx] = { ...pax, firstName: cleanVal };
                                setEditForm({
                                  ...editForm,
                                  passengers: updated,
                                  // Keep lead name in sync with pax[0]
                                  ...(idx === 0 && { name: [cleanVal, pax.lastName].filter(Boolean).join(' ') }),
                                });
                              }}
                            />
                            <Input
                              label="Middle Name"
                              placeholder="Middle name (letters only)..."
                              value={pax.middleName || ''}
                              onChange={(e) => {
                                const cleanVal = lettersAndSpacesOnly(e.target.value);
                                const updated = [...editForm.passengers];
                                updated[idx] = { ...pax, middleName: cleanVal };
                                setEditForm({ ...editForm, passengers: updated });
                              }}
                            />
                            <Input
                              label="Last Name"
                              placeholder="Last name (letters only)..."
                              value={pax.lastName || ''}
                              onChange={(e) => {
                                const cleanVal = lettersAndSpacesOnly(e.target.value);
                                const updated = [...editForm.passengers];
                                updated[idx] = { ...pax, lastName: cleanVal };
                                setEditForm({
                                  ...editForm,
                                  passengers: updated,
                                  // Keep lead name in sync with pax[0]
                                  ...(idx === 0 && { name: [pax.firstName, cleanVal].filter(Boolean).join(' ') }),
                                });
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Select
                              label="Passenger Type"
                              value={pax.type || 'Adult'}
                              onChange={(e) => {
                                const updated = [...editForm.passengers];
                                updated[idx] = { ...pax, type: e.target.value };
                                setEditForm({ ...editForm, passengers: updated });
                              }}
                            >
                              <option value="Adult">Adult</option>
                              <option value="Child">Child</option>
                              <option value="Infant">Infant</option>
                            </Select>
                            <Input
                              label="Date of Birth"
                              type="date"
                              value={pax.dob || ''}
                              onChange={(e) => {
                                const updated = [...editForm.passengers];
                                updated[idx] = { ...pax, dob: e.target.value };
                                setEditForm({ ...editForm, passengers: updated });
                              }}
                            />
                            <Select
                              label="Gender"
                              value={pax.gender || ''}
                              onChange={(e) => {
                                const updated = [...editForm.passengers];
                                updated[idx] = { ...pax, gender: e.target.value };
                                setEditForm({ ...editForm, passengers: updated });
                              }}
                            >
                              <option value="">Select...</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Contact Detail (shared — one per booking) ──── */}
                  <div className="pt-3 border-t border-ember-border space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-3.5 h-3.5 text-ember-primary" />
                      <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Contact Detail</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Phone"
                        type="tel"
                        placeholder="Primary contact phone..."
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="Primary contact email..."
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* ── Flight Detail ────────────────────────────────── */}
                  <div className="pt-3 border-t border-ember-border space-y-3">
                    {/* PNR Converter — paste HTML from pnrconverter.com */}
                    <HtmlPnrConverter
                      value={String(editForm.pnrHtml ?? '')}
                      onChange={(html) => setEditForm({ ...editForm, pnrHtml: html })}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plane className="w-3.5 h-3.5 text-ember-primary" />
                        <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Flight Detail</span>
                        {(editForm.flightLegs || []).length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
                            {(editForm.flightLegs || []).length} leg{(editForm.flightLegs || []).length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-xs gap-1"
                        onClick={() => setEditForm({
                          ...editForm,
                          flightLegs: [
                            ...(editForm.flightLegs || []),
                            { id: `leg_${Date.now()}`, carrier: '', flightNumber: '', flightClass: 'Economy', departingAirport: '', departingAt: '', arrivingAirport: '', arrivingAt: '' },
                          ],
                        })}
                      >
                        <Plus className="w-3 h-3" />
                        Add Leg
                      </Button>
                    </div>

                    {/* ── Route (primary lead fields — always saved) ── */}
                    <div className="p-3 bg-ember-surface-raised rounded-btn border border-ember-border space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">Customer Requested Route</p>
                        {editForm.tripType === 'Multi-City' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            Multi-City Mode
                          </span>
                        )}
                      </div>

                      {/* Trip type selector */}
                      <div className="flex items-center p-0.5 rounded-btn bg-white border border-ember-border self-start w-fit">
                        {(['One Way', 'Round Trip', 'Multi-City'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              const updatedRoutes =
                                type === 'Multi-City' && (!editForm.multiCityRoutes || editForm.multiCityRoutes.length === 0)
                                  ? [
                                      { id: `route_${Date.now()}_1`, origin: editForm.origin || '', destination: editForm.destination || '', travelDate: editForm.travelDate || '' },
                                      { id: `route_${Date.now()}_2`, origin: editForm.destination || '', destination: '', travelDate: '' },
                                    ]
                                  : editForm.multiCityRoutes;
                              setEditForm({ ...editForm, tripType: type, multiCityRoutes: updatedRoutes });
                            }}
                            className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-colors ${
                              (editForm.tripType || 'Round Trip') === type
                                ? 'bg-ember-primary text-white shadow-sm'
                                : 'text-ember-neutral hover:text-ember-text-primary'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      {editForm.tripType === 'Multi-City' ? (
                        <div className="space-y-2.5 p-2.5 rounded-btn bg-amber-500/5 border border-amber-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide flex items-center gap-1.5">
                              <Plane className="w-3.5 h-3.5 text-ember-primary" />
                              <span>Multi-City Itinerary Sectors ({editForm.multiCityRoutes?.length || 0})</span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="text-xs gap-1 py-1"
                              onClick={() => {
                                const currentRoutes = editForm.multiCityRoutes?.length > 0
                                  ? editForm.multiCityRoutes
                                  : [{ id: `route_1`, origin: editForm.origin || '', destination: editForm.destination || '', travelDate: editForm.travelDate || '' }];
                                const last = currentRoutes[currentRoutes.length - 1];
                                const nextRoute = {
                                  id: `route_${Date.now()}_${currentRoutes.length + 1}`,
                                  origin: last?.destination || '',
                                  destination: '',
                                  travelDate: '',
                                };
                                const updated = [...currentRoutes, nextRoute];
                                setEditForm({
                                  ...editForm,
                                  multiCityRoutes: updated,
                                  origin: updated[0]?.origin || editForm.origin,
                                  destination: updated[updated.length - 1]?.destination || editForm.destination,
                                });
                              }}
                            >
                              <Plus className="w-3 h-3" />
                              Add Sector
                            </Button>
                          </div>

                          {((editForm.multiCityRoutes && editForm.multiCityRoutes.length > 0)
                            ? editForm.multiCityRoutes
                            : [
                                { id: `route_1`, origin: editForm.origin || '', destination: '', travelDate: editForm.travelDate || '' },
                                { id: `route_2`, origin: '', destination: editForm.destination || '', travelDate: '' },
                              ]
                          ).map((route: any, rIdx: number, allRoutes: any[]) => (
                            <div key={route.id || rIdx} className="p-2.5 rounded-btn bg-ember-surface border border-ember-border space-y-2">
                              <div className="flex items-center justify-between font-bold text-ember-primary text-[11px]">
                                <span>Sector {rIdx + 1}: {route.origin || 'Origin'} → {route.destination || 'Destination'}</span>
                                {allRoutes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = allRoutes.filter((_: any, i: number) => i !== rIdx);
                                      setEditForm({
                                        ...editForm,
                                        multiCityRoutes: updated,
                                        origin: updated[0]?.origin || '',
                                        destination: updated[updated.length - 1]?.destination || '',
                                      });
                                    }}
                                    className="p-1 rounded text-ember-neutral hover:text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <AirportInput
                                  label={`From (Sector ${rIdx + 1})`}
                                  placeholder="e.g. NYC, JFK"
                                  value={route.origin || ''}
                                  onChange={(val) => {
                                    const updated = [...allRoutes];
                                    updated[rIdx] = { ...route, origin: val };
                                    setEditForm({
                                      ...editForm,
                                      multiCityRoutes: updated,
                                      origin: updated[0]?.origin || editForm.origin,
                                    });
                                  }}
                                />
                                <AirportInput
                                  label={`To (Sector ${rIdx + 1})`}
                                  placeholder="e.g. LON, LHR"
                                  value={route.destination || ''}
                                  onChange={(val) => {
                                    const updated = [...allRoutes];
                                    updated[rIdx] = { ...route, destination: val };
                                    setEditForm({
                                      ...editForm,
                                      multiCityRoutes: updated,
                                      destination: updated[updated.length - 1]?.destination || editForm.destination,
                                    });
                                  }}
                                />
                                <Input
                                  label="Date"
                                  type="date"
                                  value={route.travelDate || ''}
                                  onChange={(e) => {
                                    const updated = [...allRoutes];
                                    updated[rIdx] = { ...route, travelDate: e.target.value };
                                    setEditForm({
                                      ...editForm,
                                      multiCityRoutes: updated,
                                      travelDate: rIdx === 0 ? e.target.value : editForm.travelDate,
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <AirportInput
                              label="Origin"
                              value={editForm.origin || ''}
                              onChange={(v) => setEditForm({ ...editForm, origin: v })}
                              required
                            />
                            <AirportInput
                              label="Destination"
                              value={editForm.destination || ''}
                              onChange={(v) => setEditForm({ ...editForm, destination: v })}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="Travel Date"
                              type="date"
                              value={editForm.travelDate || ''}
                              onChange={(e) => setEditForm({ ...editForm, travelDate: e.target.value })}
                            />
                            {(editForm.tripType || 'Round Trip') !== 'One Way' && (
                              <Input
                                label="Return Date"
                                type="date"
                                value={editForm.returnDate || ''}
                                onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })}
                              />
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Live route preview from legs */}
                    {(editForm.flightLegs || []).some((l: any) => l.departingAirport || l.arrivingAirport) && (
                      <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-ember-surface-raised rounded-btn border border-ember-border">
                        {(editForm.flightLegs || []).map((leg: any, idx: number) => (
                          <span key={leg.id || idx} className="flex items-center gap-1 text-xs font-bold text-ember-text-primary">
                            {idx > 0 && <span className="text-ember-border mx-0.5">·</span>}
                            <span className="font-mono text-ember-primary">{leg.departingAirport || '?'}</span>
                            <span className="text-ember-neutral">→</span>
                            <span className="font-mono text-ember-primary">{leg.arrivingAirport || '?'}</span>
                            {leg.carrier && <span className="text-[10px] text-ember-neutral font-normal ml-0.5">({leg.carrier}{leg.flightNumber ? ' ' + leg.flightNumber : ''})</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    {(editForm.flightLegs || []).length === 0 && (
                      <p className="text-xs text-ember-neutral italic">No legs yet — click "Add Leg" to start building the itinerary.</p>
                    )}

                    {(editForm.flightLegs || []).map((leg: any, idx: number) => (
                      <div key={leg.id || idx} className="rounded-btn border border-ember-border bg-ember-surface relative">
                        {/* Leg header — shows live DEP → ARR as soon as typed */}
                        <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-ember-border">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">
                              Leg {idx + 1}
                            </span>
                            {(leg.departingAirport || leg.arrivingAirport) && (
                              <span className="flex items-center gap-1 text-xs font-bold">
                                <span className="font-mono text-ember-primary">{leg.departingAirport || '?'}</span>
                                <span className="text-ember-neutral text-[10px]">→</span>
                                <span className="font-mono text-ember-primary">{leg.arrivingAirport || '?'}</span>
                              </span>
                            )}
                            {leg.flightClass && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                {leg.flightClass}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              flightLegs: editForm.flightLegs.filter((_: any, i: number) => i !== idx),
                            })}
                            className="p-1 rounded text-ember-neutral hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-3 space-y-3">
                          {/* Carrier / Flight # / Class */}
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              label="Carrier"
                              placeholder="e.g. IndiGo"
                              value={leg.carrier || ''}
                              onChange={(e) => {
                                const updated = [...editForm.flightLegs];
                                updated[idx] = { ...leg, carrier: e.target.value };
                                setEditForm({ ...editForm, flightLegs: updated });
                              }}
                            />
                            <Input
                              label="Flight #"
                              placeholder="e.g. 6E 204"
                              value={leg.flightNumber || ''}
                              onChange={(e) => {
                                const updated = [...editForm.flightLegs];
                                updated[idx] = { ...leg, flightNumber: e.target.value };
                                setEditForm({ ...editForm, flightLegs: updated });
                              }}
                            />
                            <Select
                              label="Class"
                              value={leg.flightClass || 'Economy'}
                              onChange={(e) => {
                                const updated = [...editForm.flightLegs];
                                updated[idx] = { ...leg, flightClass: e.target.value };
                                setEditForm({ ...editForm, flightLegs: updated });
                              }}
                            >
                              <option value="Economy">Economy</option>
                              <option value="Premium Economy">Premium Economy</option>
                              <option value="Business">Business</option>
                              <option value="First">First</option>
                            </Select>
                          </div>

                          {/* Departing */}
                          <div className="pt-2 border-t border-ember-border/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral mb-2">Departing</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <AirportInput
                                label="Departing Airport"
                                placeholder="Search city or airport code..."
                                value={leg.departingAirport || ''}
                                onChange={(v) => {
                                  const updated = [...editForm.flightLegs];
                                  updated[idx] = { ...leg, departingAirport: v };
                                  setEditForm({ ...editForm, flightLegs: updated });
                                }}
                                onSelect={(opt) => {
                                  const updated = [...editForm.flightLegs];
                                  updated[idx] = { ...leg, departingAirport: `${opt.cityName} (${opt.airportCode})` };
                                  setEditForm({ ...editForm, flightLegs: updated });
                                }}
                              />
                              <Input
                                label="Date & Time"
                                type="datetime-local"
                                value={leg.departingAt || ''}
                                onChange={(e) => {
                                  const updated = [...editForm.flightLegs];
                                  updated[idx] = { ...leg, departingAt: e.target.value };
                                  setEditForm({ ...editForm, flightLegs: updated });
                                }}
                              />
                            </div>
                          </div>

                          {/* Arriving */}
                          <div className="pt-2 border-t border-ember-border/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral mb-2">Arriving</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <AirportInput
                                label="Arriving Airport"
                                placeholder="Search city or airport code..."
                                value={leg.arrivingAirport || ''}
                                onChange={(v) => {
                                  const updated = [...editForm.flightLegs];
                                  updated[idx] = { ...leg, arrivingAirport: v };
                                  setEditForm({ ...editForm, flightLegs: updated });
                                }}
                                onSelect={(opt) => {
                                  const updated = [...editForm.flightLegs];
                                  updated[idx] = { ...leg, arrivingAirport: `${opt.cityName} (${opt.airportCode})` };
                                  setEditForm({ ...editForm, flightLegs: updated });
                                }}
                              />
                              <Input
                                label="Date & Time"
                                type="datetime-local"
                                value={leg.arrivingAt || ''}
                                onChange={(e) => {
                                  const updated = [...editForm.flightLegs];
                                  updated[idx] = { ...leg, arrivingAt: e.target.value };
                                  setEditForm({ ...editForm, flightLegs: updated });
                                }}
                              />
                            </div>
                          </div>

                          {/* Leg Ancillaries: Meal, Baggage, Seat */}
                          <div className="pt-2 border-t border-ember-border/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral mb-1.5">Leg Ancillaries (Optional)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Meal</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Vegetarian..."
                                  value={leg.meal || ''}
                                  onChange={(e) => {
                                    const updated = [...editForm.flightLegs];
                                    updated[idx] = { ...leg, meal: e.target.value };
                                    setEditForm({ ...editForm, flightLegs: updated });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Baggage</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 2 x 23kg..."
                                  value={leg.baggage || ''}
                                  onChange={(e) => {
                                    const updated = [...editForm.flightLegs];
                                    updated[idx] = { ...leg, baggage: e.target.value };
                                    setEditForm({ ...editForm, flightLegs: updated });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Seat</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 14A..."
                                  value={leg.seat || ''}
                                  onChange={(e) => {
                                    const updated = [...editForm.flightLegs];
                                    updated[idx] = { ...leg, seat: e.target.value };
                                    setEditForm({ ...editForm, flightLegs: updated });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Full itinerary preview — shown when 2+ legs or any leg has data */}
                    {(editForm.flightLegs || []).some((l: any) => l.departingAirport) && (
                      <div className="rounded-btn border border-ember-border overflow-hidden mt-1">
                        <div className="flex items-center gap-2 px-3 py-2 bg-ember-primary text-white">
                          <Plane className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Itinerary Preview</span>
                        </div>
                        <div className="divide-y divide-ember-border/60">
                          {(editForm.flightLegs || []).map((leg: any, idx: number) => (
                            <div key={leg.id || idx} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                              <span className="text-[10px] text-ember-neutral w-8 shrink-0">#{idx + 1}</span>
                              <div className="flex items-center gap-1.5 font-bold flex-1">
                                <span className="font-mono text-ember-primary text-sm">{leg.departingAirport || '—'}</span>
                                <span className="text-ember-neutral">→</span>
                                <span className="font-mono text-ember-primary text-sm">{leg.arrivingAirport || '—'}</span>
                              </div>
                              <div className="text-ember-text-secondary text-right space-y-0.5">
                                {leg.carrier && <div className="font-semibold">{leg.carrier}{leg.flightNumber ? ' · ' + leg.flightNumber : ''}</div>}
                                {leg.departingAt && <div className="text-[10px]">{new Date(leg.departingAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
                                {leg.flightClass && <div className="text-[10px] text-amber-700 font-semibold">{leg.flightClass}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* ── Add-ons & Ancillary Services (Meals, Baggage, Seats) ── */}
                    <div className="pt-3 border-t border-ember-border space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-ember-primary" />
                        <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">
                          Add-ons &amp; Ancillary Services
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Meal Preference</label>
                          <input
                            type="text"
                            placeholder="e.g. Vegetarian, Halal, Kosher..."
                            value={editForm.addOns?.meal || ''}
                            onChange={(e) => setEditForm({ ...editForm, addOns: { ...(editForm.addOns || {}), meal: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Baggage Allowance</label>
                          <input
                            type="text"
                            placeholder="e.g. 2 x 23kg Checked Bags..."
                            value={editForm.addOns?.baggage || ''}
                            onChange={(e) => setEditForm({ ...editForm, addOns: { ...(editForm.addOns || {}), baggage: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Seat Selection / Preference</label>
                          <input
                            type="text"
                            placeholder="e.g. Window, 14A / 14B..."
                            value={editForm.addOns?.seat || ''}
                            onChange={(e) => setEditForm({ ...editForm, addOns: { ...(editForm.addOns || {}), seat: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Special Requests / Ancillary Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Wheelchair assistance at gate, infant bassinet..."
                          value={editForm.addOns?.notes || ''}
                          onChange={(e) => setEditForm({ ...editForm, addOns: { ...(editForm.addOns || {}), notes: e.target.value } })}
                          className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="pt-3 border-t border-ember-border/60">
                    <label className="block text-xs font-bold text-ember-text-primary mb-1">
                      Remark
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Prefers direct flight, premium economy, flexible on +/- 2 days."
                      value={editForm.remarks || editForm.initialNote || ''}
                      onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value, initialNote: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium placeholder:text-ember-neutral"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditingSpecs(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" isLoading={isSavingSpecs}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card elevated className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-ember-border flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusTone(lead.status)}`}>
                        {lead.status || 'Open'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
                        {bookingTypeShort(lead.bookingType) || 'Booking'}
                      </span>
                      <PaymentBadge status={lead.paymentStatus} size="sm" />
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditForm({
                          name: lead.name || '',
                          phone: lead.phone || '',
                          email: lead.email || '',
                          origin: lead.origin || '',
                          destination: lead.destination || '',
                          travelDate: lead.travelDate ? lead.travelDate.split('T')[0] : '',
                          returnDate: lead.returnDate ? lead.returnDate.split('T')[0] : '',
                          pax: lead.pax || 1,
                          tripType: lead.tripType || 'Round Trip',
                          priceQuoted: lead.priceQuoted || 0,
                          bookingType: lead.bookingType || 'New Booking',
                          status: lead.status || 'Open',
                          stage: lead.stage || 'New',
                          pnr: lead.pnr || '',
                          ticketNumber: lead.ticketNumber || '',
                          invoiceNumber: lead.invoiceNumber || '',
                          paymentStatus: lead.paymentStatus || 'Pending',
                          nextFollowUpDate: lead.nextFollowUpDate ? lead.nextFollowUpDate.split('T')[0] : '',
                          passengers: lead.passengers || [],
                          flightLegs: lead.flightLegs || [],
                          multiCityRoutes: lead.multiCityRoutes || [],
                          addOns: lead.addOns || { meal: '', baggage: '', seat: '', notes: '' },
                        });
                        setIsEditingSpecs(true);
                      }}
                      className="text-xs gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Flight Details</span>
                    </Button>
                  </div>

                  {/* Route Banner / Multi-City Chain */}
                  {lead.tripType === 'Multi-City' && (lead.multiCityRoutes || []).length > 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-btn space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                          <Plane className="w-3 h-3 text-amber-700" />
                          Multi-City Requested Itinerary ({lead.multiCityRoutes.length} Sectors)
                        </span>
                        <span className="text-[11px] font-bold text-amber-800">{lead.pax} Pax</span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {lead.multiCityRoutes.map((r: any, rIdx: number) => (
                          <div key={r.id || rIdx} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white/80 border border-amber-200 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-ember-text-primary">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 font-mono">#{rIdx + 1}</span>
                              <span className="text-ember-primary">{r.origin || '—'}</span>
                              <span className="text-ember-neutral">→</span>
                              <span className="text-ember-primary">{r.destination || '—'}</span>
                            </div>
                            {r.travelDate && (
                              <span className="text-[11px] font-semibold text-ember-neutral">
                                {new Date(r.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {lead.pnr && (
                        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-amber-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">PNR</span>
                          <span className="font-mono font-bold text-base text-emerald-900 bg-emerald-50 px-3 py-0.5 rounded border border-emerald-400 tracking-widest shadow-sm">
                            {lead.pnr}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-ember-surface-raised p-3.5 rounded-btn space-y-1">
                      <div className="flex items-center justify-between font-bold text-sm text-ember-text-primary">
                        <span>{lead.origin}</span>
                        <span className="text-ember-primary">&rarr;</span>
                        <span>{lead.destination}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-ember-text-secondary">
                        <span>{lead.tripType}</span>
                        <span>{lead.pax} Passenger(s)</span>
                      </div>
                      {lead.pnr && (
                        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-ember-border/60">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">PNR</span>
                          <span className="font-mono font-bold text-base text-emerald-900 bg-emerald-50 px-3 py-0.5 rounded border border-emerald-400 tracking-widest shadow-sm">
                            {lead.pnr}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Booking Summary ── */}
                  <div className="space-y-0 text-xs divide-y divide-ember-border/60">
                    {[
                      { label: 'Quoted Fare', value: lead.priceQuoted > 0 ? `${lead.currency || 'USD'} ${lead.priceQuoted.toLocaleString()}` : 'Not Quoted', bold: true, highlight: lead.priceQuoted > 0 },
                      { label: 'Departure Date', value: travelDateFormatted },
                      ...(lead.tripType !== 'One Way' ? [{ label: 'Return Date', value: returnDateFormatted }] : []),
                      { label: 'PNR', value: lead.pnr || '—', mono: true, highlight: !!lead.pnr },
                      { label: 'Ticket #', value: lead.ticketNumber || '—', mono: true },
                      { label: 'Invoice #', value: lead.invoiceNumber || '—', mono: true },
                      { label: 'Payment', value: lead.paymentStatus },
                      { label: 'Next Follow-Up', value: lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                    ].map(({ label, value, bold, mono, highlight }: any) => (
                      <div key={label} className="flex items-center justify-between py-1.5">
                        <span className="text-ember-neutral">{label}:</span>
                        <span className={`${bold ? 'font-bold text-sm' : 'font-semibold'} ${mono ? 'font-mono' : ''} ${highlight ? 'text-ember-primary' : 'text-ember-text-primary'}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ── Add-ons & Ancillaries Summary Display ── */}
                  {lead.addOns && (lead.addOns.meal || lead.addOns.baggage || lead.addOns.seat || lead.addOns.notes) && (
                    <div className="bg-sky-50/70 border border-sky-200 rounded-btn p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Add-ons &amp; Ancillaries</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {lead.addOns.meal && (
                          <div className="bg-white/90 border border-sky-100 p-2 rounded">
                            <div className="text-[10px] text-sky-700 font-bold uppercase">Meal</div>
                            <div className="font-semibold text-ember-text-primary mt-0.5">{lead.addOns.meal}</div>
                          </div>
                        )}
                        {lead.addOns.baggage && (
                          <div className="bg-white/90 border border-sky-100 p-2 rounded">
                            <div className="text-[10px] text-sky-700 font-bold uppercase">Baggage</div>
                            <div className="font-semibold text-ember-text-primary mt-0.5">{lead.addOns.baggage}</div>
                          </div>
                        )}
                        {lead.addOns.seat && (
                          <div className="bg-white/90 border border-sky-100 p-2 rounded">
                            <div className="text-[10px] text-sky-700 font-bold uppercase">Seat</div>
                            <div className="font-semibold text-ember-text-primary mt-0.5">{lead.addOns.seat}</div>
                          </div>
                        )}
                      </div>
                      {lead.addOns.notes && (
                        <div className="text-xs text-ember-text-secondary pt-1 border-t border-sky-100">
                          <strong className="text-sky-900">Notes:</strong> {lead.addOns.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Remark ── */}
                  {(lead.remarks || lead.initialNote || lead.notes?.[0]?.text) && (
                    <div className="pt-3 border-t border-ember-border space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-ember-neutral" />
                        <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">Remark</span>
                      </div>
                      <div className="p-3 rounded-btn bg-amber-50/70 border border-amber-200/80 text-xs text-stone-800 leading-relaxed font-medium">
                        {lead.remarks || lead.initialNote || lead.notes?.[0]?.text}
                      </div>
                    </div>
                  )}

                  {/* ── Passenger Details ── */}
                  <div className="pt-3 border-t border-ember-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-ember-neutral" />
                      <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">
                        Passenger Details
                        {lead.passengers?.length > 0 && <span className="ml-1 text-ember-primary">({lead.passengers.length})</span>}
                      </span>
                    </div>
                    {(!lead.passengers || lead.passengers.length === 0) ? (
                      <div className="rounded-btn border border-ember-border overflow-hidden text-xs">
                        <div className="px-3 py-1.5 bg-ember-primary/10 border-b border-ember-border/60 font-bold text-ember-primary">
                          Passenger 1 (Lead)
                        </div>
                        <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Full Name</span>
                            <span className="font-bold text-ember-text-primary">{lead.name || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Gender</span>
                            <span className="font-semibold text-ember-text-primary">—</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Date of Birth</span>
                            <span className="font-semibold text-ember-text-primary">—</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      lead.passengers.map((pax: any, idx: number) => (
                        <div key={pax.id || idx} className="rounded-btn border border-ember-border overflow-hidden text-xs">
                          {/* Card header */}
                          <div className="flex items-center justify-between px-3 py-1.5 bg-ember-primary/10 border-b border-ember-border/60">
                            <span className="font-bold text-ember-primary">
                              Passenger {idx + 1}{idx === 0 ? ' (Lead)' : ''}
                            </span>
                            {pax.gender && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-ember-primary/10 text-ember-primary border border-ember-primary/20 rounded">
                                {pax.gender}
                              </span>
                            )}
                          </div>

                          {/* All fields in a grid */}
                          <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="col-span-2">
                              <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Full Name</span>
                              <span className="font-bold text-ember-text-primary text-sm">
                                {[pax.firstName, pax.lastName].filter(Boolean).join(' ') || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Date of Birth</span>
                              <span className="font-semibold text-ember-text-primary">
                                {pax.dob
                                  ? new Date(pax.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : <span className="text-ember-neutral italic font-normal">Not provided</span>}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Gender</span>
                              <span className="font-semibold text-ember-text-primary">
                                {pax.gender || <span className="text-ember-neutral italic font-normal">Not specified</span>}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* ── Contact Detail ── */}
                  <div className="pt-3 border-t border-ember-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-ember-neutral" />
                      <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">Contact Detail</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3 h-3 text-ember-neutral shrink-0" />
                      <a href={`tel:${lead.phone}`} className="font-semibold text-ember-text-primary hover:text-ember-primary">
                        {lead.phone || '—'}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3 h-3 text-ember-neutral shrink-0" />
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="font-semibold text-ember-text-primary hover:text-ember-primary">
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-ember-neutral italic">No email on file</span>
                      )}
                    </div>
                  </div>

                  {/* ── Flight Detail ── */}
                  <div className="pt-3 border-t border-ember-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5 text-ember-neutral" />
                      <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">
                        Flight Detail
                        {lead.flightLegs?.length > 0 && (
                          <span className="ml-1 text-ember-primary">({lead.flightLegs.length} leg{lead.flightLegs.length > 1 ? 's' : ''})</span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ember-surface border border-ember-border text-ember-neutral ml-auto">
                        {lead.tripType || 'Round Trip'}
                      </span>
                    </div>

                    {(!lead.flightLegs || lead.flightLegs.length === 0) ? (
                      <p className="text-xs text-ember-neutral italic">No flight legs recorded.</p>
                    ) : (
                      <>
                        {/* Route chain preview */}
                        <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-ember-surface-raised rounded-btn border border-ember-border text-xs font-bold">
                          {lead.flightLegs.map((leg: any, idx: number) => (
                            <span key={leg.id || idx} className="flex items-center gap-1">
                              {idx > 0 && <span className="text-ember-border mx-1">·</span>}
                              <span className="font-mono text-ember-primary">{leg.departingAirport || '?'}</span>
                              <span className="text-ember-neutral text-[10px]">→</span>
                              <span className="font-mono text-ember-primary">{leg.arrivingAirport || '?'}</span>
                            </span>
                          ))}
                        </div>

                        {/* Each leg card */}
                        {lead.flightLegs.map((leg: any, idx: number) => (
                          <div key={leg.id || idx} className="rounded-btn border border-ember-border overflow-hidden text-xs">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-ember-primary text-white">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold opacity-70">Leg {idx + 1}</span>
                                <span className="font-bold font-mono">
                                  {leg.departingAirport || '?'} → {leg.arrivingAirport || '?'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {leg.carrier && <span className="text-[11px]">{leg.carrier}{leg.flightNumber ? ' ' + leg.flightNumber : ''}</span>}
                                {leg.flightClass && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-400 text-stone-900 rounded">
                                    {leg.flightClass}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-ember-border/60 bg-ember-surface-raised">
                              <div className="px-3 py-2 space-y-0.5">
                                <div className="text-[10px] uppercase tracking-wide text-ember-neutral font-semibold">Departing</div>
                                <div className="font-bold text-ember-text-primary">{leg.departingAirport || '—'}</div>
                                {leg.departingAt && (
                                  <div className="text-ember-text-secondary text-[11px]">
                                    {resolveDateTime(leg.departingAt).formattedDateTime}
                                  </div>
                                )}
                              </div>
                              <div className="px-3 py-2 space-y-0.5">
                                <div className="text-[10px] uppercase tracking-wide text-ember-neutral font-semibold">Arriving</div>
                                <div className="font-bold text-ember-text-primary">{leg.arrivingAirport || '—'}</div>
                                {leg.arrivingAt && (
                                  <div className="text-ember-text-secondary text-[11px]">
                                    {resolveDateTime(leg.arrivingAt).formattedDateTime}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* PNR converter HTML itinerary (read-only preview) */}
                    {lead.pnrHtml && lead.pnrHtml.trim() && (
                      <div className="pt-2 mt-1 border-t border-ember-border space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ember-neutral">
                          <FileText className="w-3 h-3 text-ember-primary" />
                          <span>PNR Itinerary (Converted)</span>
                        </div>
                        <div className="rounded-btn border border-ember-border bg-white p-3 max-h-[360px] overflow-auto shadow-inner">
                          {/<\/?[a-z][\s\S]*>/i.test(lead.pnrHtml) ? (
                            <>
                              <style>{`
                                .pnr-html-preview table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; border: 1px solid #e2e8f0; }
                                .pnr-html-preview th { background: #f1f5f9; color: #0b3c8a; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8; padding: 8px 10px; text-align: left; vertical-align: middle; white-space: nowrap; }
                                .pnr-html-preview td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; color: #1e293b; text-align: left; vertical-align: middle; }
                                .pnr-html-preview img { max-height: 28px; max-width: 90px; width: auto; height: auto; vertical-align: middle; display: inline-block; }
                                .pnr-html-preview a { color: #0b3c8a; text-decoration: underline; }
                              `}</style>
                              <div
                                className="pnr-html-preview text-xs text-ember-text-primary overflow-x-auto"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(lead.pnrHtml) }}
                              />
                            </>
                          ) : (
                            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-ember-text-primary m-0">
                              {lead.pnrHtml}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Agent Box */}
                  <div className="pt-3 border-t border-ember-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">
                        Assigned Agent
                      </span>
                      {currentUser?.role === 'admin' && (
                        <span className="text-[10px] text-ember-primary font-bold">Admin Reassign</span>
                      )}
                    </div>

                    {currentUser?.role === 'admin' ? (
                      <select
                        value={lead.assignedTo?._id || ''}
                        onChange={(e) => handleReassign(e.target.value)}
                        className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary"
                      >
                        <option value="">Unassigned</option>
                        {staffList
                          .filter((s) => s.active)
                          .map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({s.email})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2.5 p-2 bg-ember-surface-raised rounded-btn border border-ember-border/60">
                        <div className="w-7 h-7 rounded-full bg-ember-primary/10 text-ember-primary flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ember-text-primary">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </p>
                          <p className="text-[11px] text-ember-neutral">{lead.assignedTo?.email || '—'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Engagement & Live IP Telemetry — moved to Tracking tab on the right */}
                </Card>

                {/* Billing & Card Details Component */}
                <LeadBillingManager
                  leadId={leadId}
                  billing={lead.billing}
                  onUpdateBilling={(updatedBilling) => {
                    setLead((prev: any) => ({ ...prev, billing: updatedBilling }));
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right Col: Tabs Workspace (Email Composer, Notes, Tracking & Activity, Tasks) */}
          <div className="space-y-4">
            <Tabs
              tabs={[
                { id: 'email', label: 'Email Customer', icon: <Mail className="w-4 h-4" /> },
                { id: 'attachments', label: 'Tickets & Documents', count: lead.attachments?.length || 0, icon: <FileText className="w-4 h-4" /> },
                { id: 'activity', label: 'Tracking & Telemetry', count: (lead.customerPortal?.history?.length || 0) + (lead.activityLog?.length || 0), icon: <Activity className="w-4 h-4" /> },
                { id: 'notes', label: 'Notes Thread', count: lead.notes?.length || 0, icon: <FileText className="w-4 h-4" /> },
                { id: 'comments', label: 'Comments', count: (lead.comments || []).reduce((a: number, c: any) => a + 1 + (c.replies?.length || 0), 0), icon: <MessageSquare className="w-4 h-4" /> },
                { id: 'tasks', label: 'Lead Tasks', count: tasks.length, icon: <CheckSquare className="w-4 h-4" /> },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {/* TAB 1: DUAL-MODE EMAIL COMPOSER */}
            {activeTab === 'email' && (
              <Card elevated className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ember-border">
                  <div>
                    <h3 className="text-sm font-bold font-display text-ember-text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-ember-accent" />
                      <span>Email Customer with Flight Itinerary & Tickets</span>
                    </h3>
                    <p className="text-xs text-ember-text-secondary mt-0.5">
                      Includes automatic customer tracking token, 1x1 tracking pixel, and attached electronic tickets.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => setIsEmailModalOpen(true)}
                      className="gap-1.5 shadow-primary-glow text-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Launch Modal Composer</span>
                    </Button>
                    <div className="flex items-center p-0.5 rounded-btn bg-ember-surface-raised border border-ember-border text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setEmailMode('template')}
                        className={`px-3 py-1 rounded-btn transition-colors ${
                          emailMode === 'template'
                            ? 'bg-ember-primary text-white shadow-sm'
                            : 'text-ember-neutral hover:text-ember-text-primary'
                        }`}
                      >
                        Dynamic Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailMode('html')}
                        className={`px-3 py-1 rounded-btn transition-colors ${
                          emailMode === 'html'
                            ? 'bg-ember-primary text-white shadow-sm'
                            : 'text-ember-neutral hover:text-ember-text-primary'
                        }`}
                      >
                        Raw HTML Mode
                      </button>
                    </div>
                  </div>
                </div>

                {emailSuccessMsg && (
                  <div className="p-3 rounded-btn bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{emailSuccessMsg}</span>
                  </div>
                )}

                {/* Mode 1: Template Picker */}
                {emailMode === 'template' && (
                  <div className="space-y-3">
                    <Select
                      label="Select Saved HTML Template"
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const tmpl = templates.find((t) => t._id === e.target.value);
                        if (tmpl) applyTemplate(tmpl, lead);
                      }}
                    >
                      {templates.map((t) => (
                        <option key={t._id} value={t._id}>
                          [{t.category}] {t.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Email Subject */}
                <Input
                  label="Subject Line"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Flight quotation & options..."
                />

                {/* Live Rendered Client Preview */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-ember-text-primary">
                    <span>Live Rendered Client Preview</span>
                    <span className="text-[11px] text-emerald-700 font-bold">1x1 Pixel Active</span>
                  </div>
                  <div className="w-full h-[360px] bg-white border border-ember-border rounded-input overflow-auto p-3 shadow-inner">
                    <div
                      dangerouslySetInnerHTML={{ __html: emailBodyHtml }}
                      className="text-xs [&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto break-words"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ember-border">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Template</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyToClipboard}
                      className="gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy HTML</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleOpenMailto}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Mail Client</span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    size="md"
                    isLoading={isSendingEmail}
                    onClick={handleSendEmail}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Tracked Email</span>
                  </Button>
                </div>
              </Card>
            )}

            {/* TAB 2: TICKETS & DOCUMENTS */}
            {activeTab === 'attachments' && (
              <LeadAttachmentsManager
                leadId={leadId}
                attachments={lead.attachments || []}
                onAttachmentChange={(updated) => {
                  setLead((prev: any) => ({ ...prev, attachments: updated }));
                }}
              />
            )}

            {/* TAB 3: REALTIME ACTIVITY & EMAIL TRACKING TELEMETRY */}
            {activeTab === 'activity' && (
              <div className="space-y-6">

                {/* Live IP Telemetry Summary — top of tracking panel */}
                <Card elevated className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-ember-border">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-ember-primary" />
                      <h3 className="text-sm font-bold font-display text-ember-text-primary">Email & IP Telemetry</h3>
                    </div>
                    {lead.customerPortal?.lastSentAt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Email Dispatched
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                        Not Emailed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-ember-surface-raised rounded-btn border border-ember-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-ember-neutral">Visitor IP:</span>
                        <span className="font-mono font-bold text-ember-text-primary bg-white px-2 py-0.5 rounded border border-ember-border text-[11px]">
                          {lead.customerPortal?.lastViewedIp || 'Awaiting open'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ember-neutral">Device:</span>
                        <span className="font-semibold text-ember-text-primary text-[11px] truncate max-w-[140px]" title={lead.customerPortal?.lastViewedDevice}>
                          {lead.customerPortal?.lastViewedDevice || '—'}
                        </span>
                      </div>
                      {lead.customerPortal?.lastViewedAt && (
                        <div className="flex items-center justify-between pt-1 border-t border-ember-border/60">
                          <span className="text-ember-neutral">Last Opened:</span>
                          <span className="font-medium text-ember-text-primary text-[11px]">
                            {new Date(lead.customerPortal.lastViewedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-ember-surface-raised rounded-btn border border-ember-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-ember-neutral">Portal Views:</span>
                        <span className="font-bold font-mono text-emerald-700 text-sm">
                          {lead.customerPortal?.viewCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ember-neutral">Ticket Downloads:</span>
                        <span className="font-bold font-mono text-amber-700 text-sm">
                          {lead.customerPortal?.downloadCount || 0}
                        </span>
                      </div>
                      {lead.customerPortal?.lastSentAt && (
                        <div className="pt-1 border-t border-ember-border/60 text-[10px] text-ember-neutral">
                          Sent {new Date(lead.customerPortal.lastSentAt).toLocaleString()} · by {lead.customerPortal.lastSentBy || 'Agent'}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <LeadTrackingFeed lead={lead} onRefresh={fetchLeadDetails} />

                {/* Main Activity Log */}
                <Card elevated className="space-y-4">
                  <h3 className="text-sm font-bold font-display text-ember-text-primary flex items-center justify-between">
                    <span>Lead Activity Timeline</span>
                    <span className="text-xs text-ember-neutral font-normal">
                      {lead.activityLog?.length || 0} activity events recorded
                    </span>
                  </h3>

                  {lead.activityLog?.length === 0 ? (
                    <p className="text-xs text-ember-neutral py-4 text-center">
                      No activity logs recorded yet.
                    </p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-ember-border">
                      {lead.activityLog
                        .slice()
                        .reverse()
                        .map((act: any) => {
                          const isTracking = act.type === 'email_opened' || act.type === 'link_clicked' || act.type === 'ticket_downloaded';
                          const isReassigned = act.type === 'reassigned';

                          return (
                            <div key={act.id} className="relative space-y-1 text-xs">
                              <div
                                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                  isTracking
                                    ? 'bg-emerald-600 ring-2 ring-emerald-100'
                                    : isReassigned
                                    ? 'bg-ember-primary ring-2 ring-ember-primary/20'
                                    : 'bg-ember-neutral'
                                }`}
                              />
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-ember-text-primary">
                                  {act.description}
                                </span>
                                <span className="text-[10px] text-ember-neutral">
                                  {new Date(act.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-[11px] text-ember-neutral">
                                Actor: {act.actorName}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* TAB 2: NOTES THREAD */}
            {activeTab === 'notes' && (
              <Card elevated className="space-y-4">
                <h3 className="text-sm font-bold font-display text-ember-text-primary">
                  Timestamped Activity Notes
                </h3>

                {/* New Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <Textarea
                    placeholder="Log a phone call conversation, airline quote details, client preference..."
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    required
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" isLoading={isAddingNote}>
                      Add Note
                    </Button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-3 pt-3 border-t border-ember-border">
                  {lead.notes?.length === 0 ? (
                    <p className="text-xs text-ember-neutral py-4 text-center">
                      No notes recorded yet. Add your first note above.
                    </p>
                  ) : (
                    lead.notes
                      .slice()
                      .reverse()
                      .map((note: any) => (
                        <div
                          key={note.id}
                          className="p-3.5 rounded-btn bg-ember-surface-raised border border-ember-border space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ember-text-primary">
                                {note.authorName}
                              </span>
                              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-ember-primary/10 text-ember-primary">
                                {note.authorRole}
                              </span>
                            </div>
                            <span className="text-[11px] text-ember-neutral">
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-ember-text-primary whitespace-pre-wrap">
                            {note.text}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            )}

            {/* TAB 3: COMMENTS THREAD */}
            {activeTab === 'comments' && (
              <Card elevated className="space-y-4">
                <h3 className="text-sm font-bold font-display text-ember-text-primary flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-ember-primary" />
                  <span>Comments</span>
                  <span className="text-xs font-normal text-ember-neutral ml-1">
                    ({(lead.comments || []).reduce((a: number, c: any) => a + 1 + (c.replies?.length || 0), 0)} total)
                  </span>
                </h3>

                {/* New Comment Composer */}
                <form onSubmit={handleAddComment} className="space-y-2">
                  {/* Template variable reference — copy to use in email templates */}
                  <details className="group">
                    <summary className="flex items-center gap-1.5 text-[11px] font-semibold text-ember-neutral hover:text-ember-primary cursor-pointer select-none list-none mb-2">
                      <Code className="w-3 h-3" />
                      <span>Email template variables for this lead</span>
                      <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="p-2.5 rounded-btn bg-ember-surface-raised border border-ember-border mb-2 space-y-2">
                      <p className="text-[10px] text-ember-neutral">Click any tag to copy it. Paste into your email template body.</p>
                      {[
                        { tag: '{{name}}', value: lead.name, label: 'Passenger Name' },
                        { tag: '{{email}}', value: lead.email, label: 'Email' },
                        { tag: '{{phone}}', value: lead.phone, label: 'Phone' },
                        { tag: '{{origin}}', value: lead.origin, label: 'Origin' },
                        { tag: '{{destination}}', value: lead.destination, label: 'Destination' },
                        { tag: '{{travel_date}}', value: lead.travelDate ? new Date(lead.travelDate).toLocaleDateString() : '—', label: 'Travel Date' },
                        { tag: '{{return_date}}', value: lead.returnDate ? new Date(lead.returnDate).toLocaleDateString() : '—', label: 'Return Date' },
                        { tag: '{{pax}}', value: String(lead.pax), label: 'Pax Count' },
                        { tag: '{{price}}', value: lead.priceQuoted ? `${lead.currency || 'USD'} ${lead.priceQuoted}` : '—', label: 'Price' },
                        { tag: '{{pnr}}', value: lead.pnr || '—', label: 'PNR' },
                        { tag: '{{ticket_number}}', value: lead.ticketNumber || '—', label: 'Ticket #' },
                        { tag: '{{invoice_number}}', value: lead.invoiceNumber || '—', label: 'Invoice #' },
                        { tag: '{{booking_reference}}', value: lead.invoiceNumber || lead.pnr || `AC-${lead._id?.toString().slice(-6).toUpperCase()}`, label: 'Booking Ref' },
                        { tag: '{{agent_name}}', value: lead.assignedTo?.name || 'Agent', label: 'Agent Name' },
                        { tag: '{{portal_link}}', value: 'Auto-generated', label: 'Portal Link' },
                        { tag: '{{authorize_link}}', value: 'Auto-generated', label: 'Authorize Link' },
                      ].map(({ tag, value, label }) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            toast.info('Copied', `${tag} copied to clipboard`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-ember-border rounded text-[10px] font-mono hover:border-ember-primary hover:bg-ember-primary/5 transition-colors mr-1 mb-1"
                          title={`Value: ${value}`}
                        >
                          <span className="text-ember-primary font-bold">{tag}</span>
                          <span className="text-ember-neutral font-sans">= {value}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                  <textarea
                    rows={3}
                    placeholder="Add a comment — questions, updates, client feedback..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    required
                    className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2.5 text-xs text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:border-ember-primary resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-ember-neutral">
                      Commenting as <span className="font-bold text-ember-text-primary">{currentUser?.name}</span>
                    </span>
                    <button
                      type="submit"
                      disabled={isAddingComment || !newCommentText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ember-primary text-white text-xs font-bold rounded-btn hover:bg-ember-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3 h-3" />
                      {isAddingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4 pt-3 border-t border-ember-border">
                  {!lead.comments || lead.comments.length === 0 ? (
                    <div className="py-8 text-center">
                      <MessageSquare className="w-8 h-8 text-ember-neutral/40 mx-auto mb-2" />
                      <p className="text-xs text-ember-neutral">No comments yet. Start the conversation above.</p>
                    </div>
                  ) : (
                    lead.comments
                      .slice()
                      .reverse()
                      .map((comment: any) => (
                        <div key={comment.id} className="space-y-2">
                          {/* Comment Card */}
                          <div className="p-3.5 rounded-btn bg-ember-surface-raised border border-ember-border space-y-2">
                            {/* Header */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-ember-primary/20 text-ember-primary flex items-center justify-center text-[10px] font-bold uppercase">
                                  {comment.authorName?.charAt(0) || '?'}
                                </div>
                                <span className="font-bold text-ember-text-primary">{comment.authorName}</span>
                                <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                  comment.authorRole === 'admin'
                                    ? 'bg-ember-primary/10 text-ember-primary'
                                    : 'bg-stone-200 text-stone-600'
                                }`}>
                                  {comment.authorRole}
                                </span>
                              </div>
                              <span className="text-[11px] text-ember-neutral">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>

                            {/* Text */}
                            <p className="text-xs text-ember-text-primary whitespace-pre-wrap leading-relaxed">
                              {comment.text}
                            </p>

                            {/* Reply Button */}
                            <div className="flex items-center gap-3 pt-1 border-t border-ember-border/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                  setReplyText('');
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-ember-neutral hover:text-ember-primary transition-colors"
                              >
                                <CornerDownRight className="w-3 h-3" />
                                {replyingToId === comment.id ? 'Cancel Reply' : `Reply${comment.replies?.length ? ` (${comment.replies.length})` : ''}`}
                              </button>
                              {comment.replies?.length > 0 && replyingToId !== comment.id && (
                                <span className="text-[11px] text-ember-neutral">
                                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>

                            {/* Inline Reply Box */}
                            {replyingToId === comment.id && (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={2}
                                  placeholder={`Reply to ${comment.authorName}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  autoFocus
                                  className="w-full bg-ember-surface border border-ember-border rounded-input px-3 py-2 text-xs text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:border-ember-primary resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setReplyingToId(null); setReplyText(''); }}
                                    className="px-2.5 py-1 text-xs font-semibold text-ember-neutral hover:text-ember-text-primary rounded-btn"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddReply(comment.id)}
                                    disabled={!replyText.trim()}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-ember-primary text-white text-xs font-bold rounded-btn hover:bg-ember-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Send className="w-3 h-3" />
                                    Send Reply
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Replies — indented */}
                          {comment.replies?.length > 0 && (
                            <div className="ml-6 space-y-2">
                              {comment.replies.map((reply: any) => (
                                <div
                                  key={reply.id}
                                  className="p-3 rounded-btn bg-ember-surface border border-ember-border/60 border-l-2 border-l-ember-primary/30 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <CornerDownRight className="w-3 h-3 text-ember-neutral" />
                                      <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-[9px] font-bold uppercase">
                                        {reply.authorName?.charAt(0) || '?'}
                                      </div>
                                      <span className="font-bold text-ember-text-primary">{reply.authorName}</span>
                                      <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                        reply.authorRole === 'admin'
                                          ? 'bg-ember-primary/10 text-ember-primary'
                                          : 'bg-stone-200 text-stone-600'
                                      }`}>
                                        {reply.authorRole}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-ember-neutral">
                                      {new Date(reply.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-ember-text-primary whitespace-pre-wrap ml-5 leading-relaxed">
                                    {reply.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </Card>
            )}

            {/* TAB 4: REALTIME ACTIVITY & EMAIL TRACKING TIMELINE */}
            {activeTab === 'activity' && (
              <Card elevated className="space-y-4">
                <h3 className="text-sm font-bold font-display text-ember-text-primary flex items-center justify-between">
                  <span>Activity & Tracking Timeline</span>
                  <span className="text-xs text-ember-neutral font-normal">
                    {lead.emailTrackingEvents?.length || 0} tracking events logged
                  </span>
                </h3>

                {lead.activityLog?.length === 0 ? (
                  <p className="text-xs text-ember-neutral py-4 text-center">
                    No activity logs recorded yet.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-ember-border">
                    {lead.activityLog
                      .slice()
                      .reverse()
                      .map((act: any) => {
                        const isTracking = act.type === 'email_opened' || act.type === 'link_clicked';
                        const isReassigned = act.type === 'reassigned';

                        return (
                          <div key={act.id} className="relative space-y-1 text-xs">
                            <div
                              className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                isTracking
                                  ? 'bg-emerald-600 ring-2 ring-emerald-100'
                                  : isReassigned
                                  ? 'bg-ember-primary ring-2 ring-ember-primary/20'
                                  : 'bg-ember-neutral'
                              }`}
                            />
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-ember-text-primary">
                                {act.description}
                              </span>
                              <span className="text-[10px] text-ember-neutral">
                                {new Date(act.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[11px] text-ember-neutral">
                              Actor: {act.actorName}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            )}

            {/* TAB 4: TASKS */}
            {activeTab === 'tasks' && (
              <Card elevated className="space-y-4">
                <h3 className="text-sm font-bold font-display text-ember-text-primary">
                  Lead Tasks & Follow-up Actions
                </h3>

                {/* Add Task Form */}
                <form onSubmit={handleCreateTask} className="p-3 bg-ember-surface-raised rounded-btn space-y-3">
                  <Input
                    label="Task Title *"
                    placeholder="e.g. Call client with updated Emirates fare..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      label="Due Date *"
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      required
                    />
                    <Select
                      label="Priority"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </Select>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="emailAlert"
                        checked={newTaskEmailAlert}
                        onChange={(e) => setNewTaskEmailAlert(e.target.checked)}
                        className="rounded text-ember-primary focus:ring-ember-primary"
                      />
                      <label htmlFor="emailAlert" className="text-xs font-semibold text-ember-text-primary">
                        Send Email Notification
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" isLoading={isAddingTask}>
                      Create Task
                    </Button>
                  </div>
                </form>

                {/* Task List */}
                <div className="space-y-2 pt-2">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-ember-neutral py-3 text-center">
                      No tasks assigned for this lead.
                    </p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task._id}
                        className={`p-3 rounded-btn border flex items-center justify-between text-xs transition-colors ${
                          task.status === 'Completed'
                            ? 'bg-emerald-50/50 border-emerald-200 line-through text-stone-500'
                            : 'bg-ember-surface border-ember-border text-ember-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'Completed'}
                            onChange={() => handleToggleTaskStatus(task._id, task.status)}
                            className="rounded text-ember-primary"
                          />
                          <div>
                            <p className="font-semibold">{task.title}</p>
                            <span className="text-[11px] text-ember-neutral">
                              Due: {new Date(task.dueDate).toLocaleDateString()} &bull; Assigned to: {task.assignedTo?.name}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-chip ${
                            task.priority === 'High'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSaveConfirm}
        onCancel={() => setShowSaveConfirm(false)}
        onConfirm={handleConfirmSave}
        title="Save Flight Details"
        description="Please review the changes below before saving to the database."
        confirmLabel="Yes, Save"
        cancelLabel="Go Back"
        isLoading={isSavingSpecs}
      >
        <div className="space-y-3 text-xs">

          {/* Booking */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">Booking</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-ember-surface-raised rounded-btn border border-ember-border px-3 py-2">
              {[
                ['Booking Type', editForm.bookingType],
                ['Status', editForm.status],
                ['Trip Type', editForm.tripType],
                ['Price', editForm.priceQuoted ? `${editForm.currency || 'USD'} ${editForm.priceQuoted}` : '—'],
                ['PNR', editForm.pnr || '—'],
                ['Ticket #', editForm.ticketNumber || '—'],
                ['Invoice #', editForm.invoiceNumber || '—'],
                ['Payment', editForm.paymentStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2 py-0.5 border-b border-ember-border/40 last:border-0">
                  <span className="text-ember-neutral">{label}</span>
                  <span className="font-semibold text-ember-text-primary truncate max-w-[120px]">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Passengers */}
          {editForm.passengers?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">
                Passengers ({editForm.passengers.length})
              </p>
              <div className="space-y-1">
                {editForm.passengers.map((pax: any, idx: number) => (
                  <div key={pax.id || idx} className="flex items-center justify-between px-3 py-1.5 bg-ember-surface-raised rounded-btn border border-ember-border">
                    <span className="font-semibold text-ember-text-primary">
                      {[pax.firstName, pax.lastName].filter(Boolean).join(' ') || `Passenger ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2 text-ember-neutral">
                      {pax.gender && <span>{pax.gender}</span>}
                      {pax.dob && <span>· DOB {pax.dob}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">Contact Detail</p>
            <div className="flex items-center gap-4 px-3 py-2 bg-ember-surface-raised rounded-btn border border-ember-border">
              <span className="text-ember-text-primary font-semibold">{editForm.phone || '—'}</span>
              <span className="text-ember-neutral">·</span>
              <span className="text-ember-text-primary font-semibold">{editForm.email || '—'}</span>
            </div>
          </div>

          {/* Flight Legs */}
          {editForm.flightLegs?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">
                Flight Legs ({editForm.flightLegs.length})
              </p>
              <div className="space-y-1">
                {editForm.flightLegs.map((leg: any, idx: number) => (
                  <div key={leg.id || idx} className="px-3 py-1.5 bg-ember-surface-raised rounded-btn border border-ember-border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ember-primary">
                        {leg.departingAirport || '?'} → {leg.arrivingAirport || '?'}
                      </span>
                      <div className="flex items-center gap-2 text-ember-neutral">
                        {leg.carrier && <span>{leg.carrier}{leg.flightNumber ? ' ' + leg.flightNumber : ''}</span>}
                        {leg.flightClass && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">{leg.flightClass}</span>}
                      </div>
                    </div>
                    {leg.departingAt && (
                      <div className="text-[11px] text-ember-neutral mt-0.5">
                        {new Date(leg.departingAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons & Ancillary Services */}
          {(editForm.addOns?.meal || editForm.addOns?.baggage || editForm.addOns?.seat || editForm.addOns?.notes) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">Add-ons &amp; Ancillaries</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-ember-surface-raised rounded-btn border border-ember-border px-3 py-2 text-[11px]">
                {editForm.addOns?.meal && <div><span className="text-ember-neutral">Meal: </span><span className="font-semibold text-ember-text-primary">{editForm.addOns.meal}</span></div>}
                {editForm.addOns?.baggage && <div><span className="text-ember-neutral">Baggage: </span><span className="font-semibold text-ember-text-primary">{editForm.addOns.baggage}</span></div>}
                {editForm.addOns?.seat && <div><span className="text-ember-neutral">Seat: </span><span className="font-semibold text-ember-text-primary">{editForm.addOns.seat}</span></div>}
              </div>
            </div>
          )}
        </div>
      </ConfirmDialog>

      {/* Email Customer Modal */}
      {lead && (
        <LeadEmailComposerModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          lead={lead}
          onEmailSent={(updatedLead) => {
            setLead(updatedLead);
            fetchLeadDetails();
          }}
        />
      )}

      {/* Email Template Live Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Email Template Live Client Preview"
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-ember-surface-raised border border-ember-border rounded-btn text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-ember-text-primary">Subject: {emailSubject}</div>
              <div className="text-ember-neutral text-[11px]">
                To: <strong className="text-ember-text-primary">{lead?.email}</strong> • Verified tracking pixel &amp; live authorization button active
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-50 text-[#0B3C8A] border border-blue-200 text-[11px] font-bold self-start sm:self-auto">
              Yellow &amp; Blue Official Template
            </span>
          </div>

          <div className="w-full h-[65vh] bg-white border border-ember-border rounded-card overflow-hidden shadow-inner">
            <iframe
              srcDoc={emailBodyHtml}
              className="w-full h-full border-0"
              title="Rendered Email Preview"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-ember-border">
            <Button variant="secondary" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
              Close Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsPreviewModalOpen(false);
                setShowSendConfirm(true);
              }}
              className="gap-1.5 shadow-primary-glow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Proceed to Dispatch</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stage Change Confirmation Popup Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingStage)}
        onCancel={() => setPendingStage(null)}
        onConfirm={executeStageChange}
        title={`Move Lead to "${pendingStage}" Stage?`}
        description={`Are you sure you want to transition ${lead?.name || 'this lead'} from "${lead?.stage || 'New'}" to "${pendingStage}"? This will update the sales pipeline and log an activity record.`}
        confirmLabel="Yes, Update Stage"
        cancelLabel="Cancel"
        variant="default"
        isLoading={isChangingStage}
      />


      {/* Send Email Confirmation Popup Dialog */}
      <ConfirmDialog
        isOpen={showSendConfirm}
        onCancel={() => setShowSendConfirm(false)}
        onConfirm={executeSendEmail}
        title="Dispatch Official Booking Agreement?"
        description={`Are you sure you want to send this official booking confirmation to ${lead?.email}? It includes live telemetry tracking and an interactive payment authorization button.`}
        confirmLabel="Yes, Dispatch Tracked Email"
        cancelLabel="Cancel"
        variant="default"
        isLoading={isSendingEmail}
      />

      {/* Send Email Success Modal Popup */}
      <Modal
        isOpen={Boolean(sendSuccessData)}
        onClose={() => setSendSuccessData(null)}
        title="Email Dispatched Successfully"
        maxWidth="md"
      >
        {sendSuccessData && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ember-text-primary">Itinerary Agreement Sent!</h3>
              <p className="text-xs text-ember-text-secondary mt-1">
                An official booking confirmation email was successfully dispatched to <strong className="text-ember-text-primary">{sendSuccessData.email}</strong>.
              </p>
            </div>

            <div className="bg-ember-surface-raised border border-ember-border rounded-btn p-3.5 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-ember-neutral">
                <span>Status:</span>
                <span className="font-bold text-emerald-700">✓ Active &amp; Tracked</span>
              </div>
              <div className="flex justify-between text-ember-neutral">
                <span>Tracking Token:</span>
                <span className="text-ember-text-primary font-bold truncate max-w-[200px]">{sendSuccessData.token || 'Active'}</span>
              </div>
              <div className="flex justify-between text-ember-neutral">
                <span>Telemetry:</span>
                <span className="text-blue-700 font-semibold">IP &amp; Location Enabled</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sendSuccessData.token) {
                    window.open(`/portal/${sendSuccessData.token}`, '_blank');
                  }
                }}
                className="flex-1 gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Customer Portal</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSendSuccessData(null)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
