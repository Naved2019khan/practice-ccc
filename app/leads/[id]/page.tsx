'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Code,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs } from '@/components/ui/Tabs';
import { StageBadge, PaymentBadge, FollowUpBadge, Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs state: 'email' | 'notes' | 'activity' | 'tasks'
  const [activeTab, setActiveTab] = useState('email');

  // Edit Specs State
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Note composer state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Email Composer State
  const [emailMode, setEmailMode] = useState<'template' | 'html'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

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
        paymentStatus: data.lead.paymentStatus,
        pnr: data.lead.pnr || '',
        invoiceNumber: data.lead.invoiceNumber || '',
        priceQuoted: data.lead.priceQuoted || '',
        currency: data.lead.currency || 'USD',
        nextFollowUpDate: data.lead.nextFollowUpDate
          ? data.lead.nextFollowUpDate.split('T')[0]
          : '',
      });

      // Fetch templates
      const tmplRes = await fetch('/api/templates');
      if (tmplRes.ok) {
        const tmplData = await tmplRes.json();
        setTemplates(tmplData.templates || []);
        if (tmplData.templates?.length > 0 && !selectedTemplateId) {
          applyTemplate(tmplData.templates[0], data.lead);
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

  const handleStageChange = async (newStage: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch (e) {
      console.error(e);
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
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Spec Edits
  const handleSaveSpecs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setIsEditingSpecs(false);
      }
    } catch (e) {
      console.error(e);
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
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setNewNoteText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Template Placeholder Replacement
  const applyTemplate = (template: any, currentLead: any) => {
    setSelectedTemplateId(template._id);
    const l = currentLead || lead;
    if (!l) return;

    const travelDateStr = l.travelDate
      ? new Date(l.travelDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Flexible Date';

    const replacers: Record<string, string> = {
      '{{name}}': l.name || '',
      '{{origin}}': l.origin || '',
      '{{destination}}': l.destination || '',
      '{{travel_date}}': travelDateStr,
      '{{pax}}': (l.pax || 1).toString(),
      '{{price}}': (l.priceQuoted || 0).toLocaleString(),
      '{{pnr}}': l.pnr || 'PENDING',
      '{{invoice_number}}': l.invoiceNumber || 'PENDING',
      '{{agent_name}}': currentUser?.name || (l.assignedTo ? l.assignedTo.name : 'Travel Specialist'),
      '{{agent_email}}': currentUser?.email || 'concierge@flightcrm.com',
      '{{company_name}}': 'Ember Flight Concierge',
    };

    let subject = template.subject;
    let bodyHtml = template.bodyHtml;

    Object.entries(replacers).forEach(([key, val]) => {
      subject = subject.replaceAll(key, val);
      bodyHtml = bodyHtml.replaceAll(key, val);
    });

    setEmailSubject(subject);
    setEmailBodyHtml(bodyHtml);
  };

  // Send Email with Tracking
  const handleSendEmail = async () => {
    if (!lead?.email) {
      alert('Passenger does not have an email address specified.');
      return;
    }
    if (!emailSubject.trim() || !emailBodyHtml.trim()) {
      alert('Subject and email content cannot be empty.');
      return;
    }

    setIsSendingEmail(true);
    setEmailSuccessMsg('');

    try {
      const res = await fetch(`/api/leads/${leadId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: emailSubject,
          html: emailBodyHtml,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setEmailSuccessMsg('✅ Email sent with active 1x1 tracking pixel!');
      fetchLeadDetails(); // refresh timeline
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Copy HTML to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(emailBodyHtml);
    alert('Copied HTML body to clipboard!');
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

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [...prev, data.task]);
        setNewTaskTitle('');
        setNewTaskDueDate('');
      }
    } catch (e) {
      console.error(e);
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold font-display text-ember-text-primary">
                  {lead.name}
                </h1>
                <StageBadge stage={lead.stage} size="md" />
                <FollowUpBadge date={lead.nextFollowUpDate} />
              </div>
              <p className="text-xs text-ember-text-secondary mt-0.5">
                Source: <span className="font-semibold text-ember-text-primary">{lead.source}</span> &bull;
                Created {new Date(lead.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

              return (
                <button
                  key={st}
                  onClick={() => handleStageChange(st)}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-btn text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-ember-primary text-white shadow-primary-glow'
                      : isPast
                      ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                      : 'bg-ember-surface-raised/80 text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised'
                  }`}
                >
                  {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  <span>{st}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Lead Specs & Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Flight Specifications & Passenger Info */}
          <div className="lg:col-span-1 space-y-4">
            {isEditingSpecs ? (
              <Card elevated className="space-y-3">
                <h3 className="text-sm font-bold font-display text-ember-text-primary">
                  Edit Flight Requirements
                </h3>
                <form onSubmit={handleSaveSpecs} className="space-y-3">
                  <Input
                    label="Passenger Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    required
                  />
                  <Input
                    label="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Origin"
                      value={editForm.origin}
                      onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                      required
                    />
                    <Input
                      label="Destination"
                      value={editForm.destination}
                      onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Travel Date"
                      type="date"
                      value={editForm.travelDate}
                      onChange={(e) => setEditForm({ ...editForm, travelDate: e.target.value })}
                    />
                    <Input
                      label="Return Date"
                      type="date"
                      value={editForm.returnDate}
                      onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Pax"
                      type="number"
                      value={editForm.pax}
                      onChange={(e) => setEditForm({ ...editForm, pax: e.target.value })}
                    />
                    <Input
                      label="Price ($)"
                      type="number"
                      value={editForm.priceQuoted}
                      onChange={(e) => setEditForm({ ...editForm, priceQuoted: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="PNR / Reference"
                      value={editForm.pnr}
                      onChange={(e) => setEditForm({ ...editForm, pnr: e.target.value })}
                    />
                    <Input
                      label="Invoice #"
                      value={editForm.invoiceNumber}
                      onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Payment Status"
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </Select>
                    <Input
                      label="Next Follow-Up"
                      type="date"
                      value={editForm.nextFollowUpDate}
                      onChange={(e) => setEditForm({ ...editForm, nextFollowUpDate: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditingSpecs(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card elevated className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-ember-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">
                    Flight Itinerary
                  </span>
                  <PaymentBadge status={lead.paymentStatus} size="sm" />
                </div>

                {/* Route Banner */}
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
                </div>

                {/* Itinerary Details */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-ember-border/60">
                    <span className="text-ember-neutral">Departure Date:</span>
                    <span className="font-semibold text-ember-text-primary">{travelDateFormatted}</span>
                  </div>
                  {lead.tripType !== 'One Way' && (
                    <div className="flex items-center justify-between py-1 border-b border-ember-border/60">
                      <span className="text-ember-neutral">Return Date:</span>
                      <span className="font-semibold text-ember-text-primary">{returnDateFormatted}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1 border-b border-ember-border/60">
                    <span className="text-ember-neutral">Quoted Fare:</span>
                    <span className="font-bold text-ember-primary text-sm">
                      {lead.priceQuoted > 0 ? `$${lead.priceQuoted.toLocaleString()}` : 'Not Quoted'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-ember-border/60">
                    <span className="text-ember-neutral">Airline PNR:</span>
                    <span className="font-code font-bold text-emerald-700">
                      {lead.pnr || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-ember-border/60">
                    <span className="text-ember-neutral">Invoice Number:</span>
                    <span className="font-semibold text-ember-text-primary">
                      {lead.invoiceNumber || '—'}
                    </span>
                  </div>
                </div>

                {/* Contact Card */}
                <div className="pt-2 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral block">
                    Contact Details
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3.5 h-3.5 text-ember-neutral" />
                    <a href={`tel:${lead.phone}`} className="font-semibold text-ember-text-primary hover:text-ember-primary">
                      {lead.phone}
                    </a>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3.5 h-3.5 text-ember-neutral" />
                      <a href={`mailto:${lead.email}`} className="font-semibold text-ember-text-primary hover:text-ember-primary">
                        {lead.email}
                      </a>
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
                    <div className="flex items-center gap-2.5 p-2 bg-ember-surface-raised rounded-btn">
                      <Avatar name={lead.assignedTo?.name || 'Agent'} src={lead.assignedTo?.avatar} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-ember-text-primary">
                          {lead.assignedTo?.name || 'Unassigned'}
                        </p>
                        <p className="text-[11px] text-ember-neutral">{lead.assignedTo?.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Col 2 & 3: Tabs Workspace (Email Composer, Notes, Tracking & Activity, Tasks) */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs
              tabs={[
                { id: 'email', label: 'Email Composer', icon: <Mail className="w-4 h-4" /> },
                { id: 'notes', label: 'Notes Thread', count: lead.notes?.length || 0, icon: <FileText className="w-4 h-4" /> },
                { id: 'activity', label: 'Tracking & Activity', count: lead.activityLog?.length || 0, icon: <Activity className="w-4 h-4" /> },
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
                      <span>Branded Email Composer (Dual-Mode)</span>
                    </h3>
                    <p className="text-xs text-ember-text-secondary mt-0.5">
                      Includes automatic 1x1 tracking pixel and click-tracker link rewrite.
                    </p>
                  </div>

                  {/* Mode Toggle: Template vs Raw HTML */}
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

                {/* Editor & Live Rendered Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-ember-text-primary">
                      <span>HTML Body Source</span>
                      <span className="text-[11px] text-ember-neutral">Placeholders supported</span>
                    </div>
                    <textarea
                      rows={12}
                      value={emailBodyHtml}
                      onChange={(e) => setEmailBodyHtml(e.target.value)}
                      className="w-full bg-stone-900 text-stone-100 font-code text-xs p-3 rounded-input border border-stone-700 focus:outline-none focus:border-ember-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-ember-text-primary">
                      <span>Live Rendered Client Preview</span>
                      <span className="text-[11px] text-emerald-700 font-bold">1x1 Pixel Active</span>
                    </div>
                    <div className="w-full h-[260px] bg-white border border-ember-border rounded-input overflow-y-auto p-3 shadow-inner">
                      <div
                        dangerouslySetInnerHTML={{ __html: emailBodyHtml }}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ember-border">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
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
                      <span>Open in Mail Client</span>
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

            {/* TAB 3: REALTIME ACTIVITY & EMAIL TRACKING TIMELINE */}
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
    </AppLayout>
  );
}
