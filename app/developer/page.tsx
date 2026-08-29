'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { DeveloperHeader } from '@/components/dev/DeveloperHeader';
import { S3Manager } from '@/components/dev/S3Manager';
import { SmtpTester } from '@/components/dev/SmtpTester';

function DeveloperToolsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'s3' | 'email'>(
    tabParam === 'email' ? 'email' : 's3'
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
      ) : (
        <SmtpTester envStatus={envStatus} />
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
