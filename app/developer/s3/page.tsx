'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DeveloperHeader } from '@/components/dev/DeveloperHeader';
import { S3Manager } from '@/components/dev/S3Manager';

export default function S3DeveloperPage() {
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

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <DeveloperHeader
          envStatus={envStatus}
          loadingEnv={loadingEnv}
          onRefresh={fetchEnvStatus}
          activeTab="s3"
        />

        <S3Manager envStatus={envStatus} />
      </div>
    </AppLayout>
  );
}
