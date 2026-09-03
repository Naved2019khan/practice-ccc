'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  MapPin,
  Monitor,
  Clock,
  ExternalLink,
  CheckSquare,
  Square,
  Minus,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  ShieldCheck,
  Filter,
  Globe,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalViewer {
  _id: string;
  name: string;
  email: string | null;
  phone: string;
  origin: string;
  destination: string;
  travelDate: string | null;
  stage: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  referenceNumber: string | null;
  pnr: string | null;
  trackingToken: string | null;
  isAuthorized: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  lastViewedIp: string | null;
  lastViewedLocation: string | null;
  lastViewedDevice: string | null;
  firstViewedAt: string | null;
  uniqueIpCount: number;
  uniqueDevices: string[];
  sentTo: string | null;
  authorizedAt: string | null;
  authorizedIp: string | null;
  authorizedLocation: string | null;
  authorizedDevice: string | null;
}

interface SendResult {
  leadId: string;
  name: string;
  email: string | null;
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

type SortKey = 'name' | 'lastViewedAt' | 'viewCount' | 'stage' | 'paymentStatus';
type SortDir = 'asc' | 'desc';
type FilterTab = 'all' | 'viewed' | 'authorized';

// ─── CS Notification template (mirrors portal route.ts buildCsNotificationHtml) ──

function buildCsTemplate(lead: PortalViewer): string {
  const esc = (v: any) => String(v ?? '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ref = lead.referenceNumber || '—';
  const pnr = lead.pnr || 'Pending';
  const route = `${esc(lead.origin)} → ${esc(lead.destination)}`;
  const amount =
    lead.totalAmount > 0
      ? `${lead.currency} ${Number(lead.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : '—';
  const viewedAt = lead.lastViewedAt
    ? new Date(lead.lastViewedAt).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      })
    : '—';
  const authAt = lead.authorizedAt
    ? new Date(lead.authorizedAt).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      })
    : null;
  const payColor = lead.isAuthorized ? '#16A34A' : '#D97706';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:24px 16px;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1E293B;">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0B3C8A 0%,#1E40AF 100%);padding:22px 28px;border-bottom:3px solid #F59E0B;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td>
        <div style="font-size:11px;font-weight:700;color:#FDE68A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">AirlinesConsolidator &bull; CS Alert</div>
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">
          ${lead.isAuthorized ? '✅ Booking Authorized' : '👀 Customer Viewed Portal'}
        </h1>
      </td>
      <td style="text-align:right;vertical-align:middle;">
        <span style="background:#FEF3C7;color:#92400E;font-size:12px;font-weight:800;padding:6px 12px;border-radius:20px;display:inline-block;white-space:nowrap;">
          ${lead.isAuthorized ? '✅ Authorized' : '👀 Viewed'}
        </span>
      </td>
    </tr></table>
  </div>

  <div style="padding:28px 28px 24px;">
    <!-- Reference Card -->
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:5px 0;color:#64748B;font-weight:600;width:34%;">Ref # ID</td>
          <td style="padding:5px 0;">
            <span style="font-family:monospace;font-size:15px;font-weight:800;color:#0B3C8A;background:#DBEAFE;padding:3px 10px;border-radius:6px;border:1px solid #BFDBFE;">${esc(ref)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748B;font-weight:600;">PNR / Booking</td>
          <td style="padding:5px 0;"><span style="font-family:monospace;font-weight:700;background:#E2E8F0;padding:2px 8px;border-radius:4px;">${esc(pnr)}</span></td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748B;font-weight:600;">Passenger</td>
          <td style="padding:5px 0;font-weight:700;color:#0F172A;">${esc(lead.name)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748B;font-weight:600;">Contact</td>
          <td style="padding:5px 0;"><strong>${esc(lead.phone)}</strong> &bull; <a href="mailto:${esc(lead.email)}" style="color:#0284C7;">${esc(lead.email)}</a></td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748B;font-weight:600;">Route</td>
          <td style="padding:5px 0;color:#0B3C8A;font-weight:800;">${route}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748B;font-weight:600;">Payment &amp; Fare</td>
          <td style="padding:5px 0;"><span style="font-weight:700;color:${payColor};">${esc(lead.paymentStatus)}</span> &bull; <strong>${esc(amount)}</strong></td>
        </tr>
      </table>
    </div>

    <!-- Telemetry -->
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">🌐 Visitor Telemetry</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;width:34%;">Last Viewed</td>
          <td style="padding:5px 0;font-weight:600;">${esc(viewedAt)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;">IP Address</td>
          <td style="padding:5px 0;font-family:monospace;font-weight:700;">${esc(lead.lastViewedIp || '—')}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;">Location</td>
          <td style="padding:5px 0;">${esc(lead.lastViewedLocation || '—')}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;">Device</td>
          <td style="padding:5px 0;">${esc(lead.lastViewedDevice || '—')}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;">View Count</td>
          <td style="padding:5px 0;font-weight:700;">${esc(lead.viewCount)}</td>
        </tr>
        ${authAt ? `<tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;">Authorized At</td>
          <td style="padding:5px 0;font-weight:700;color:#16A34A;">${esc(authAt)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-weight:600;">Auth Location</td>
          <td style="padding:5px 0;">${esc(lead.authorizedLocation || '—')}</td>
        </tr>` : ''}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:20px 0 8px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://crm.airlinesconsolidator.com'}/leads/${lead._id}"
         style="display:inline-block;background:#0B3C8A;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;margin:0 6px 10px;">
        Open Lead in CRM &rarr;
      </a>
      ${lead.trackingToken ? `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://crm.airlinesconsolidator.com'}/portal/${lead.trackingToken}"
         style="display:inline-block;background:#F1F5F9;color:#0B3C8A;border:1px solid #CBD5E1;font-size:13px;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:8px;margin:0 6px 10px;">
        View Customer Portal
      </a>` : ''}
    </div>
  </div>

  <div style="background:#F8FAFC;padding:14px 28px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
    AirlinesConsolidator CRM &bull; Dev Portal Viewer Notification
  </div>
</div>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null, relative = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  if (relative) {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function paymentBadge(status: string) {
  const map: Record<string, string> = {
    Paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Authorized: 'bg-blue-50 text-blue-800 border-blue-200',
    Partial: 'bg-amber-50 text-amber-800 border-amber-200',
    Pending: 'bg-stone-100 text-stone-600 border-stone-200',
    Failed: 'bg-red-50 text-red-800 border-red-200',
    Refunded: 'bg-purple-50 text-purple-800 border-purple-200',
  };
  return map[status] || 'bg-stone-100 text-stone-600 border-stone-200';
}

function stageBadge(stage: string) {
  const map: Record<string, string> = {
    Ticketed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Booked: 'bg-blue-50 text-blue-800 border-blue-200',
    Quoted: 'bg-sky-50 text-sky-800 border-sky-200',
    Negotiation: 'bg-amber-50 text-amber-800 border-amber-200',
    Contacted: 'bg-stone-100 text-stone-600 border-stone-200',
    New: 'bg-stone-100 text-stone-600 border-stone-200',
    Lost: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[stage] || 'bg-stone-100 text-stone-600 border-stone-200';
}

// ─── Sender Config Bar ────────────────────────────────────────────────────────

interface SenderConfigProps {
  senderEmail: string;
  setSenderEmail: (v: string) => void;
  provider: string;
  setProvider: (v: string) => void;
}

function SenderConfigBar({ senderEmail, setSenderEmail, provider, setProvider }: SenderConfigProps) {
  const PROVIDERS = [
    { id: 'godaddy', label: 'GoDaddy' },
    { id: 'gmail',   label: 'Gmail' },
    { id: 'ses',     label: 'AWS SES' },
    { id: 'mock',    label: 'Mock' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg bg-ember-bg border border-ember-border">
      <div className="flex items-center gap-2 shrink-0">
        <Globe className="w-4 h-4 text-ember-neutral" />
        <span className="text-xs font-bold text-ember-text-secondary uppercase tracking-wide">
          Sender
        </span>
      </div>

      {/* Provider pills */}
      <div className="flex items-center gap-1 bg-ember-surface-raised p-0.5 rounded-btn border border-ember-border">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setProvider(p.id);
              if (p.id === 'godaddy' && !senderEmail) {
                setSenderEmail('support@airlinesconsolidator.com');
              }
            }}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              provider === p.id
                ? 'bg-white text-ember-primary shadow-sm'
                : 'text-ember-neutral hover:text-ember-text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* From address */}
      <div className="flex-1 relative">
        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ember-neutral pointer-events-none" />
        <input
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="support@airlinesconsolidator.com"
          className="w-full pl-8 pr-3 h-8 text-xs rounded-btn border border-ember-border bg-ember-surface text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:ring-1 focus:ring-ember-primary/30"
        />
      </div>

      {provider === 'godaddy' && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-800 font-semibold whitespace-nowrap shrink-0">
          GoDaddy SMTP
        </span>
      )}
    </div>
  );
}

// ─── Individual Send Modal ────────────────────────────────────────────────────

interface IndividualSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewer: PortalViewer | null;
  senderEmail: string;
  provider: string;
  onSent: () => void;
}

function IndividualSendModal({
  isOpen, onClose, viewer, senderEmail, provider, onSent,
}: IndividualSendModalProps) {
  const [subject, setSubject] = useState('');
  const [html, setHtml]       = useState('');
  const [sending, setSending]  = useState(false);
  const [result, setResult]    = useState<SendResult | null>(null);
  const [preview, setPreview]  = useState(false);

  // Populate defaults whenever viewer changes
  useEffect(() => {
    if (!viewer) return;
    setResult(null);
    setPreview(false);
    const ref   = viewer.referenceNumber || '—';
    const route = `${viewer.origin} → ${viewer.destination}`;
    setSubject(
      viewer.isAuthorized
        ? `✅ Booking Confirmed — [${ref}] ${viewer.name} (${route})`
        : `Portal viewed — [${ref}] ${viewer.name} (${route})`
    );
    setHtml(buildCsTemplate(viewer));
  }, [viewer]);

  const handleSend = async () => {
    if (!viewer) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/dev/portal-viewers/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: [viewer._id],
          subject,
          html,
          from: senderEmail || undefined,
          provider: provider || undefined,
        }),
      });
      const data = await res.json();
      const r = data.results?.[0] ?? { success: false, error: data.error || 'Unknown error' };
      setResult({ ...r, leadId: viewer._id, name: viewer.name, email: viewer.email });
      if (r.success) onSent();
    } catch (err: any) {
      setResult({ leadId: viewer._id, name: viewer.name, email: viewer.email, success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  if (!viewer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Send Email — ${viewer.name}`}
      description={`${viewer.origin} → ${viewer.destination} · ${viewer.referenceNumber || '—'}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Recipient + status */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-ember-surface border border-ember-border">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ember-text-primary truncate">{viewer.name}</p>
            {viewer.email ? (
              <p className="text-xs text-ember-neutral truncate">{viewer.email}</p>
            ) : (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No email on record — cannot send
              </p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${paymentBadge(viewer.paymentStatus)}`}>
            {viewer.isAuthorized && <ShieldCheck className="w-3 h-3" />}
            {viewer.paymentStatus}
          </span>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${viewer.isAuthorized ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
            {viewer.isAuthorized ? '✅ Authorized' : '👀 Viewed'}
          </span>
        </div>

        {/* Sender info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Sending via <strong className="mx-1">{provider || 'default'}</strong> from <strong className="ml-1">{senderEmail || 'default sender'}</strong>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ember-text-secondary uppercase tracking-wide">Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={sending || !!result} />
        </div>

        {/* HTML / Preview toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-ember-text-secondary uppercase tracking-wide">
              HTML Body
            </label>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-semibold text-ember-primary hover:text-ember-primary-hover transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              {preview ? 'Edit HTML' : 'Preview'}
            </button>
          </div>

          {preview ? (
            <div
              className="w-full h-72 overflow-auto rounded-lg border border-ember-border bg-white p-2"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              disabled={sending || !!result}
            />
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-xs ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {result.success
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold">{result.success ? 'Email sent successfully' : 'Send failed'}</p>
              {result.success && result.messageId && (
                <p className="font-mono text-[10px] mt-0.5 opacity-70">ID: {result.messageId}</p>
              )}
              {result.error && <p className="mt-0.5 break-all">{result.error}</p>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-ember-border">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              isLoading={sending}
              disabled={sending || !viewer.email || !subject.trim() || !html.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              Send Email
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Bulk Send Modal ──────────────────────────────────────────────────────────

interface BulkSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedViewers: PortalViewer[];
  senderEmail: string;
  provider: string;
  onSent: () => void;
}

function BulkSendModal({ isOpen, onClose, selectedViewers, senderEmail, provider, onSent }: BulkSendModalProps) {
  const DEFAULT_SUBJECT = '{{status}} Booking Alert — [{{ref}}] {{name}} ({{route}})';
  const FALLBACK_HTML   = `<p>Dear {{name}}, notification re booking {{ref}} ({{route}}).</p>`;

  const [subject,      setSubject]      = useState(DEFAULT_SUBJECT);
  // comma-separated internal/CS recipient addresses
  const [recipientRaw, setRecipientRaw] = useState('');
  const [sending,      setSending]      = useState(false);
  const [results,      setResults]      = useState<SendResult[] | null>(null);
  const [previewId,    setPreviewId]    = useState<string | null>(null);

  // parse + dedupe recipient input
  const parsedRecipients = recipientRaw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));

  useEffect(() => {
    if (isOpen) {
      setResults(null);
      setPreviewId(null);
    }
  }, [isOpen]);

  const withEmail = selectedViewers.filter((v) => v.email);
  const noEmail   = selectedViewers.filter((v) => !v.email);

  // Build per-lead templateMap using the full CS notification template
  const templateMap: Record<string, string> = {};
  for (const v of selectedViewers) {
    templateMap[v._id] = buildCsTemplate(v);
  }

  const handleSend = async () => {
    setSending(true);
    setResults(null);
    try {
      const res = await fetch('/api/dev/portal-viewers/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedViewers.map((v) => v._id),
          subject,
          html: FALLBACK_HTML,
          from: senderEmail || undefined,
          provider: provider || undefined,
          templateMap,
          recipients: parsedRecipients.length > 0 ? parsedRecipients : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResults([{ leadId: '', name: 'Error', email: null, success: false, error: data.error || 'Request failed' }]);
        return;
      }
      setResults(data.results ?? []);
      onSent();
    } catch (err: any) {
      setResults([{ leadId: '', name: 'Error', email: null, success: false, error: err.message }]);
    } finally {
      setSending(false);
    }
  };

  const summary = results
    ? {
        ok:   results.filter((r) => r.success).length,
        fail: results.filter((r) => !r.success && !r.skipped).length,
        skip: results.filter((r) => r.skipped).length,
      }
    : null;

  const previewViewer = previewId ? selectedViewers.find((v) => v._id === previewId) ?? null : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Send — CS Notification Template"
      description={`${selectedViewers.length} lead${selectedViewers.length !== 1 ? 's' : ''} selected · individual CS template per lead`}
      maxWidth="4xl"
    >
      <div className="space-y-4">

        {/* What gets sent banner */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Each recipient receives their own <strong>personalised CS notification email</strong> — same
            rich template used by the portal route: Ref card, PNR, route, payment, visitor telemetry
            (IP, location, device, view count), and CRM / portal action buttons.
          </span>
        </div>

        {/* Sender info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ember-bg border border-ember-border text-xs text-ember-neutral">
          <Globe className="w-3.5 h-3.5 shrink-0 text-ember-neutral" />
          <span>
            Sending via <strong className="text-ember-text-primary">{provider || 'default'}</strong>
            {' '}from <strong className="text-ember-text-primary">{senderEmail || 'default sender'}</strong>
          </span>
        </div>

        {/* ── TO Recipients input ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ember-text-secondary uppercase tracking-wide flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Send To <span className="font-normal normal-case text-ember-neutral">(internal / CS team — not the customer)</span>
            {parsedRecipients.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {parsedRecipients.length} valid
              </span>
            )}
          </label>
          <div className="relative">
            <input
              value={recipientRaw}
              onChange={(e) => setRecipientRaw(e.target.value)}
              placeholder="cs@airlinesconsolidator.com, manager@example.com"
              disabled={sending || !!results}
              className="w-full px-3 py-2 h-9 text-xs rounded-btn border border-ember-border bg-ember-surface text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:ring-1 focus:ring-ember-primary/30 disabled:opacity-50"
            />
          </div>
          <p className="text-[10px] text-ember-neutral">
            Comma or space separated. Each lead's personalised CS template is sent to all addresses above.
            Leave empty to send to each lead's own email instead.
          </p>
          {/* Parsed address chips */}
          {parsedRecipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {parsedRecipients.map((addr) => (
                <span key={addr} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  {addr}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recipient stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ember-surface border border-ember-border">
            <Users className="w-4 h-4 text-ember-neutral" />
            <div>
              <p className="text-[10px] text-ember-neutral uppercase font-semibold">Selected</p>
              <p className="text-sm font-bold text-ember-text-primary">{selectedViewers.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <Mail className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[10px] text-emerald-700 uppercase font-semibold">
                {parsedRecipients.length > 0 ? 'Addresses' : 'Will receive'}
              </p>
              <p className="text-sm font-bold text-emerald-800">
                {parsedRecipients.length > 0 ? parsedRecipients.length : withEmail.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-[10px] text-amber-700 uppercase font-semibold">No email</p>
              <p className="text-sm font-bold text-amber-800">{noEmail.length}</p>
            </div>
          </div>
        </div>

        {noEmail.length > 0 && parsedRecipients.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Skipped (no email): {noEmail.map((v) => v.name).join(', ')}
          </p>
        )}

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ember-text-secondary uppercase tracking-wide">
            Subject
            <span className="ml-2 font-normal normal-case text-ember-neutral">
              — tokens: <code className="font-mono bg-ember-surface px-1 rounded">{'{{name}}'}</code>{' '}
              <code className="font-mono bg-ember-surface px-1 rounded">{'{{ref}}'}</code>{' '}
              <code className="font-mono bg-ember-surface px-1 rounded">{'{{route}}'}</code>{' '}
              <code className="font-mono bg-ember-surface px-1 rounded">{'{{status}}'}</code>
            </span>
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending || !!results}
          />
        </div>

        {/* Per-lead template previews */}
        {!results && withEmail.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ember-text-secondary uppercase tracking-wide">
                Template Preview — per lead
              </p>
              {previewId && (
                <button
                  type="button"
                  onClick={() => setPreviewId(null)}
                  className="text-xs text-ember-neutral hover:text-ember-text-primary transition-colors"
                >
                  Close preview
                </button>
              )}
            </div>

            {/* Lead selector pills */}
            <div className="flex flex-wrap gap-1.5">
              {withEmail.map((v) => (
                <button
                  key={v._id}
                  type="button"
                  onClick={() => setPreviewId(previewId === v._id ? null : v._id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    previewId === v._id
                      ? 'bg-ember-primary text-white border-ember-primary'
                      : 'bg-ember-surface border-ember-border text-ember-text-secondary hover:border-ember-primary/40 hover:text-ember-primary'
                  }`}
                >
                  {v.isAuthorized && <ShieldCheck className="w-3 h-3" />}
                  <Eye className="w-3 h-3" />
                  {v.name}
                </button>
              ))}
            </div>

            {/* Inline preview iframe */}
            {previewViewer && (
              <div className="rounded-lg border border-ember-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-ember-bg border-b border-ember-border">
                  <span className="text-xs font-semibold text-ember-text-primary">
                    Preview: {previewViewer.name}
                    <span className="ml-2 font-normal text-ember-neutral">
                      {previewViewer.referenceNumber} · {previewViewer.origin} → {previewViewer.destination}
                    </span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${previewViewer.isAuthorized ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                    {previewViewer.isAuthorized ? '✅ Authorized' : '👀 Viewed'}
                  </span>
                </div>
                <div
                  className="w-full h-80 overflow-auto bg-white p-2"
                  dangerouslySetInnerHTML={{ __html: templateMap[previewViewer._id] }}
                />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-ember-surface border border-ember-border">
              {summary!.ok   > 0 && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4" />{summary!.ok} sent</span>}
              {summary!.fail > 0 && <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><XCircle className="w-4 h-4" />{summary!.fail} failed</span>}
              {summary!.skip > 0 && <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700"><AlertCircle className="w-4 h-4" />{summary!.skip} skipped</span>}
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {results.map((r: any, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                  r.success   ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : r.skipped ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {r.success   ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : r.skipped  ? <AlertCircle  className="w-3.5 h-3.5 shrink-0" />
                                 : <XCircle      className="w-3.5 h-3.5 shrink-0" />}
                    <span className="font-semibold shrink-0">{r.name}</span>
                    {/* show sent-to addresses (bulk mode) or lead email (individual mode) */}
                    {r.sentTo?.length > 0 && (
                      <span className="opacity-70 truncate">{r.sentTo.join(', ')}</span>
                    )}
                    {!r.sentTo && r.email && <span className="opacity-70">{r.email}</span>}
                  </div>
                  <span className="opacity-80 text-right max-w-[200px] truncate ml-2 shrink-0">
                    {r.success
                      ? `✓ ${r.messageIds?.length ? r.messageIds[0].slice(0, 16) + '…' : r.messageId ? r.messageId.slice(0, 16) + '…' : 'Sent'}`
                      : r.error || r.skipReason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1 border-t border-ember-border">
          <Button variant="secondary" size="sm" onClick={onClose}>{results ? 'Close' : 'Cancel'}</Button>
          {!results && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              isLoading={sending}
              disabled={
                sending ||
                !subject.trim() ||
                // need either explicit recipients or leads that have emails
                (parsedRecipients.length === 0 && selectedViewers.length === 0)
              }
            >
              <Send className="w-3.5 h-3.5" />
              {parsedRecipients.length > 0
                ? `Send ${selectedViewers.length} template${selectedViewers.length !== 1 ? 's' : ''} → ${parsedRecipients.length} address${parsedRecipients.length !== 1 ? 'es' : ''}`
                : `Send CS template to ${withEmail.length} recipient${withEmail.length !== 1 ? 's' : ''}`
              }
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const PortalViewers: React.FC = () => {
  const [viewers,      setViewers]      = useState<PortalViewer[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [filterTab,    setFilterTab]    = useState<FilterTab>('all');
  const [sortKey,      setSortKey]      = useState<SortKey>('lastViewedAt');
  const [sortDir,      setSortDir]      = useState<SortDir>('desc');
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  // sender config (shared across both modals)
  const [provider,     setProvider]     = useState('godaddy');
  const [senderEmail,  setSenderEmail]  = useState('support@airlinesconsolidator.com');

  // modals
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [indivViewer,  setIndivViewer]  = useState<PortalViewer | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchViewers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/dev/portal-viewers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setViewers(data.viewers ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchViewers(); }, [fetchViewers]);

  // ── Filter + sort ─────────────────────────────────────────────────────────

  const tabCounts = {
    all:        viewers.length,
    viewed:     viewers.filter((v) => v.viewCount > 0).length,
    authorized: viewers.filter((v) => v.isAuthorized).length,
  };

  const filtered = viewers.filter((v) => {
    if (filterTab === 'viewed'     && !(v.viewCount > 0))   return false;
    if (filterTab === 'authorized' && !v.isAuthorized)       return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.email ?? '').toLowerCase().includes(q) ||
      (v.referenceNumber ?? '').toLowerCase().includes(q) ||
      v.origin.toLowerCase().includes(q) ||
      v.destination.toLowerCase().includes(q) ||
      (v.lastViewedLocation ?? '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name')          cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'viewCount') cmp = a.viewCount - b.viewCount;
    else if (sortKey === 'lastViewedAt')
      cmp = new Date(a.lastViewedAt ?? 0).getTime() - new Date(b.lastViewedAt ?? 0).getTime();
    else if (sortKey === 'stage')         cmp = a.stage.localeCompare(b.stage);
    else if (sortKey === 'paymentStatus') cmp = a.paymentStatus.localeCompare(b.paymentStatus);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  const allVisibleIds = sorted.map((v) => v._id);
  const allSelected   = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const someSelected  = allVisibleIds.some((id) => selected.has(id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); allVisibleIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((prev) => new Set([...prev, ...allVisibleIds]));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectedViewers = viewers.filter((v) => selected.has(v._id));

  // ── Sort ──────────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />;

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ember-neutral">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-xs">Loading portal viewers…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <AlertTriangle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-600 font-medium">{error}</p>
      <Button variant="secondary" size="sm" onClick={fetchViewers}><RefreshCw className="w-3.5 h-3.5" /> Retry</Button>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Sender Config ─────────────────────────────────────────────────── */}
      <SenderConfigBar
        provider={provider} setProvider={setProvider}
        senderEmail={senderEmail} setSenderEmail={setSenderEmail}
      />

      {/* ── Filter Tabs + Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-ember-surface-raised p-0.5 rounded-btn border border-ember-border">
          {([
            { id: 'all',        label: 'All',        icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'viewed',     label: 'Viewed',     icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'authorized', label: 'Authorized', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          ] as { id: FilterTab; label: string; icon: React.ReactNode }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                filterTab === tab.id
                  ? 'bg-white text-ember-primary shadow-sm'
                  : 'text-ember-neutral hover:text-ember-text-primary'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                filterTab === tab.id ? 'bg-ember-primary/10 text-ember-primary' : 'bg-ember-border text-ember-neutral'
              }`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Right side: search + actions */}
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember-primary/10 border border-ember-primary/20 text-xs font-semibold text-ember-primary">
              <CheckSquare className="w-3.5 h-3.5" />{selected.size} selected
            </span>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ember-neutral pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ref, route…"
              className="pl-8 pr-3 h-8 text-xs rounded-btn border border-ember-border bg-ember-surface text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:ring-1 focus:ring-ember-primary/30 w-52"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchViewers}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => setBulkOpen(true)}
          >
            <Mail className="w-3.5 h-3.5" />
            Bulk Send
            {selected.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs font-bold leading-none">
                {selected.size}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-ember-neutral">
          <Eye className="w-8 h-8 opacity-30" />
          <p className="text-sm font-medium">
            {search ? 'No results match your search' : filterTab === 'authorized' ? 'No authorized leads yet' : 'No portal views recorded yet'}
          </p>
          {search && <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear search</Button>}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ember-border bg-ember-bg/60">
                  <th className="w-10 px-3 py-3">
                    <button onClick={toggleAll} className="flex items-center justify-center text-ember-neutral hover:text-ember-primary transition-colors">
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-ember-primary" />
                        : someSelected
                        ? <div className="w-4 h-4 rounded border-2 border-ember-primary flex items-center justify-center bg-ember-primary/10"><Minus className="w-2.5 h-2.5 text-ember-primary" /></div>
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide cursor-pointer select-none hover:text-ember-text-primary" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">Lead <SortIcon k="name" /></span>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide">Route</th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide cursor-pointer select-none hover:text-ember-text-primary" onClick={() => handleSort('viewCount')}>
                    <span className="flex items-center gap-1">Views <SortIcon k="viewCount" /></span>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide cursor-pointer select-none hover:text-ember-text-primary" onClick={() => handleSort('lastViewedAt')}>
                    <span className="flex items-center gap-1">Last Activity <SortIcon k="lastViewedAt" /></span>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide">Location</th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide cursor-pointer select-none hover:text-ember-text-primary" onClick={() => handleSort('paymentStatus')}>
                    <span className="flex items-center gap-1">Status <SortIcon k="paymentStatus" /></span>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-ember-neutral uppercase tracking-wide">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ember-border">
                {sorted.map((viewer) => {
                  const isSelected = selected.has(viewer._id);
                  const isExpanded = expandedId === viewer._id;

                  return (
                    <React.Fragment key={viewer._id}>
                      <tr className={`transition-colors hover:bg-ember-surface-raised ${isSelected ? 'bg-ember-primary/5' : ''}`}>

                        {/* Checkbox */}
                        <td className="px-3 py-3">
                          <button onClick={() => toggleOne(viewer._id)} className="flex items-center justify-center text-ember-neutral hover:text-ember-primary transition-colors">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-ember-primary" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Lead info */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ember-text-primary">{viewer.name}</span>
                            {viewer.isAuthorized && (
                              <span title="Booking Authorized" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="w-2.5 h-2.5" /> Auth
                              </span>
                            )}
                          </div>
                          {viewer.email
                            ? <div className="text-ember-neutral mt-0.5">{viewer.email}</div>
                            : <div className="text-amber-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No email</div>}
                          {viewer.referenceNumber && (
                            <div className="text-ember-neutral mt-0.5 font-mono">{viewer.referenceNumber}</div>
                          )}
                        </td>

                        {/* Route */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-medium text-ember-text-primary">{viewer.origin}</span>
                          <span className="text-ember-neutral mx-1">→</span>
                          <span className="font-medium text-ember-text-primary">{viewer.destination}</span>
                        </td>

                        {/* Views */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[11px]">
                              {viewer.viewCount}
                            </span>
                            {viewer.uniqueIpCount > 1 && (
                              <span className="text-[10px] text-ember-neutral">{viewer.uniqueIpCount} IPs</span>
                            )}
                          </div>
                        </td>

                        {/* Last activity */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-ember-text-primary">
                            {viewer.isAuthorized
                              ? <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              : <Clock className="w-3 h-3 text-ember-neutral shrink-0" />}
                            {fmtDate(viewer.authorizedAt ?? viewer.lastViewedAt, true)}
                          </div>
                          <div className="text-ember-neutral mt-0.5">
                            {fmtDate(viewer.authorizedAt ?? viewer.lastViewedAt)}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-3 py-3 max-w-[160px]">
                          {(viewer.authorizedLocation || viewer.lastViewedLocation) && (
                            <div className="flex items-center gap-1 text-ember-text-primary truncate">
                              <MapPin className="w-3 h-3 text-ember-neutral shrink-0" />
                              <span className="truncate">{viewer.authorizedLocation ?? viewer.lastViewedLocation}</span>
                            </div>
                          )}
                          {viewer.lastViewedDevice && (
                            <div className="flex items-center gap-1 text-ember-neutral mt-0.5 truncate">
                              <Monitor className="w-3 h-3 shrink-0" />
                              <span className="truncate">{viewer.lastViewedDevice}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${paymentBadge(viewer.paymentStatus)}`}>
                              {viewer.paymentStatus}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${stageBadge(viewer.stage)}`}>
                              {viewer.stage}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {/* Open lead */}
                            <a href={`/leads/${viewer._id}`} target="_blank" rel="noopener noreferrer"
                               title="Open lead" className="p-1.5 rounded-btn text-ember-neutral hover:text-ember-primary hover:bg-ember-surface-raised transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            {/* Open portal */}
                            {viewer.trackingToken && (
                              <a href={`/portal/${viewer.trackingToken}`} target="_blank" rel="noopener noreferrer"
                                 title="View portal" className="p-1.5 rounded-btn text-ember-neutral hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {/* Expand */}
                            <button onClick={() => setExpandedId(isExpanded ? null : viewer._id)}
                               title={isExpanded ? 'Collapse' : 'Details'}
                               className="p-1.5 rounded-btn text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised transition-colors">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            {/* Individual send — pre-fills CS template */}
                            <button
                              onClick={() => setIndivViewer(viewer)}
                              title="Send individual email"
                              className="p-1.5 rounded-btn text-ember-neutral hover:text-ember-primary hover:bg-ember-primary/10 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded detail row ──────────────────────────── */}
                      {isExpanded && (
                        <tr className="bg-ember-bg/40">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">First Viewed</p>
                                <p className="text-ember-text-primary">{fmtDate(viewer.firstViewedAt)}</p>
                              </div>
                              <div>
                                <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Unique IPs</p>
                                <p className="text-ember-text-primary">{viewer.uniqueIpCount}</p>
                              </div>
                              <div>
                                <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Last IP</p>
                                <p className="text-ember-text-primary font-mono">{viewer.lastViewedIp || '—'}</p>
                              </div>
                              <div>
                                <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Email Sent To</p>
                                <p className="text-ember-text-primary">{viewer.sentTo || '—'}</p>
                              </div>
                              {viewer.isAuthorized && (
                                <>
                                  <div>
                                    <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Authorized At</p>
                                    <p className="text-emerald-700 font-semibold">{fmtDate(viewer.authorizedAt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Auth IP</p>
                                    <p className="text-ember-text-primary font-mono">{viewer.authorizedIp || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Auth Location</p>
                                    <p className="text-ember-text-primary">{viewer.authorizedLocation || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Auth Device</p>
                                    <p className="text-ember-text-primary">{viewer.authorizedDevice || '—'}</p>
                                  </div>
                                </>
                              )}
                              {viewer.uniqueDevices.length > 0 && (
                                <div className="col-span-2">
                                  <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Devices Seen</p>
                                  <p className="text-ember-text-primary">{viewer.uniqueDevices.join(' · ')}</p>
                                </div>
                              )}
                              {viewer.pnr && (
                                <div>
                                  <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">PNR</p>
                                  <p className="text-ember-text-primary font-mono">{viewer.pnr}</p>
                                </div>
                              )}
                              {viewer.trackingToken && (
                                <div className="col-span-2">
                                  <p className="text-ember-neutral uppercase tracking-wide font-semibold mb-1">Tracking Token</p>
                                  <p className="text-ember-text-primary font-mono text-[10px] break-all">{viewer.trackingToken}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <IndividualSendModal
        isOpen={!!indivViewer}
        onClose={() => setIndivViewer(null)}
        viewer={indivViewer}
        senderEmail={senderEmail}
        provider={provider}
        onSent={fetchViewers}
      />

      <BulkSendModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        selectedViewers={selectedViewers}
        senderEmail={senderEmail}
        provider={provider}
        onSent={fetchViewers}
      />
    </div>
  );
};
