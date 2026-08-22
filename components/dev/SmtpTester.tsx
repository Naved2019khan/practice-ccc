'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Server,
  ShieldCheck,
  Zap,
  RefreshCw,
  Code2,
  FileText,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
  KeyRound,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface SmtpTesterProps {
  envStatus?: any;
}

const TEMPLATES = [
  {
    name: 'Simple Verification',
    subject: 'Email Delivery Verification Test',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #c2410c; margin-top: 0;">Flight CRM &bull; Email Delivery Success!</h2>
  <p style="color: #333; font-size: 15px;">This test message verifies that your email provider and SMTP credentials are functioning properly.</p>
  <div style="background: #f5f5f4; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #444;">
    Timestamp: ${new Date().toUTCString()}<br/>
    Status: Operational &bull; Verified
  </div>
  <p style="color: #777; font-size: 12px; margin-top: 20px;">Sent via Flight CRM Developer Tools</p>
</div>`,
    text: `Flight CRM - Email Delivery Success!\nThis test message verifies that your email provider and SMTP credentials are functioning properly.\nTimestamp: ${new Date().toUTCString()}`,
  },
  {
    name: 'Flight Booking Notification',
    subject: 'Flight Itinerary Confirmation #FL-8921',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9; padding: 24px; border: 1px solid #d6d3d1; border-radius: 12px;">
  <div style="border-bottom: 2px solid #c2410c; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="color: #c2410c; margin: 0;">Flight CRM &bull; Concierge Itinerary</h2>
  </div>
  <p style="color: #1c1917; font-size: 15px;">Dear VIP Client,</p>
  <p style="color: #57534E; font-size: 14px;">Your private flight itinerary from <strong>JFK (New York)</strong> to <strong>LHR (London)</strong> has been confirmed.</p>
  <div style="background: #f5f5f4; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 16px 0;">
    <p style="margin: 4px 0; color: #1c1917; font-size: 13px;"><strong>Flight:</strong> Gulfstream G650 &bull; Private Jet</p>
    <p style="margin: 4px 0; color: #1c1917; font-size: 13px;"><strong>Departure:</strong> Tomorrow at 09:30 AM EST</p>
    <p style="margin: 4px 0; color: #1c1917; font-size: 13px;"><strong>Status:</strong> Ticketed &bull; Priority Handling</p>
  </div>
  <p style="color: #78716c; font-size: 12px;">For assistance, reply directly to your assigned concierge agent.</p>
</div>`,
    text: `Flight CRM - Concierge Itinerary\nFlight JFK -> LHR Confirmed on Gulfstream G650. Departure: Tomorrow at 09:30 AM EST.`,
  },
];

export const SmtpTester: React.FC<SmtpTesterProps> = ({ envStatus }) => {
  const activeEnvProvider = envStatus?.activeProvider || 'gmail';
  const gmailConfig = envStatus?.gmail;
  const sesConfig = envStatus?.smtp;

  // Selected provider for tester: 'gmail' | 'smtp' (SES SMTP) | 'ses_api' (SES SDK)
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'smtp' | 'ses_api'>(
    activeEnvProvider === 'gmail' ? 'gmail' : 'smtp'
  );

  // Connection Test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  // Email Send Form state
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('Flight CRM Delivery Test');
  const [message, setMessage] = useState(TEMPLATES[0].html);
  const [isHtml, setIsHtml] = useState(true);

  // Send state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // Sync default From email whenever provider or env changes
  useEffect(() => {
    if (selectedProvider === 'gmail' && gmailConfig?.defaultFromEmail) {
      setFromEmail(gmailConfig.defaultFromEmail);
    } else if (selectedProvider !== 'gmail' && sesConfig?.defaultFromEmail) {
      setFromEmail(sesConfig.defaultFromEmail);
    }
  }, [selectedProvider, gmailConfig?.defaultFromEmail, sesConfig?.defaultFromEmail]);

  // Run Connection handshake test
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const res = await fetch('/api/dev/email/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const data = await res.json();
      setConnectionResult(data);
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: 'Failed to contact connection endpoint',
        error: err.message,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Run Test Email Send
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || !subject || !message) return;

    setSendingEmail(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/dev/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject,
          message,
          isHtml,
          method: selectedProvider,
        }),
      });

      const data = await res.json();
      setSendResult({
        ...data,
        status: res.status,
      });
    } catch (err: any) {
      setSendResult({
        success: false,
        error: err.message || 'Network error occurred while sending email',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const applyTemplate = (template: (typeof TEMPLATES)[0]) => {
    setSubject(template.subject);
    setMessage(isHtml ? template.html : template.text);
  };

  const isGmailActive = selectedProvider === 'gmail';
  const isCurrentProviderReady = isGmailActive
    ? gmailConfig?.isConfigured
    : selectedProvider === 'ses_api'
    ? envStatus?.s3?.hasCredentials
    : sesConfig?.isConfigured;

  return (
    <div className="space-y-6">
      {/* Provider Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-ember-bg rounded-card border border-ember-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wider">
              Active CRM Provider:
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
              EMAIL_PROVIDER={activeEnvProvider}
            </span>
          </div>
          <p className="text-[11px] text-ember-neutral mt-0.5">
            Switch test mode below to verify either Gmail SMTP or Amazon SES credentials.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-ember-surface-raised p-1 rounded-btn border border-ember-border">
          <button
            type="button"
            onClick={() => setSelectedProvider('gmail')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              selectedProvider === 'gmail'
                ? 'bg-white text-ember-primary shadow-sm'
                : 'text-ember-neutral hover:text-ember-text-primary'
            }`}
          >
            Gmail SMTP
          </button>
          <button
            type="button"
            onClick={() => setSelectedProvider('smtp')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              selectedProvider === 'smtp'
                ? 'bg-white text-ember-primary shadow-sm'
                : 'text-ember-neutral hover:text-ember-text-primary'
            }`}
          >
            AWS SES (SMTP)
          </button>
          <button
            type="button"
            onClick={() => setSelectedProvider('ses_api')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              selectedProvider === 'ses_api'
                ? 'bg-white text-ember-primary shadow-sm'
                : 'text-ember-neutral hover:text-ember-text-primary'
            }`}
          >
            AWS SES (SDK API)
          </button>
        </div>
      </div>

      {/* 1. Environment & Configuration Check Card */}
      <Card elevated className="p-5 space-y-4 bg-ember-surface/80 border-ember-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-ember-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-btn bg-ember-accent/10 text-ember-accent flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ember-text-primary flex items-center gap-2">
                <span>
                  {isGmailActive
                    ? 'Gmail SMTP Configuration Checklist'
                    : selectedProvider === 'ses_api'
                    ? 'AWS SES API Configuration Checklist'
                    : 'AWS SES SMTP Configuration Checklist'}
                </span>
                {isCurrentProviderReady ? (
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Action Required
                  </span>
                )}
              </h3>
              <p className="text-xs text-ember-text-secondary">
                {isGmailActive
                  ? 'Verifies Gmail user and Google App Password loaded from .env.'
                  : 'Verifies AWS SES host, port, username, and password loaded from .env.'}
              </p>
            </div>
          </div>

          {selectedProvider !== 'ses_api' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              isLoading={testingConnection}
              className="shrink-0 gap-1.5 text-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Test Connection ({isGmailActive ? 'Gmail' : 'SES SMTP'})</span>
            </Button>
          )}
        </div>

        {/* Gmail Checklist */}
        {isGmailActive ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">SMTP Service</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="font-mono text-xs text-ember-text-primary">smtp.gmail.com:465 (SSL)</p>
            </div>

            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">Gmail User</span>
                {gmailConfig?.user ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="font-mono text-xs text-ember-text-primary truncate">
                {gmailConfig?.maskedUser || 'Missing GMAIL_USER / SMTP_USER'}
              </p>
            </div>

            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">App Password</span>
                {gmailConfig?.isConfigured ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="font-mono text-xs text-ember-text-primary">
                {gmailConfig?.isConfigured ? '✓ Configured in .env' : 'Missing Password'}
              </p>
            </div>
          </div>
        ) : (
          /* AWS SES Checklist */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">SES Host</span>
                {sesConfig?.host ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="font-mono text-xs text-ember-text-primary truncate" title={sesConfig?.host}>
                {sesConfig?.host || 'Missing'}
              </p>
            </div>

            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">SES Port</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="font-mono text-xs text-ember-text-primary">{sesConfig?.port || 587} (STARTTLS)</p>
            </div>

            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">AWS Region</span>
                {sesConfig?.region ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="font-mono text-xs text-ember-text-primary">{sesConfig?.region || 'ap-south-1'}</p>
            </div>

            <div className="p-3 rounded-btn bg-ember-bg border border-ember-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ember-neutral font-semibold">Credentials</span>
                {sesConfig?.hasUser && sesConfig?.hasPassword ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="font-mono text-xs text-ember-text-primary truncate">
                {sesConfig?.maskedUser ? `User: ${sesConfig.maskedUser}` : 'Not set'}
              </p>
            </div>
          </div>
        )}

        {/* Connection Test Result Card */}
        {connectionResult && (
          <div
            className={`p-4 rounded-btn border text-xs space-y-2 animate-in fade-in duration-200 ${
              connectionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {connectionResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold">
                    {connectionResult.success
                      ? `${connectionResult.details?.provider || 'SMTP'} Connection Succeeded`
                      : `${connectionResult.details?.provider || 'SMTP'} Connection Failed`}
                  </h4>
                  <p className="text-[11px] opacity-90">{connectionResult.message}</p>
                </div>
              </div>

              {connectionResult.details?.latencyMs && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/70">
                  {connectionResult.details.latencyMs} ms
                </span>
              )}
            </div>

            {connectionResult.error && (
              <div className="p-2.5 rounded bg-red-100/80 font-mono text-[11px] text-red-900 break-all">
                {connectionResult.error}
              </div>
            )}

            {connectionResult.troubleshooting && connectionResult.troubleshooting.length > 0 && (
              <div className="pt-2 border-t border-red-200/80 text-[11px] space-y-1">
                <span className="font-bold text-red-950 block">Troubleshooting Guide:</span>
                <ul className="list-disc list-inside space-y-0.5 text-red-800">
                  {connectionResult.troubleshooting.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 2. Send Test Email Form Card */}
      <Card elevated className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ember-border">
          <div>
            <h2 className="text-sm font-bold text-ember-text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 text-ember-primary" />
              <span>
                Send Test Email via{' '}
                {selectedProvider === 'gmail'
                  ? 'Gmail SMTP'
                  : selectedProvider === 'ses_api'
                  ? 'AWS SES API'
                  : 'AWS SES SMTP'}
              </span>
            </h2>
            <p className="text-xs text-ember-text-secondary">
              Dispatches a test message directly to verify your delivery pipeline.
            </p>
          </div>

          {/* Quick Preset Templates */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ember-neutral font-semibold">Templates:</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => applyTemplate(t)}
                className="px-2 py-1 text-[10px] font-bold rounded-btn bg-ember-surface-raised hover:bg-ember-border text-ember-text-secondary hover:text-ember-text-primary transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* From Address */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ember-text-primary">
                From Email Address <span className="text-ember-neutral font-normal">(Sender)</span>
              </label>
              <Input
                type="text"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="Sender <sender@domain.com>"
                required
              />
              <p className="text-[10px] text-ember-neutral">
                {isGmailActive
                  ? 'Your Gmail account address.'
                  : 'Must be verified identity in AWS SES Console.'}
              </p>
            </div>

            {/* To Address */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ember-text-primary">
                To Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-ember-text-primary">
              Subject <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Test subject..."
              required
            />
          </div>

          {/* Message Body with HTML Toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-ember-text-primary">
                Email Message Content <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-ember-neutral font-semibold">Format:</span>
                <div className="flex bg-ember-surface-raised p-0.5 rounded-btn border border-ember-border text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsHtml(true)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      isHtml ? 'bg-white text-ember-primary shadow-sm' : 'text-ember-neutral'
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHtml(false)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      !isHtml ? 'bg-white text-ember-primary shadow-sm' : 'text-ember-neutral'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>
              </div>
            </div>

            <Textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isHtml ? '<p>Your HTML content here...</p>' : 'Plain text message content...'}
              className="font-mono text-xs"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2 border-t border-ember-border">
            <div className="flex items-center gap-2 text-xs text-ember-neutral">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Dispatching via:{' '}
                <strong>
                  {selectedProvider === 'gmail'
                    ? 'Gmail SMTP'
                    : selectedProvider === 'ses_api'
                    ? 'AWS SES API (SDK)'
                    : 'AWS SES SMTP'}
                </strong>
              </span>
            </div>

            <Button type="submit" isLoading={sendingEmail} className="gap-2 px-5">
              <Send className="w-4 h-4" />
              <span>
                Send Test Email (
                {selectedProvider === 'gmail'
                  ? 'Gmail'
                  : selectedProvider === 'ses_api'
                  ? 'SES API'
                  : 'SES SMTP'}
                )
              </span>
            </Button>
          </div>
        </form>

        {/* Send Result Feedback */}
        {sendResult && (
          <div
            className={`p-4 rounded-btn border text-xs space-y-2 animate-in fade-in duration-200 ${
              sendResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {sendResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">
                    {sendResult.success ? 'Test Email Sent Successfully!' : 'Email Delivery Failed'}
                  </h4>
                  {sendResult.methodUsed && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white font-bold border border-emerald-300 text-emerald-900">
                      {sendResult.methodUsed}
                    </span>
                  )}
                </div>
                {sendResult.success && (
                  <p className="text-xs text-emerald-800">
                    The email was accepted and successfully dispatched.
                  </p>
                )}
                {sendResult.messageId && (
                  <p className="text-[11px] font-mono text-emerald-700">
                    Message ID: <strong>{sendResult.messageId}</strong>
                  </p>
                )}
                {sendResult.error && (
                  <div className="p-2.5 rounded bg-red-100/80 font-mono text-[11px] text-red-900 mt-1 break-all">
                    {sendResult.error}
                  </div>
                )}
              </div>
            </div>

            {sendResult.troubleshooting && sendResult.troubleshooting.length > 0 && (
              <div className="pt-2 border-t border-red-200/80 text-[11px] space-y-1">
                <span className="font-bold text-red-950 block">Troubleshooting Guide:</span>
                <ul className="list-disc list-inside space-y-0.5 text-red-800">
                  {sendResult.troubleshooting.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
