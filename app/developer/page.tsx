'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { DeveloperHeader } from '@/components/dev/DeveloperHeader';
import { S3Manager } from '@/components/dev/S3Manager';
import { SmtpTester } from '@/components/dev/SmtpTester';
import { PortalViewers } from '@/components/dev/PortalViewers';

function DeveloperToolsContent() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'s3' | 'email' | 'viewers'>(
    tabParam === 'email' ? 'email' : tabParam === 'viewers' ? 'viewers' : 's3'
  );

  const [envStatus, setEnvStatus] = useState<any>(null);
  const [loadingEnv, setLoadingEnv] = useState(true);

  const fetchEnvStatus = async () => {
    try {
      setLoadingEnv(true);
      const res = await fetch('/api/dev/env-status');
      if (res.ok) {
        const data = await res.json();
        setEnvStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch dev env status:', err);
    } finally {
      setLoadingEnv(false);
    }
  };

  useEffect(() => {
    fetchEnvStatus();
  }, []);

  useEffect(() => {
    if (tabParam === 'email' || tabParam === 's3') {
      setActiveTab(tabParam);
    } else if (tabParam === 'viewers') {
      setActiveTab('viewers');
    }
  }, [tabParam]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <DeveloperHeader
        envStatus={envStatus}
        loadingEnv={loadingEnv}
        onRefresh={fetchEnvStatus}
        activeTab={activeTab}
      />

      {activeTab === 's3' ? (
        <S3Manager envStatus={envStatus} />
      ) : activeTab === 'email' ? (
        <SmtpTester envStatus={envStatus} />
      ) : (
        <PortalViewers />
      )}
    </div>
  );
}

export default function DeveloperToolsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="py-12 text-center text-xs text-ember-neutral">Loading developer tools...</div>}>
        <DeveloperToolsContent />
      </Suspense>
    </AppLayout>
  );
}
