'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ember-bg">
      {/* Left Brand Panel */}
      <div className="w-full md:w-5/12 bg-ember-surface border-b md:border-b-0 md:border-r border-ember-border p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-ember-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-ember-accent/5 blur-3xl pointer-events-none" />

        {/* Top Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-btn bg-[#072B66] border-2 border-[#FFC107] flex items-center justify-center text-[#FFC107] font-bold text-lg shadow-sm">
              ✈
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-ember-text-primary tracking-tight">
                AirlinesConsolidator
              </h1>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Flight Management CRM
              </span>
            </div>
          </div>

          <div className="space-y-4 my-8">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-ember-text-primary leading-snug">
              Crafted for High-Touch Flight & Travel Teams
            </h2>
            <p className="text-sm text-ember-text-secondary leading-relaxed">
              Manage offline airline leads, streamline round-robin distribution, compose branded quotes, and monitor follow-ups in one warm, distraction-free workspace.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-3 pt-6 border-t border-ember-border">
          <div className="flex items-center gap-2.5 text-xs text-ember-text-secondary">
            <CheckCircle2 className="w-4 h-4 text-ember-primary shrink-0" />
            <span>Dual Roles: Admin control & Staff lead isolation</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-ember-text-secondary">
            <CheckCircle2 className="w-4 h-4 text-ember-primary shrink-0" />
            <span>Dual-Mode Email Composer with 1x1 tracking pixel</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-ember-text-secondary">
            <CheckCircle2 className="w-4 h-4 text-ember-primary shrink-0" />
            <span>CSV / Excel import with duplicate phone detection</span>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="w-full md:w-7/12 p-8 md:p-16 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ember-primary">
              Sign In
            </span>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-ember-text-primary mt-1">
              Welcome back
            </h2>
            <p className="text-xs text-ember-text-secondary mt-1">
              Enter your credentials to access your CRM workspace.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-btn bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@flightcrm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-2 gap-2">
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-xs text-ember-neutral">
              Staff accounts are created by administrators only. No public registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
