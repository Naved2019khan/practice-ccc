'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Code2, Image as ImageIcon, Mail, Server, CheckCircle2, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';

interface DeveloperHeaderProps {
  envStatus?: any;
  loadingEnv?: boolean;
  onRefresh?: () => void;
  activeTab?: 's3' | 'email' | 'viewers';
}

export const DeveloperHeader: React.FC<DeveloperHeaderProps> = ({
  envStatus,
  loadingEnv,
  onRefresh,
  activeTab = 's3',
}) => {
  const pathname = usePathname();

  const isS3Tab = activeTab === 's3';
  const isEmailTab = activeTab === 'email';
  const isViewersTab = activeTab === 'viewers';

  const s3Ready = envStatus?.s3?.isConfigured;
  const smtpReady = envStatus?.smtp?.isConfigured;
  const gdReady = envStatus?.godaddy?.isConfigured;

  return (
    <div className="space-y-6">
      {/* Top Title & Environment Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-ember-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-btn bg-stone-900 text-amber-400 flex items-center justify-center shadow-sm">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-ember-text-primary">
                Developer Tools & Diagnostics
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                Dev Mode
              </span>
            </div>
            <p className="text-xs text-ember-text-secondary mt-0.5">
              Secure administrative toolset for AWS S3 asset management and AWS SES SMTP email delivery verification.
            </p>
          </div>
        </div>

        {/* Global Env Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {loadingEnv ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-ember-surface text-xs text-ember-neutral">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Checking environment...</span>
            </div>
          ) : (
            <>
              {/* S3 status badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  s3Ready
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={
                  s3Ready
                    ? `S3 Bucket: ${envStatus?.s3?.bucket || 'configured'} (${envStatus?.s3?.region})`
                    : 'AWS S3 credentials or bucket name missing in .env'
                }
              >
                {s3Ready ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                <span>S3: {s3Ready ? 'Ready' : 'Incomplete'}</span>
              </div>

              {/* SES SMTP status badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  smtpReady
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={
                  smtpReady
                    ? `SES SMTP: ${envStatus?.smtp?.host}:${envStatus?.smtp?.port}`
                    : 'SES SMTP credentials missing in .env'
                }
              >
                {smtpReady ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                <span>SES SMTP: {smtpReady ? 'Ready' : 'Incomplete'}</span>
              </div>

              {/* GoDaddy SMTP status badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  gdReady
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={
                  gdReady
                    ? `GoDaddy SMTP: ${envStatus?.godaddy?.host}:${envStatus?.godaddy?.port} (${envStatus?.godaddy?.maskedUser})`
                    : 'GoDaddy SMTP credentials missing in .env'
                }
              >
                {gdReady ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                <span>GoDaddy: {gdReady ? 'Ready' : 'Incomplete'}</span>
              </div>

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  title="Reload environment validation"
                  className="p-1.5 rounded-btn text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-ember-border space-x-1">
        <Link
          href="/developer/s3"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            isS3Tab
              ? 'border-ember-primary text-ember-primary bg-ember-primary/5 rounded-t-md'
              : 'border-transparent text-ember-text-secondary hover:text-ember-text-primary hover:border-ember-border'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>S3 Image Manager</span>
          {s3Ready && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </Link>

        <Link
          href="/developer/email"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            isEmailTab
              ? 'border-ember-primary text-ember-primary bg-ember-primary/5 rounded-t-md'
              : 'border-transparent text-ember-text-secondary hover:text-ember-text-primary hover:border-ember-border'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email / SMTP Tester</span>
          {(smtpReady || gdReady) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </Link>

        <Link
          href="/developer?tab=viewers"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            isViewersTab
              ? 'border-ember-primary text-ember-primary bg-ember-primary/5 rounded-t-md'
              : 'border-transparent text-ember-text-secondary hover:text-ember-text-primary hover:border-ember-border'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Portal Viewers</span>
        </Link>
      </div>
    </div>
  );
};
