'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    autoAssignEnabled: true,
    companyName: 'AirlinesConsolidator',
    defaultCurrency: 'USD',
    emailProvider: 'mock',
  });
  const [activeStaffCount, setActiveStaffCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchSettings = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setActiveStaffCount(data.activeStaffCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleAutoAssign = async () => {
    const nextVal = !settings.autoAssignEnabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'autoAssignEnabled', value: nextVal }),
      });
      if (res.ok) {
        setSettings({ ...settings, autoAssignEnabled: nextVal });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmailAddress: testEmail }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-ember-text-primary">
            System Settings & Integrations
          </h1>
          <p className="text-xs text-ember-text-secondary mt-0.5">
            Configure round-robin auto assignment, email delivery (AWS SES / Gmail SMTP), and CRM defaults.
          </p>
        </div>

        {/* Section 1: Lead Auto-Assignment */}
        <Card elevated className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ember-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-btn bg-ember-primary/10 text-ember-primary flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ember-text-primary">
                  Lead Distribution & Auto-Assignment
                </h2>
                <p className="text-xs text-ember-text-secondary">
                  Distribute new incoming leads evenly across all active staff members.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              disabled={currentUser?.role !== 'admin'}
              onClick={handleToggleAutoAssign}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoAssignEnabled ? 'bg-ember-primary' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.autoAssignEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-btn bg-ember-surface-raised">
              <div>
                <span className="font-bold text-ember-text-primary block">
                  Status: {settings.autoAssignEnabled ? 'Auto-Assign ON' : 'Auto-Assign OFF'}
                </span>
                <span className="text-[11px] text-ember-neutral">
                  {settings.autoAssignEnabled
                    ? `New leads from Public Forms, Imports, and Manual Add are automatically distributed round-robin across ${activeStaffCount} active staff.`
                    : 'All newly ingested leads remain unassigned until manually allocated by an administrator.'}
                </span>
              </div>
              <span className="font-bold text-ember-primary px-2.5 py-1 rounded bg-ember-primary/10">
                {activeStaffCount} Active Agents
              </span>
            </div>
          </div>
        </Card>

        {/* Section 2: Email Configuration (SES / Gmail SMTP) */}
        <Card elevated className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-ember-border">
            <div className="w-8 h-8 rounded-btn bg-ember-accent/10 text-ember-accent flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ember-text-primary">
                Email Dispatch Configuration (SES / Gmail)
              </h2>
              <p className="text-xs text-ember-text-secondary">
                Configure AWS SES credentials or Gmail App Password via environment variables (.env).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-btn bg-ember-surface-raised space-y-1.5">
              <h3 className="font-bold text-ember-text-primary flex items-center gap-1.5">
                <span>Option A: Gmail SMTP</span>
              </h3>
              <p className="text-[11px] text-ember-neutral">
                Set in <code className="font-code text-ember-primary">.env</code>:
              </p>
              <div className="font-code text-[11px] bg-stone-900 text-stone-200 p-2.5 rounded">
                EMAIL_PROVIDER=gmail<br />
                GMAIL_USER=your@gmail.com<br />
                GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx<br />
                GMAIL_FROM_EMAIL=Flight CRM &lt;no-reply@...&gt;
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-ember-surface-raised space-y-1.5">
              <h3 className="font-bold text-ember-text-primary flex items-center gap-1.5">
                <span>Option B: AWS SES</span>
              </h3>
              <p className="text-[11px] text-ember-neutral">
                Set in <code className="font-code text-ember-primary">.env</code>:
              </p>
              <div className="font-code text-[11px] bg-stone-900 text-stone-200 p-2.5 rounded">
                EMAIL_PROVIDER=ses<br />
                SES_KEY=AKIA...<br />
                SES_SECRET=wJalrXUt...<br />
                SES_REGION=us-east-1
              </div>
            </div>
          </div>

          {/* Test Email Form */}
          <form onSubmit={handleSendTestEmail} className="pt-2 border-t border-ember-border space-y-3">
            <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wider block">
              Send Test Email
            </span>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter recipient email address..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                required
              />
              <Button type="submit" isLoading={isSendingTest} className="shrink-0 gap-1.5">
                <Send className="w-3.5 h-3.5" />
                <span>Send Test</span>
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-btn text-xs font-semibold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Test email sent successfully!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Error: {testResult.error}</span>
                  </>
                )}
              </div>
            )}
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
