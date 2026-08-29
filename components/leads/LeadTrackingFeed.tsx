'use client';

import React, { useState } from 'react';
import {
  Activity,
  Eye,
  Download,
  Mail,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  Radio,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LeadTrackingFeedProps {
  lead: any;
  onRefresh?: () => void;
}

export const LeadTrackingFeed: React.FC<LeadTrackingFeedProps> = ({ lead, onRefresh }) => {
  const [copied, setCopied] = useState(false);

  const portal = lead?.customerPortal || { viewCount: 0, downloadCount: 0, history: [] };
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
  const baseUrl = (typeof window !== 'undefined' && !isLocalhost)
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') ? process.env.NEXT_PUBLIC_APP_URL : 'http://crm.airlinesconsolidator.com');
  const trackingToken = lead?.customerPortal?.trackingToken || lead?._id;
  const publicTrackingUrl = trackingToken ? `${baseUrl}/portal/${trackingToken}` : null;

  const handleCopyLink = () => {
    if (!publicTrackingUrl) return;
    navigator.clipboard.writeText(publicTrackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const historyEvents = (portal.history || []).slice().reverse();

  return (
    <div className="space-y-6">
      {/* 1. Unique Customer Portal Link Card */}
      <Card elevated className="p-4 bg-gradient-to-r from-ember-bg via-ember-surface to-ember-bg border-ember-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-display text-ember-text-primary">
                Unique Customer Tracking Link
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                Live Tracking
              </span>
            </div>
            <p className="text-xs text-ember-text-secondary mt-0.5">
              Secure customer token — MongoDB lead IDs are never exposed in public tracking URLs.
            </p>
          </div>

          {publicTrackingUrl && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyLink}
                className="gap-1.5 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link' : 'Copy Tracking Link'}</span>
              </Button>
              <a
                href={publicTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-btn bg-ember-primary hover:bg-ember-primary-hover text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                title="Test View Portal"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Portal</span>
              </a>
            </div>
          )}
        </div>

        {publicTrackingUrl ? (
          <div className="p-2.5 rounded-btn bg-white border border-ember-border flex items-center justify-between text-xs font-mono text-ember-text-primary overflow-hidden">
            <span className="truncate select-all">{publicTrackingUrl}</span>
          </div>
        ) : (
          <div className="p-3 rounded-btn bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            Tracking link will be automatically generated upon sending the first customer email.
          </div>
        )}
      </Card>

      {/* 2. Key Engagement Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Views */}
        <div className="p-4 rounded-card bg-ember-surface border border-ember-border space-y-1">
          <div className="flex items-center justify-between text-ember-neutral">
            <span className="text-xs font-semibold">Portal Views</span>
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ember-text-primary">
            {portal.viewCount || 0}
          </div>
          <p className="text-[11px] text-ember-neutral">
            {portal.lastViewedAt
              ? `Last viewed: ${new Date(portal.lastViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'No customer opens yet'}
          </p>
        </div>

        {/* Ticket Downloads */}
        <div className="p-4 rounded-card bg-ember-surface border border-ember-border space-y-1">
          <div className="flex items-center justify-between text-ember-neutral">
            <span className="text-xs font-semibold">Ticket Downloads</span>
            <Download className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ember-text-primary">
            {portal.downloadCount || 0}
          </div>
          <p className="text-[11px] text-ember-neutral">Total electronic ticket downloads</p>
        </div>

        {/* Email Dispatches */}
        <div className="p-4 rounded-card bg-ember-surface border border-ember-border space-y-1">
          <div className="flex items-center justify-between text-ember-neutral">
            <span className="text-xs font-semibold">Email Dispatched</span>
            <Mail className="w-4 h-4 text-ember-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-ember-text-primary">
            {portal.lastSentAt ? 'Yes' : 'No'}
          </div>
          <p className="text-[11px] text-ember-neutral truncate">
            {portal.lastSentTo ? `Sent to: ${portal.lastSentTo}` : 'No email sent yet'}
          </p>
        </div>

        {/* Last Device & IP */}
        <div className="p-4 rounded-card bg-ember-surface border border-ember-border space-y-1">
          <div className="flex items-center justify-between text-ember-neutral">
            <span className="text-xs font-semibold">Visitor IP & Location</span>
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xs font-bold text-ember-text-primary truncate" title={portal.lastViewedDevice}>
            {portal.lastViewedDevice || 'Awaiting Visitor'}
          </div>
          <div className="space-y-0.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-ember-primary truncate">
                {portal.lastViewedIp ? `IP: ${portal.lastViewedIp}` : 'No IP recorded'}
              </span>
              {portal.lastViewedIp && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(portal.lastViewedIp);
                    alert(`Copied IP: ${portal.lastViewedIp}`);
                  }}
                  className="text-[10px] text-ember-neutral hover:text-ember-primary transition-colors underline"
                  title="Copy IP Address"
                >
                  Copy
                </button>
              )}
            </div>
            {portal.lastViewedLocation && (
              <div className="text-[10px] font-semibold text-emerald-700 truncate" title={portal.lastViewedLocation}>
                📍 {portal.lastViewedLocation}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Audit Log Timeline */}
      <Card elevated className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ember-border">
          <h3 className="text-sm font-bold font-display text-ember-text-primary flex items-center gap-2">
            <Activity className="w-4 h-4 text-ember-primary" />
            <span>Telemetry & Activity Audit Feed ({historyEvents.length})</span>
          </h3>
          {onRefresh && (
            <Button size="sm" variant="ghost" onClick={onRefresh} className="p-1.5 text-xs">
              Refresh Feed
            </Button>
          )}
        </div>

        {historyEvents.length === 0 ? (
          <div className="py-8 text-center text-ember-neutral space-y-1">
            <Clock className="w-8 h-8 mx-auto text-stone-400" />
            <p className="text-xs font-semibold">No tracking telemetry events logged yet.</p>
            <p className="text-[11px]">Dispatch a customer email or open the itinerary link to see live tracking events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-btn border border-ember-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ember-surface border-b border-ember-border text-ember-neutral uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Device / Browser</th>
                  <th className="py-2.5 px-3">IP & Location</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ember-border/60">
                {historyEvents.map((item: any) => {
                  const isSent = item.event === 'email_sent';
                  const isViewed = item.event === 'portal_viewed';
                  const isDownloaded = item.event === 'ticket_downloaded';
                  const isAuthorized = item.event === 'booking_authorized';

                  return (
                    <tr key={item.id} className="hover:bg-ember-surface/50 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isAuthorized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] uppercase shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" /> Authorized
                          </span>
                        ) : isSent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                            <Mail className="w-3 h-3" /> Email Sent
                          </span>
                        ) : isViewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                            <Eye className="w-3 h-3" /> Opened / Viewed
                          </span>
                        ) : isDownloaded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                            <Download className="w-3 h-3" /> Downloaded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-bold text-[10px] uppercase">
                            Activity
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-ember-text-primary">{item.description}</span>
                      </td>
                      <td className="py-2.5 px-3 text-ember-text-secondary whitespace-nowrap">
                        {item.device || item.browser ? (
                          <span className="font-mono text-[11px]">
                            {item.device} &bull; {item.browser} {item.os ? `(${item.os})` : ''}
                          </span>
                        ) : (
                          <span className="text-ember-neutral">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-ember-text-primary font-semibold text-[11px]">{item.ip || '-'}</div>
                        {(item.location || item.meta?.location) && (
                          <div className="text-[10px] text-emerald-700 font-medium">📍 {item.location || item.meta?.location}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-ember-neutral whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
